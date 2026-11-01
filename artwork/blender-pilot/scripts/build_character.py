"""MOVALYT pilot: one CC0 skinned character, one armature, two static review poses.
Run with Blender --background --factory-startup --python this_file -- --stage all.
No downloaded Python, external generation, image planes, or paid add-ons run.
"""
import argparse, hashlib, json, math, struct, sys
from pathlib import Path
import bpy, bmesh
from mathutils import Vector, Matrix
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'source/quaternius-superhero-male.glb'
BLEND=ROOT/'source/MOVALYT-Athlete-v001.blend'
RIG='ARM-MOVALYT-Athlete'; BODY='GEO-MOVALYT-Body'

def material(name, color, roughness=.62, metallic=0):
    mat=bpy.data.materials.new(name);mat.use_nodes=True;mat.diffuse_color=(*color,1)
    bs=mat.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=roughness;bs.inputs['Metallic'].default_value=metallic
    return mat

def aim(obj, target):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()

def context_object(obj):
    if bpy.context.object and bpy.context.object.mode!='OBJECT':bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj

def mesh_fingerprint(mesh):
    digest=hashlib.sha256()
    for v in mesh.vertices:digest.update(struct.pack('<3f',*v.co))
    for p in mesh.polygons:digest.update(struct.pack('<I',len(p.vertices))+struct.pack('<'+'I'*len(p.vertices),*p.vertices))
    return digest.hexdigest()

