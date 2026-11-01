"""Real Blender GUI screenshots on an authenticated local X display.
Run Blender with the saved .blend and --python this_file. ImageMagick's import
captures the display directly; this script does not composite or edit screenshots.
"""
import bpy,json,os,subprocess
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
rig=bpy.data.objects['ARM-MOVALYT-Athlete'];scene=bpy.context.scene
if bpy.context.object and bpy.context.object.mode!='OBJECT':bpy.ops.object.mode_set(mode='OBJECT')
for obj in bpy.context.scene.objects:
    if obj.type in ['CAMERA','LIGHT'] or obj.name=='GEO-Studio-Floor':obj.hide_set(True)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
rig.show_in_front=True
for p in rig.pose.bones:p.custom_shape=None
for bone in rig.data.bones:bone.hide=('_leaf' in bone.name or bone.name=='root')
bpy.ops.object.mode_set(mode='POSE')
bpy.ops.pose.select_all(action='DESELECT');rig.data.bones['thigh_l'].select=True;rig.data.bones.active=rig.data.bones['thigh_l']
bpy.context.workspace.name='MOVALYT — ONE CHARACTER / 65 BONES'

def configure(frame):
    scene.frame_set(frame);bpy.context.view_layer.update()
    cam=bpy.data.objects['CAM-Standing' if frame==1 else 'CAM-LSit']
    target=Vector((0,0,.94) if frame==1 else (0,-.4,.68))
    for area in bpy.context.screen.areas:
        if area.type=='VIEW_3D':
            space=area.spaces.active;space.shading.type='SOLID';space.shading.color_type='MATERIAL'
            space.shading.light='STUDIO';space.shading.show_shadows=True;space.shading.show_cavity=True
            space.shading.cavity_type='BOTH';space.shading.curvature_ridge_factor=1.6;space.shading.curvature_valley_factor=1.3
            space.overlay.show_overlays=True;space.overlay.show_floor=True;space.overlay.show_axis_x=False;space.overlay.show_axis_y=False
            space.overlay.show_bones=True;space.show_region_ui=False
            space.region_3d.view_rotation=cam.rotation_euler.to_quaternion();space.region_3d.view_location=target
            space.region_3d.view_distance=2.55 if frame==1 else 2.35;space.region_3d.view_perspective='ORTHO'
        elif area.type=='PROPERTIES':
            try:area.spaces.active.context='DATA'
            except Exception:pass
        elif area.type=='OUTLINER':
            area.spaces.active.show_restrict_column_viewport=True
            try:
                with bpy.context.temp_override(area=area):bpy.ops.outliner.show_hierarchy()
            except Exception:pass
    for area in bpy.context.screen.areas:area.tag_redraw()

configure(1)
state={'step':0,'captures':[]}
def capture():
    if state['step']==0:
        path=ROOT/'renders/blender-ui-standing.png'
        subprocess.run(['import','-window','root',str(path)],check=True,env=os.environ.copy())
        state['captures'].append({'frame':1,'file':path.name,'mode':bpy.context.mode,'rig':rig.name,'armatures':sum(o.type=='ARMATURE' for o in scene.objects)})
        configure(40);state['step']=1
        return 8.0
    path=ROOT/'renders/blender-ui-l-sit.png'
    subprocess.run(['import','-window','root',str(path)],check=True,env=os.environ.copy())
    state['captures'].append({'frame':40,'file':path.name,'mode':bpy.context.mode,'rig':rig.name,'armatures':sum(o.type=='ARMATURE' for o in scene.objects)})
    (ROOT/'gui-proof.json').write_text(json.dumps({'method':'Unmodified ImageMagick X11 window capture of actual Blender GUI','blender':bpy.app.version_string,'blend':bpy.data.filepath,'captures':state['captures']},indent=2)+'\n')
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'source/MOVALYT-Athlete-v001.blend'),compress=True)
    bpy.app.timers.register(lambda:bpy.ops.wm.quit_blender() and None,first_interval=2)
    return None
bpy.app.timers.register(capture,first_interval=10.0)
