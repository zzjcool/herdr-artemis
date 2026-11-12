# Artemis

A Herdr layout cut from one NASA photograph: ART002E015967, *The Planets Shine
Bright* — the Artemis II crew's view of the Moon eclipsing the Sun from Orion,
6 April 2026, 4,067 mi from the Moon.

![Artemis](preview.png)

Two plates are composed from the frame and from nothing else. `sky.jpg` is the
window's ground: it shows in the window's own band, and the top 66 px of the
window are open sky with the photograph's own stars, where a 38 px bar carries
the mission mark, the active space and four agent tallies. `rail.jpg` is the
limb that runs down the top of the left rail — corona to its left, the Moon's
dark face to its right — fading into the black as it goes, with the title, date,
frame number and credit printed where it fades out. Terminals are dark plates on
what is left; the palette is sampled from the photograph.

**What it gives you**

- the photograph twice, from one composer: the window's band and the rail's
  limb, `tools/make-sky.py` builds both from the original frame;
- the photograph's title, date, frame number and credit printed on the rail's
  band — click it for the full caption, credit and source;
- agent status in three places at once: the bar's four tallies (click a
  non-empty one to focus that agent), the bar's eclipse mark, and the 5 px dot
  on the band (click it for `agent.next`);
- neither mod binds a key, runs a program or reaches the network.

**Install.** Copy `layouts/` and `mods/` into `~/.config/herdr-app/`, check the
two mods, then switch:

```sh
herdr-app check ~/.config/herdr-app/mods/artemis-bar
herdr-app check ~/.config/herdr-app/mods/artemis-head
herdr-app do layout.switch --name artemis
herdr-app status
```

**[RECIPE.md](RECIPE.md)** is the brief it was built from: every size and
colour, the node tree, both mods, the two plates and the composer that builds
them, what a fresh build gets wrong, and how to check a build.

The photograph is `art002e015967` from
[nasa.gov](https://www.nasa.gov/image-detail/amf-art002e015967/): a US
government work, public domain, credit NASA, imply no endorsement. The untouched
original is not in this repository; the two plates that are composed from it
are, because the layout needs them. The lists in the preview are blurred on
purpose — they hold a real machine's own spaces.
