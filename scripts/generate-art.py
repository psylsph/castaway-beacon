#!/usr/bin/env python3
"""Generate Castaway Beacon pixel-art assets (atlas + background).

Deterministic: seeded RNG, no external assets. Run from repo root:
    python scripts/generate-art.py
Outputs public/atlas.png, public/atlas.json, public/island-bg.png
"""
import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw

PUBLIC = Path(__file__).resolve().parent.parent / "public"

# ---------------------------------------------------------------- palette
OCEAN_TOP = (26, 156, 175)
OCEAN_BOT = (7, 84, 107)
FOAM = (186, 240, 232)
SAND_L = (247, 215, 140)
SAND_M = (232, 181, 99)
SAND_D = (201, 143, 75)
SAND_WET = (184, 128, 70)
WOOD_D = (94, 58, 32)
WOOD_M = (133, 85, 47)
WOOD_L = (168, 116, 68)
STRAW = (217, 169, 75)
STRAW_L = (237, 201, 107)
STRAW_D = (176, 128, 48)
LEAF_D = (31, 122, 68)
LEAF_M = (45, 142, 85)
LEAF_L = (98, 192, 120)
TRUNK = (120, 78, 46)
SKIN = (216, 156, 112)
SKIN_D = (185, 127, 88)
TEAL = (58, 166, 160)
TEAL_D = (42, 127, 123)
TROUSERS = (58, 74, 87)
OUTLINE = (58, 42, 30)
FIRE_Y = (255, 240, 161)
FIRE_O = (255, 180, 46)
FIRE_R = (255, 123, 46)
STONE = (128, 133, 140)
STONE_D = (96, 100, 108)
CANVAS_T = (217, 120, 74)
CANVAS_D = (176, 88, 52)

rng = random.Random(20260912)


def px(dr, x, y, color):
    dr.point((x, y), fill=color)


def rect(dr, x, y, w, h, color):
    dr.rectangle([x, y, x + w - 1, y + h - 1], fill=color)


def hline(dr, x, y, w, color):
    dr.line([x, y, x + w - 1, y], fill=color)


def safe(im, x, y):
    return 0 <= x < im.width and 0 <= y < im.height


# ---------------------------------------------------------------- background
BG_W, BG_H = 480, 640
CX, CY = 240, 356
RX, RY = 138, 63  # must match src/game/world.ts sand radii


def ellipse_points(cx, cy, rx, ry):
    return [
        (cx + rx * math.cos(2 * math.pi * i / 120), cy + ry * math.sin(2 * math.pi * i / 120))
        for i in range(120)
    ]


def inside_sand(x, y, scale=1.0):
    dx = (x - CX) / (RX * scale)
    dy = (y - CY) / (RY * scale)
    return dx * dx + dy * dy <= 1


