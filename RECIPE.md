# Artemis

A Herdr layout whose ground is one NASA photograph: ART002E015967, *The Planets Shine Bright*
— the Artemis II crew's view of the Moon eclipsing the Sun from Orion, 6 April 2026, 4,067 mi
from the Moon. The whole frame, uncropped and ungraded, sits behind the entire window with
`fit: "contain"`; where the window is a different shape the layout paints the frame's own
border colour (`#030304`), so the empty part of the window is not a bar but the photograph
running out of stars. Nothing in the layout paints a solid background: the rail, the tab
strip, the status bar and the panes are smoked glass at 25 %, and their type sits straight on
the picture. The accent and the four agent status colours are sampled from the photograph.

![Artemis](preview.png)

## What you see

**The window.** Root `padding` `14`, `gap` `10`, `titlebar: none`, traffic lights at `[14, 13]`,
theme `graphite` with the `colors` map below, terminal padding `[14, 17]`, `terminal_opacity` `1`,
and `background` `{ "image": "mods/artemis-head/photo.jpg", "fit": "contain" }`.

**The ground.** The photograph, whole: 3:2, no crop, no grade, no vignette, no fade. `contain`
fits it inside the window and centres it. An aspect wider than 3:2 (a 16:10 window) leaves the same near-black at the sides — 90 px
either side at 2880 px wide; an aspect narrower than 3:2 (a tall window) leaves it above and
below, and the picture becomes a band across the middle. Those bars are `canvas` `#030304` — the value measured off the frame's own
outer 8 px (mean `2.84, 3.02, 3.61`) — so the picture's edge and the window's edge are the same
colour and there is no seam to see. What the photograph contributes: its near-black sky (mean
luminance 11 of 255) with the frame's own stars, the Moon's disc in its left third, the corona's
ring around it, and Saturn and Mars as two small dots to the right of the disc.

**Smoked glass.** Every layout node is transparent unless it is one of these five surfaces, and
they all use `chrome` `#070b1240` (25 % of `#070b12`) with a `1px` border of `#ffffff1f`:

| surface | radius | size |
|---|---|---|
| `sidebar` (the rail) | 14 | 292 px, `min` 220, `max` 420 |
| `tabs` | 12 | 38 px tall, `window_drag: true` |
| `status` | 10 | 26 px tall |
| `panel` (files / changes) | 14 | 340 px, `min` 280, `max` 900, `hidden: true` |
| `pane` | 14 | fills the work area; **no fill at all** — a `1px` `#ffffff1f` frame, `accent` `#e9d8b9` on the pane holding the keyboard |

**Top bar — 38 px, full width, `window_drag: true`, no fill of its own.** Its mod paints the
same 25 % chrome so its controls stay clickable over the corona, and its type sits on that. One
row at 11.5 px, left to right:

- **the eclipse mark, 16 px:** a 1 px outer ring at `#e9d8b938` (accent at 22 %), a 1 px
  `#e9d8b9` rim at 11 px, and a 5 px Moon disc in `#05080c`.
- `ARTEMIS` at 10.5 px `font_semibold` in `#e7ecf3`, then `II` at 9 px in `accent` `#e9d8b9`.
- a `│` separator at `${muted}44`, 11 px margin each side, then the active space's name at 12 px
  `foreground` (max 240 px), its git branch (180 px), the focused terminal's folder leaf (160 px)
  and the tab's name (200 px) at 11.5 px `dim` `#828d9c` — each truncated.
- a flexible spacer, then **four tallies** — `working`, `blocked`, `done`, `idle`: 19 px tall,
  radius 5, a 5 px dot and the count at 10.5 px. A non-empty tally sits on that status colour at
  12 % (`${color}1f`); an empty one is the 5 px dot in `dim`, no plate, no number.
- the **UTC clock**, `HH:MM:SS` at 11 px in `settings().font_family` (else JetBrains Mono), plus
  `UTC` at 9 px `dim`, 10 px to its left.
