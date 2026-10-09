# SPDX-License-Identifier: GPL-3.0-or-later
# Leviate for Blender. Copyright (C) 2026 Vladyslav Pereverzyev

"""Leviate for Blender: move the 3D view or the selected objects with your bare hands.

Press Start camera in the Leviate tab of the 3D view sidebar. The webcam, or a phone
paired with a QR code, and the hand tracking run on the CPU in a process of their own
next to Blender (MediaPipe Hand Landmarker, the same model and gesture rules as the
Leviate web app). Nothing is recorded.
"""

import os
import secrets
import sys
import tempfile

import bpy
import gpu
import numpy as np
from gpu_extras.batch import batch_for_shader
from mathutils import Matrix, Quaternion, Vector

from .process import Engine

# Gestures, as engine/gestures.py names them.
NONE, ROTATE, PAN, ZOOM = "none", "rotate", "pan", "zoom"

_engine = None
_draw_handle = None
_texture = {"serial": -1, "tex": None, "size": (0, 0)}
_state = {"moving": False}
_qr = {"url": None, "size": 0, "cells": []}
# Pairing id and token of this Blender session: the QR code stays the same from one
# start to the next, so a paired phone reconnects with Start camera alone.
_phone_identity = None

HAND_LINKS = (
    (0, 1), (1, 2), (2, 3), (3, 4),
    (0, 5), (5, 6), (6, 7), (7, 8),
    (5, 9), (9, 10), (10, 11), (11, 12),
    (9, 13), (13, 14), (14, 15), (15, 16),
    (13, 17), (17, 18), (18, 19), (19, 20), (0, 17),
)
MODE_COLOR = {
    NONE: (0.55, 0.58, 0.62, 1.0),
    ROTATE: (0.06, 0.70, 0.47, 1.0),
    PAN: (0.88, 0.72, 0.35, 1.0),
    ZOOM: (0.34, 0.67, 0.85, 1.0),
}
MODE_LABEL = {NONE: "Hand seen", ROTATE: "Rotate", PAN: "Pan", ZOOM: "Zoom"}


# ---------------------------------------------------------------- settings

def _restart(self, context):
    if _engine is not None and _engine.running:
        stop_camera()
        start_camera(context)


def _mirror(self, context):
    if _engine is not None:
        _engine.send(mirror=self.mirror)


def _smooth(self, context):
    if _engine is not None:
        _engine.send(smoothing=1 - self.smooth)


class LeviateSettings(bpy.types.PropertyGroup):
    source: bpy.props.EnumProperty(
        name="Camera",
        items=(
            ("WEBCAM", "This computer", "A webcam on this computer"),
            ("PHONE", "Phone", "Your phone as the camera: scan a QR code, no app to install. Keep the phone and this computer on the same Wi-Fi network"),
        ),
        default="WEBCAM", update=_restart,
    )
    target: bpy.props.EnumProperty(
        name="Move",
        items=(
            ("VIEW", "View", "The hand moves the 3D view, the scene stays where it is"),
            ("OBJECTS", "Selected objects", "The hand moves the selected objects"),
        ),
        default="VIEW",
    )
    camera: bpy.props.IntProperty(name="Camera", default=1, min=1, max=8, update=_restart,
                                  description="Number of the camera, 1 is the default one")
    resolution: bpy.props.EnumProperty(
        name="Resolution",
        items=(("480", "480p", ""), ("720", "720p", "")),
        default="480", update=_restart,
    )
    mirror: bpy.props.BoolProperty(name="Mirror", default=True, update=_mirror,
                                   description="Mirror the camera, like a selfie")
    preview: bpy.props.BoolProperty(name="Show camera", default=True,
                                    description="Camera preview with the hand points in the 3D view")
    rotate: bpy.props.FloatProperty(name="Rotate", default=5.0, min=0.5, max=15.0)
    pan: bpy.props.FloatProperty(name="Pan", default=1.0, min=0.1, max=4.0)
    zoom: bpy.props.FloatProperty(name="Zoom", default=1.0, min=0.1, max=4.0)
    smooth: bpy.props.FloatProperty(name="Smooth", default=0.5, min=0.0, max=0.9, update=_smooth)


