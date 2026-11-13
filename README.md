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
tint of the same `#0e1621` (20 % on the containers, 32 % on the pane) — and the pane's
tint is drawn by its frame, so it stops on the corner's arc and the Moon's limb, its craters
and the corona read straight through the text.

**What it gives you**

- the whole frame, never cropped: in a 16:10 window it fills the height with 90 px of the same near-black at
  either side (at 2880 px wide); in a tall window it is a band across the middle
  with the same near-black above and below;
- rounded plates throughout: the rail, the tab strip, the pane and the status bar are
  sheets of smoke with a 14 px corner (12 on the tab strip, 10 on the status bar), and both
  the frame's fill and its divider stop on the curve, so no square corner pokes out of it —
  the header band cannot be clipped that way, so `artemis-pane` paints it rounded to the
  frame's own radius instead;
- one grid: inside the window's 14 px margin every plate is 10 px from its neighbour on all four
  sides — the tab strip's top edge sits on the rail's top line, the rail, the pane and the panel
  end on one bottom line, and the status bar is a full-width footer one gutter below it;
- menu surfaces (`popover`, `raised`, `input`) stay opaque, because a menu over a
  photograph needs a floor;
- **a system monitor at the right end of the status bar**: the CPU, memory and network of the
  machine the shown space lives on — this computer, or the host that space's terminals run on, read
  over the connection Herdr already keeps to it (`uname`, `sysctl`, `iostat`, `vm_stat`,
  `netstat -ib` on macOS; one `sh -c` over `/proc` on Linux — all read-only queries), a number and a
  twelve-tick sparkline each, read every second; CPU and memory are named by a chip and a memory
  module rather than by two words, the network reads `↓1.2M ↑96K` bytes a second, every number is
  padded to a fixed width so no column shifts as it changes, and the strips keep 36 s of trend. A
  number warms as its machine fills up — muted, then the palette's sand past 70 % CPU or 80 %
  memory, then its red past 90 % / 92 % — so a busy host is visible without reading the digits. Every machine with a space is sampled in the
  background, so switching to another host shows its numbers at once instead of starting from nothing. The mod never runs ssh and holds no
  key, and a machine that cannot answer goes quiet rather than drawing a guess;
- **the same reading in the rail**: under each machine's name in the space list, one left-aligned
  line — the same two glyphs, `42%` and `78%`, then `↓379K ↑67K`, each metric with its own
  sparkline — so the health of every host is one glance away, without switching to a space on it;
- **a Files panel that can hand you the file**: right-click a row for `Download file` /
  `Download folder` or `Copy path`. A download lands in `~/Downloads` and never overwrites
  (`report.pdf`, then `report (2).pdf`); from another machine it is one `scp` over the ssh you
  already have to that host, not the connection Herdr keeps — that one carries text and stops at
  8 MiB, which would corrupt anything binary. It says what happened in the same toast the rest of
  the window uses;
- the bar's own mod (`artemis-bar`) binds no key, starts no program, and only asks Herdr to
  minimise, maximise or close the window; the pane header (`artemis-pane`), the tab strip
  (`artemis-tabs`), the status bar's left half (`artemis-workspace-status`) and the space list
  (`artemis-spaces`) are the shipped mods with the one thing changed that they needed here (§
  *Watch out* in the recipe); none of them, nor the monitor, touches the network.

**Install.** Copy `layouts/`, `mods/` and `backgrounds/` into `~/.config/herdr-app/`
(`backgrounds/artemis.jpg` is the ground — without it the window has no photograph),
check the mods, then switch:

```sh
herdr-app check ~/.config/herdr-app/mods/artemis-bar
herdr-app check ~/.config/herdr-app/mods/artemis-pane
herdr-app check ~/.config/herdr-app/mods/artemis-tabs
herdr-app check ~/.config/herdr-app/mods/artemis-workspace-status
herdr-app check ~/.config/herdr-app/mods/artemis-spaces
herdr-app check ~/.config/herdr-app/mods/sysmon
herdr-app do layout.switch --name artemis
herdr-app status
```

**[RECIPE.md](RECIPE.md)** is the brief it was built from: every size and colour,
the node tree, the six mods, the picture, and the things this layout cannot do.

The photograph is `art002e015967` from
[nasa.gov](https://www.nasa.gov/image-detail/amf-art002e015967/): a US government
work, public domain, credit NASA / JSC, imply no endorsement. The layout ships the
frame re-encoded at 4096 px wide (`backgrounds/artemis.jpg`, 1.0 MB) — the same
pixels, no crop, no grade. The lists in the preview are blurred on purpose; they
hold a real machine's own spaces.
