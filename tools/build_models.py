"""Build every 3D model for 最後一槌：換班 and export dist/models.glb.

Run with Blender's Python module (pip install bpy) or inside Blender:
    python3 tools/build_models.py dist/models.glb
    blender -b -P tools/build_models.py -- dist/models.glb

Everything is authored in three.js coordinates (Y up, +Z toward the camera)
so the numbers match game.js, then rotated to Blender's Z-up before export.
Colours are written as sRGB hex values straight into the base colour, because
the game renders without colour management.
"""
import math, random, sys
import bpy, bmesh, addon_utils
from mathutils import Vector as V, Matrix

random.seed(7)
OUT = sys.argv[-1] if sys.argv[-1].endswith(".glb") else "models.glb"
bpy.ops.wm.read_factory_settings(use_empty=True)
addon_utils.enable("io_scene_gltf2", default_set=True)
RX = Matrix.Rotation(math.radians(90), 4, "X")  # three (x,y,z) -> blender (x,-z,y)
I4 = Matrix.Identity(4)

MATS = {}
def mat(name, hexc, alpha=1.0):
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = tuple(int(hexc[i:i+2], 16) / 255 for i in (1, 3, 5)) + (1.0,)
    b.inputs["Roughness"].default_value = 0.8
    if alpha < 1:
        b.inputs["Alpha"].default_value = alpha
        m.surface_render_method = "BLENDED"
    MATS[name] = m

for n, c in dict(Outline="#15121a", Steel="#b7bfc9", SteelDark="#5d656e", SteelFace="#d2d8df", Wood="#c8874a", WoodDark="#7a4a2a",
                 Grip="#f3b54f", GripDark="#b97a2a", Skin="#efbf95", SkinApp="#f2c4a0", SkinIndex="#f2c4a0", SkinThumb="#f2c4a0",
                 Fingernail="#f7dcd0", Indigo="#2d4766", IndigoDark="#1d2f45", White="#f6f1e7", Apron="#c9a46e", ApronDark="#9c7a4b",
                 Hair="#dcd6cc", Dark="#24170f", Glass="#3a2618", Nose="#e39a7a", Blush="#f19a8a", Sweat="#8fd0ff",
                 Red="#de5147", RedDark="#992f3b", RedLight="#f17b5d", Tip="#d3d8c8", TipDark="#8f9e9a", Visor="#14181f",
                 Bracket="#47404b", Hazard="#e9ac49", Chain="#718090", Eye="#62efe5", Bark="#854a35", StumpTop="#ffffff",
                 StumpBottom="#3e2420", Root="#6b3a2c", Sleeve="#d99c2e", SleeveDark="#a8701a", Pencil="#e0b040").items():
    mat(n, c)
mat("Lens", "#dff3ff", 0.3)