# ---------------------------------------------------------------- motion

def view3d_regions():
    """Every 3D view open in Blender as (area, space, region)."""
    found = []
    for window in bpy.context.window_manager.windows:
        for area in window.screen.areas:
            if area.type != "VIEW_3D":
                continue
            space = area.spaces.active
            region = next((r for r in area.regions if r.type == "WINDOW"), None)
            if space and space.region_3d and region:
                found.append((area, space, region))
    return found


def visible_height(space, region):
    """Height of the scene visible at the view center, in scene units."""
    rv3d = space.region_3d
    # The viewport maps its lens to a 72 mm frame across its longer side.
    size = rv3d.view_distance * 72.0 / max(space.lens, 1.0)
    if region.width > region.height:
        return size * region.height / max(region.width, 1)
    return size


def move_view(space, region, rot, pan, zoom):
    rv3d = space.region_3d
    # Turning the model one way is turning the view the other way around it.
    if rot.length:
        rv3d.view_rotation = (rv3d.view_rotation @ Quaternion(rot.normalized(), -rot.length)).normalized()
    if pan.length:
        h = visible_height(space, region)
        rv3d.view_location = rv3d.view_location - rv3d.view_rotation @ Vector((pan.x * h, pan.y * h, 0.0))
    if zoom != 1.0:
        rv3d.view_distance = max(rv3d.view_distance / zoom, 1e-4)


def move_objects(objects, view_rotation, height, rot, pan, zoom):
    # Children of selected objects follow their parent, so they are left out.
    objects = [o for o in objects if not (o.parent and o.parent in objects)]
    if not objects:
        return
    center = sum((o.matrix_world.translation for o in objects), Vector()) / len(objects)
    m = Matrix.Identity(4)
    if rot.length:
        m = Matrix.Rotation(rot.length, 4, view_rotation @ rot.normalized())
    if zoom != 1.0:
        m = m @ Matrix.Scale(zoom, 4)
    m = Matrix.Translation(center) @ m @ Matrix.Translation(-center)
    if pan.length:
        m = Matrix.Translation(view_rotation @ Vector((pan.x * height, pan.y * height, 0.0))) @ m
    for o in objects:
        o.matrix_world = m @ o.matrix_world


def apply_motion(rot, pan, zoom, settings, views):
    """rot: turn of the model around the view axes, pan: in view heights, zoom: scale."""
    if not rot.length and not pan.length and zoom == 1.0:
        return
    if settings.target == "OBJECTS":
        # Objects move once, along the axes of the largest 3D view.
        _, space, region = max(views, key=lambda v: v[0].width * v[0].height)
        # Timers have no selection in their context, the view layer always does.
        selected = [o for o in bpy.context.view_layer.objects if o.select_get()]
        move_objects(selected, space.region_3d.view_rotation, visible_height(space, region), rot, pan, zoom)
    else:
        for _, space, region in views:
            move_view(space, region, rot, pan, zoom)


def undo_push():
    try:
        bpy.ops.ed.undo_push(message="Leviate move")
    except RuntimeError:
        pass


def poll():
    if _engine is None:
        return None
    running = _engine.update()
    settings = bpy.context.window_manager.leviate
    views = view3d_regions()
    rot = Vector()
    pan = Vector((0.0, 0.0))
    zoom = 1.0
    moving = _state["moving"]
    if views:
        _, _, big = max(views, key=lambda v: v[0].width * v[0].height)
        aspect = big.width / max(big.height, 1)
    else:
        aspect = 1.0
    for mode, dx, dy, z in _engine.take_moves():
        moving = mode != NONE
        if mode == ROTATE:
            rot += Vector((dy, dx, 0.0)) * settings.rotate
        elif mode == PAN:
            pan += Vector((dx * aspect, -dy)) * settings.pan
        elif mode == ZOOM:
            zoom *= z ** settings.zoom
    if views:
        apply_motion(rot, pan, zoom, settings, views)
    # One undo step for every gesture that moved objects.
    if _state["moving"] and not moving and settings.target == "OBJECTS":
        undo_push()
    _state["moving"] = moving
    for area, _, _ in views:
        area.tag_redraw()
    if not running:
        # The engine ended by itself (camera error): keep the message, stop the timer.
        stop_drawing()
        return None
    return 1 / 60


