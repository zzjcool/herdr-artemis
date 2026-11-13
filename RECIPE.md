# Artemis

A Herdr layout whose ground is one NASA photograph: ART002E015967, *The Planets Shine Bright*
— the Artemis II crew's view of the Moon eclipsing the Sun from Orion, 6 April 2026, 4,067 mi
from the Moon. The whole frame, uncropped and ungraded, sits behind the entire window with
`fit: "contain"`; where the window is a different shape the layout paints the frame's own
border colour (`#030304`), so the empty part of the window is not a bar but the photograph
running out of stars. Nothing is filled flat: the rail, the tab strip, the status bar and the
panel are 25 % smoke, the pane and everything else take a 20 % tint, so the sky, the disc and its corona sit
behind the whole interface — and a terminal's paper is 25 % smoke, so the Moon's limb, its
craters and the corona read straight through the text. Every plate carries a corner — 14 px on the
rail, the pane and the panel, 12 on the tab strip, 10 on the status bar — and the frame clips its
header, its divider and the terminal's paper to that curve, so nothing square pokes out of it.

The status bar's right end carries a small system monitor: the CPU and memory of the machine the
shown space lives on — this computer, or the host that space's terminals run on — a number and a
twelve-tick sparkline each, sampled every three seconds. It reads them over the connection Herdr
already has (`exec(…, {on})`, i.e. herdr-core on that machine), so no shell, no key handling and no
network of the mod's own.

![Artemis](preview.png)

## What you see

**The window.** Root `padding` `14`, `gap` `10`, `titlebar: none`, traffic lights at `[14, 13]`,
theme `graphite` with the `colors` map below, terminal padding `[20, 24]`, `terminal_opacity`
`0.25`, and `background` `{ "image": "backgrounds/artemis.jpg", "fit": "contain" }`.

**The ground.** The photograph, whole: 3:2, no crop, no grade, no vignette, no fade. `contain`
fits it inside the window and centres it. An aspect wider than 3:2 (a 16:10 window) leaves the
same near-black at the sides — 90 px either side at 2880 px wide; an aspect narrower than 3:2 (a
tall window) leaves it above and below, and the picture becomes a band across the middle. Those
bars are `canvas` `#030304` — measured off the frame's own outer 8 px (mean `2.84, 3.02, 3.61`)
— so the picture's edge and the window's edge are the same colour and there is no seam to see.
What the photograph contributes: its near-black sky (mean luminance 11 of 255) with the frame's
own stars, the Moon's disc in its left third, the corona's ring around it, and Saturn and Mars
as two small dots to the right of the disc.

**Smoked glass.** `colors.background` is `#0e162133` — 20 % of a dark blue-grey — so every node's
default fill is a thin smoke over the photograph rather than a hole or a slab, and a terminal's
own paper takes that colour's RGB (`#0e1621`) with `terminal_opacity` `0.25` blending it toward
the picture behind it: a shell pane reads (4, 6, 8) over the frame's black, and the Moon's limb,
the craters, the corona and the stars show through it, so the terminal is written on the
photograph rather than in a box on it. `terminal_padding` `[20, 24]` leaves the picture as a
mount inside each pane, which is where the glass reads even over the frame's black. `chrome` is
`#00000000` on purpose: the bar paints `chrome` (`mods/artemis-bar/main.js`, `.bg(t.chrome)`), so a
transparent `chrome` is what keeps the bar's type on the photograph instead of on a band across the
top of the window. Every plate that *should* be visible names the literal `#070b1240` instead.

**The four plates** carry the sturdier version of the same smoke — the literal `#070b1240`
(25 % of `#070b12`) with a `1px` border of `#ffffff1f`, and a corner:

| plate | size | radius |
|---|---|---|
| `sidebar` (the rail) | 292 px, `min` 220, `max` 420 | 14 |
| `tabs` | 38 px tall, `window_drag: true` | 12 |
| `status` | 26 px tall — a row of two mods: `workspace-status` and `sysmon`, 308 px | 10 |
| `panel` (files / changes) | 340 px, `min` 280, `max` 900, `hidden: true` | 14 |