class Part:
    """A bmesh being built in three.js space, finished into one object."""
    def __init__(self, name, smooth=False):
        self.bm, self.name, self.mats, self.smooth = bmesh.new(), name, [], smooth
    def mi(self, m):
        if m not in self.mats: self.mats.append(m)
        return self.mats.index(m)
    def tag(self, verts, m, smooth=None):
        idx, faces = self.mi(m), set()
        for v in verts: faces.update(v.link_faces)
        for f in faces:
            f.material_index = idx
            f.smooth = self.smooth if smooth is None else smooth
        return verts
    def box(self, c, size, m, bevel=0.0, rot=I4, smooth=False):
        vs = bmesh.ops.create_cube(self.bm, size=1.0, matrix=Matrix.Translation(V(c)) @ rot @ Matrix.Diagonal(V(size).to_4d()))["verts"]
        self.tag(vs, m, smooth)
        if bevel > 0:
            es = list({e for v in vs for e in v.link_edges})
            bmesh.ops.bevel(self.bm, geom=es, offset=bevel, segments=2, affect="EDGES", profile=0.5)
        return vs
    def tube(self, a, b, r1, r2, m, seg=10, smooth=None, scale=None):
        a, b = V(a), V(b); d = b - a
        rot = V((0, 0, 1)).rotation_difference(d).to_matrix().to_4x4()
        vs = bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r1, radius2=r2,
                                   depth=d.length, matrix=Matrix.Translation((a + b) / 2) @ rot)["verts"]
        if scale: bmesh.ops.scale(self.bm, vec=V(scale), space=Matrix.Translation(-(a + b) / 2), verts=vs)
        return self.tag(vs, m, smooth)
    def ell(self, c, sc, m, u=12, v=8, rot=I4, smooth=True):
        vs = bmesh.ops.create_uvsphere(self.bm, u_segments=u, v_segments=v, radius=1.0,
                                       matrix=Matrix.Translation(V(c)) @ rot @ Matrix.Diagonal(V(sc).to_4d()))["verts"]
        return self.tag(vs, m, smooth)
    def torus(self, c, R, r, m, seg=16, tseg=6, arc=2 * math.pi, rot=I4, smooth=None):
        c, full = V(c), abs(arc - 2 * math.pi) < 1e-6
        n = seg if full else seg + 1
        rings = []
        for i in range(n):
            a = arc * i / seg
            ring = []
            for j in range(tseg):
                t = 2 * math.pi * j / tseg + math.pi / tseg
                p = V(((R + r * math.cos(t)) * math.cos(a), (R + r * math.cos(t)) * math.sin(a), r * math.sin(t)))
                ring.append(self.bm.verts.new(c + (rot @ p)))
            rings.append(ring)
        for i in range(seg):
            A, B = rings[i], rings[(i + 1) % n]
            for j in range(tseg):
                self.bm.faces.new((A[j], A[(j + 1) % tseg], B[(j + 1) % tseg], B[j]))
        if not full:
            self.bm.faces.new(rings[0][::-1]); self.bm.faces.new(rings[-1])
        return self.tag([v for r_ in rings for v in r_], m, smooth)
    def finish(self, loc=(0, 0, 0), parent=None, outline=0.0, shape=None):
        bm = self.bm
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        if outline > 0:  # inverted hull: a slightly bigger shell, faces flipped, dark material
            dup = bmesh.ops.duplicate(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:])["geom"]
            nv = [g for g in dup if isinstance(g, bmesh.types.BMVert)]
            nf = [g for g in dup if isinstance(g, bmesh.types.BMFace)]
            bm.normal_update()
            for v in nv: v.co += v.normal * outline
            bmesh.ops.reverse_faces(bm, faces=nf)
            oi = self.mi("Outline")
            for f in nf: f.material_index = oi; f.smooth = True
        me = bpy.data.meshes.new(self.name); bm.to_mesh(me); bm.free()
        for m in self.mats: me.materials.append(MATS[m])
        ob = bpy.data.objects.new(self.name, me)
        bpy.context.scene.collection.objects.link(ob)
        if shape: shape(ob)
        me.transform(RX, shape_keys=True)
        ob.location = RX @ V(loc)
        if parent: ob.parent = parent
        return ob


def swell_key(points, k):
    pts = [V(p) for p in points]
    def apply(ob):
        ob.shape_key_add(name="Basis")
        sk = ob.shape_key_add(name="Swell", from_mix=False)
        for i, v in enumerate(ob.data.vertices):
            best = None
            for a, b in zip(pts, pts[1:]):
                ab = b - a; t = max(0.0, min(1.0, (v.co - a).dot(ab) / ab.length_squared)); q = a + ab * t
                d = (v.co - q).length
                if best is None or d < best[0]: best = (d, q)
            sk.data[i].co = best[1] + (v.co - best[1]) * k
    return apply

RY = lambda a: Matrix.Rotation(a, 4, "Y")
RZ = lambda a: Matrix.Rotation(a, 4, "Z")
RXm = lambda a: Matrix.Rotation(a, 4, "X")
NL, L = 0.9, 2.0