# ---------------------------------------------------------------- preview

def _shader(*names):
    for name in names:
        try:
            return gpu.shader.from_builtin(name)
        except (ValueError, KeyError):
            continue
    return None


def qr_cells(engine):
    """Dark modules of the pairing QR code as (row, column), cached."""
    if _qr["url"] != engine.phone_url:
        rows = engine.qr_rows
        _qr.update(url=engine.phone_url, size=len(rows),
                   cells=[(r, c) for r, row in enumerate(rows) for c, dark in enumerate(row) if dark == "1"])
    return _qr["size"], _qr["cells"]


def draw_qr(engine):
    """The pairing QR code in the lower left corner of the 3D view."""
    region = bpy.context.region
    flat = _shader("UNIFORM_COLOR")
    if flat is None:
        return
    size, cells = qr_cells(engine)
    if not size:
        return
    scale = bpy.context.preferences.system.ui_scale
    side = min(220 * scale, region.width * 0.45, region.height * 0.55)
    x0, y0 = 16 * scale, 16 * scale
    area = bpy.context.area
    if area is not None:
        x0 += sum(r.width for r in area.regions if r.type == "TOOLS" and r.width > 1)
    cell = side / max(size, 1)
    top = y0 + side
    quads = []
    for r, c in cells:
        x, y = x0 + c * cell, top - (r + 1) * cell
        quads += [(x, y), (x + cell, y), (x + cell, y + cell), (x, y), (x + cell, y + cell), (x, y + cell)]
    flat.bind()
    flat.uniform_float("color", (1.0, 1.0, 1.0, 1.0))
    batch_for_shader(flat, "TRIS", {"pos": [(x0, y0), (x0 + side, y0), (x0 + side, top),
                                            (x0, y0), (x0 + side, top), (x0, top)]}).draw(flat)
    flat.uniform_float("color", (0.0, 0.0, 0.0, 1.0))
    batch_for_shader(flat, "TRIS", {"pos": quads}).draw(flat)

    import blf
    font = 0
    blf.size(font, 13 * scale)
    blf.color(font, 0.92, 0.94, 0.96, 1.0)
    blf.position(font, x0, top + 10 * scale, 0)
    blf.draw(font, engine.status)


