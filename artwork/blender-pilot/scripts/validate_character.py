"""Structural/pose/export evidence from Blender data, never inferred from images."""
import bpy,hashlib,json,math,struct
from mathutils import Vector
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BLEND=ROOT/'source/MOVALYT-Athlete-v001.blend'
bpy.ops.wm.open_mainfile(filepath=str(BLEND))
scene=bpy.context.scene;rig=bpy.data.objects['ARM-MOVALYT-Athlete'];body=bpy.data.objects['GEO-MOVALYT-Body']
assert len([o for o in scene.objects if o.type=='ARMATURE'])==1
assert len(rig.data.bones)==65
assert body.find_armature()==rig and body.data.shape_keys is None
assert not any(n.type=='TEX_IMAGE' for m in bpy.data.materials if m.use_nodes for n in m.node_tree.nodes),'Image textures are not part of this character'
character=[o for o in scene.objects if o.name.startswith('GEO-MOVALYT-')]
assert len(character)==5,[o.name for o in character]
assert all(o.find_armature()==rig for o in character)
def fingerprint(mesh):
 d=hashlib.sha256()
 for v in mesh.vertices:d.update(struct.pack('<3f',*v.co))
 for p in mesh.polygons:d.update(struct.pack('<I',len(p.vertices))+struct.pack('<'+'I'*len(p.vertices),*p.vertices))
 return d.hexdigest()
def angle(a,b):return math.degrees(a.angle(b))
weights=[sum(g.weight for g in v.groups) for v in body.data.vertices]
assert min(weights)>.99 and max(weights)<1.01,(min(weights),max(weights))
lengths={b.name:b.length for b in rig.data.bones}
report={'blender':bpy.app.version_string,'source':str(BLEND.name),'armatures':1,'bones':65,'bodyMeshes':1,'characterMeshes':[o.name for o in character],'bodyVertices':len(body.data.vertices),'bodyFaces':len(body.data.polygons),'skinWeightRange':[min(weights),max(weights)],'imageTextureNodes':0,'poses':[],'approval':'Pending visual/rig approval; not a professional anatomy certification'}
for frame,kind in [(1,'standing'),(40,'l-sit-full')]:
 scene.frame_set(frame);bpy.context.view_layer.update()
 hashes={o.name:fingerprint(o.data) for o in character}
 assert hashes[body.name]==scene['MOVALYT-BodyHash']
 errors={name:abs((rig.pose.bones[name].tail-rig.pose.bones[name].head).length/value-1) for name,value in lengths.items()}
 assert max(errors.values())<.0002,max(errors.items(),key=lambda x:x[1])
 assert all(abs(s-1)<.0002 for p in rig.pose.bones for s in p.scale),'Limb scaling is not allowed'
 pose={'frame':frame,'name':kind,'restMeshHashes':hashes,'maxRelativeBoneLengthError':max(errors.values()),'rigTranslation':list(rig.location),'angles':{},'jointWorldCoordinates':{}}
 for suffix in ['l','r']:
  u=rig.pose.bones['upperarm_'+suffix];f=rig.pose.bones['lowerarm_'+suffix]
  t=rig.pose.bones['thigh_'+suffix];c=rig.pose.bones['calf_'+suffix]
  elbow=angle(u.head-u.tail,f.tail-f.head);knee=angle(t.head-t.tail,c.tail-c.head)
  torso=rig.pose.bones['spine_03'].head-rig.pose.bones['pelvis'].head
  hip=angle(torso,t.tail-t.head)
  pose['angles'][suffix]={'elbowDegrees':elbow,'kneeDegrees':knee,'hipToTorsoDegrees':hip,'thighInclinationDegrees':math.degrees(math.asin((t.tail-t.head).normalized().z))}
  assert elbow>179
  if kind=='l-sit-full':
   assert knee>179 and 80<hip<100 and abs(pose['angles'][suffix]['thighInclinationDegrees'])<.1
  for name in ['upperarm','lowerarm','hand','thigh','calf','foot']:
   pose['jointWorldCoordinates'][name+'_'+suffix]=list(rig.matrix_world@rig.pose.bones[name+'_'+suffix].head)
 evaluated=body.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=evaluated.to_mesh()
 minimum=min((evaluated.matrix_world@v.co).z for v in mesh.vertices)
 pose['lowestBodyPointMeters']=minimum
 assert minimum>-.002
 if kind=='l-sit-full':
  pose['handHandleSurfaceChecks']={}
  for suffix in ['l','r']:
   names=['hand_'+suffix]+[f'{finger}_{i:02d}_{suffix}' for finger in ['thumb','index','middle','ring','pinky'] for i in [1,2,3]]
   groups={body.vertex_groups[n].index for n in names}
   handindices=[v.index for v in body.data.vertices if any(g.group in groups and g.weight>.25 for g in v.groups)]
   handle=bpy.data.objects['GEO-Parallette-'+suffix+'-Handle'];cx,cy,cz=handle.location
   radii=[]
   for i in handindices:
    co=evaluated.matrix_world@mesh.vertices[i].co
    if abs(co.y-cy)<.21:radii.append(math.hypot(co.x-cx,co.z-cz))
   pose['handHandleSurfaceChecks'][suffix]={'handleRadiusMeters':.014,'minimumRadialSkinDistanceMeters':min(radii),'nearestSurfaceDifferenceMeters':min(abs(r-.014) for r in radii),'maximumPenetrationMeters':max(0,.014-min(radii)),'note':'Geometry proximity only; visual finger/contact approval remains required'}
  assert all(x['maximumPenetrationMeters']<.003 for x in pose['handHandleSurfaceChecks'].values()),pose['handHandleSurfaceChecks']
  pose['pelvisJointAboveGroundMeters']=(rig.matrix_world@rig.pose.bones['pelvis'].head).z
 evaluated.to_mesh_clear();report['poses'].append(pose)
