"""Generate Rewired app icons (client + console). Run: python3 tools/make_icons.py"""
from PIL import Image, ImageDraw
import math, os
OUT=os.path.join(os.path.dirname(__file__),'..','app','icons')
INK=(23,34,45); TEAL=(14,94,102); AMBER=(232,163,61); PAPER=(238,243,241)
def trace(d, s, color, w):
    pts=[]
    for i in range(0,101):
        x=s*0.16+i*(s*0.68/100); t=i/100
        y=s*0.56 + math.sin(t*math.pi*7)*s*0.035
        spike=math.exp(-((t-0.52)**2)/(2*0.035**2)); y-= spike*s*0.30
        dip=math.exp(-((t-0.40)**2)/(2*0.02**2)); y+= dip*s*0.06
        pts.append((x,y))
    d.line(pts, fill=color, width=w, joint='curve')
    return pts
def icon(size, bg, line, dot, path, maskable=False, radius=0.22):
    im=Image.new('RGBA',(size,size),(0,0,0,0)); d=ImageDraw.Draw(im)
    if maskable: d.rectangle([0,0,size,size],fill=bg)
    else: d.rounded_rectangle([0,0,size-1,size-1],radius=int(size*radius),fill=bg)
    g=max(1,size//170)
    for k in range(1,8):   # chart-paper grid
        p=int(size*k/8); d.line([(p,0),(p,size)],fill=tuple(min(255,c+14) for c in bg),width=g); d.line([(0,p),(size,p)],fill=tuple(min(255,c+14) for c in bg),width=g)
    sc=0.8 if maskable else 1.0; s=int(size*sc); off=(size-s)//2
    layer=Image.new('RGBA',(s,s),(0,0,0,0)); ld=ImageDraw.Draw(layer)
    pts=trace(ld,s,line,max(2,s//22))
    px,py=pts[52]; r=s*0.055; ld.ellipse([px-r,py-r-s*0.02,px+r,py+r-s*0.02],fill=dot)
    im.alpha_composite(layer,(off,off)); im.save(path)
os.makedirs(OUT,exist_ok=True)
for sz in (192,512): icon(sz,INK,(255,255,255),AMBER,f'{OUT}/icon-{sz}.png')
icon(512,INK,(255,255,255),AMBER,f'{OUT}/icon-maskable-512.png',maskable=True)
icon(180,INK,(255,255,255),AMBER,f'{OUT}/apple-touch-icon.png',radius=0)
for sz in (192,512): icon(sz,TEAL,(255,255,255),AMBER,f'{OUT}/console-{sz}.png')
icon(512,TEAL,(255,255,255),AMBER,f'{OUT}/console-maskable-512.png',maskable=True)
icon(180,TEAL,(255,255,255),AMBER,f'{OUT}/console-apple-touch-icon.png',radius=0)
print('icons written to',OUT)