def draw_preview():
    if _engine is None:
        return
    if _engine.phone and not _engine.connected and _engine.running:
        draw_qr(_engine)
        return
    if not bpy.context.window_manager.leviate.preview or _engine.preview is None:
        return
    region = bpy.context.region
    w, h, pixels = _engine.preview
    hand, mode = _engine.hand, _engine.mode
    if _texture["serial"] != _engine.serial:
        rgba = np.frombuffer(pixels, dtype=np.uint8).astype(np.float32) / 255.0
        buf = gpu.types.Buffer("FLOAT", rgba.size, rgba)
        _texture["tex"] = gpu.types.GPUTexture((w, h), format="RGBA16F", data=buf)
        _texture["serial"] = _engine.serial
        _texture["size"] = (w, h)
    tex = _texture["tex"]
    if tex is None:
        return

    scale = bpy.context.preferences.system.ui_scale
    pw = min(260 * scale, region.width * 0.35)
    ph = pw * h / w
    if ph > region.height * 0.45:
        ph = region.height * 0.45
        pw = ph * w / h
    # Keep clear of the toolbar, which overlaps the view on the left.
    x0, y0 = 16 * scale, 16 * scale
    area = bpy.context.area
    if area is not None:
        x0 += sum(r.width for r in area.regions if r.type == "TOOLS" and r.width > 1)

    gpu.state.blend_set("ALPHA")
    image = _shader("IMAGE", "IMAGE_SCENE_LINEAR_TO_REC709_SRGB")
    if image:
        batch = batch_for_shader(image, "TRI_FAN", {
            "pos": ((x0, y0), (x0 + pw, y0), (x0 + pw, y0 + ph), (x0, y0 + ph)),
            "texCoord": ((0, 0), (1, 0), (1, 1), (0, 1)),
        })
        image.bind()
        image.uniform_sampler("image", tex)
        batch.draw(image)

    flat = _shader("UNIFORM_COLOR")
    color = MODE_COLOR.get(mode, MODE_COLOR[NONE])
    if hand and flat:
        pts = [(x0 + x * pw, y0 + (1 - y) * ph) for x, y in hand]
        lines = [pts[i] for link in HAND_LINKS for i in link]
        gpu.state.line_width_set(2.0 * scale)
        flat.bind()
        flat.uniform_float("color", color)
        batch_for_shader(flat, "LINES", {"pos": lines}).draw(flat)
        gpu.state.point_size_set(5.0 * scale)
        batch_for_shader(flat, "POINTS", {"pos": pts}).draw(flat)
        gpu.state.line_width_set(1.0)
        gpu.state.point_size_set(1.0)
    gpu.state.blend_set("NONE")

    import blf
    font = 0
    blf.size(font, 13 * scale)
    blf.color(font, *color)
    blf.position(font, x0 + 8 * scale, y0 + ph + 8 * scale, 0)
    blf.draw(font, MODE_LABEL.get(mode, "") if hand else "No hand")


def start_drawing():
    global _draw_handle
    if _draw_handle is None:
        _draw_handle = bpy.types.SpaceView3D.draw_handler_add(draw_preview, (), "WINDOW", "POST_PIXEL")


def stop_drawing():
    global _draw_handle
    if _draw_handle is not None:
        bpy.types.SpaceView3D.draw_handler_remove(_draw_handle, "WINDOW")
        _draw_handle = None
    _texture.update(serial=-1, tex=None, size=(0, 0))
    for area, _, _ in view3d_regions():
        area.tag_redraw()


# ---------------------------------------------------------------- camera

def log_path():
    """Where the engine writes its messages, read back when it stops by itself."""
    try:
        folder = bpy.utils.extension_path_user(__package__, create=True)
    except ValueError:   # loaded as a legacy add-on, not as an extension
        folder = tempfile.gettempdir()
    return os.path.join(folder, "engine.log")


def wheels_folder():
    """Where Blender installs the wheels of extensions for its own Python version."""
    return os.path.join(bpy.utils.user_resource("EXTENSIONS"), ".local", "lib",
                        "python%d.%d" % sys.version_info[:2], "site-packages")


def online_reason(settings):
    """What this start needs Allow Online Access for, or an empty string."""
    return "for the phone" if settings.source == "PHONE" else ""


def phone_identity():
    """Pairing id and token of this Blender session."""
    global _phone_identity
    if _phone_identity is None:
        alphabet = "0123456789abcdefghijklmnopqrstuvwxyz"
        _phone_identity = ("leviate-" + "".join(secrets.choice(alphabet) for _ in range(14)),
                           secrets.token_hex(8))
    return _phone_identity


def start_camera(context):
    global _engine
    settings = context.window_manager.leviate
    height = int(settings.resolution)
    phone = phone_identity() if settings.source == "PHONE" else None
    _engine = Engine(wheels_folder(), log_path(), camera=settings.camera - 1, width=height * 4 // 3, height=height,
                     mirror=settings.mirror, smoothing=1 - settings.smooth, phone=phone)
    _state["moving"] = False
    start_drawing()
    if not bpy.app.timers.is_registered(poll):
        bpy.app.timers.register(poll, first_interval=0.05)


def stop_camera():
    global _engine
    if _engine is not None:
        _engine.stop()
    _engine = None
    stop_drawing()
    if bpy.app.timers.is_registered(poll):
        bpy.app.timers.unregister(poll)