assert report['poses'][0]['restMeshHashes']==report['poses'][1]['restMeshHashes'],'Every character mesh must be the same in both poses'
# Straight waist and leg hem loops, independent of the garment's posed shape.
shorts=bpy.data.objects['GEO-MOVALYT-Shorts'];uses={}
for p in shorts.data.polygons:
 for edge in p.edge_keys:uses[edge]=uses.get(edge,0)+1
for edge,count in uses.items():
 if count==1:
  for i in edge:assert min(abs(shorts.data.vertices[i].co.z-z) for z in [.765,1.015])<1e-5
portable=ROOT/'MOVALYT-Athlete-v001.glb'
if portable.exists():
 data=portable.read_bytes();magic,version,total=struct.unpack_from('<4sII',data);assert magic==b'glTF' and version==2 and total==len(data)
 size,kind=struct.unpack_from('<II',data,12);doc=json.loads(data[20:20+size])
 assert len(doc.get('skins',[]))==1 and len(doc['skins'][0]['joints'])==65
 assert len(doc.get('animations',[]))>=1 and not doc.get('images')
 report['portableExport']={'file':portable.name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'skins':1,'joints':65,'animations':len(doc['animations']),'images':0}
 # Re-import into a fresh scene to validate the delivered file rather than only the source.
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(portable))
 rigs=[o for o in bpy.context.scene.objects if o.type=='ARMATURE'];assert len(rigs)==1 and len(rigs[0].data.bones)==65
 assert len([o for o in bpy.context.scene.objects if o.type=='MESH'])>=5
 imported=rigs[0];assert imported.animation_data and imported.animation_data.action
 assert tuple(imported.animation_data.action.frame_range)==(1.0,40.0)
 errors=[]
 for pose in report['poses']:
  bpy.context.scene.frame_set(pose['frame']);bpy.context.view_layer.update()
  for name,expected in pose['jointWorldCoordinates'].items():
   actual=imported.matrix_world@imported.pose.bones[name].head
   errors.append((actual-Vector(expected)).length)
 assert max(errors)<.001,('Export changed pose joint positions',max(errors))
 report['portableExport']['reimportPassed']=True
 report['portableExport']['maximumReimportJointPositionErrorMeters']=max(errors)
else:report['portableExport']={'status':'not exported yet'}
report['artifactHashes']={p.relative_to(ROOT).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in [BLEND,ROOT/'renders/standing.png',ROOT/'renders/l-sit-full.png',ROOT/'renders/blender-ui-standing.png',ROOT/'renders/blender-ui-l-sit.png'] if p.exists()}
(ROOT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'validated':True,'bones':65,'poses':[{'name':p['name'],'angles':p['angles'],'contact':p.get('handHandleSurfaceChecks')} for p in report['poses']],'export':report['portableExport']}),flush=True)
