"""AETHER orbital station. Run in Blender 5.x through Blender MCP.
Authoring units: metres, Z up. glTF export converts to Y up.
Creates an isolated scene and preserves the user's original scene.
"""
import bpy, math, random, os, json
from mathutils import Vector, Matrix
from collections import defaultdict
random.seed(37)
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
scene = bpy.data.scenes.get('AETHER_Station') or bpy.data.scenes.new('AETHER_Station')
bpy.context.window.scene = scene
for ob in list(scene.objects):
    bpy.data.objects.remove(ob, do_unlink=True)
scene.unit_settings.system = 'METRIC'
materials = {}
def mat(name, color, metal=0, rough=.45, emission=0):
    m = bpy.data.materials.new('AETHER_'+name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None) or m.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
    p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=rough
    if emission:
        p.inputs['Emission Color'].default_value=(*color,1); p.inputs['Emission Strength'].default_value=emission
    materials[name]=m
mat('Hull',(.55,.60,.63),.65,.38)
mat('Ivory',(.77,.78,.72),.35,.43)
mat('Titanium',(.11,.16,.20),.85,.32)
mat('Recess',(.025,.038,.048),.6,.62)
mat('Solar',(.013,.038,.09),.78,.24)
mat('Gold',(.46,.29,.075),.85,.4)
mat('Window',(.13,.64,.78),.4,.22,2)
mat('Core',(.04,.58,.9),.3,.2,5)
mat('Warm',(.95,.51,.17),0,.5,2)
mat('Signal',(.95,.08,.03),0,.4,4)
# Material batches keep the finished model under 25 draw calls.
batch=defaultdict(lambda:[[],[]])
def poly(key,verts,faces):
    b=batch[key]; n=len(b[0]);b[0].extend(verts);b[1].extend([tuple(n+i for i in f) for f in faces])