- On Linux and Windows only (`window().buttons`): minimise, maximise/restore, close — 30 px
  each, glyphs in `dim`.

**Rail — 292 px.** One glass plate, `padding` 14, holding, top to bottom:

1. **`plate` — 104 px, mod `artemis-head`, no fill:** the photograph's own facts, printed where
   the sky is emptiest.
   - the kicker `ARTEMIS II · ART002E015967` at 8.5 px in `accent`;
   - the title `The Planets Shine Bright` at 12.5 px `font_semibold` `foreground`; under it,
     when the rail is at least 250 px wide, `Orion · 6 Apr 2026 · 4,067 mi from the Moon` at
     9 px `muted` — both truncated to one line;
   - a 1 px `#ffffff14` hairline, `mt 8`;
   - one row under the rule: a 5 px status dot, then `NASA / JSC · public domain` at 9 px `dim`;
     the frame number `ART002E015967` at 8.5 px mono `dim` on the right.
2. **`spaces`** — the shipped `spaces` mod, `weight: 1`, `min` 90.
3. **`agents`** — the shipped `agents` mod, `weight: 1`, `min` 90.

**Work column** — `gap` 12: `tabs` 38 px with the shipped `tabs` mod → `work-body` row, `gap` 10 →
the pane area and the hidden panel → `status` 26 px, the shipped `workspace-status`.

**Panes** are bare frames: 10 px between them, radius 14, no fill, `1px` `#ffffff1f` border;
the pane holding the keyboard gets a `1px` `accent` border instead. Each carries the shipped
`pane` header, 30 px, at the top, always visible: program icon, title, folder, split / zoom /
close. `lone: true`, so a single pane fills the area. Terminal padding 14 px vertical, 17
horizontal.

**Colours** are theme `graphite` plus the root `colors` map: `canvas` `#030304`, `background`
`#00000000`, `surface` `#00000000`, `chrome` `#070b1240`, `popover` `#0a1017`, `raised`
`#0d141c`, `input` `#0c131a`, `hover` `#ffffff0d`, `selected` `#ffffff14`, `border`
`#ffffff1f`, `foreground` `#e7ecf3`, `muted` `#b7c2cd`, `dim` `#828d9c`, `accent` `#e9d8b9`,
`accent_foreground` `#0a0c11`, `solid` `#111820`, `solid_foreground` `#0a0f15`, `selection`
`#2a3a4d66`, `working` `#8bb3d9`, `blocked` `#e08a6c`, `done` `#d8c8a6`, `idle` `#5f6a78`,
`unknown` `#47525f`, and the 16-colour ANSI ramp `#121821 #dd7a63 #a3bd97 #e3c88d #7fa6cf
#c39ecf #83bfc0 #c9d2dc #3b4655 #ef9781 #bcd4ab #f2dba3 #9cc0e6 #d8b5e2 #9ed8d6 #edf2f7`
(`ansi0`–`ansi15`). Fonts are the person's own; the layout sets none, but the clock and the
frame number ask for `settings().font_family` (else JetBrains Mono) because they are numerals.

## How it behaves

**Agent status, in three places, from the same four colours:**

| status | colour | the bar's tally | the bar's mark | the plate's dot |
|---|---|---|---|---|
| `working` | `#8bb3d9` | dot fades 0.45 → 1 every 2000 ms, count on a 12 % plate | pulses, 2400 ms | pulses, 2000 ms |
| `blocked` | `#e08a6c` | dot fades 0.3 → 1 every 900 ms | turns coral, pulses every 900 ms | pulses every 900 ms |
| `done` | `#d8c8a6` | steady cream dot and count | steady cream | steady cream |
| `idle` | `#5f6a78` | steady dim dot and count | steady cream | steady dim |
| none | — | dim dot, no plate, no number | steady cream | dim dot |