def generate_bg():
    im = Image.new("RGB", (BG_W, BG_H))
    dr = ImageDraw.Draw(im)
    for y in range(BG_H):
        t = y / BG_H
        c = tuple(int(OCEAN_TOP[i] + (OCEAN_BOT[i] - OCEAN_TOP[i]) * t) for i in range(3))
        hline(dr, 0, y, BG_W, c)
    # wave dashes
    for _ in range(90):
        x = rng.randint(0, BG_W - 30)
        y = rng.randint(20, BG_H - 20)
        if inside_sand(x, y, 1.35):
            continue
        w = rng.randint(8, 26)
        base = im.getpixel((x, y))
        col = tuple(min(255, ch + 28) for ch in base)
        for i in range(0, w, 2):
            if safe(im, x + i, y):
                px(dr, x + i, y, col)
    # shallow water rings
    dr.polygon(ellipse_points(CX, CY, RX * 1.55, RY * 1.65), fill=(52, 172, 182))
    dr.polygon(ellipse_points(CX, CY, RX * 1.32, RY * 1.4), fill=(96, 200, 200))
    dr.polygon(ellipse_points(CX, CY, RX * 1.18, RY * 1.26), fill=FOAM)
    # sand layers: wet rim, main, lit top
    dr.polygon(ellipse_points(CX, CY, RX * 1.12, RY * 1.18), fill=SAND_WET)
    dr.polygon(ellipse_points(CX, CY, RX, RY), fill=SAND_M)
    dr.polygon(ellipse_points(CX, CY - 4, RX * 0.92, RY * 0.86), fill=SAND_L)
    # speckles + patches
    for _ in range(240):
        x = rng.randint(int(CX - RX), int(CX + RX))
        y = rng.randint(int(CY - RY), int(CY + RY))
        if inside_sand(x, y, 0.97):
            px(dr, x, y, rng.choice([SAND_D, SAND_M, SAND_L]))
    for _ in range(7):
        x = rng.randint(int(CX - RX * 0.7), int(CX + RX * 0.7))
        y = rng.randint(int(CY - RY * 0.7), int(CY + RY * 0.7))
        if inside_sand(x, y, 0.8):
            r = rng.randint(2, 4)
            dr.ellipse([x - r, y - r, x + r, y + r], fill=SAND_D)
    # sparkles
    for _ in range(50):
        x = rng.randint(0, BG_W - 1)
        y = rng.randint(0, BG_H - 1)
        if not inside_sand(x, y, 1.5):
            px(dr, x, y, (210, 245, 240))
    im.save(PUBLIC / "island-bg.png")


# ---------------------------------------------------------------- frames
def hat_head(dr, ox, oy, face):
    hline(dr, ox + 3, oy + 5, 14, STRAW_D)          # brim shadow
    hline(dr, ox + 2, oy + 4, 16, STRAW)            # brim
    hline(dr, ox + 2, oy + 3, 16, STRAW_L)
    rect(dr, ox + 6, oy, 8, 3, STRAW)               # dome
    hline(dr, ox + 6, oy, 8, STRAW_L)
    px(dr, ox + 6, oy + 2, STRAW_D)
    px(dr, ox + 13, oy + 2, STRAW_D)
    rect(dr, ox + 6, oy + 6, 8, 5, SKIN)
    hline(dr, ox + 6, oy + 10, 8, SKIN_D)
    if face == "down":
        px(dr, ox + 8, oy + 8, OUTLINE)
        px(dr, ox + 11, oy + 8, OUTLINE)
    elif face == "side":
        px(dr, ox + 11, oy + 8, OUTLINE)
        px(dr, ox + 8, oy + 8, SKIN_D)


def base_frame(face, leg_offset, bob, arm):
    im = Image.new("RGBA", (20, 30), (0, 0, 0, 0))
    dr = ImageDraw.Draw(im)
    oy = 2 + (1 if bob else 0)
    if face == "up":
        hline(dr, 4, oy + 5, 14, STRAW_D)
        hline(dr, 4, oy + 4, 16, STRAW)
        rect(dr, 8, oy, 8, 3, STRAW_L)
        rect(dr, 7, oy + 6, 10, 5, SKIN_D)
    else:
        hat_head(dr, 2, oy, face)
    rect(dr, 7, oy + 11, 10, 8, TEAL)
    hline(dr, 7, oy + 11, 10, TEAL_D)
    hline(dr, 7, oy + 18, 10, TEAL_D)
    if arm == "swing":
        rect(dr, 5, oy + 12, 2, 4, TEAL)
        px(dr, 5, oy + 16, SKIN)
        rect(dr, 17, oy + 11, 2, 4, TEAL)
        px(dr, 18, oy + 15, SKIN)
    else:
        rect(dr, 5, oy + 12, 2, 5, TEAL)
        px(dr, 5, oy + 17, SKIN)
        rect(dr, 17, oy + 12, 2, 5, TEAL)
        px(dr, 18, oy + 17, SKIN)
    if face == "side":
        lx = 9 + leg_offset
        rect(dr, lx, oy + 19, 4, 6, TROUSERS)
        rect(dr, lx + (1 if leg_offset else 0), oy + 25, 4, 2, WOOD_D)
    else:
        rect(dr, 8, oy + 19, 3, 6, TROUSERS)
        rect(dr, 13, oy + 19, 3, 6, TROUSERS)
        rect(dr, 7 + leg_offset, oy + 25, 4, 2, WOOD_D)
        rect(dr, 13 - leg_offset, oy + 25, 4, 2, WOOD_D)
    return im


