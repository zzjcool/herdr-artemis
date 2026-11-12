# Artemis

A Herdr layout whose ground is one NASA photograph: ART002E015967, *The Planets Shine Bright*
— the Artemis II crew's view of the Moon eclipsing the Sun from Orion, 6 April 2026, 4,067 mi
from the Moon. The whole frame, uncropped and ungraded, sits behind the entire window with
`fit: "contain"`; where the window is a different shape the layout paints the frame's own
border colour (`#030304`), so the empty part of the window is not a bar but the photograph
running out of stars. No plate is filled: the rail, the tab strip, the status bar and the
pane are 25 % smoke and the default is a 20 % tint, so the sky, the disc and its corona sit
behind the whole interface — and a terminal's paper is 25 % smoke, so the Moon's limb, its
craters and the corona read straight through the text. Every plate is a right angle: nothing
rounds a corner the photograph does not.

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
`#00000000` on purpose: the shipped `pane` header paints `chrome`, and that is what lets the
header's title and buttons float on the picture instead of filling a slab across the top of the
pane.

**The four plates** carry the sturdier version of the same smoke — the literal `#070b1240`
(25 % of `#070b12`) with a `1px` border of `#ffffff1f`, and **no radius**:

| plate | size |
|---|---|
| `sidebar` (the rail) | 292 px, `min` 220, `max` 420 |
| `tabs` | 38 px tall, `window_drag: true` |
| `status` | 26 px tall |
| `panel` (files / changes) | 340 px, `min` 280, `max` 900, `hidden: true` |

**The pane** is a bare frame: it inherits the 20 % smoke, gets a `1px` `#ffffff1f` border (the
pane holding the keyboard takes `accent` `#e9d8b9` instead), radius 0, and the shipped `pane`
header 30 px at the top, always visible: program icon, title, folder, split / zoom / close.

**Top bar — 38 px, full width, `window_drag: true`, nothing painted.** Its type sits straight on
the photograph. One row at 11.5 px, left to right:

- **the eclipse mark, 16 px:** a 1 px outer ring at `#e9d8b938` (accent at 22 %), a 1 px
  `#e9d8b9` rim at 11 px, and a 5 px Moon disc in `#05080c`.
- `ARTEMIS` at 10.5 px `font_semibold` in `#e7ecf3`, then `II` at 9 px in `accent` `#e9d8b9`.
- a `│` separator at `${muted}44`, 11 px margin each side, then the active space's name at 12 px
  `foreground` (max 240 px), its git branch (180 px), the focused terminal's folder leaf (160 px)
  and the tab's name (200 px) at 11.5 px `dim` `#828d9c` — each truncated.
- a flexible spacer, then the **UTC clock**, `HH:MM:SS` at 11 px in `settings().font_family` (else
  JetBrains Mono), with `UTC` at 9 px `dim`, 5 px to its left.
- On Linux and Windows only (`window().buttons`): minimise, maximise/restore, close — 30 px
  each, glyphs in `dim`.

**Rail — 292 px.** One plate, `padding` 14, holding, top to bottom:

1. **`spaces`** — the shipped `spaces` mod, `weight: 1`, `min` 90.
2. **`agents`** — the shipped `agents` mod, `weight: 1`, `min` 90.

**Work column** — `gap` 12: `tabs` 38 px with the shipped `tabs` mod → `work-body` row, `gap` 10 →
the pane area and the hidden panel → `status` 26 px, the shipped `workspace-status`.

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

**The mark, and nothing else, carries agent status.** The bar's 16 px eclipse takes the most
urgent status present, in the order `blocked` > `working` > `done` > `idle`:

| status | the mark |
|---|---|
| `blocked` | ring and rim coral `#e08a6c`, pulsing 0.35 → 1 every 900 ms |
| `working` | ring and rim cream `#e9d8b9`, pulsing 0.5 → 1 every 2400 ms |
| `done`, `idle`, none | ring and rim cream `#e9d8b9`, steady |

Counts are not repeated in the bar: the `agents` list in the rail is where they belong.

**Clicks and hovers**

- Both mods stop the left mouse-down on their controls, so a window drag never starts from a
  button; the bar's and the tab strip's `window_drag` take every other press.
- Nothing in the bar is clickable — the mark is a lamp, not a button. Everything else — the space
  and agent lists, the tab bar, the pane headers, the status bar, the panel — behaves as in
  Herdr's own layouts, because it is those shipped mods.

**What moves**

- Dragging the bar moves the window, and so does dragging the tab strip — both blocks are
  `window_drag: true`. On Linux and Windows the bar's own buttons minimise, maximise/restore and
  close it.
- Dragging the rail's right edge resizes it 220–420 px.
- The only motion in the layout is the mark's pulse and the clock: one tick a second via
  `cx.timer.every(1000)`, notifying only when a digit changed. No JS redraws for the pulse — it
  is a native GPUI `.loop` on opacity.

**Keys** — the layout binds nothing and leaves the person's `keys.json` alone; the one mod binds
no key, runs no `exec` or `hc`, and touches no network.

## Built from

```
layouts/artemis.json          the window
layouts/artemis.svg           the picture Settings shows for this layout (root "preview")
backgrounds/artemis.jpg       the ground: the whole NASA frame, re-encoded
mods/artemis-bar/             main.js, mod.json {"place":"none","title":"Artemis bar"}
```

**The node tree** (root is a `column`):