The bar's mark and the plate's dot show only the most urgent status present, in the order
`blocked` > `working` > `done` > `idle`. The bar shows all four counts; the plate shows one.

**Clicks and hovers**

- Clicking a non-empty tally runs `agent.focus` with that status's first agent
  (`{terminal: address}`); hovering it deepens the plate to `${color}33` and turns the count
  `foreground`. Empty tallies do nothing.
- Clicking the plate's title row or its credit row calls `notify()` with the photograph's full
  caption, the credit and the source URL. Hovering the credit text lifts it from `dim` to
  `muted`.
- Clicking the plate's 5 px dot runs `agent.next`; it is only clickable when an agent exists.
- Both mods stop the left mouse-down on their controls, so a window drag never starts from a
  button; the bar's and the tab strip's `window_drag` take every other press.
- Everything else — the space and agent lists, the tab bar, the pane headers, the status bar,
  the panel — behaves as in Herdr's own layouts, because it is those shipped mods.

**What moves**

- Dragging the bar moves the window, and so does dragging the tab strip — both blocks are
  `window_drag: true`. On Linux and Windows the bar's own buttons minimise, maximise/restore and
  close it.
- Dragging the rail's right edge resizes it 220–420 px; under 250 px its date line and the frame
  number drop out, leaving kicker, title and credit.
- Motion is native GPUI (`.loop` on opacity); no JS redraws for it. The only timer is the clock —
  one tick a second via `cx.timer.every(1000)`, notifying only when a digit changed.

**Keys** — the layout binds nothing and leaves the person's `keys.json` alone; neither mod binds
a key, runs `exec` or `hc`, or touches the network.

## Built from

```
layouts/artemis.json          the window
layouts/artemis.svg           the picture Settings shows for this layout (root "preview")
mods/artemis-bar/             main.js, mod.json {"place":"none","title":"Artemis bar"}
mods/artemis-head/            main.js, mod.json {"place":"none","title":"Artemis head"},
                              photo.jpg (the ground: the whole frame, re-encoded)
```

**The node tree** (root is a `column`):

```
root  column  titlebar "none", traffic_lights [14,13], theme "graphite" + colors,
              background {image "mods/artemis-head/photo.jpg", fit "contain"},
              padding 14, gap 10, terminal_padding [14,17], terminal_opacity 1,
              preview "layouts/artemis.svg"
├ bar         block 38   window_drag  mod artemis-bar     (no fill; the mod paints chrome)
└ body        row        gap 0
  ├ sidebar   column 292  min 220  max 420
  │ │                    background "chrome"  border {1,"#ffffff1f"}  radius 14
  │ ├ plate   block 104   mod artemis-head    (no fill: the photograph is the ground)
  │ ├ spaces  block weight 1  min 90  mod spaces   (no fill)
  │ └ agents  block weight 1  min 90  mod agents   (no fill)
  └ work      column gap 12  resizable false
    ├ tabs       block 38  window_drag  background "chrome"
    │                    border {1,"#ffffff1f"}  radius 12  mod tabs
    ├ work-body  row  gap 10
    │ ├ main  block  content {tab "active", pane {...}}
    │ └ panel column 340  min 280  max 900  hidden true  background "chrome"
    │          border {1,"#ffffff1f"}  radius 14
    │   └ panel-body  stack  active "files"  children: files, changes
    └ status     block 26  background "chrome"  border {1,"#ffffff1f"}  radius 10
                           mod workspace-status
```

The pane frame is exactly
`{"gap":10,"radius":14,"background":"#00000000","lone":true,"border":{"width":1,"color":"#ffffff1f"},"focus":{"width":1,"color":"accent"},"header":{"content":{"mod":"pane"},"height":30,"position":"top","reveal":"always"}}`.