def sculpt_body(body):
    # One-time modest stylization of an anatomical artist-made base, BEFORE pose lock.
    # Continuous mesh displacement: no pasted primitive muscles or per-pose remeshing.
    context_object(body)
    # glTF splits coincident vertices at UV/normal seams. Weld these BEFORE
    # subdivision so the smooth skin and derived garment share continuous seams.
    # BMesh carries the deform-weight layer through this topology operation.
    bm=bmesh.new();bm.from_mesh(body.data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bm.to_mesh(body.data);bm.free();body.data.update()
    sub=body.modifiers.new('Subdivision-before-character-lock','SUBSURF');sub.levels=1
    bpy.ops.object.modifier_move_up(modifier=sub.name)
    bpy.ops.object.modifier_apply(modifier=sub.name)
    def g(x,z,cx,cz,wx,wz):return math.exp(-((x-cx)/wx)**2-((z-cz)/wz)**2)
    for v in body.data.vertices:
        x,y,z=v.co
        front=max(0,min(1,(-y-.015)/.075))
        if 1.015<z<1.435 and abs(x)<.24:
            bump=0
            for side in (-1,1):
                bump+=.018*g(x,z,side*.095,1.345,.090,.055)
                for az in (1.075,1.145,1.215):bump+=.013*g(x,z,side*.043,az,.033,.024)
                bump+=.005*g(x,z,side*.127,1.15,.027,.12)
            groove=.006*g(x,z,0,1.245,.009,.19)
            v.co.y-=(bump-groove)*front
        if .59<z<.94 and abs(x)<.25:
            v.co.y-=front*.010*(g(x,z,.12,.76,.065,.12)+g(x,z,-.12,.76,.065,.12))
    body.data.update()
    for p in body.data.polygons:p.use_smooth=True
    body['character_geometry_lock']='Set once before poses. Rest topology/coordinates must match at frames 1 and 40.'

def shell_from_body(body, name, predicate, mat, offset):
    chosen=[p for p in body.data.polygons if predicate(p.center)]
    indices=sorted({i for p in chosen for i in p.vertices});lookup={old:new for new,old in enumerate(indices)}
    vertices=[body.data.vertices[i].co+body.data.vertices[i].normal*offset for i in indices]
    faces=[[lookup[i] for i in p.vertices] for p in chosen]
    mesh=bpy.data.meshes.new(name+'-Mesh');mesh.from_pydata(vertices,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(mat)
    for vg in body.vertex_groups:obj.vertex_groups.new(name=vg.name)
    for new,old in enumerate(indices):
        for group in body.data.vertices[old].groups:obj.vertex_groups[group.group].add([new],group.weight,'REPLACE')
    arm=obj.modifiers.new('Same-armature-deformation','ARMATURE');arm.object=body.find_armature();arm.use_deform_preserve_volume=True
    obj.parent=body.parent
    for p in mesh.polygons:p.use_smooth=True
    return obj

def clipped_shorts(body, mat):
    # Exact plane clipping with interpolated skin weights yields clean hems;
    # moving an existing jagged edge by hand would alter its deformation.
    vertices=[];faces=[];weights=[];lookup={}
    def cut(poly,z,above):
        out=[]
        if not poly:return out
        for a,b in zip(poly,poly[1:]+poly[:1]):
            ia=(a[0].z>=z) if above else (a[0].z<=z)
            ib=(b[0].z>=z) if above else (b[0].z<=z)
            if ia:out.append(a)
            if ia!=ib:
                t=(z-a[0].z)/(b[0].z-a[0].z)
                co=a[0].lerp(b[0],t);co.z=z
                w={k:a[1].get(k,0)*(1-t)+b[1].get(k,0)*t for k in set(a[1])|set(b[1])}
                out.append((co,w))
        return out
    for p in body.data.polygons:
        poly=[]
        for i in p.vertices:
            v=body.data.vertices[i];poly.append((v.co+v.normal*.010,{g.group:g.weight for g in v.groups}))
        poly=cut(cut(poly,.765,True),1.015,False)
        if len(poly)<3:continue
        ids=[]
        for co,w in poly:
            key=tuple(round(c,8) for c in co)
            if key not in lookup:
                lookup[key]=len(vertices);vertices.append(co);weights.append(w)
            ids.append(lookup[key])
        if len(set(ids))>=3:faces.append(ids)
    mesh=bpy.data.meshes.new('GEO-MOVALYT-Shorts-Mesh');mesh.from_pydata(vertices,[],faces);mesh.update()
    obj=bpy.data.objects.new('GEO-MOVALYT-Shorts',mesh);bpy.context.collection.objects.link(obj);mesh.materials.append(mat)
    for vg in body.vertex_groups:obj.vertex_groups.new(name=vg.name)
    for i,w in enumerate(weights):
        for group,value in w.items():
            if value>1e-8:obj.vertex_groups[group].add([i],value,'REPLACE')
    bm=bmesh.new();bm.from_mesh(mesh)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001);bm.to_mesh(mesh);bm.free();mesh.update()
    obj.parent=body.parent;arm=obj.modifiers.new('Same-armature-deformation','ARMATURE');arm.object=body.find_armature();arm.use_deform_preserve_volume=True
    for p in mesh.polygons:p.use_smooth=True
    # Concealed body surface uses the same textile color to prevent skin bleed at
    # grazing contacts, as in ordinary game-character clothing authoring.
    body.data.materials.append(mat)
    for p in body.data.polygons:
        if .79<p.center.z<.99:p.material_index=len(body.data.materials)-1
    return obj

def aim_bone(rig,name,direction):
    # Rotate the bone about its current joint, preserving source roll and length.
    # Child transforms continue through the same weighted armature.
    bpy.context.view_layer.update();p=rig.pose.bones[name]
    delta=(p.tail-p.head).normalized().rotation_difference(Vector(direction).normalized())
    h=p.head.copy();p.matrix=Matrix.Translation(h)@delta.to_matrix().to_4x4()@Matrix.Translation(-h)@p.matrix
    bpy.context.view_layer.update()

def reset_pose(rig):
    for p in rig.pose.bones:p.matrix_basis=Matrix.Identity(4)
    rig.location=(0,0,0);bpy.context.view_layer.update()

def pose_athlete(rig, kind):
    reset_pose(rig)
    for suffix,sign in [('l',1),('r',-1)]:
        direction=(sign*.065,0,-1)
        aim_bone(rig,'upperarm_'+suffix,direction);aim_bone(rig,'lowerarm_'+suffix,direction)
        # Finger curls use source bone rolls. No replacement hand meshes.
        for finger in ['index','middle','ring','pinky']:
            for i,angle in enumerate(([25,55,45] if kind=='l-sit-full' else [8,12,8]),1):
                p=rig.pose.bones[f'{finger}_{i:02d}_{suffix}'];p.rotation_mode='XYZ';p.rotation_euler.x=math.radians(angle)
        for i,angle in enumerate(([12,22,28] if kind=='l-sit-full' else [3,6,4]),1):
            p=rig.pose.bones[f'thumb_{i:02d}_{suffix}'];p.rotation_mode='XYZ';p.rotation_euler.x=math.radians(angle)
        if kind=='l-sit-full':
            leg=(-sign*.075,-1,0)
            aim_bone(rig,'thigh_'+suffix,leg);aim_bone(rig,'calf_'+suffix,leg)
            aim_bone(rig,'foot_'+suffix,leg);aim_bone(rig,'ball_'+suffix,leg)
    bpy.context.view_layer.update()
    if kind=='standing':
        evaluated=bpy.data.objects[BODY].evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=evaluated.to_mesh()
        minimum=min((evaluated.matrix_world@v.co).z for v in mesh.vertices);evaluated.to_mesh_clear();rig.location.z=-minimum
    else:
        # Actual palm/finger landmarks determine equipment placement; root translation
        # lifts the same body over a 0.28m handle, without stretching any limb.
        grip=sum(rig.pose.bones[f'index_01_{s}'].head.z+.0108537 for s in ['l','r'])/2
        rig.location.z=.28-grip
    bpy.context.view_layer.update()

def cylinder(name, p1, p2, radius, mat):
    a,b=Vector(p1),Vector(p2);d=b-a
    bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=radius,depth=d.length,location=(a+b)/2)
    obj=bpy.context.object;obj.name=name;obj.rotation_euler=d.to_track_quat('Z','Y').to_euler();obj.data.materials.append(mat)
    bevel=obj.modifiers.new('Soft-metal-edges','BEVEL');bevel.width=.003;bevel.segments=3
    for p in obj.data.polygons:p.use_smooth=True
    return obj