**The pane** is a bare frame: it inherits the 20 % tint, gets a `1px` `#ffffff1f` border (the
pane holding the keyboard takes `accent` `#e9d8b9` instead) and radius 14. The shipped `pane` header
sits 30 px at the top, always visible: program icon, title, folder, the agent's status (spinner,
`Needs you` while blocked, a dot when done), and — on hover only — split-right, split-down, zoom
and close. The header paints `theme().background`, i.e. a second 20 % tint, plus a 1 px `border`
rule: two thin layers rather than a slab, which is what keeps it from fighting the photograph.
Both layers are clipped to the frame's curve, so the tint stops on the arc instead of squaring the
pane's top corners.

**Top bar — 38 px, full width, `window_drag: true`, nothing painted.** Its type sits straight on
the photograph. One row at 11.5 px, left to right:

- **the eclipse mark, 16 px:** a 1 px outer ring at `${color}38` (22 % of the status colour),
  a 1 px rim in the status colour at 11 px, and a 5 px Moon disc in `#05080c`.
- `ARTEMIS` at 10.5 px `font_semibold` in `#e7ecf3`, then `II` at 9 px in `accent` `#e9d8b9`.
- a `│` separator at `${muted}44`, 11 px margin each side, then the active space's name at 12 px
  `foreground` (max 240 px) and its git branch (180 px); then, only when they differ from the space,
  the focused terminal's folder leaf (160 px, `~` at home) and the tab's name (200 px, only when the
  tab is named) at 11.5 px `dim` `#828d9c` — each truncated.
- a flexible spacer, then the **UTC clock**, `HH:MM:SS` at 11 px in `settings().font_family` (else
  JetBrains Mono), with `UTC` at 9 px `dim`, 5 px to its left.
- On Linux and Windows only (`window().buttons`): minimise, maximise/restore, close — 30 px
  each, glyphs in `dim`.

**Rail — 292 px.** One plate, its children flush to its edge (the 14 px the root keeps is what
insets the whole body from the window), holding, top to bottom:

1. **`spaces`** — the shipped `spaces` mod, `weight: 1`, `min` 90.
2. **`agents`** — the shipped `agents` mod, `weight: 1`, `min` 90.

**Work column** — `gap` 12 and `padding` `[10, 20]`, so the tabs, the pane and the status bar sit
10 px in from the top and bottom and 20 px in from the rail and the window edge: `tabs` 38 px with
the shipped `tabs` mod → `work-body` row, `gap` 10 → the pane area and the hidden panel →
`status` 26 px: `workspace-status` (weight 1) plus the monitor, 308 px.

**The status bar is a row, not a block**, since its right end holds a second mod: `workspace-status`
at `weight: 1` takes every pixel the monitor does not, so the palette hint stays where the shipped
mod puts it — just left of the seam. The row is `resizable: false`: the seam is a 1 px rule, not a
drag handle, and the monitor's 308 px cannot be moved by a stray press. The 25 % smoke and the
1 px `#ffffff1f` rule are on the row; the seam is a 1 px rule the monitor draws on its own left edge,
and both halves draw the same 1 px rule along their top edge, so the bar keeps the two thin layers
it always had.

**System monitor — the bar's right end.** `CPU`, the percentage, a twelve-tick strip; a 1 px rule;
`MEM`, `23.1/32G` — that machine's own total, so a 15G host reads `/15G` — and a strip of the same
twelve ticks. Labels are 9 px `dim` `#828d9c`; numbers are
11.5 px in `settings().font_family` (else JetBrains Mono) in `muted` `#b7c2cd`, right-aligned in
fixed boxes — 34 px for the percentage, 58 px for the memory — so `%` and `G` stand in the same
column on every sample and the strips never shift. A strip is twelve 2 px ticks 2 px apart, 1–11 px
tall, 46 px in all: the older eleven in `idle` `#5f6a78`, the newest in `accent` `#e9d8b9`, so the
right edge of a strip is “now”. Nothing rounds, nothing fills: the ticks sit straight on the plate.