**`mods/artemis-bar`** (no `props`) is one `h_flex().size_full()`: `.bg(t.chrome)`,
`.pl(mac ? 78 : 12).pr(4)`, `.text_size(11.5)`, `.overflow_hidden()`. It imports `View` and `div`
from `gpui-kit`, `h_flex` from `gpui-base`, and `agents`, `focused`, `home`, `run`, `settings`,
`spaces`, `theme`, `window` from `herdr`; it runs `agent.focus` and, where the system draws no
buttons, `window.minimize` / `window.maximize` / `window.close`. The clock is
`cx.timer.every(1000, …)` over `new Date()` formatted as UTC. Every control is wrapped in
`.on_mouse_down("left", (_e, cx) => cx.stopPropagation())`. The mark is three nested `div()`s:
`size(16).rounded(8).border(1)` at `${color}38`, inside it `size(11).rounded(6).border(1)` at the
status colour, inside that `size(5).rounded(3).bg("#05080c")` — an opaque core, because
`t.background` is now transparent and the Moon's face must not be a hole.

**`mods/artemis-head`** (no `props`) is a `v_flex().size_full()` that paints nothing: the plate
sits at the head of the rail, directly on the photograph. It imports `theme`, `agents`, `notify`,
`run`, `settings` from `herdr`; it calls `notify()` for the caption and `run("agent.next")` from
the dot, and hides its date line and frame number under 250 px of width via `.on_size_change`.
There is no second drawn eclipse in it: the bar's 16 px mark is the only drawn one, because the
ground already carries the real one.

**Shipped mods used:** `spaces`, `agents`, `tabs`, `pane` (pane headers), `workspace-status`,
`files`, `changes`. Nothing needs `keys.json`, `programs.json`, `settings.json` or a theme file:
the look is all in the layout's root.

**The art.** `mods/artemis-head/photo.jpg` is the whole NASA frame: 8256×5504 re-encoded at
4096×2731 (Lanczos, JPEG quality 90, 4:2:0), 1.0 MB. No crop, no exposure change, no gradient, no
fade, no grain added — the photograph as published, at a size a GPU texture likes. The frame's own
facts, measured on the original: the Moon's disc centre `3357.5, 2794.0` (radii `1247.5 × 1238.0`),
the outer 8 px border `2.84, 3.02, 3.61` (hence `canvas` `#030304`), overall mean luminance `11.3`.

```sh
python3 -c "from PIL import Image; Image.open('art002e015967.jpg').resize((4096,2731), Image.LANCZOS).save('mods/artemis-head/photo.jpg', quality=90, subsampling=1, optimize=True)"
```

## Watch out

- **`#00000000` is transparent.** An earlier build of this layout shipped the opposite claim
  ("a zero-alpha fill paints black") and built the whole design around it: plates with
  `background` `#060a11f2` because transparency "could not work". It was wrong — the test that
  produced it put the image behind a dark plate and read the plate's own near-black, not the
  image. Verify a fill's transparency with a bright test image (`fit: "contain"` a solid red
  3000×2000 PNG): if the red reaches the pane, the fill is transparent.
- **The root `background` image renders behind every pane, and `fit: "contain"` works.** The same
  earlier build also claimed neither was true. Both were artefacts of the same bad test. The
  image is drawn first, the whole tree over it; only fills in the tree hide it — and with
  `colors.background` at `#00000000` there are almost none.
- **The letterbox must be the picture's own border colour.** The frame's border is not `#000`
  and not the theme's canvas: it is `#030304` (mean `2.84, 3.02, 3.61` over the outer 8 px). A
  hard black there reads as a bar the moment the window is dimmed or the display is not
  sRGB-bright. Re-measure it if the plate is ever re-encoded from a different frame.
- **`contain` in a very tall window gives a band, and that is the deal.** The window here was
  2880×5060 once; the plate then occupies the middle 38 % with the same near-black above and
  below. Filling the height would crop the frame — the one thing this layout must not do. Don't
  "fix" it with `cover`.