def box(key, p, s, angle=0):
    x,y,z=p; a,b,c=[v/2 for v in s];ca,sa=math.cos(angle),math.sin(angle)
    vs=[(x+u*ca-v*sa,y+u*sa+v*ca,z+w) for u,v,w in [(-a,-b,-c),(a,-b,-c),(a,b,-c),(-a,b,-c),(-a,-b,c),(a,-b,c),(a,b,c),(-a,b,c)]]
    poly(key,vs,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
def cylinder(key,p,r,depth,n=24,r2=None):
    x,y,z=p;r2=r if r2 is None else r2
    vs=[(x+math.cos(i*math.tau/n)*rr,y+math.sin(i*math.tau/n)*rr,z+zz) for rr,zz in [(r,-depth/2),(r2,depth/2)] for i in range(n)]
    fs=[tuple(reversed(range(n))),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    poly(key,vs,fs)
def beam(key,a,b,r=.16,n=6):
    av,bv=Vector(a),Vector(b); d=bv-av; axis=d.normalized();v=axis.cross(Vector((0,0,1)))
    if v.length<.01:v=axis.cross(Vector((1,0,0)))
    v.normalize();w=axis.cross(v)
    vs=[tuple(p+r*(v*math.cos(i*math.tau/n)+w*math.sin(i*math.tau/n))) for p in [av,bv] for i in range(n)]
    poly(key,vs,[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)])
def radial(key,r,z,s,a):box(key,(r*math.cos(a),r*math.sin(a),z),s,a)
def ring(key,r,z,w,h,count=128):
    # Eight-sided chamfered pressure hull section; segmented skin avoids a toy torus.
    profile=[(-w/2,-h*.25),(-w*.35,-h/2),(w*.35,-h/2),(w/2,-h*.25),(w/2,h*.25),(w*.35,h/2),(-w*.35,h/2),(-w/2,h*.25)]
    vs=[((r+dr)*math.cos(i*math.tau/count),(r+dr)*math.sin(i*math.tau/count),z+dz) for i in range(count) for dr,dz in profile]
    fs=[(i*8+j,((i+1)%count)*8+j,((i+1)%count)*8+(j+1)%8,i*8+(j+1)%8) for i in range(count) for j in range(8)]
    poly(key,vs,fs)
for R,Z,N in [(43,0,112),(35,23,96)]:
    ring('Hull',R,Z,7,5,N)
    for dr in [-3.53,3.53]:
        ring('Titanium',R+dr,Z,.28,1.4,N)
        ring('Window',R+dr,Z+.35,.3,.16,N)
        ring('Titanium',R+dr,Z-1.15,.35,.25,N)
    ring('Ivory',R,Z+2.51,3.8,.17,N)
    for i in range(N):
        a=i*math.tau/N
        radial('Recess',R,Z+2.64,(5,.10,.055),a)
        radial('Hull',R+3.62,Z,(.2,.19,3.8),a)
        for off in [-1,1]:
            radial('Titanium',R+off*1.5,Z+2.67,(.7,1.35,.1),a)
            if i%2==0:radial('Gold',R+off*2.85,Z+1.65,(.25,.8,.2),a)
        if i%4==0:
            radial('Ivory',R,Z+3,(3,1.8,.65),a)
            radial('Recess',R,Z+3.35,(1.8,1.3,.06),a)
            radial('Warm',R+3.7,Z+1.5,(.16,.24,.16),a)
    for j in range(6):
        a=j*math.tau/6
        radial('Hull',(R+8)/2,Z,(R-8,3.4,3.2),a)
        radial('Ivory',(R+8)/2,Z+1.7,(R-8,2,.22),a)
        for side in [-1,1]:
            def point(r,zz):return (r*math.cos(a)-side*2*math.sin(a),r*math.sin(a)+side*2*math.cos(a),zz)
            beam('Titanium',point(8,Z-3),point(R-4,Z-3),.2)
            for t in range(6):
                ra=9+t*(R-13)/6;rb=ra+(R-13)/6
                beam('Titanium',point(ra,Z-3),point(rb,Z+1),.12)
                beam('Titanium',point(ra,Z+1),point(rb,Z-3),.12)
        for t in range(8):radial('Titanium',10+t*(R-14)/8,Z+1.88,(.13,3.6,.13),a)
        radial('Hull',R,Z,(9,6,6.4),a)
        radial('Titanium',R,Z+3.25,(7,4.4,.12),a)
        radial('Window',R+4.6,Z+.2,(.12,3.8,.65),a)
# Axial habitat modules, reactor, antenna crown.
for z,r,d in [(-15,5,12),(-7,9,5),(5,7,8),(15,5.5,10),(25,9,5),(32,5,9),(39,3.4,6),(46,1.7,8)]:
    cylinder('Hull',(0,0,z),r,d,48,r*.83)
    for h in [-d*.4,d*.4]:
        ring('Titanium',r,z+h,.45,.8,64)
        ring('Window',r+.08,z+h+.5,.15,.2,64)
    for j in range(12):radial('Titanium',r,z,(.38,.48,d*.65),j*math.tau/12)
cylinder('Core',(0,0,8),3.4,5,32,3.4)
for z in [4.5,8,11.5]: ring('Hull',4.6,z,.6,.5,64)
for j in range(8):
    a=j*math.tau/8;beam('Titanium',(5*math.cos(a),5*math.sin(a),3),(5*math.cos(a),5*math.sin(a),13),.28)
for j in range(5):
    a=j*math.tau/5;r=2.4
    cylinder('Titanium',(r*math.cos(a),r*math.sin(a),48+j%2*3),.17,13+j%2*4,8)
    cylinder('Signal',(r*math.cos(a),r*math.sin(a),54.7+j%2*5),.24,.3,8)
beam('Titanium',(0,0,-20),(0,0,-35),.18)
cylinder('Gold',(0,0,-23),1.5,5,24,.4)
# Four articulated solar arrays, frames, cell dividers and utility pods.
for j in range(4):
    a=math.pi/4+j*math.pi/2
    radial('Hull',54,-1,(24,3.5,3.3),a)
    radial('Titanium',56,1,(27,1,.5),a)
    radial('Gold',65,0,(2.5,4.5,4.5),a)
    for side in [-1,1]:
        for u in range(4):
            for v in range(3):
                rr=70+u*5;yy=side*(3.2+v*5)
                x=rr*math.cos(a)-yy*math.sin(a);y=rr*math.sin(a)+yy*math.cos(a)
                box('Ivory',(x,y,0),(4.9,4.9,.2),a)
                box('Solar',(x,y,.14),(4.6,4.6,.13),a)
                for line in [-1.5,-.75,0,.75,1.5]:
                    box('Titanium',(x-math.sin(a)*line,y+math.cos(a)*line,.22),(4.6,.035,.03),a)
        rr=77;yy=side*8
        beam('Titanium',(65*math.cos(a),65*math.sin(a),-2),(rr*math.cos(a)-yy*math.sin(a),rr*math.sin(a)+yy*math.cos(a),-.3),.22)
# Docked service craft with layered fuselage and engine nozzles.
for a,z,r in [(math.pi/2,-2,60),(-math.pi/2,23,48)]:
    radial('Titanium',r-5,z,(20,5,4),a)
    radial('Ivory',r,z+1,(15,6.5,3.2),a)
    radial('Hull',r+8,z+.8,(8,3.7,2.4),a)
    radial('Window',r+9,z+2.1,(3,3,.15),a)
    radial('Hull',r-5,z-.2,(7,17,.9),a)
    for s in [-1,1]:
        rr=r-10;yy=s*3
        x=rr*math.cos(a)-yy*math.sin(a);y=rr*math.sin(a)+yy*math.cos(a)
        box('Core',(x,y,z),(1.4,1.4,1.4),a)
for key,(vs,fs) in batch.items():
    mesh=bpy.data.meshes.new('AETHER_'+key);mesh.from_pydata(vs,[],fs);mesh.update()
    ob=bpy.data.objects.new('Station_'+key,mesh);scene.collection.objects.link(ob);ob.data.materials.append(materials[key])
    # World projected UVs keep texel density consistent across pressure modules.
    uv=mesh.uv_layers.new(name='UVMap')
    for face in mesh.polygons:
        axis=max(range(3),key=lambda i:abs(face.normal[i]));axes=[i for i in range(3) if i!=axis]
        for loop in face.loop_indices:
            co=mesh.vertices[mesh.loops[loop].vertex_index].co
            uv.data[loop].uv=(co[axes[0]]*.27,co[axes[1]]*.27)
    bevel=ob.modifiers.new('Manufactured edge bevels','BEVEL');bevel.width=.045;bevel.segments=2;bevel.limit_method='ANGLE'
    # Explicitly triangulate for predictable browser rendering.
    mod=ob.modifiers.new('Triangulate','TRIANGULATE')
# Embed the actual Poly Haven PBR image maps into the Blender materials and GLB.
for key in ['Hull','Ivory']:
    material=materials[key];nodes=material.node_tree.nodes;links=material.node_tree.links
    principled=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
    for channel,socket,color_space in [('diffuse','Base Color','sRGB'),('rough','Roughness','Non-Color')]:
        image=bpy.data.images.load(ROOT+'/public/assets/metal_plate_02_'+channel+'.jpg',check_existing=True);image.colorspace_settings.name=color_space;image.pack()
        tex=nodes.new('ShaderNodeTexImage');tex.image=image;links.new(tex.outputs['Color'],principled.inputs[socket])
    image=bpy.data.images.load(ROOT+'/public/assets/metal_plate_02_nor_gl.jpg',check_existing=True);image.colorspace_settings.name='Non-Color';image.pack()
    tex=nodes.new('ShaderNodeTexImage');tex.image=image;normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.16
    links.new(tex.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],principled.inputs['Normal'])