def cube(name, location, scale, mat):
    bpy.ops.mesh.primitive_cube_add(size=1,location=location);o=bpy.context.object;o.name=name;o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
    b=o.modifiers.new('Rounded-feet','BEVEL');b.width=.012;b.segments=3
    return o

def add_equipment(rig,metal,rubber):
    objects=[]
    for side in ['l','r']:
        sign=1 if side=='l' else -1
        idx=rig.pose.bones['index_01_'+side].head
        grip=rig.matrix_world@idx
        x=grip.x-sign*.0330645;y=grip.y+.035
        objects.append(cylinder('GEO-Parallette-'+side+'-Handle',(x,y-.22,.28),(x,y+.22,.28),.014,metal))
        for j,dy in enumerate([-.18,.18]):
            objects.append(cylinder(f'GEO-Parallette-{side}-Post-{j}',(x,y+dy,.045),(x,y+dy,.28),.018,metal))
            objects.append(cube(f'GEO-Parallette-{side}-Foot-{j}',(x,y+dy,.026),(.145,.13,.052),rubber))
    for o in objects:
        for frame,hidden in [(1,True),(40,False)]:
            o.hide_render=hidden;o.hide_viewport=hidden
            o.keyframe_insert('hide_render',frame=frame);o.keyframe_insert('hide_viewport',frame=frame)
    return objects

