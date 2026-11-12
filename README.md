# Artemis

A Herdr layout built on one NASA photograph: ART002E015967, *The Planets Shine
Bright* — the Artemis II crew's view of the Moon eclipsing the Sun from Orion,
6 April 2026, 4,067 mi from the Moon.

![Artemis](preview.png)

The photograph is the window's ground, whole: the entire 3:2 frame, uncropped and
ungraded, placed with `fit: "contain"`. Where the window is a different shape the
layout paints the frame's own border colour — measured off the picture, `#030304` —
so the letterbox is not a bar, it is the photograph running out of stars. Nothing
in the layout paints a background unless it is smoked glass (`#070b1240`, 25 %) or a
20 % tint (`#0e162133`), so the sky, the disc and its corona are behind the rail, the
tabs and the panes rather than in a picture block of their own — and a shell pane's
paper blends with the picture behind it, so the corona's glow passes through it.

**What it gives you**

- the whole frame, never cropped: in a 16:10 window it fills the height with 90 px of the same near-black at
  either side (at 2880 px wide); in a tall window it is a band across the middle
  with the same near-black above and below;
- the photograph's title, date, frame number and credit printed at the head of the
  rail — click it for the full caption, credit and source;
- menu surfaces (`popover`, `raised`, `input`) stay opaque, because a menu over a
  photograph needs a floor;
- two mods, neither of which binds a key, runs a program or reaches the network.

**Install.** Copy `layouts/` and `mods/` into `~/.config/herdr-app/`, check the two
mods, then switch:

```sh
herdr-app check ~/.config/herdr-app/mods/artemis-bar
herdr-app check ~/.config/herdr-app/mods/artemis-head
herdr-app do layout.switch --name artemis
herdr-app status
```

**[RECIPE.md](RECIPE.md)** is the brief it was built from: every size and colour,
the node tree, both mods, the plate, and the one thing this layout cannot do.

The photograph is `art002e015967` from
[nasa.gov](https://www.nasa.gov/image-detail/amf-art002e015967/): a US government
work, public domain, credit NASA / JSC, imply no endorsement. The layout ships the
frame re-encoded at 4096 px wide (`mods/artemis-head/photo.jpg`, 1.0 MB) — the same
pixels, no crop, no grade. The lists in the preview are blurred on purpose; they
hold a real machine's own spaces.