**Colours** are theme `graphite` plus the root `colors` map: `canvas` `#030304`, `background`
`#0e162133`, `surface` `#00000000`, `chrome` `#00000000`, `popover` `#0a1017`, `raised`
`#0d141c`, `input` `#0c131a`, `hover` `#ffffff0d`, `selected` `#ffffff14`, `border`
`#ffffff1f`, `foreground` `#e7ecf3`, `muted` `#b7c2cd`, `dim` `#828d9c`, `accent` `#e9d8b9`,
`accent_foreground` `#0a0c11`, `solid` `#111820`, `solid_foreground` `#0a0f15`, `selection`
`#2a3a4d66`, `working` `#8bb3d9`, `blocked` `#e08a6c`, `done` `#d8c8a6`, `idle` `#5f6a78`,
`unknown` `#47525f`, and the 16-colour ANSI ramp `#121821 #dd7a63 #a3bd97 #e3c88d #7fa6cf
#c39ecf #83bfc0 #c9d2dc #3b4655 #ef9781 #bcd4ab #f2dba3 #9cc0e6 #d8b5e2 #9ed8d6 #edf2f7`
(`ansi0`–`ansi15`). Fonts are the person's own; the layout sets none, but the clock asks for
`settings().font_family` (else JetBrains Mono) because it is numerals.

## How it behaves

**The mark, and nothing else, carries agent status.** The bar's 16 px eclipse reads two facts —
whether any agent is `blocked` and whether any is `working` — and nothing else; `done` and `idle`
render exactly like no agent at all:

| status | the mark |
|---|---|
| `blocked` | ring and rim coral `#e08a6c`, pulsing 0.35 → 1 every 900 ms |
| `working` | ring and rim cream `#e9d8b9`, pulsing 0.5 → 1 every 2400 ms |
| `done`, `idle`, none | ring and rim cream `#e9d8b9`, steady (indistinguishable) |

Counts are not repeated in the bar: the `agents` list in the rail is where they belong.

**The monitor reads the shown space's machine, every three seconds.** There is no system-stats API,
so each machine is asked in its own dialect. macOS: `iostat -c 2 -w 1` prints two samples one second
apart — the first is the average since boot, the second is the last second, so only the last line is
read (a single-line answer is refused rather than passed off as “now”) — and CPU is `us + sy` from
it; `vm_stat` is read in the same breath, and memory in use is `(active + wired + compressor) × page
size` over `hw.memsize`, asked once. Linux: one `sh -c` reads the aggregate `cpu` line of
`/proc/stat`, the two memory numbers from `/proc/meminfo`, sleeps a second and reads `cpu` again —
busy is `1 − (Δidle + Δiowait) / Δtotal`, and memory in use is `MemTotal − MemAvailable`. Which
dialect is `uname -s`, asked once per machine and asked again if it fails.

All of it is read-only, and a sample is one round trip to that machine: about 12 ms of CPU here, and
on a remote host the ~1 s probe plus the link. The poll stays three seconds; when a machine answers
slowly the `busy` flag skips ticks instead of stacking samples.

**Switching machines retargets the monitor at once.** The machine is the active space's, so moving to
a space on another host drops the old reading, empties the strip and takes a sample of the new
machine immediately, rather than letting a stranger's numbers stand for three seconds. A sample for
the machine we just left is thrown away (`gen`), and `hw.memsize` / `uname` answers are cached per
machine so switching back does not re-ask them.

**The first strip is flat.** The first sample fills all twelve ticks with itself, so a fresh window
shows a line at today's level instead of twelve claims of history it never saw; after that, one
tick per sample with the oldest dropping off the left — 36 s of history.