class LEVIATE_OT_start(bpy.types.Operator):
    bl_idname = "leviate.start"
    bl_label = "Start camera"
    bl_description = "Turn on the camera and move Blender with your hand"

    def execute(self, context):
        reason = online_reason(context.window_manager.leviate)
        if reason and not bpy.app.online_access:
            self.report({"ERROR"}, "Turn on Allow Online Access in Preferences > System > Network " + reason)
            return {"CANCELLED"}
        start_camera(context)
        return {"FINISHED"}


class LEVIATE_OT_stop(bpy.types.Operator):
    bl_idname = "leviate.stop"
    bl_label = "Stop camera"
    bl_description = "Turn off the camera"

    def execute(self, context):
        stop_camera()
        return {"FINISHED"}


class LEVIATE_OT_copy_link(bpy.types.Operator):
    bl_idname = "leviate.copy_link"
    bl_label = "Copy link"
    bl_description = "Copy the pairing link, to open it on the phone without the QR code"

    def execute(self, context):
        if _engine is not None and _engine.phone_url:
            context.window_manager.clipboard = _engine.phone_url
            self.report({"INFO"}, "Pairing link copied")
        return {"FINISHED"}


class LEVIATE_PT_panel(bpy.types.Panel):
    bl_label = "Leviate"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Leviate"

    def draw(self, context):
        layout = self.layout
        settings = context.window_manager.leviate
        on = _engine is not None and _engine.running
        phone = settings.source == "PHONE"

        layout.prop(settings, "source", expand=True)
        if on:
            layout.operator("leviate.stop", icon="CANCEL")
            fw, fh = _engine.frame_size
            if fw:
                layout.label(text="%s  %dx%d  %.0f fps" % (_engine.status, fw, fh, _engine.fps), icon="OUTLINER_OB_CAMERA")
            else:
                layout.label(text=_engine.status, icon="TIME")
            if _engine.phone and not _engine.connected:
                col = layout.column(align=True)
                col.label(text="Scan the QR code in the 3D view")
                col.label(text="and tap Start camera on the phone")
                col.label(text="Same Wi-Fi on the phone and this computer", icon="INFO")
                col.operator("leviate.copy_link", icon="COPYDOWN")
        else:
            layout.operator("leviate.start", icon="OUTLINER_OB_CAMERA")
            if phone:
                layout.label(text="Same Wi-Fi on the phone and this computer", icon="INFO")
            if _engine is not None and _engine.error:
                layout.label(text=_engine.error, icon="ERROR")
            reason = online_reason(settings)
            if reason and not bpy.app.online_access:
                col = layout.column(align=True)
                col.label(text="Turn on Allow Online Access", icon="INFO")
                col.label(text=reason)
                col.label(text="Preferences > System > Network")

        layout.prop(settings, "target")
        col = layout.column(align=True)
        col.label(text="Open hand rotates, fist pans, pinch zooms")

        box = layout.box()
        box.label(text="Camera")
        if not phone:
            row = box.row(align=True)
            row.prop(settings, "camera")
            row.prop(settings, "resolution", text="")
        row = box.row()
        if not phone:
            row.prop(settings, "mirror")
        row.prop(settings, "preview")

        box = layout.box()
        box.label(text="Gestures")
        col = box.column(align=True)
        col.prop(settings, "rotate", slider=True)
        col.prop(settings, "pan", slider=True)
        col.prop(settings, "zoom", slider=True)
        col.prop(settings, "smooth", slider=True)


classes = (
    LeviateSettings,
    LEVIATE_OT_start,
    LEVIATE_OT_stop,
    LEVIATE_OT_copy_link,
    LEVIATE_PT_panel,
)


def register():
    for cls in classes:
        bpy.utils.register_class(cls)
    bpy.types.WindowManager.leviate = bpy.props.PointerProperty(type=LeviateSettings)


def unregister():
    stop_camera()
    del bpy.types.WindowManager.leviate
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)
