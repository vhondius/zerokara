"""Generates the --paper-texture washi tiles in src/styles.css.

Usage: python3 scripts/gen-washi-texture.py [strength=1]
Paste the printed light/dark values into :root and .dark.
"""
import random, urllib.parse, sys
S=320
def tile(fiber_rgb, grain_matrix, fiber_alpha, mottle_matrix, seed=7):
    rnd=random.Random(seed); paths=[]
    for _ in range(70):
        x,y=rnd.uniform(0,S),rnd.uniform(0,S)
        L=rnd.uniform(12,70); import math
        a=rnd.uniform(0,math.pi)
        x2,y2=x+L*math.cos(a), y+L*math.sin(a)
        cx,cy=(x+x2)/2+rnd.uniform(-12,12),(y+y2)/2+rnd.uniform(-12,12)
        w=rnd.uniform(.3,.8); o=fiber_alpha*rnd.uniform(.4,1)
        d=f"M{x:.1f} {y:.1f}Q{cx:.1f} {cy:.1f} {x2:.1f} {y2:.1f}"
        xs=[x,x2,cx]; ys=[y,y2,cy]
        for dx in (-S,0,S):
            for dy in (-S,0,S):
                if not (min(xs)+dx<S and max(xs)+dx>0 and min(ys)+dy<S and max(ys)+dy>0): continue
                paths.append(f"<path transform='translate({dx} {dy})' d='{d}' stroke-width='{w:.2f}' stroke-opacity='{o:.3f}'/>")
    svg=(f"<svg xmlns='http://www.w3.org/2000/svg' width='{S}' height='{S}'>"
         f"<filter id='g' x='0' y='0' width='1' height='1'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/>"
         f"<feColorMatrix values='{grain_matrix}'/></filter>"
         f"<filter id='m' x='0' y='0' width='1' height='1'><feTurbulence type='fractalNoise' baseFrequency='.012' numOctaves='2' stitchTiles='stitch'/>"
         f"<feColorMatrix values='{mottle_matrix}'/></filter>"
         f"<rect width='100%' height='100%' filter='url(#m)'/>"
         f"<rect width='100%' height='100%' filter='url(#g)'/>"
         f"<g fill='none' stroke='rgb({fiber_rgb})' stroke-linecap='round'>{''.join(paths)}</g></svg>")
    return "url(\"data:image/svg+xml,"+urllib.parse.quote(svg,safe="/:=' ,.()-")+"\")"
k=float(sys.argv[1]) if len(sys.argv)>1 else 1
# grain alpha from red noise channel: alpha = 1.6*R - 0.72, scaled by k
light=tile("120,92,60", f"0 0 0 0 .36  0 0 0 0 .27  0 0 0 0 .18  {1.6*k*0.13:.3f} 0 0 0 {-0.72*k*0.13:.3f}", .2*k, f"0 0 0 0 .45  0 0 0 0 .35  0 0 0 0 .22  {k*0.16:.3f} 0 0 0 {-k*0.06:.3f}")
dark =tile("232,220,200", f"0 0 0 0 .92  0 0 0 0 .87  0 0 0 0 .78  {1.6*k*0.1:.3f} 0 0 0 {-0.72*k*0.1:.3f}", .13*k, f"0 0 0 0 .92  0 0 0 0 .87  0 0 0 0 .78  {k*0.08:.3f} 0 0 0 {-k*0.03:.3f}")
print('light:', light)
print('dark:', dark)
