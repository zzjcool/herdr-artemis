#!/usr/bin/env python3
"""Compose the two plates in mods/artemis-head/ from NASA's ART002E015967.

Everything the plate shows is measured in the photograph: the Moon's disc
(the rim ridge at left 2110, right 4605, top 1556, bottom 4032 px gives
centre 3357.5, 2794.0 and radii 1247.5 x 1238.0), the corona's brightness
as a function of angle at 1.08-2.9 disc radii, and the star field (a
1720x2752 crop of the frame's empty sky). The composer only decides where
the — mostly off-frame — Sun sits, so the window is lit from one edge
instead of showing a picture pasted into it.

    python3 tools/make-sky.py art_orig.jpg mods/artemis-head/sky.jpg sky
    python3 tools/make-sky.py art_orig.jpg mods/artemis-head/rail.jpg rail

Needs numpy, scipy and Pillow. The untouched original is not in this
repository; fetch it from
https://www.nasa.gov/image-detail/amf-art002e015967/ (public domain).
"""
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

CX, CY = 3357.5, 2794.0          # the Moon's disc, measured on the rim ridge
RX, RY = 1247.5, 1238.0

# Two plates, one composer. `sky` is the window: 16:10 like the window itself,
# the Sun's limb just under the bottom edge, so the hot rim becomes the line
# the window rests on and the corona climbs the frame. `rail` is the band at
# the top of the rail: a landscape plate whose limb runs vertically, corona to
# its left and the Moon's dark face to its right — cropped by `cover` into any
# band shape, it always keeps the arc. Both fade to the window's black at the
# edges they should dissolve into.
PLATES = {
    "sky": dict(w=3200, h=2000, sun=(2400.0, 5390.0), radius=3400.0,
                corona=95.0, falloff=2.0, bloom=12.0, rim=215.0, halo=34.0,
                grain=0.5, fade=(0.0, 0.0)),
    "rail": dict(w=1800, h=1200, sun=(1750.0, 600.0), radius=900.0,
                 corona=95.0, falloff=2.15, bloom=9.0, rim=205.0, halo=30.0,
                 grain=0.5, fade=(0.16, 0.42)),
}
GRADE = (1.0, 0.935, 0.835)      # warm cream, as the rim is
DISC = (3.0, 5.0, 9.0)
SKY = (4.0, 6.0, 11.0)


def corona_profile(im):
    """Mean luminance vs angle in the halo, normalised to its own mean."""
    lum = im.mean(2)
    n = 2048
    th = np.linspace(0, 2 * np.pi, n, endpoint=False)
    acc = np.zeros(n, np.float32)
    radii = np.linspace(1.08, 2.9, 40) * RX
    for rr in radii:
        xs = np.clip((CX + rr * np.cos(th)).astype(int), 0, im.shape[1] - 1)
        ys = np.clip((CY + rr * np.sin(th) * RY / RX).astype(int), 0, im.shape[0] - 1)
        acc += lum[ys, xs]
    acc /= radii.size
    k = np.hanning(161)
    k /= k.sum()
    acc = np.convolve(np.r_[acc[-80:], acc, acc[:80]], k, "same")[80:-80]
    return acc / max(acc.mean(), 1e-3)


def stars(im, W, H):
    """The frame's own star field: one 16:10 crop of empty sky, lifted."""
    patch = im[0:1720, 5504:8256].mean(2)             # no disc, no seam
    floor = ndimage.uniform_filter(patch, 25)         # the frame's own noise floor
    patch = np.clip(patch - floor - 2.5, 0, None) * 16.0
    patch = np.clip(patch, 0, 255) ** 0.92
    img = Image.fromarray(np.clip(patch, 0, 255).astype(np.uint8), "L")
    return np.asarray(img.resize((W, H), Image.LANCZOS), np.float32)


def main(src, out, mode):
    p = PLATES[mode]
    W, H = p["w"], p["h"]
    SUN, RADIUS = p["sun"], p["radius"]
    CORONA, FALLOFF = p["corona"], p["falloff"]
    BLOOM, RIM, HALO = p["bloom"], p["rim"], p["halo"]
    STARS = 1.0
    im = np.asarray(Image.open(src).convert("RGB"), dtype=np.float32)
    prof = corona_profile(im)

    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    dx = xx - SUN[0]
    dy = (yy - SUN[1]) * 0.97                          # the disc is a hair elliptical
    d = np.sqrt(dx * dx + dy * dy)
    th = (np.arctan2(dy, dx) % (2 * np.pi)) / (2 * np.pi) * prof.size
    rays = np.clip(prof[th.astype(np.int32) % prof.size], 0.42, 1.85)

    r = np.maximum(d, RADIUS)
    light = np.clip(
        CORONA * (RADIUS / r) ** FALLOFF * rays
        + BLOOM * np.exp(-(((d - RADIUS) / (RADIUS * 1.25)) ** 2))
        + RIM * np.exp(-(((d - RADIUS - 1.6) / 1.7) ** 2))
        + HALO * np.exp(-(((d - RADIUS) / 34.0) ** 2)),
        0, 255,
    )

    on_moon = np.clip((RADIUS - d) / 2.0 + 0.5, 0, 1)  # 1 on the Moon, 0 in the corona
    star = stars(im, W, H) * STARS * np.clip(1.0 - light / 30.0, 0.0, 1.0) ** 1.5

    img = np.zeros((H, W, 3), np.float32)
    for i in range(3):
        lit = light * GRADE[i]
        img[..., i] = (SKY[i] + star) * (1 - on_moon) + (DISC[i] + lit * 0.10) * on_moon
        img[..., i] += lit * (1 - on_moon)

    top_fade, bottom_fade = p["fade"]
    if top_fade or bottom_fade:
        # dissolve into the window's black at the edges the band bleeds into
        v = np.linspace(0, 1, H)[:, None, None]
        top = np.clip(v / top_fade, 0, 1) ** 1.5 if top_fade else 1.0
        bottom = np.clip((1 - v) / bottom_fade, 0, 1) ** 1.35 if bottom_fade else 1.0
        img *= np.minimum(top, bottom)

    rng = np.random.default_rng(7)
    img = np.clip(img + rng.normal(0, p["grain"], (H, W, 1)), 0, 255)
    Image.fromarray(img.astype(np.uint8)).save(out, quality=90, subsampling=1, optimize=True)

    a = np.asarray(Image.open(out)).mean(2)
    print(f"{out}: {W}x{H}, mean {a.mean():.1f}, max {a.max():.0f}")


if __name__ == "__main__":
    if len(sys.argv) not in (3, 4):
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) == 4 else "sky")