def hut_im(roof_a, roof_b):
    im = Image.new("RGBA", (48, 40), (0, 0, 0, 0))
    dr = ImageDraw.Draw(im)
    for row in range(16):
        inset = max(0, (row - 3) // 2)
        x0 = 2 + inset
        x1 = 45 - inset
        c = roof_a if row % 4 < 2 else roof_b
        hline(dr, x0, 4 + row, x1 - x0 + 1, c)
    for _ in range(70):
        x = rng.randint(4, 43)
        y = rng.randint(5, 18)
        if im.getpixel((x, y))[3] > 0:
            px(dr, x, y, STRAW_D)
    hline(dr, 2, 4, 44, STRAW_L)
    hline(dr, 6, 19, 36, STRAW_D)
    rect(dr, 8, 20, 32, 14, WOOD_M)
    for i, y in enumerate(range(20, 34, 3)):
        hline(dr, 8, y, 32, WOOD_D if i % 2 == 0 else WOOD_L)
    rect(dr, 21, 24, 8, 10, WOOD_D)
    rect(dr, 22, 25, 6, 9, WOOD_M)
    px(dr, 26, 29, STRAW_L)
    rect(dr, 11, 23, 6, 5, OUTLINE)
    rect(dr, 12, 24, 4, 3, (255, 244, 200))
    hline(dr, 8, 34, 32, WOOD_D)
    return im


def palm_im(lean):
    im = Image.new("RGBA", (36, 48), (0, 0, 0, 0))
    dr = ImageDraw.Draw(im)
    base_x = 16 if lean > 0 else 20
    for i in range(26):
        t = i / 25
        x = base_x + int(lean * 8 * t * t)
        y = 44 - i
        px(dr, x, y, TRUNK)
        if i % 4 == 0:
            if safe(im, x - 1, y):
                px(dr, x - 1, y, (98, 62, 36))
            if safe(im, x + 1, y):
                px(dr, x + 1, y, WOOD_L)
    top_x = base_x + lean * 8
    top_y = 19
    for dx, dy in [(-9, -4), (-6, -7), (0, -9), (7, -7), (10, -3), (12, 2), (-12, 2)]:
        for s in range(1, 9):
            x = int(top_x + dx * s / 8)
            y = int(top_y + dy * s / 8 + (s * s) // 14)
            if safe(im, x, y):
                px(dr, x, y, LEAF_M if s < 6 else LEAF_D)
                if s in (2, 4, 6) and safe(im, x, y - 1):
                    px(dr, x, y - 1, LEAF_L)
    if safe(im, top_x - 2, top_y + 1):
        px(dr, top_x - 2, top_y + 1, WOOD_D)
    if safe(im, top_x + 2, top_y + 2):
        px(dr, top_x + 2, top_y + 2, WOOD_D)
    return im


def campfire_im(fi):
    im = Image.new("RGBA", (22, 20), (0, 0, 0, 0))
    dr = ImageDraw.Draw(im)
    for (sx, sy) in [(3, 14), (7, 16), (13, 16), (17, 14), (2, 11), (18, 11)]:
        dr.ellipse([sx - 2, sy - 2, sx + 1, sy + 1], fill=STONE)
        px(dr, sx - 1, sy - 2, STONE_D)
    dr.line([4, 16, 17, 12], fill=WOOD_D, width=2)
    dr.line([5, 12, 18, 16], fill=WOOD_M, width=2)
    if fi == 0:
        dr.polygon([(10, 2), (5, 12), (15, 12)], fill=FIRE_O)
        dr.polygon([(10, 5), (7, 12), (13, 12)], fill=FIRE_Y)
        px(dr, 10, 1, FIRE_R)
    else:
        dr.polygon([(11, 4), (6, 12), (15, 12)], fill=FIRE_O)
        dr.polygon([(11, 7), (8, 12), (14, 12)], fill=FIRE_Y)
        px(dr, 8, 5, FIRE_R)
    return im


def driftwood_im():
    im = Image.new("RGBA", (20, 12), (0, 0, 0, 0))
    dr = ImageDraw.Draw(im)
    dr.rounded_rectangle([1, 4, 18, 9], 2, fill=WOOD_M)
    hline(dr, 3, 5, 14, WOOD_L)
    hline(dr, 3, 8, 13, WOOD_D)
    dr.ellipse([1, 5, 4, 8], fill=WOOD_L)
    px(dr, 2, 6, WOOD_D)
    px(dr, 6, 6, WOOD_D)
    px(dr, 11, 7, WOOD_D)
    return im


def raft_im():
    im = Image.new("RGBA", (44, 18), (0, 0, 0, 0))
    dr = ImageDraw.Draw(im)
    rect(dr, 1, 2, 42, 14, WOOD_M)
    for x in range(1, 43, 9):
        for y in range(2, 16):
            px(dr, x, y, WOOD_D)
        hline(dr, x + 1, 3, 8, WOOD_L)
    hline(dr, 1, 5, 42, (222, 205, 160))
    hline(dr, 1, 12, 42, (222, 205, 160))
    return im


def tent_im():
    im = Image.new("RGBA", (34, 26), (0, 0, 0, 0))
    dr = ImageDraw.Draw(im)
    dr.polygon([(17, 1), (1, 23), (33, 23)], fill=CANVAS_T)
    dr.polygon([(17, 1), (17, 23), (33, 23)], fill=CANVAS_D)
    dr.polygon([(17, 10), (12, 23), (22, 23)], fill=OUTLINE)
    hline(dr, 15, 23, 5, WOOD_D)
    px(dr, 17, 0, WOOD_M)
    return im


def main():
    generate_bg()

    images = {
        "castaway_idle_down": base_frame("down", 0, False, "rest"),
        "castaway_walk_down_0": base_frame("down", 0, False, "swing"),
        "castaway_walk_down_1": base_frame("down", 2, True, "swing"),
        "castaway_idle_side": base_frame("side", 0, False, "rest"),
        "castaway_walk_side_0": base_frame("side", 0, False, "swing"),
        "castaway_walk_side_1": base_frame("side", 2, True, "swing"),
        "castaway_idle_up": base_frame("up", 0, False, "rest"),
        "castaway_walk_up_0": base_frame("up", 0, False, "swing"),
        "castaway_walk_up_1": base_frame("up", 2, True, "swing"),
        "hut_a": hut_im(STRAW, STRAW_D),
        "hut_b": hut_im((205, 150, 62), (160, 112, 42)),
        "palm_a": palm_im(1),
        "palm_b": palm_im(-1),
        "campfire_0": campfire_im(0),
        "campfire_1": campfire_im(1),
        "driftwood": driftwood_im(),
        "raft_platform": raft_im(),
        "tent": tent_im(),
    }

    total_w = max(im.width for im in images.values())
    total_h = sum(im.height for im in images.values()) + len(images) - 1
    sheet = Image.new("RGBA", (total_w, total_h), (0, 0, 0, 0))
    y = 0
    atlas = {"frames": {}, "meta": {"image": "atlas.png", "scale": "1"}}
    for name, im in images.items():
        sheet.paste(im, (0, y))
        atlas["frames"][name] = {
            "frame": {"x": 0, "y": y, "w": im.width, "h": im.height},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": im.width, "h": im.height},
            "sourceSize": {"w": im.width, "h": im.height},
        }
        y += im.height + 1
    sheet.save(PUBLIC / "atlas.png")
    atlas["meta"]["size"] = {"w": sheet.width, "h": sheet.height}
    (PUBLIC / "atlas.json").write_text(json.dumps(atlas, indent=1))
    print(f"atlas: {sheet.width}x{sheet.height}, {len(images)} frames -> public/atlas.png")
    print("background -> public/island-bg.png")


if __name__ == "__main__":
    main()
