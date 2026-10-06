# SPDX-License-Identifier: GPL-3.0-or-later
# Leviate for Blender. Copyright (C) 2026 Vladyslav Pereverzyev

"""Leviate for Blender: move the 3D view or the selected objects with your bare hands.

Press Start camera in the Leviate tab of the 3D view sidebar. The webcam and the hand
tracking run inside Blender on the CPU (MediaPipe Hand Landmarker, the same model and
gesture rules as the Leviate web app). Nothing is recorded or sent anywhere.
"""

import queue

import bpy
import gpu
from gpu_extras.batch import batch_for_shader
from mathutils import Matrix, Quaternion, Vector

from .gestures import NONE, PAN, ROTATE, ZOOM
from .tracker import Tracker

_tracker = None
_draw_handle = None
_texture = {"serial": -1, "tex": None, "size": (0, 0)}
_state = {"moving": False}

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
    if _tracker is not None and _tracker.running:
        stop_camera()
        start_camera(context)


def _mirror(self, context):
    if _tracker is not None:
        _tracker.mirror = self.mirror


def _smooth(self, context):
    if _tracker is not None:
        _tracker.engine.smoothing = 1 - self.smooth


class LeviateSettings(bpy.types.PropertyGroup):
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
    if _tracker is None:
        return None
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
    while True:
        try:
            mode, dx, dy, z, _ = _tracker.moves.get_nowait()
        except queue.Empty:
            break
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
    if not _tracker.running:
        # The thread ended by itself (camera error): keep the message, stop the timer.
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


def draw_preview():
    if _tracker is None or not bpy.context.window_manager.leviate.preview:
        return
    region = bpy.context.region
    serial, w, h, pixels, hand, mode = _tracker.preview()
    if not w:
        return
    if _texture["serial"] != serial and pixels is not None:
        buf = gpu.types.Buffer("FLOAT", len(pixels), pixels)
        _texture["tex"] = gpu.types.GPUTexture((w, h), format="RGBA16F", data=buf)
        _texture["serial"] = serial
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

def start_camera(context):
    global _tracker
    settings = context.window_manager.leviate
    height = int(settings.resolution)
    _tracker = Tracker(camera=settings.camera - 1, width=height * 4 // 3, height=height,
                       mirror=settings.mirror, smoothing=1 - settings.smooth)
    _tracker.start()
    _state["moving"] = False
    start_drawing()
    if not bpy.app.timers.is_registered(poll):
        bpy.app.timers.register(poll, first_interval=0.05)


def stop_camera():
    global _tracker
    if _tracker is not None:
        _tracker.stop()
    _tracker = None
    stop_drawing()
    if bpy.app.timers.is_registered(poll):
        bpy.app.timers.unregister(poll)


class LEVIATE_OT_start(bpy.types.Operator):
    bl_idname = "leviate.start"
    bl_label = "Start camera"
    bl_description = "Turn on the camera and move Blender with your hand"

    def execute(self, context):
        start_camera(context)
        return {"FINISHED"}


class LEVIATE_OT_stop(bpy.types.Operator):
    bl_idname = "leviate.stop"
    bl_label = "Stop camera"
    bl_description = "Turn off the camera"

    def execute(self, context):
        stop_camera()
        return {"FINISHED"}


class LEVIATE_PT_panel(bpy.types.Panel):
    bl_label = "Leviate"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Leviate"

    def draw(self, context):
        layout = self.layout
        settings = context.window_manager.leviate
        on = _tracker is not None and _tracker.running

        if on:
            layout.operator("leviate.stop", icon="CANCEL")
            fw, fh = _tracker.frame_size
            if fw:
                layout.label(text="%s  %dx%d  %.0f fps" % (_tracker.status, fw, fh, _tracker.fps), icon="OUTLINER_OB_CAMERA")
            else:
                layout.label(text=_tracker.status, icon="TIME")
        else:
            layout.operator("leviate.start", icon="OUTLINER_OB_CAMERA")
            if _tracker is not None and _tracker.error:
                layout.label(text=_tracker.error, icon="ERROR")

        layout.prop(settings, "target")
        col = layout.column(align=True)
        col.label(text="Open hand rotates, fist pans, pinch zooms")

        box = layout.box()
        box.label(text="Camera")
        row = box.row(align=True)
        row.prop(settings, "camera")
        row.prop(settings, "resolution", text="")
        row = box.row()
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