- **A full-screen TUI paints its own background.** The pane is frameless and the terminal's own
  background is transparent (`colors.background`), so a shell pane shows the photograph behind
  its text — but `pi`, `vim`, `less`, `htop` fill their cells, and that pane is opaque no matter
  what the layout says. The terminal is not "not see-through" because of the layout.
- **`terminal_opacity` below 1 dims the text, not just the background.** It is left at `1`: the
  transparency comes from the fills, and dimming a terminal to see more picture costs legibility
  for as long as the window is open.
- **Everything is transparent by default, so anything that prints must bring its own floor.**
  The bar paints `chrome` (25 %); the rail's own 25 % plate is what keeps `spaces` and `agents`
  readable over the corona. A new mod inside the work column would sit directly on the disc.
- **Menu surfaces are deliberately opaque** (`popover` `#0a1017`, `raised` `#0d141c`, `input`
  `#0c131a`): a menu over a photograph needs a floor, and `solid` is the opaque accent for
  filled buttons.
- **The plate is 104 px and clips if you add a line.** A longer title truncates; under 250 px of
  rail the date line and the frame number disappear and the kicker, title and credit remain.
- **`spaces` and `agents` need `weight: 1` with `min: 90`**, or the plate takes the rail's height
  and the lists are left with nothing.
- **The bar keeps 78 px clear on the left on macOS** (`pl(mac ? 78 : 12)`) for the traffic lights
  at `[14, 13]`; drop that and the mark sits under the window buttons. Where the system draws no
  buttons (`window().buttons`), the bar draws its own at the right instead.
- **Zero tallies keep their dot** and lose the plate and the number, so the four statuses stay in
  place instead of dropping out of the row when a count reaches zero.
- **The `files` / `changes` panel starts hidden** and is reachable from the tab bar; it is 340 px
  (`min` 280, `max` 900) and takes its width from the pane area.
- **The plate's dot and the bar's tallies act on agents, not panes**: `agent.next` and
  `agent.focus` do nothing when there is no agent in that status.
- **No letterspacing exists** in gpui-kit; the wordmark is bold caps, not spaced caps.
- **The photograph is public domain; keep the credit.** The layout ships the frame re-encoded,
  not the 8256×5504 original; both are NASA/US-government works. Credit NASA / JSC, imply no
  endorsement.

## Done when

Copy `layouts/` and `mods/` into `~/.config/herdr-app/`, then:

```sh
herdr-app check ~/.config/herdr-app/mods/artemis-bar           # exit 0
herdr-app check ~/.config/herdr-app/mods/artemis-head          # exit 0
herdr-app do layout.switch --name artemis
herdr-app status                                               # "layout": "artemis", "errors": []
herdr-app shot /tmp/artemis.png
```

…and in the window:

- the photograph is whole: nothing is cropped, and where the window is a different shape the
  bars above and below blend into the frame's own edge with no line to see;
- the rail, the tab strip and the status bar are visibly lighter than the sky and show the
  photograph through them; the rail carries the kicker, the title, the date line, a hairline and
  the credit with the frame number on the right;
- the bar shows `ARTEMIS` `II`, the active space with its branch and folder, the four tallies and
  a UTC clock that advances every second;
- a pane running a shell shows the picture behind its text, and a pane running a full-screen TUI
  does not — that is the TUI, not the layout;
- with two panes open, the one holding the keyboard has a cream hairline and the other a grey
  one, and both have a 30 px header with split / zoom / close;
- an agent that starts working pulses the bar's mark and lights the `working` tally blue;
  blocking turns the mark coral and pulses it faster; a finished agent lights `done` cream;
- clicking a non-empty tally focuses that agent; clicking the plate posts a toast with the credit
  and the caption; clicking the plate's dot jumps to the next agent;
- dragging the bar moves the window and no press that starts on a control ever does;
- the tab bar's Files button opens a 340 px panel on the right and nothing else moves;
- `ctrl-shift-l` returns to the person's other layouts.