# ---------------- nail ----------------
p = Part("Nail")
p.tube((0, -0.13, 0), (0, 0, 0), 0.004, 0.036, "Steel", 8)
p.tube((0, 0, 0), (0, NL, 0), 0.036, 0.036, "Steel", 8)
p.tube((0, NL, 0), (0, NL + 0.035, 0), 0.12, 0.13, "Steel", 14)
p.ell((0, NL + 0.035, 0), (0.13, 0.02, 0.13), "Steel", 14, 6)
p.finish(outline=0.012)

# ---------------- hammers (origin = fist, handle along +z, face centre at (0,-0.31,L)) ----------------
def hammer(name, handle, wrap):
    p = Part(name)
    p.tube((0, 0, -0.27), (0, 0, L - 0.12), 0.07, 0.058, handle, 10, smooth=True)
    p.ell((0, 0, -0.27), (0.075, 0.075, 0.045), handle, 10, 6)
    if wrap == "rings":
        for z in (-0.2, -0.08, 0.04, 0.16, 0.28, 0.4):
            p.torus((0, 0, z), 0.07, 0.02, "GripDark", 12, 5)
    else:
        p.tube((0, 0, -0.24), (0, 0, 0.36), 0.078, 0.078, "WoodDark", 10, smooth=True)
    hz = (0, 0, L)
    p.tube((0, -0.31, L), (0, -0.19, L), 0.215, 0.2, "SteelFace", 12)
    p.torus((0, -0.19, L), 0.195, 0.028, "Steel", 12, 5)
    p.tube((0, -0.19, L), (0, 0.18, L), 0.19, 0.17, "SteelDark", 12)
    p.box(hz, (0.3, 0.24, 0.32), "SteelDark", 0.035)
    p.tube((0, 0.18, L), (0, 0.29, L), 0.15, 0.12, "SteelDark", 10)
    p.box((0, 0.13, L), (0.07, 0.07, 0.34), "Steel", 0.015)  # wedge
    for x in (0.065, -0.065):
        pts = [(x, 0.27, L), (x, 0.4, L - 0.04), (x, 0.47, L - 0.16), (x, 0.47, L - 0.3)]
        for (a, b), r in zip(zip(pts, pts[1:]), (0.055, 0.045, 0.035)):
            p.tube(a, b, r, r * 0.8, "SteelDark", 6)
        p.ell(pts[-1], (0.03, 0.03, 0.04), "Steel", 6, 4)
    p.finish(outline=0.02)
hammer("HammerM", "Wood", "leather")
hammer("HammerP", "Grip", "rings")

p = Part("Fist", smooth=True)
p.ell((0, 0.02, 0), (0.23, 0.2, 0.25), "Skin", 14, 10)
for z in (-0.12, -0.04, 0.04, 0.12):
    p.ell((0.1, 0.15, z), (0.075, 0.07, 0.06), "Skin", 8, 6)
p.ell((-0.17, 0.09, 0.08), (0.08, 0.07, 0.13), "Skin", 8, 6)
p.finish(outline=0.018)

# ---------------- stump ----------------
p = Part("Stump")
bm = p.bm; uv = bm.loops.layers.uv.new("UVMap")
SEG, RT = 48, 2.36
ridge = [random.uniform(-0.05, 0.05) for _ in range(SEG)]
centre = bm.verts.new((0, 0.0, 0))
rim0 = [bm.verts.new((RT * math.cos(2 * math.pi * i / SEG), 0, RT * math.sin(2 * math.pi * i / SEG))) for i in range(SEG)]
top_faces = []
for i in range(SEG):
    f = bm.faces.new((centre, rim0[(i + 1) % SEG], rim0[i])); f.material_index = p.mi("StumpTop"); top_faces.append(f)
for f in top_faces:
    for l in f.loops: l[uv].uv = ((l.vert.co.x / RT + 1) / 2, (l.vert.co.z / RT + 1) / 2)
rings_y = [(0.03, 2.47, 0.0), (0.0, 2.5, 0.3), (-0.35, 2.52, 1.0), (-0.72, 2.6, 1.0), (-0.9, 2.66, 0.6)]
cols = []
for i in range(SEG + 1):
    a = 2 * math.pi * i / SEG; rr = ridge[i % SEG]
    cols.append([bm.verts.new(((r + rr * w) * math.cos(a), y, (r + rr * w) * math.sin(a))) for y, r, w in rings_y])
