# SPDX-License-Identifier: GPL-3.0-or-later
# Leviate for Blender. Copyright (C) 2026 Vladyslav Pereverzyev

"""Leviate for Blender: move the 3D view or the selected objects with your hands.

The hand tracking runs in the Leviate web app (https://vladpereverzyev.github.io/leviate/).
Press Link app there and the page sends every gesture to this add-on over a WebSocket
on 127.0.0.1. The messages are described in integrations/README.md of the repository.
"""

import queue

import bpy
from mathutils import Matrix, Quaternion, Vector

from .server import LeviateServer

APP_URL = "https://vladpereverzyev.github.io/leviate/"
PROTOCOL = 1

_server = None
_state = {"app": "", "moving": False}


# ---------------------------------------------------------------- settings

class LeviatePreferences(bpy.types.AddonPreferences):
    bl_idname = __package__

    port: bpy.props.IntProperty(
        name="Port", default=47800, min=1024, max=65535,
        description="Port on 127.0.0.1 where Leviate connects. Set the same one in Leviate",
    )
    auto_start: bpy.props.BoolProperty(
        name="Wait for Leviate when Blender opens", default=False,
    )
    origins: bpy.props.StringProperty(
        name="Extra pages", default="",
        description="Addresses of your own Leviate copies allowed to connect, separated by spaces",
    )
    any_origin: bpy.props.BoolProperty(
        name="Allow any page", default=False,
        description="Only for testing: any site open in the browser could move the view",
    )

    def draw(self, context):
        col = self.layout.column()
        col.prop(self, "port")
        col.prop(self, "auto_start")
        col.prop(self, "origins")
        col.prop(self, "any_origin")


class LeviateSettings(bpy.types.PropertyGroup):
    target: bpy.props.EnumProperty(
        name="Move",
        items=(
            ("VIEW", "View", "Gestures move the 3D view, the scene stays where it is"),
            ("OBJECTS", "Selected objects", "Gestures move the selected objects"),
        ),
        default="VIEW",
    )
    rotate: bpy.props.FloatProperty(name="Rotate", default=1.0, min=0.0, max=5.0)
    pan: bpy.props.FloatProperty(name="Pan", default=1.0, min=0.0, max=5.0)
    zoom: bpy.props.FloatProperty(name="Zoom", default=1.0, min=0.0, max=5.0)


def prefs():
    return bpy.context.preferences.addons[__package__].preferences


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


def apply_motion(rot, pan, zoom, settings):
    rot = rot * settings.rotate
    pan = pan * settings.pan
    zoom = zoom ** settings.zoom
    if not rot.length and not pan.length and zoom == 1.0:
        return
    views = view3d_regions()
    if not views:
        return
    if settings.target == "OBJECTS":
        # Objects move once, along the axes of the largest 3D view.
        _, space, region = max(views, key=lambda v: v[0].width * v[0].height)
        # Timers have no selection in their context, the view layer always does.
        selected = [o for o in bpy.context.view_layer.objects if o.select_get()]
        move_objects(selected, space.region_3d.view_rotation,
                     visible_height(space, region), rot, pan, zoom)
    else:
        for _, space, region in views:
            move_view(space, region, rot, pan, zoom)
    for area, _, _ in views:
        area.tag_redraw()


def undo_push():
    try:
        bpy.ops.ed.undo_push(message="Leviate move")
    except RuntimeError:
        pass