```
root  column  titlebar "none", traffic_lights [14,13], theme "graphite" + colors,
              background {image "backgrounds/artemis.jpg", fit "contain"},
              padding 14, gap 10, terminal_padding [20,24], terminal_opacity 0.25,
              preview "layouts/artemis.svg"
├ bar         block 38   window_drag  mod artemis-bar     (nothing painted)
└ body        row        gap 0
  ├ sidebar   column 292  min 220  max 420  radius 0
  │ │                    background "#070b1240"  border {1,"#ffffff1f"}
  │ ├ spaces  block weight 1  min 90  mod spaces   (no fill)
  │ └ agents  block weight 1  min 90  mod agents   (no fill)
  └ work      column gap 12  resizable false
    ├ tabs       block 38  window_drag  background "#070b1240"
    │                    border {1,"#ffffff1f"}  mod tabs
    ├ work-body  row  gap 10
    │ ├ main  block  content {tab "active", pane {...}}
    │ └ panel column 340  min 280  max 900  hidden true  background "#070b1240"
    │          border {1,"#ffffff1f"}
    │   └ panel-body  stack  active "files"  children: files, changes
    └ status     block 26  background "#070b1240"  border {1,"#ffffff1f"}
                           mod workspace-status
```

The pane frame is exactly
`{"gap":10,"lone":true,"border":{"width":1,"color":"#ffffff1f"},"focus":{"width":1,"color":"accent"},"header":{"content":{"mod":"pane"},"height":30,"position":"top","reveal":"always"}}`
— no `radius`, no `background`, so it keeps the layout's 20 % smoke and its square corners.

**`mods/artemis-bar`** (no `props`) is one `h_flex().size_full()`: `.pl(mac ? 78 : 12).pr(4)`,
`.text_size(11.5)`, `.overflow_hidden()`, and `.bg(t.chrome)` — which is transparent, so the row
paints nothing and its type sits on the photograph. It imports `View` and `div` from `gpui-kit`,
`h_flex` from `gpui-base`, and `agents`, `focused`, `home`, `settings`, `spaces`, `theme`,
`window` from `herdr`; it runs `window.minimize` / `window.maximize` / `window.close` where the
system draws no buttons. The clock is `cx.timer.every(1000, …)` over `new Date()` formatted as
UTC. Every control is wrapped in `.on_mouse_down("left", (_e, cx) => cx.stopPropagation())`. The
mark is three nested `div()`s: `size(16).rounded(8).border(1)` at `${color}38`, inside it
`size(11).rounded(6).border(1)` at the status colour, inside that `size(5).rounded(3).bg("#05080c")`
— an opaque core, because `t.background` is translucent and the Moon's face must not be a hole.

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
- **`chrome` is `#00000000` on purpose.** The shipped `pane` header paints `theme().chrome`; with
  a visible chrome the header is a filled rectangle whose square top corners fight a rounded
  pane frame, which is exactly the misalignment this layout removes. Everything that should be
  visible names the literal `#070b1240` instead.
- **Every plate has radius 0, for the same reason.** A rounded frame around a terminal whose
  content, header and divider are all square leaves a sliver of square corner poking into the
  curve. If you want round plates back, square the header first (`header: {…}` off, or a custom
  header mod that clips).
- **`colors.background` is a 20 % tint, not a solid.** It keeps printed text readable over the
  corona without hiding the photograph; the four plates double it to 25 %. A new mod inside the
  work column sits on that same thin smoke, so give any new panel its own fill.
- **Menu surfaces are deliberately opaque** (`popover` `#0a1017`, `raised` `#0d141c`, `input`
  `#0c131a`): a menu over a photograph needs a floor, and `solid` is the opaque accent for filled
  buttons.
- **`spaces` and `agents` need `weight: 1` with `min: 90`**, or one of them takes the rail's
  height and the other is left with nothing.
- **The bar keeps 78 px clear on the left on macOS** (`pl(mac ? 78 : 12)`) for the traffic lights
  at `[14, 13]`; drop that and the mark sits under the window buttons. Where the system draws no
  buttons (`window().buttons`), the bar draws its own at the right instead.
- **The `files` / `changes` panel starts hidden** and is reachable from the tab bar; it is 340 px
  (`min` 280, `max` 900) and takes its width from the pane area.
- **The photograph is public domain; keep the credit.** The layout ships the frame re-encoded,
  not the 8256×5504 original; both are NASA/US-government works. Credit NASA / JSC, imply no
  endorsement.

## Done when

Copy `layouts/`, `mods/` and `backgrounds/` into `~/.config/herdr-app/`, then:

```sh
herdr-app check ~/.config/herdr-app/mods/artemis-bar           # exit 0
herdr-app do layout.switch --name artemis
herdr-app status                                               # "layout": "artemis", "errors": []
herdr-app shot /tmp/artemis.png
```

…and in the window:

- the photograph is whole: nothing is cropped, and where the window is a different shape the
  bars above and below (or either side) blend into the frame's own edge with no line to see;
- the rail opens with `Spaces` at once — no title block, no credit; then `Agents`;
- every plate is a right angle: rail, tab strip, pane and status bar meet their neighbours
  squarely, and the pane's header title and buttons sit on the photograph with no slab behind them;
- the bar shows the eclipse mark, `ARTEMIS` `II`, the active space with its branch and folder, and
  a UTC clock that advances every second — and nothing else;
- a pane running a shell shows the picture behind its text (the Moon's limb, its craters and the
  corona read through), pi's page shows it too, and the blocks pi paints itself stay opaque;
- an agent that starts working makes the mark pulse; blocking turns it coral and pulses it
  faster; both stop when nothing is working or blocked;
- dragging the bar moves the window, dragging the rail's edge resizes it, and no press that
  starts on a control ever does either;
- the tab bar's Files button opens a 340 px panel on the right and nothing else moves;
- `ctrl-shift-l` returns to the person's other layouts.