bark = p.mi("Bark")
for i in range(SEG):
    a_, b_ = cols[i], cols[i + 1]
    f = bm.faces.new((rim0[i], rim0[(i + 1) % SEG], b_[0], a_[0])); f.material_index = bark
    for l in f.loops: l[uv].uv = (0.5, 0.95)
    for j in range(len(rings_y) - 1):
        f = bm.faces.new((a_[j], b_[j], b_[j + 1], a_[j + 1])); f.material_index = bark
        for l, (ii, jj) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))):
            l[uv].uv = (ii / SEG, 1 - (jj / (len(rings_y) - 1)))
bot = bm.verts.new((0, -0.9, 0))
for i in range(SEG):
    f = bm.faces.new((bot, cols[i][-1], cols[i + 1][-1])); f.material_index = p.mi("StumpBottom")
for k in range(6):
    a = 2 * math.pi * (k + random.random() * 0.5) / 6
    p.ell((2.58 * math.cos(a), -0.84, 2.58 * math.sin(a)), (0.5, 0.14, 0.3), "Root", 8, 6, rot=RY(-a), smooth=False)
bmesh.ops.remove_doubles(bm, verts=[v for c in cols for v in (c[0], c[-1])] , dist=1e-5)
p.finish(outline=0.03)

# ---------------- electromagnet monster ----------------
p = Part("Magnet")
p.torus((0, 0.1, 0), 0.42, 0.18, "Red", 14, 8, arc=math.pi)
p.torus((0, 0.1, 0.13), 0.44, 0.045, "RedLight", 8, 5, arc=math.pi * 0.42, rot=RZ(math.pi * 0.52))
for s in (1, -1):
    x = 0.42 * s
    p.box((x, -0.06, 0), (0.36, 0.32, 0.36), "Red", 0.04)
    p.box((x, -0.22, 0), (0.38, 0.05, 0.38), "RedDark", 0.01)
    p.box((x, -0.31, 0), (0.39, 0.15, 0.39), "Tip", 0.03)
    p.box((x, -0.385, 0), (0.33, 0.03, 0.33), "TipDark", 0.01)
    p.tube((x, -0.05, 0.17), (x, -0.05, 0.2), 0.04, 0.04, "RedDark", 8)
p.tube((-0.6, 0.0, 0), (-0.67, 0.0, 0), 0.1, 0.1, "TipDark", 10)
p.tube((-0.66, 0.0, 0), (-0.7, 0.0, 0), 0.05, 0.05, "Bracket", 8)
p.box((0, 0.43, 0.18), (0.5, 0.27, 0.1), "Visor", 0.045)
p.box((0, 0.3, 0.215), (0.2, 0.04, 0.03), "Bracket", 0.01)  # mouth grille
p.box((0, 0.64, 0), (0.36, 0.14, 0.28), "Bracket", 0.03)
for i, x in enumerate((-0.12, -0.04, 0.04, 0.12)):
    p.box((x, 0.64, 0.145), (0.06, 0.11, 0.02), "Hazard" if i % 2 == 0 else "Dark", 0.0, rot=RZ(-0.5))
p.torus((0, 0.77, 0), 0.075, 0.026, "Chain", 12, 5, rot=RY(math.pi / 2))
mag = p.finish(outline=0.025)
for name, x in (("MagEyeA", 0.1), ("MagEyeB", -0.1)):
    q = Part(name); q.box((0, 0, 0), (0.065, 0.12, 0.03), "Eye", 0.008); q.finish((x, 0.43, 0.235), mag)

p = Part("ChainLink")
p.torus((0, 0, 0), 0.075, 0.024, "Chain", 12, 5)
for v in p.bm.verts: v.co.y *= 1.5
p.finish(outline=0.012)

# ---------------- arm segments (unit length along Y, radius 1) ----------------
for name, m in (("SegSleeve", "Indigo"), ("SegSkin", "Skin")):
    p = Part(name, smooth=True); p.tube((0, -0.5, 0), (0, 0.5, 0), 1.0, 1.0, m, 12)
    if m == "Indigo": p.torus((0, -0.42, 0), 1.0, 0.16, "IndigoDark", 12, 5, rot=RXm(math.pi / 2))
    p.finish(outline=0.1)