def poll():
    if _server is None or not _server.running:
        return None
    settings = bpy.context.window_manager.leviate
    rot = Vector()
    pan = Vector((0.0, 0.0))
    zoom = 1.0
    moving = _state["moving"]
    changed = False
    while True:
        try:
            msg = _server.messages.get_nowait()
        except queue.Empty:
            break
        kind = msg.get("type")
        if kind == "connected":
            _server.send({"type": "hello", "app": "blender", "version": bpy.app.version_string,
                          "protocol": PROTOCOL})
            changed = True
        elif kind == "disconnected":
            _state["app"] = ""
            moving = False
            changed = True
        elif kind == "hello":
            _state["app"] = str(msg.get("version", ""))
            changed = True
        elif kind == "motion":
            try:
                r = msg.get("rotate") or (0, 0, 0)
                p = msg.get("pan") or (0, 0)
                rot += Vector((float(r[0]), float(r[1]), float(r[2])))
                pan += Vector((float(p[0]), float(p[1])))
                zoom *= float(msg.get("zoom") or 1.0)
            except (TypeError, ValueError, IndexError):
                continue
            moving = msg.get("mode", "none") != "none"
    apply_motion(rot, pan, zoom, settings)
    # One undo step for every gesture that moved objects.
    if _state["moving"] and not moving and settings.target == "OBJECTS":
        undo_push()
    _state["moving"] = moving
    if changed:
        for area, _, _ in view3d_regions():
            area.tag_redraw()
    return 1 / 60


def start_server():
    global _server
    if _server and _server.running:
        return
    p = prefs()
    _server = LeviateServer(port=p.port, origins=p.origins.split(), any_origin=p.any_origin)
    _server.start()
    if not bpy.app.timers.is_registered(poll):
        bpy.app.timers.register(poll, first_interval=0.1, persistent=True)


def stop_server():
    global _server
    if _server:
        _server.stop()
    _server = None
    _state.update(app="", moving=False)
    if bpy.app.timers.is_registered(poll):
        bpy.app.timers.unregister(poll)


# ---------------------------------------------------------------- UI

class LEVIATE_OT_start(bpy.types.Operator):
    bl_idname = "leviate.start"
    bl_label = "Wait for Leviate"
    bl_description = "Open the link on 127.0.0.1 so the Leviate page can connect"

    def execute(self, context):
        try:
            start_server()
        except OSError as err:
            self.report({"ERROR"}, "Port %d is busy: %s" % (prefs().port, err))
            return {"CANCELLED"}
        return {"FINISHED"}


class LEVIATE_OT_stop(bpy.types.Operator):
    bl_idname = "leviate.stop"
    bl_label = "Stop"
    bl_description = "Close the link with Leviate"

    def execute(self, context):
        stop_server()
        return {"FINISHED"}


class LEVIATE_OT_open(bpy.types.Operator):
    bl_idname = "leviate.open"
    bl_label = "Open Leviate"
    bl_description = "Open the Leviate web app in the browser"

    def execute(self, context):
        bpy.ops.wm.url_open(url=APP_URL)
        return {"FINISHED"}


class LEVIATE_PT_panel(bpy.types.Panel):
    bl_label = "Leviate"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Leviate"

    def draw(self, context):
        layout = self.layout
        settings = context.window_manager.leviate

        if _server is None or not _server.running:
            layout.operator("leviate.start", icon="LINKED")
        else:
            layout.operator("leviate.stop", icon="CANCEL")
            if _server.connected:
                layout.label(text="Linked to Leviate " + _state["app"], icon="CHECKMARK")
            else:
                layout.label(text="Waiting on port %d" % _server.port, icon="TIME")
                layout.label(text="In Leviate press Link app")
            if _server.error:
                layout.label(text=_server.error, icon="ERROR")

        layout.operator("leviate.open", icon="URL")
        layout.separator()
        layout.prop(settings, "target")
        col = layout.column(align=True)
        col.prop(settings, "rotate", slider=True)
        col.prop(settings, "pan", slider=True)
        col.prop(settings, "zoom", slider=True)


classes = (
    LeviatePreferences,
    LeviateSettings,
    LEVIATE_OT_start,
    LEVIATE_OT_stop,
    LEVIATE_OT_open,
    LEVIATE_PT_panel,
)


def _auto_start():
    try:
        if prefs().auto_start:
            start_server()
    except (OSError, KeyError):
        pass
    return None


def register():
    for cls in classes:
        bpy.utils.register_class(cls)
    bpy.types.WindowManager.leviate = bpy.props.PointerProperty(type=LeviateSettings)
    bpy.app.timers.register(_auto_start, first_interval=1.0)


def unregister():
    stop_server()
    if bpy.app.timers.is_registered(_auto_start):
        bpy.app.timers.unregister(_auto_start)
    del bpy.types.WindowManager.leviate
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)
