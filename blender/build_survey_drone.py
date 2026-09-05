"""Original AETHER survey drone. Run from Blender; exports only its isolated scene."""
import bpy, math, os
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
previous=bpy.context.window.scene
scene=bpy.data.scenes.new('AETHER_SurveyDrone')
bpy.context.window.scene=scene
scene.unit_settings.system='METRIC'
def material(name,color,metal=0,rough=.4,emission=0):
    m=bpy.data.materials.new('SURVEY_'+name);m.use_nodes=True
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    p.inputs['Coat Weight'].default_value=.25 if name=='Ceramic' else 0
    if emission:
        p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emission
    return m
ivory=material('Ceramic',(.76,.8,.76),.22,.27)
dark=material('Graphite',(.018,.035,.048),.65,.34)
alloy=material('Titanium',(.31,.39,.43),.9,.24)
bronze=material('AnodizedCopper',(.53,.28,.09),.75,.3)
cyan=material('Optics',(.08,.7,.82),.2,.19,3)
black=material('Lens',(.002,.01,.018),.55,.085)
def finish(o,name,mat):
    o.name=name;o.data.materials.append(mat)
    for p in o.data.polygons:p.use_smooth=True
    return o
def box(name,p,s,mat,bevel=.015):
    bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.scale=s
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Machined edge','BEVEL');mod.width=bevel;mod.segments=3
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(o,name,mat)
def sphere(name,p,s,mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=20,location=p)
    o=bpy.context.object;o.scale=s;return finish(o,name,mat)
def cylinder(name,p,r,d,mat,rotation=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=r,depth=d,location=p,rotation=rotation)
    return finish(bpy.context.object,name,mat)
# The forward face points toward Blender -Y, which becomes glTF +Z.
sphere('Pressure body',(0,0,0),(.31,.23,.24),ivory)
sphere('Recessed visor',(0,-.184,.018),(.264,.082,.15),dark)
for x in [-.105,.105]:
    cylinder('Optical bezel',(x,-.246,.04),.071,.034,alloy,(math.pi/2,0,0))
    cylinder('Obsidian lens',(x,-.268,.04),.057,.016,black,(math.pi/2,0,0))
    cylinder('Sensor pupil',(x,-.28,.04),.024,.009,cyan,(math.pi/2,0,0))
box('Status smile',(0,-.262,-.064),(.108,.011,.009),cyan,.004)
box('Upper instrumentation cap',(0,.015,.237),(.19,.15,.04),dark,.016)
for x in [-.105,0,.105]:box('Back cooling slit',(x,.219,.025),(.032,.016,.165),dark,.009)
for side in [-1,1]:
    x=side*.303
    cylinder('Thruster nacelle',(x,0,.015),.112,.084,alloy,(0,math.pi/2,0))
    cylinder('Thruster shroud',(x+side*.047,0,.015),.091,.012,dark,(0,math.pi/2,0))
    cylinder('Maneuvering emitter',(x+side*.056,0,.015),.066,.006,cyan,(0,math.pi/2,0))
    for k in range(12):
        a=k*math.tau/12
        sphere('Nacelle fastener',(x+side*.056,math.sin(a)*.097,.015+math.cos(a)*.097),(.007,.007,.007),bronze)
    box('Landing strut',(side*.17,.025,-.24),(.038,.034,.12),alloy,.006)
    box('Magnetic foot',(side*.17,.015,-.305),(.08,.13,.024),dark,.01)
    for y in [-.09,.09]:sphere('Hull quarter turn fastener',(side*.25,y,.148),(.009,.009,.009),alloy)
cylinder('Telemetry mast',(.13,.07,.325),.009,.16,alloy)
sphere('Navigation diode',(.13,.07,.41),(.018,.018,.022),cyan)
box('Service identifier',(0,.18,.152),(.135,.045,.025),bronze,.005)
# Join by material for inexpensive rendering, preserving original smooth normals.
for mat in [ivory,dark,alloy,bronze,cyan,black]:
    bpy.ops.object.select_all(action='DESELECT')
    items=[o for o in scene.objects if o.type=='MESH' and mat.name in o.data.materials]
    if not items:continue
    for o in items:o.select_set(True)
    bpy.context.view_layer.objects.active=items[0]
    bpy.ops.object.join();items[0].name='SURVEY_'+mat.name
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'public/assets/survey-drone.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False)
# Save a new source file without replacing the station master.
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'blender/survey-drone.blend'),copy=True)
bpy.context.window.scene=previous
print('SURVEY_DRONE_READY',os.path.getsize(os.path.join(ROOT,'public/assets/survey-drone.glb')))