# ---------------- the old master ----------------
p = Part("MasterBody", smooth=True)
p.tube((0, -0.75, 0), (0, 0.85, 0), 1.05, 0.86, "Indigo", 18, scale=(1, 1, 0.8))
for s in (1, -1): p.ell((0.78 * s, 0.8, 0), (0.33, 0.3, 0.33), "Indigo", 10, 8)
p.ell((0, 0.92, 0.0), (0.62, 0.16, 0.48), "Indigo", 14, 6)
for s in (1, -1): p.tube((0.34 * s, 0.98, 0.48), (0.02 * s, 0.25, 0.72), 0.075, 0.075, "IndigoDark", 8)
p.ell((0, 0.8, 0.56), (0.3, 0.2, 0.08), "White", 10, 6)
p.box((0, -0.22, 0.72), (1.1, 1.05, 0.06), "Apron", 0.025, rot=RXm(-0.12))
p.box((0, -0.36, 0.77), (0.52, 0.3, 0.04), "ApronDark", 0.015, rot=RXm(-0.12))
p.tube((0.13, -0.28, 0.79), (0.17, 0.08, 0.76), 0.03, 0.03, "Pencil", 6)
p.tube((0.17, 0.08, 0.76), (0.18, 0.16, 0.755), 0.03, 0.002, "Wood", 6)
for s in (1, -1): p.tube((0.5 * s, 0.32, 0.7), (0.3 * s, 0.98, 0.38), 0.04, 0.04, "Apron", 6)
p.tube((0.95, 1.0, 0.15), (1.32, 0.3, 0.8), 0.22, 0.19, "Indigo", 12)
p.tube((1.3, 0.34, 0.76), (1.36, 0.24, 0.86), 0.2, 0.2, "IndigoDark", 12)
p.tube((1.33, 0.3, 0.82), (1.42, 0.1, 1.05), 0.13, 0.12, "Skin", 10)
p.ell((1.45, 0.04, 1.12), (0.22, 0.18, 0.24), "Skin", 12, 8)
p.finish(outline=0.03)

head = Part("MasterHead", smooth=True)
head.ell((0, 0, 0), (0.74, 0.78, 0.72), "Skin", 18, 12)
for s in (1, -1):
    head.ell((0.73 * s, -0.04, 0.02), (0.11, 0.18, 0.12), "Skin", 10, 8)
    head.ell((0.6 * s, -0.1, -0.16), (0.22, 0.33, 0.36), "Hair", 10, 8)
    head.torus((0.24 * s, 0.02, 0.69), 0.17, 0.028, "Glass", 16, 5)
    head.ell((0.24 * s, 0.02, 0.695), (0.155, 0.155, 0.01), "Lens", 12, 4)
    head.tube((0.41 * s, 0.04, 0.62), (0.71 * s, 0.06, 0.08), 0.018, 0.018, "Glass", 5)
    head.ell((0.42 * s, -0.2, 0.58), (0.12, 0.06, 0.03), "Blush", 8, 4)
    head.ell((0.17 * s, -0.3, 0.67), (0.22, 0.09, 0.1), "Hair", 10, 6, rot=RZ(-0.3 * s))
    head.ell((0.37 * s, -0.37, 0.6), (0.08, 0.06, 0.06), "Hair", 8, 6)
    head.box((0.16 * s, 0.4, 0.78), (0.2, 0.07, 0.04), "White", 0.012, rot=RZ(0.55 * s))