def create_scene():
    initial={o.name for o in bpy.context.scene.objects}
    if not initial.issubset({'Cube','Camera','Light'}):raise RuntimeError('Run in --factory-startup; refusing to replace an existing scene')
    provenance=json.loads((ROOT/'reference-manifest.json').read_text())
    if hashlib.sha256(SOURCE.read_bytes()).hexdigest()!=provenance['geometrySource']['sha256']:
        raise RuntimeError('Input character differs from the reviewed CC0 source')
    for name in list(initial):bpy.data.objects.remove(bpy.data.objects[name],do_unlink=True)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE))
    rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');rig.name=RIG;rig.data.name='ARM-MOVALYT-65-Bones';rig.show_in_front=True;rig.data.display_type='OCTAHEDRAL'
    body=bpy.data.objects['SuperHero_Male'];body.name=BODY;body.data.name='GEO-MOVALYT-Body-Locked'
    body.modifiers[0].use_deform_preserve_volume=True
    skin=material('MAT-MOVALYT-Sculpted-Gray',(.24,.24,.24),.58)
    shorts_mat=material('MAT-MOVALYT-Black-Shorts',(.006,.006,.006),.88)
    hair_mat=material('MAT-MOVALYT-Black-Hair',(.009,.009,.009),.72)
    dark=material('MAT-MOVALYT-Brows',(.018,.018,.018),.75)
    eyes=material('MAT-MOVALYT-Simple-Eyes',(.16,.16,.16),.55)
    for obj,mat in [(body,skin),(bpy.data.objects['Eyebrows'],dark),(bpy.data.objects['Eyes'],eyes)]:
        obj.data.materials.clear();obj.data.materials.append(mat)
        for p in obj.data.polygons:p.use_smooth=True
    bpy.data.objects['Eyebrows'].name='GEO-MOVALYT-Eyebrows';bpy.data.objects['Eyes'].name='GEO-MOVALYT-Eyes'
    for obj in list(bpy.context.scene.objects):
        if obj.type=='MESH' and obj not in [body,bpy.data.objects['GEO-MOVALYT-Eyes'],bpy.data.objects['GEO-MOVALYT-Eyebrows']]:obj.hide_render=True
    sculpt_body(body)
    shorts=clipped_shorts(body,shorts_mat)
    solid=shorts.modifiers.new('Cloth-thickness','SOLIDIFY');solid.thickness=.002
    hair=shell_from_body(body,'GEO-MOVALYT-Hair',lambda c:c.z>max(1.67,min(1.765,1.765-(c.y+.10)*.53)),hair_mat,.008)
    for v in hair.data.vertices:
        # Small deterministic sculpted ridges; attached to the same head bones.
        v.co+=v.normal*(.0015*math.sin(v.co.x*160)*math.sin(v.co.y*120))
    hair.data.update()
    # One rig action with two discrete review keys, not a claimed movement animation.
    scene=bpy.context.scene;scene.frame_start=1;scene.frame_end=40;scene.render.fps=24
    rig.animation_data_create();rig.animation_data.action=bpy.data.actions.new('ACT-MOVALYT-Standing-and-LSit-Review')
    for frame,kind in [(1,'standing'),(40,'l-sit-full')]:
        scene.frame_set(frame);pose_athlete(rig,kind)
        for p in rig.pose.bones:
            p.keyframe_insert('location',frame=frame,group=p.name)
            p.keyframe_insert('rotation_quaternion' if p.rotation_mode=='QUATERNION' else 'rotation_euler',frame=frame,group=p.name)
            p.keyframe_insert('scale',frame=frame,group=p.name)
        rig.keyframe_insert('location',frame=frame)
        scene.timeline_markers.new('STANDING' if frame==1 else 'L-SIT FULL',frame=frame)
    for fc in rig.animation_data.action.fcurves:
        for kp in fc.keyframe_points:kp.interpolation='CONSTANT'
    scene.frame_set(40);bpy.context.view_layer.update()
    metal=material('MAT-Parallettes-Metal',(.16,.16,.16),.32,1)
    rubber=material('MAT-Parallettes-Feet',(.018,.018,.018),.82)
    add_equipment(rig,metal,rubber)
    floor_mat=material('MAT-Studio-Charcoal',(.003,.003,.003),.95)
    bpy.ops.mesh.primitive_plane_add(size=200);floor=bpy.context.object;floor.name='GEO-Studio-Floor';floor.data.materials.append(floor_mat)
    world=bpy.data.worlds.new('WORLD-MOVALYT-Studio');world.use_nodes=True
    world.node_tree.nodes['Background'].inputs['Color'].default_value=(.015,.015,.015,1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value=.3;scene.world=world
    for name,loc,power,size in [('Key',(-3,-4,4),280,2.2),('Fill',(3,-2,2),85,3),('Rim',(1,3,3),420,2)]:
        d=bpy.data.lights.new('LGT-'+name,'AREA');o=bpy.data.objects.new('LGT-'+name,d);scene.collection.objects.link(o);o.location=loc;d.energy=power;d.shape='DISK';d.size=size;aim(o,(0,0,.9))
    for name,loc,target,scale in [('Standing',(-3,-5,2),(0,0,.94),2.75),('LSit',(-4,-2.2,1.7),(0,-.40,.68),2.15)]:
        d=bpy.data.cameras.new('CAM-'+name);o=bpy.data.objects.new('CAM-'+name,d);scene.collection.objects.link(o);o.location=loc;aim(o,target);d.type='ORTHO';d.ortho_scale=scale;d.lens=70
    scene.camera=bpy.data.objects['CAM-LSit']
    scene.render.engine='BLENDER_EEVEE_NEXT';scene.eevee.taa_render_samples=32
    scene.cycles.device='CPU';scene.cycles.samples=96;scene.cycles.use_denoising=False
    scene.render.resolution_x=1536;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
    scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
    scene['MOVALYT-Source']='Quaternius CC0 body/weights, MOVALYT original sculpt/materials/clothing/poses/studio'
    scene['MOVALYT-Review']='Two poses only. Frame 1 standing; frame 40 L-Sit. No AI images or image planes. Character/Rig awaiting approval.'
    rig['MOVALYT-FK-Rig']='One 65-bone humanoid; original names, skinning and lengths; articulated fingers; no stretch controls.'
    scene['MOVALYT-BodyHash']=mesh_fingerprint(body.data)
    for b in rig.data.bones:
        b.hide='_leaf' in b.name
    for textname in ['README-MOVALYT','POSES-MOVALYT']:
        t=bpy.data.texts.new(textname);t.write('MOVALYT — rig pilot. Same character and armature in both poses.\nFrame 1: STANDING. Frame 40: L-SIT FULL.\nNo AI images, mesh swaps, per-pose body edits or paid services.\nReview character, hip deformation, shoulder/hand contact before expanding.\n')
    context_object(rig)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND),compress=True)
    print(json.dumps({'built':str(BLEND),'bones':len(rig.data.bones),'bodyVertices':len(body.data.vertices),'bodyHash':scene['MOVALYT-BodyHash']}),flush=True)