world=bpy.data.worlds.new('Aether_Space');world.use_nodes=True;next(n for n in world.node_tree.nodes if n.type=='BACKGROUND').inputs[0].default_value=(.08,.12,.2,1);next(n for n in world.node_tree.nodes if n.type=='BACKGROUND').inputs[1].default_value=.35;scene.world=world
data=bpy.data.lights.new('Sun','SUN');data.energy=3;ob=bpy.data.objects.new('Aether_Sun',data);scene.collection.objects.link(ob);ob.rotation_euler=(.5,-.4,-.4)
camdata=bpy.data.cameras.new('Aether_Camera');cam=bpy.data.objects.new('Aether_Camera',camdata);scene.collection.objects.link(cam);cam.location=(140,-180,125);cam.rotation_euler=(Vector((0,0,7))-cam.location).to_track_quat('-Z','Y').to_euler();camdata.lens=48;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=1400;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
for ob in scene.objects: ob.select_set(ob.type=='MESH')
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/blender/aether-station.blend')
bpy.ops.export_scene.gltf(filepath=ROOT+'/blender/station.raw.glb',export_format='GLB',use_selection=True,use_active_scene=True,export_apply=True,export_yup=True)
print(json.dumps({'objects':len(batch),'vertices':sum(len(v[0]) for v in batch.values()),'glb':os.path.getsize(ROOT+'/blender/station.raw.glb')}))