**Nothing here warns.** A lean machine is a line of short ticks, a busy one a comb: that is the
whole reading, and no colour changes with load, because the mark stays the bar's only status
carrier. Which machine these are is said once, by the label at the other end of the bar — the
monitor repeats neither the name nor the fact that it is remote. A machine whose dialect is unknown
(Windows, anything without `/proc`) draws nothing at all, and so does one that cannot answer. A
failed sample is not painted over: the numbers drop to `dim` and the newest tick loses its cream, so
nothing on the bar claims to be “now” while the reading is stale; three failures in a row and it
keeps trying once a minute instead of every tick.

**Clicks and hovers**

- The mod stops the left mouse-down on its clock and its window buttons, so a window drag never
  starts from them; the bar's and the tab strip's `window_drag` take every other press.
- Nothing in the bar is clickable — the mark is a lamp, not a button, and the monitor's block takes
  no press at all. Everything else — the space and agent lists, the tab bar, the pane headers,
  `workspace-status`, the panel — behaves as in Herdr's own layouts, because it is those shipped mods.

**What moves**

- Dragging the bar moves the window, and so does dragging the tab strip — both blocks are
  `window_drag: true`. On Linux and Windows the bar's own buttons minimise, maximise/restore and
  close it.
- Dragging the rail's right edge resizes it 220–420 px.
- The motion in the layout: the mark's pulse (native GPUI `.loop` on opacity, no JS redraws), the
  clock (one tick a second via `cx.timer.every(1000)`, notifying only when the formatted string
  changed) and the monitor's strips (one tick and one redraw per sample, every three seconds).

**Keys** — the layout binds nothing and leaves the person's `keys.json` alone; neither mod binds a
key. The bar mod runs no program and asks Herdr only to minimise, maximise or close the window; the
monitor runs `uname`, then `iostat`, `vm_stat` and `sysctl` on macOS or one `sh -c` over `/proc` on
Linux, all through herdr-core on the machine being watched — it opens no network connection of its
own and holds no key.

## Built from

```
layouts/artemis.json          the window
layouts/artemis.svg           the picture Settings shows for this layout (root "preview")
backgrounds/artemis.jpg       the ground: the whole NASA frame, re-encoded
mods/artemis-bar/             main.js, mod.json {"place":"none","title":"Artemis bar"}
mods/sysmon/                  main.js, mod.json {"place":"none","title":"System monitor"}
```

**The node tree** (root is a `column`):

```
root  column  titlebar "none", traffic_lights [14,13], theme "graphite" + colors,
              background {image "backgrounds/artemis.jpg", fit "contain"},
              padding 14, gap 10, terminal_padding [20,24], terminal_opacity 0.25,
              preview "layouts/artemis.svg"
├ bar         block 38   window_drag  mod artemis-bar     (nothing painted)
└ body        row        gap 0
  ├ sidebar   column 292  min 220  max 420  radius 14
  │ │                    background "#070b1240"  border {1,"#ffffff1f"}
  │ ├ spaces  block weight 1  min 90  mod spaces   (no fill)
  │ └ agents  block weight 1  min 90  mod agents   (no fill)
  └ work      column gap 12  padding [10,20]  resizable false
    ├ tabs       block 38  window_drag  radius 12  background "#070b1240"
    │                    border {1,"#ffffff1f"}  mod tabs
    ├ work-body  row  gap 10
    │ ├ main  block  content {tab "active", pane {...}}
    │ └ panel column 340  min 280  max 900  hidden true  radius 14
    │          background "#070b1240"  border {1,"#ffffff1f"}
    │   └ panel-body  stack  active "files"  children: files, changes
    └ status       row 26  gap 0  resizable false  radius 10
                           background "#070b1240"  border {1,"#ffffff1f"}
      ├ status-workspace  block weight 1  mod workspace-status
      └ status-sysmon     block 308  min 308  mod sysmon  (paints no fill)
```