def render_poses(preview=False):
    bpy.ops.wm.open_mainfile(filepath=str(BLEND));scene=bpy.context.scene
    scene.eevee.taa_render_samples=16 if preview else 32
    scene.render.resolution_percentage=50 if preview else 100
    for frame,kind,camera in [(1,'standing','CAM-Standing'),(40,'l-sit-full','CAM-LSit')]:
        scene.frame_set(frame);scene.camera=bpy.data.objects[camera]
        scene.render.filepath=str(ROOT/'renders'/((kind+'-preview' if preview else kind)+'.png'))
        bpy.ops.render.render(write_still=True)
        print(json.dumps({'rendered':kind,'frame':frame,'bodyHash':mesh_fingerprint(bpy.data.objects[BODY].data)}),flush=True)

def export_model():
    bpy.ops.wm.open_mainfile(filepath=str(BLEND));context_object(bpy.data.objects[RIG]);bpy.context.scene.frame_set(1)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in bpy.context.scene.objects:
        if obj.name.startswith('GEO-MOVALYT-') or obj.name==RIG:obj.hide_set(False);obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(ROOT/'MOVALYT-Athlete-v001.glb'),export_format='GLB',use_selection=True,export_skins=True,export_animations=True,export_frame_range=True,export_cameras=False,export_lights=False,export_apply=False)
    print('PORTABLE_MODEL_EXPORTED',flush=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--stage',choices=['build','preview','render','export','all'],default='all')
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    if args.stage in ['build','all']:create_scene()
    if args.stage in ['preview','render','all']:render_poses(preview=args.stage=='preview')
    if args.stage in ['export','all']:export_model()