head.ell((0, -0.15, -0.55), (0.55, 0.3, 0.25), "Hair", 12, 8)
head.torus((0, 0.28, 0), 0.74, 0.1, "White", 28, 6, rot=RXm(math.pi / 2))
head.ell((0, 0.31, 0.77), (0.15, 0.12, 0.1), "White", 10, 6)
head.box((0, 0.05, 0.71), (0.14, 0.03, 0.03), "Glass", 0.0)
head.ell((0, -0.14, 0.73), (0.13, 0.12, 0.12), "Nose", 10, 8)
H = head.finish((0, 1.65, 0.05), outline=0.025)
for name, x in (("EyeA", 0.24), ("EyeB", -0.24)):
    q = Part(name, smooth=True); q.ell((0, 0, 0), (0.055, 0.07, 0.04), "Dark", 10, 8)
    q.ell((0.018, 0.025, 0.03), (0.016, 0.016, 0.012), "White", 6, 4); q.finish((x, 0.02, 0.64), H)
for name, x in (("BrowA", 0.25), ("BrowB", -0.25)):
    q = Part(name); q.box((0, 0, 0), (0.28, 0.075, 0.075), "Hair", 0.025); q.finish((x, 0.24, 0.68), H, outline=0.012)
q = Part("Mouth", smooth=True); q.ell((0, 0, 0), (0.09, 0.02, 0.04), "Dark", 10, 6); q.finish((0, -0.44, 0.62), H)
q = Part("Sweat", smooth=True); q.ell((0, 0, 0), (0.07, 0.08, 0.07), "Sweat", 8, 6); q.tube((0, 0.05, 0), (0, 0.15, 0), 0.06, 0.004, "Sweat", 8)
q.finish((0.64, 0.32, 0.42), H)

# ---------------- the apprentice's hand ----------------
IDX = [(-0.56, 0.07, -0.2), (-0.31, 0.05, -0.21), (-0.07, 0.01, -0.085)]
THB = [(-0.62, -0.01, 0.24), (-0.33, 0, 0.21), (-0.07, 0, 0.085)]
p = Part("Hand", smooth=True)
p.ell((-0.86, 0.05, 0.02), (0.36, 0.17, 0.32), "SkinApp", 14, 10)
for b in ((-0.62, 0.0, -0.3), (-0.77, -0.02, -0.36), (-0.92, -0.02, -0.33)):
    e = (b[0] + 0.08, b[1] - 0.1, b[2] - 0.12)
    p.tube(b, e, 0.085, 0.08, "SkinApp", 8); p.ell(b, (0.085,) * 3, "SkinApp", 8, 6); p.ell(e, (0.08,) * 3, "SkinApp", 8, 6)
p.tube((-1.0, 0.06, 0.12), (-2.3, 0.45, 1.5), 0.15, 0.19, "SkinApp", 12)
d = (V((-3.8, 1.0, 3.0)) - V((-1.95, 0.36, 1.15))).normalized()
rot = V((0, 0, 1)).rotation_difference(d).to_matrix().to_4x4()
p.tube((-1.95, 0.36, 1.15), (-3.8, 1.0, 3.0), 0.28, 0.34, "Sleeve", 14)
for k, (R_, r_) in enumerate(((0.29, 0.075), (0.31, 0.05), (0.32, 0.05))):
    p.torus(V((-1.95, 0.36, 1.15)) + d * (0.02 + k * 0.22), R_, r_, "SleeveDark" if k == 0 else "Sleeve", 16, 5, rot=rot)
hand = p.finish(outline=0.022)
def finger(name, pts, r, m):
    q = Part(name, smooth=True)
    for a, b in zip(pts, pts[1:]): q.tube(a, b, r, r, m, 10)
    for c in pts: q.ell(c, (r,) * 3, m, 10, 8)
    tip, prev = V(pts[-1]), V(pts[-2]); dd = (tip - prev).normalized()
    q.ell(tip - dd * r * 0.3 + V((0, r * 0.72, 0)), (r * 0.62, r * 0.28, r * 0.62), "Fingernail", 8, 4)
    q.finish(parent=hand, shape=swell_key(pts, 1.85))
finger("Index", IDX, 0.07, "SkinIndex")
finger("Thumb", THB, 0.078, "SkinThumb")

bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_yup=True, export_apply=False, export_morph=True,
                          export_morph_normal=True, export_materials="EXPORT", use_selection=False, export_animations=False)
print("exported", OUT)