The pane frame is exactly
`{"gap":10,"radius":14,"lone":true,"border":{"width":1,"color":"#ffffff1f"},"focus":{"width":1,"color":"accent"},"header":{"content":{"mod":"pane"},"height":30,"position":"top","reveal":"always"}}`
— no `background`, so it keeps the layout's 20 % tint, and `radius` 14 like every plate: the frame
must be stated in `content.pane`, not on the node, or the frame stays square (the node's `radius`
rounds the block's own fill, not the pane).

**`mods/artemis-bar`** (no `props`) is one `h_flex().size_full()`: `.pl(mac ? 78 : 12).pr(4)`,
`.text_size(11.5)`, `.overflow_hidden()`, and `.bg(t.chrome)` — which is transparent, so the row
paints nothing and its type sits on the photograph. It imports `View` and `div` from `gpui-kit`,
`h_flex` from `gpui-base`, and `agents`, `focused`, `home`, `run`, `settings`, `spaces`,
`theme`, `window` from `herdr`; it runs `window.minimize` / `window.maximize` / `window.close` where
the system draws no buttons, and that is every `run` in the mod. The clock is `cx.timer.every(1000, …)` over `new Date()` formatted as
UTC. Every control is wrapped in `.on_mouse_down("left", (_e, cx) => cx.stopPropagation())`. The
mark is three nested `div()`s: `size(16).rounded(8).border(1)` at `${color}38`, inside it
`size(11).rounded(6).border(1)` at the status colour, inside that `size(5).rounded(3).bg("#05080c")`
— an opaque core, because `t.background` is translucent and the Moon's face must not be a hole.

**`mods/sysmon`** (no `props`) is one
`h_flex().size_full().items_center().justify_end().overflow_hidden()` with `.gap(10).px(12)` and
`.border_t(1).border_l(1)` in `theme().border` — no background, so the plate stays the row's and the
bar reads as one sheet with a 1 px seam, and no overflow, so a squeezed block clips its own content
rather than painting over its neighbour. It imports `View` and `div` from `gpui-kit`, `h_flex` from
`gpui-base`, and `exec`, `settings`, `spaces`, `theme` from `herdr`. It samples on a
`cx.timer.every(3000, …)` — the first sample fired at once by `cx.timer.after(1, …)` — with a
`busy` flag so a slow answer never stacks, and a `missing` counter that, after three failures in a
row, waits 20 ticks (63 s to the next try). `render(cx)` is where a machine change is noticed:
`spaces().find((s) => s.active)?.machine ?? null` against `this.machine`; a difference bumps `gen`,
empties the history and starts a sample of the new machine. Programs, by dialect (`uname -s`, cached
per machine): macOS `sysctl -n hw.memsize` (cached per machine), `iostat -c 2 -w 1` + `vm_stat`;
Linux one `sh -c` reading `/proc/stat`, `/proc/meminfo`, then `/proc/stat` again a second later.
Every call carries `{ on: machine }`, so it runs through herdr-core on that machine — the mod never
runs ssh itself. Each metric is a
label (`w(24)`, 9 px, `dim`), a value (`h_flex().w(34 | 58).justify_end()` around a 11.5 px `div()`
in the person's mono face, `muted` while the reading is live and `dim` once it is not) and a strip:
`h_flex().gap(2).h(11).items_end()` over twelve `div().w(2)` ticks whose height is
`1 + round(pct / 10)` px, the newest one `accent` (`unknown` when stale) and the rest `idle`. Between
the two, a `div().w(1).h(11).bg(t.border)`. Parsing is three small regexes and one split: the last of
two data lines of `iostat`, and `vm_stat`'s `Pages active/wired down/occupied by compressor` plus the
page size in its header.

**Shipped mods used:** `spaces`, `agents`, `tabs`, `pane` (pane headers), `workspace-status`,
`files`, `changes`. Nothing needs `keys.json`, `programs.json`, `settings.json` or a theme file:
the look is all in the layout's root.

**The art.** `backgrounds/artemis.jpg` is the whole NASA frame: 8256×5504 re-encoded at 4096×2731
(Lanczos, JPEG quality 90, 4:2:0), 1.0 MB. No crop, no exposure change, no gradient, no fade, no
grain added — the photograph as published, at a size a GPU texture likes. The frame's own facts,
measured on the original: the Moon's disc centre `3357.5, 2794.0` (radii `1247.5 × 1238.0`), the
outer 8 px border `2.84, 3.02, 3.61` (hence `canvas` `#030304`), overall mean luminance `11.3`,
99.9th percentile `101` of 255.

```sh
python3 -c "from PIL import Image; Image.open('art002e015967.jpg').resize((4096,2731), Image.LANCZOS).save('backgrounds/artemis.jpg', quality=90, subsampling=1, optimize=True)"
```

## Watch out

- **`#00000000` is transparent.** An earlier build of this layout shipped the opposite claim
  ("a zero-alpha fill paints black") and built its design around it. It was wrong — the test that
  produced it put the image behind a dark plate and read the plate's own near-black, not the
  image. Verify a fill's transparency with a bright test image (`fit: "contain"` a solid red
  3000×2000 PNG): if the red reaches the pane, the fill is transparent.
- **The root `background` image renders behind every pane, and `fit: "contain"` works.** Both were
  denied by that same earlier build. The image is drawn first, the whole tree over it; only fills
  in the tree hide it.
- **The letterbox must be the picture's own border colour.** The frame's border is not `#000`
  and not the theme's canvas: it is `#030304` (mean `2.84, 3.02, 3.61` over the outer 8 px). A
  hard black there reads as a bar the moment the window is dimmed or the display is not
  sRGB-bright.
- **`contain` in a very tall window gives a band, and that is the deal.** The window here was
  2880×5060 once; the plate then occupies the middle 38 % with the same near-black above and
  below. Filling the height would crop the frame — the one thing this layout must not do. Don't
  "fix" it with `cover`.
- **`terminal_opacity` 0.25 makes a terminal's *paper* see-through, and only its paper.** Measured:
  a cell the program leaves unpainted (a shell's background, pi's page between its blocks) is
  composited with the photograph behind it, and its **glyphs keep full brightness** (a crop of the
  same text measures max 212 at `1.0` and at `0.4`); a cell whose background the program paints
  itself (a colour swatch, `vim`'s status line, pi's tool blocks) is untouched at every opacity.
  0.25 is where the frame still reads as a photograph (worst backdrop a glyph ever sits on is
  ~80, so cream text on it is ~4:1) while the pane keeps a faint floor; `0` leaves no floor at
  all, and `0.5` and above hides half the picture behind smoke.
- **`chrome` is `#00000000` on purpose.** The bar paints `theme().chrome`, so a transparent chrome
  is what keeps its type on the photograph; the four plates name the literal `#070b1240` instead.
  Don't set `chrome` to the plate colour: the bar would grow a band across the top of the window.
- **A plate's corner is its node's `radius`; the pane's is `content.pane.radius`.** The app clips
  the frame's content — the header mod's tint and its 1 px rule, the terminal's paper — to the
  rounded rect, and draws the `focus` border on the same arc, so a rounded pane needs no square
  header. Measured on 0.1.15 by painting the pane opaque at `radius` 20: neither a square corner
  nor a straight-ended divider shows outside the curve. Put the value in `content.pane`, not on
  the node, or the frame stays square.
- **The app may rewrite its own copy of this picture.** After a click it can set the app folder's
  `layouts/artemis.svg` `rx` values to the clicked radii (`3.11` = 14 px at 4.5 px per unit), the
  same pass that writes click radii into `layouts/artemis.json`. The repo's hand-drawn file is the
  one that ships; don't copy the app's rewrite back.
- **`colors.background` is a 20 % tint, not a solid.** It keeps printed text readable over the
  corona without hiding the photograph; the four plates double it to 25 %. A new mod inside the
  work column sits on that same thin smoke, so give any new panel its own fill.
- **Menu surfaces are deliberately opaque** (`popover` `#0a1017`, `raised` `#0d141c`, `input`
  `#0c131a`): a menu over a photograph needs a floor, and `solid` is the opaque accent for filled
  buttons.
- **`spaces` and `agents` need `weight: 1` with `min: 90`**, or one of them takes the rail's
  height and the other is left with nothing.
- **The bar keeps 78 px clear on the left on macOS** (`pl(mac ? 78 : 12)`; 12 in fullscreen, which
  draws no traffic lights) for them at `[14, 13]`; drop it and the mark sits under the window
  buttons. Where the system draws no
  buttons (`window().buttons`), the bar draws its own at the right instead.
- **The `files` / `changes` panel starts hidden** and is reachable from the tab bar; it is 340 px
  (`min` 280, `max` 900) and takes its width from the pane area.
- **The monitor's memory figure is not `top`'s.** `top` prints `31G used … 252M unused`, which is the
  total minus free; a healthy Mac reads 99 % that way forever, because file cache counts as used.
  The monitor adds the pages actually in use — `(active + wired + compressor) × page size` — which
  is `23.1/32G` on the same Mac at the same moment. Don't “correct” it to `total − free`.
- **`iostat`'s first line is the average since boot.** `-c 2 -w 1` prints two samples a second
  apart; only the second is the reading. A build that takes the first line reports ~20 % on this
  Mac and barely moves. Take the last data line and its last six fields (`us sy id 1m 5m 15m`),
  whatever disks stand before them.
- **The machine is the active space's, not the focused pane's.** Every tab and split of a space
  lives on that space's machine, so `spaces().find((s) => s.active).machine` is the one the bar is
  about; the left end of the bar names it. On a switch the old reading is dropped before the new one
  arrives, and `gen` throws away a sample that lands after the switch — otherwise a slow host would
  paint its numbers over the new machine's.
- **Two dialects; a third system draws nothing.** macOS answers with `iostat`/`vm_stat`/`sysctl`,
  Linux with two reads of `/proc/stat` a second apart plus `/proc/meminfo` in one `sh -c`. `uname -s`
  picks, once per machine, and the answer is cached — but a *failure* is not cached, so a host that
  was asleep is asked again rather than written off for the session. Windows has neither, so the
  block stays empty there.
- **`exec(…, {on})` is herdr-core on that machine, not a shell here.** The mod never runs `ssh` and
  holds no key or host list: it uses the connection Herdr already keeps for that space, and an
  offline host rejects like a missing program does — nothing drawn, one retry a minute.
- **Linux memory is `MemTotal − MemAvailable`, not free plus caches.** `MemAvailable` is the
  kernel's own estimate of what a new workload could get, which is what "used" should mean; adding
  buffers and cache would report the host as nearly full, the way `top`'s first column does.
- **A remote sample is one round trip with a second of it spent asleep.** Measured here: 30–60 ms of
  link plus the probe's own `sleep 1`. The poll stays three seconds and `busy` skips ticks on a slow
  link rather than stacking samples, so a bad host backs off by itself.
- **`vm_stat`'s page size is 16384 on Apple Silicon and 4096 on Intel** — read it from the header
  (`page size of N bytes`); assuming 16384 reports memory 4× off on an Intel Mac.
- **The block is 308 px for 306 px of content.** 1 px border + 2 × 12 px padding + 281 px
  (CPU `24 + 7 + 34 + 7 + 46`, then `10 + 1 + 10`, then MEM `24 + 7 + 58 + 7 + 46`) = 306; the two
  spare pixels are `justify_end`'s slack, so nothing is stretched. Change `TICKS` or a `width`
  and the layout's `px` must change with it — a short block clips the CPU label on the left, not
  on the right.
- **The `status` row is `resizable: false`, and that is load-bearing.** Rows are draggable at their
  boundaries by default, so without it the seam is a handle that can squeeze the monitor under its
  306 px of content — and a clicked size persists in `layouts/.state/`. The block also carries
  `min: 308` as a second guard.
- **`herdr-app check` proves little about this mod.** `render()` returns an empty `div()` until a
  sample has landed, so the check exercises `init`'s two timers and that empty block — and no program
  at all, since the samples start on the timer; the numbers and their strips are built only in the
  window. (This is how a leftover variable name got past the check and into a bar that would not
  re-render.)
- **`iostat` sleeps one second per sample, and that is the cost.** `top -l 2 -n 0 -s 1` measures the
  same interval for ~0.7 s of CPU; `iostat` spends ~10 ms and `vm_stat` ~2 ms. Don't swap it for
  `top`, and don't poll faster than the bar can be read.
- **Three failures, then one try a minute.** On a machine that has neither program an every-tick
  retry would spawn a failing `exec` for as long as the window lives: `missing` sets `wait` to 20
  ticks after the third failure in a row (63 s to the next try), so a machine without the programs
  costs almost nothing and a transient timeout still recovers. A failed sample also paints nothing as
  “now” — `live` false means `dim` numbers and no cream tick.
- **The monitor paints no fill of its own.** The plate, its rule and its smoke belong to the
  `status` row. Give the mod a `.bg(...)` and the bar becomes two plates with a seam down it.
- **The photograph is public domain; keep the credit.** The layout ships the frame re-encoded,
  not the 8256×5504 original; both are NASA/US-government works. Credit NASA / JSC, imply no
  endorsement.

## Done when

Copy `layouts/`, `mods/` and `backgrounds/` into `~/.config/herdr-app/`, then:

```sh
herdr-app check ~/.config/herdr-app/mods/artemis-bar           # exit 0
herdr-app check ~/.config/herdr-app/mods/sysmon                # exit 0
herdr-app do layout.switch --name artemis
herdr-app status                                               # "layout": "artemis", "errors": []
herdr-app shot /tmp/artemis.png
```

…and in the window:

- the photograph is whole: nothing is cropped, and where the window is a different shape the
  bars above and below (or either side) blend into the frame's own edge with no line to see;
- the rail opens with `Spaces` at once — no title block, no credit; then `Agents`;
- every plate is a round sheet: 14 px on the rail, the pane and the panel, 12 on the tab strip,
  10 on the status bar, and the pane's header is two thin layers (20 % tint + a 1 px rule) clipped
  to the frame's curve, not a square slab;
- the bar shows the eclipse mark, `ARTEMIS` `II`, the active space with its branch (plus a folder and
  a named tab when they differ), and a UTC clock that advances every second — and nothing else;
- a pane running a shell shows the picture behind its text (the Moon's limb, its craters and the
  corona read through), pi's page shows it too, and the blocks pi paints itself stay opaque;
- an agent that starts working makes the mark pulse; blocking turns it coral and pulses it
  faster; both stop when nothing is working or blocked;
- the status bar's right end reads `CPU 33% ▁▁…` and `MEM 23.1/32G ▁▁…`: two numbers in the bar's
  mono face with `%` and `G` in fixed columns, and two twelve-tick strips whose newest tick is cream
  and the rest grey-blue, updating every three seconds without the layout moving;
- switch to a space on another machine (`hw-nj`): the same two readings become that host's — `MEM`
  shows its total, 15G rather than 32G — and both strips restart instead of carrying the other
  machine's history; switch back and this computer's return, with nothing of the other host left;
- a space on a machine that cannot be reached leaves the block blank — no last-known numbers, no
  “—”, nothing in `herdr-app status`;
- `yes > /dev/null` in a few shells drives the CPU into the 90s and the strip stands up into a comb
  over a few samples, then falls back when they stop; memory barely moves;
- the seam between `workspace-status` and the monitor is one 1 px rule and cannot be dragged; the
  bar's top edge is still two thin layers;
- dragging the bar moves the window, dragging the rail's edge resizes it, and no press that
  starts on a control ever does either;
- the tab bar's Files button opens a 340 px panel on the right and nothing else moves;
- `ctrl-shift-l` returns to the person's other layouts.
