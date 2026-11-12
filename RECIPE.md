# Artemis

A Herdr layout cut from one NASA photograph — ART002E015967, *The Planets Shine Bright*,
the Artemis II crew's view of the Moon eclipsing the Sun from Orion, 6 April 2026, 4,067 mi
from the Moon. Two plates are composed from it and only from it: `mods/artemis-head/sky.jpg`
(3200×2000), which is the window's own frame, and `mods/artemis-head/rail.jpg` (1800×1200),
the limb that runs down the top of the left rail. The sky is open across the top of the
window, where a 38 px bar carries the mission mark, the active space and four agent tallies;
the rail's band carries the photograph's title, date, frame number and credit, printed where
the light fades out. Terminals are dark plates on what is left. The accent and the four
agent status colours are sampled from the photograph, the rest of the palette is its sky,
and nothing is drawn that the photo does not contain.

![Artemis](preview.png)

## What you see

**The window.** Root `padding` `[28, 0]` (28 px above and below, none at the sides), `gap: 0`,
`titlebar: none`, traffic lights at `[14, 13]`, theme `graphite` with the `colors` map in
the file. The sky plate covers the whole window; the layout's own nodes paint fills over
it, so what you see of `sky.jpg` is the window's own band — 28 px along the top and the
bottom, all of the work column's 20 px right inset — plus the open sky across the top of the
window, 66 px (28 padding + 38 bar), the `bar` block being the one region with no fill. A hot
cream rim line runs along the bottom of that band and the corona's light climbs it.

**Top bar — 38 px, full width, `window_drag: true`, no background.** Its type sits straight
on the sky. One row at 11.5 px, left to right:

- **the eclipse mark, 16 px:** a 1 px outer ring at `#e9d8b938` (accent at 22 %), a 1 px
  `#e9d8b9` rim at 11 px, and a 5 px Moon disc in `background` `#060a11f2`.
- `ARTEMIS` at 10.5 px `font_semibold` in `foreground` `#e7ecf3`, then `II` at 9 px in
  `accent` `#e9d8b9`.
- a `│` separator at `${muted}44`, 11 px margin each side, then the active space's name at
  12 px `foreground` (max 240 px), its git branch (180 px), the focused terminal's folder
  leaf (160 px) and the tab's name (200 px) at 11.5 px `dim` `#828d9c` — each truncated.
- a flexible spacer, then **four tallies**, `working`, `blocked`, `done`, `idle`: 19 px
  tall, radius 5, a 5 px dot and the count at 10.5 px. A non-empty tally sits on that status
  colour at 12 % (`${color}1f`); an empty one is the 5 px dot in `dim`, no plate, no number.
- the **UTC clock**, `HH:MM:SS` at 11 px in `settings().font_family` (else JetBrains Mono),
  plus `UTC` at 9 px `dim`, 10 px to its left.
- On Linux and Windows only (`window().buttons`): minimise, maximise/restore, close — 30 px
  each, 11 px glyphs in `dim`.

**Rail — `sidebar`, 292 px** (`min` 220, `max` 420), no card of its own: the band at its top
bleeds to the window's left edge and dissolves into the black above the lists. Top to bottom:

1. **`plate` — 400 px,** mod `artemis-head`, `background` `{image: mods/artemis-head/rail.jpg,
   fit: cover}`, padding 14 px side, 12 below. The photograph is the block: the Moon's limb
   runs vertically through it, corona to its left, the Moon's dark face to its right, and the
   JPEG fades to the window's black at its top and bottom, so no edge of the band is a line.
   The mod prints, at the band's foot and nothing else:
   - the kicker `ARTEMIS II · ART002E015967` at 8.5 px in `accent`;
   - the title `The Planets Shine Bright` at 12.5 px `font_semibold` `foreground`; under it,
     when the rail is at least 250 px wide, `Orion · 6 Apr 2026 · 4,067 mi from the Moon` at
     9 px `muted` — both truncated to one line;
   - a 1 px `#ffffff14` hairline;
   - one row under the rule: a 5 px status dot, then `NASA / JSC · public domain` at 9 px
     `dim`; the frame number `ART002E015967` at 8.5 px mono `dim` on the right.
2. **`spaces`** — the shipped `spaces` mod, `weight: 1`, `min` 90.
3. **`agents`** — the shipped `agents` mod, `weight: 1`, `min` 90.

**Work column** — `padding` `[10, 20]`, `gap: 12`: `tabs` 38 px, the shipped `tabs` mod on a
plate (`chrome`, 1 px `border`, radius 12, shadow `sm`) → `work-body` row with a 10 px gap →
the pane area and a hidden panel → `status` 26 px, the shipped `workspace-status` on the same
plate look (radius 10, shadow `sm`).

**Panes** are plates: 10 px between them, radius 14, `background` `#060a11f2`, 1 px
`border` `#ffffff24`, shadow `lg`; the pane holding the keyboard gets a 1 px `accent`
`#e9d8b9` border instead. Each carries the shipped `pane` header, 30 px, on top, always
visible: program icon, title, folder, split / zoom / close. `lone: true`, so a single pane
fills the area. Terminal padding is 14 px vertical, 17 horizontal; `terminal_opacity` is 1.

**Panel** — `column`, 340 px (`min` 280, `max` 900), `hidden: true`, holding a `stack` of
the shipped `files` and `changes` mods with `files` active. Opened from the tab bar.

**Colours** are theme `graphite` plus the root `colors` map: `canvas` `#04060b`,
`background` `#060a11f2`, `chrome` `#080d14d0`, `surface` `#070b12f2`, `popover` `#0b1018`,
`raised` `#111a24`, `hover` `#ffffff14`, `selected` `#ffffff1f`, `border` `#ffffff24`,
`input` `#28313f`, `foreground` `#e7ecf3`, `muted` `#b7c2cd`, `dim` `#828d9c`, `accent`
`#e9d8b9`, `accent_foreground` `#0a0c11`, `solid` `#e9d8b9`, `solid_foreground` `#0a0c11`,
`selection` `#2a3a4d66`, `working` `#8bb3d9`, `blocked` `#e08a6c`, `done` `#d8c8a6`,
`idle` `#5f6a78`, `unknown` `#47525f`, and the 16-colour ANSI ramp `#121821 #dd7a63
#a3bd97 #e3c88d #7fa6cf #c39ecf #83bfc0 #c9d2dc #3b4655 #ef9781 #bcd4ab #f2dba3 #9cc0e6
#d8b5e2 #9ed8d6 #edf2f7` (`ansi0`–`ansi15`). Fonts are the person's own; the layout sets
none, but the clock and the frame number ask for `settings().font_family` (else JetBrains
Mono) because they are numerals.

## How it behaves

**Agent status, in three places, from the same four colours:**

| status | colour | the bar's tally | the bar's mark | the band's dot |
|---|---|---|---|---|
| `working` | `#8bb3d9` | dot fades 0.45 → 1 every 2000 ms, count on a 12 % plate | pulses, 2400 ms | pulses, 2000 ms |
| `blocked` | `#e08a6c` | dot fades 0.3 → 1 every 900 ms | turns coral, pulses every 900 ms | pulses every 900 ms |
| `done` | `#d8c8a6` | steady cream dot and count | steady cream | steady cream |
| `idle` | `#5f6a78` | steady dim dot and count | steady cream | steady dim |
| none | — | dim dot, no plate, no number | steady cream | dim dot |

The bar's mark and the band's dot show only the most urgent status present, in the order
`blocked` > `working` > `done` > `idle`. The bar shows all four counts; the band shows one.

**Clicks and hovers**

- Clicking a non-empty tally runs `agent.focus` with that status's first agent
  (`{terminal: address}`); hovering it deepens the plate to `${color}33` and turns the count
  `foreground`. Empty tallies do nothing.
- Clicking the band's title row or its credit row calls `notify()` with the photograph's
  full caption, the credit and the source URL. Hovering the credit text lifts it from `dim`
  to `muted`.
- Clicking the band's 5 px status dot runs `agent.next`; it is only clickable when an agent
  exists.
- Both mods stop the left mouse-down on their controls, so a window drag never starts from
  a button; the bar's `window_drag` takes every other press.
- Everything else — the space and agent lists, the tab bar, the pane headers, the status
  bar, the panel — behaves as in Herdr's own layouts, because it is those shipped mods.

**What moves**

- Dragging the bar moves the window, and so does dragging the tab strip — both blocks are
  `window_drag: true`. On Linux and Windows the bar's own buttons minimise,
  maximise/restore and close it.
- Dragging the rail's right edge resizes it 220–420 px; the band stays 400 px tall, and
  under 250 px of rail its date line and the frame number drop out.
- Motion is native GPUI (`.loop` on opacity); no JS redraws for it. The only timer is the
  clock — one tick a second via `cx.timer.every(1000)`, notifying only when a digit changed.

**Keys** — the layout binds nothing and leaves the person's `keys.json` alone; neither mod
binds a key, runs `exec` or `hc`, or touches the network.

## Built from

```
layouts/artemis.json          the window
layouts/artemis.svg           the picture Settings shows for this layout (root "preview")
mods/artemis-bar/             main.js, mod.json {"place":"none","title":"Artemis bar"}
mods/artemis-head/            main.js, mod.json {"place":"none","title":"Artemis head"},
                              sky.jpg (the window's frame), rail.jpg (the rail's band)
tools/make-sky.py             rebuilds both plates from the original NASA frame
```

**The node tree** (root is a `column`):

```
root  column  titlebar "none", traffic_lights [14,13], theme "graphite" + colors,
              background {image "mods/artemis-head/sky.jpg", fit "cover"},
              padding [28,0], gap 0, terminal_padding [14,17], terminal_opacity 1,
              preview "layouts/artemis.svg"
├ bar         block 38   window_drag  mod artemis-bar      (no background)
└ body        row        gap 0
  ├ sidebar   column 292  min 220  max 420   (no background: the band bleeds)
  │ ├ plate   block 400   mod artemis-head
  │ │                    background {image "mods/artemis-head/rail.jpg", fit "cover"}
  │ ├ spaces  block weight 1  min 90  mod spaces
  │ └ agents  block weight 1  min 90  mod agents
  └ work      column gap 12  padding [10,20]  resizable false
    ├ tabs       block 38  window_drag  background "chrome"
    │                    border {1,"border"}  radius 12  shadow "sm"  mod tabs
    ├ work-body  row  gap 10
    │ ├ main  block  content {tab "active", pane {...}}
    │ └ panel column 340  min 280  max 900  hidden true  background "chrome"
    │          border {1,"border"}  radius 14  shadow "lg"
    │   └ panel-body  stack  active "files"  children: files, changes
    └ status     block 26  background "chrome"  border {1,"border"}  radius 10
                           shadow "sm"  mod workspace-status
```

The pane frame is exactly
`{"gap":10,"radius":14,"background":"background","lone":true,"border":{"width":1,"color":"border"},"shadow":"lg","focus":{"width":1,"color":"accent"},"header":{"content":{"mod":"pane"},"height":30,"position":"top","reveal":"always"}}`.

**`mods/artemis-bar`** (no `props`) is one `h_flex().size_full()`: `.bg(t.chrome)`,
`.pl(mac ? 78 : 12).pr(4)`, `.text_size(11.5)`, `.overflow_hidden()`. It imports `View` and
`div` from `gpui-kit`, `h_flex` from `gpui-base`, and `agents`, `focused`, `home`, `run`,
`settings`, `spaces`, `theme`, `window` from `herdr`; it runs `agent.focus` and, where the
system draws no buttons, `window.minimize` / `window.maximize` / `window.close`. The clock
is `cx.timer.every(1000, …)` over `new Date()` formatted as UTC. Every control is wrapped
in `.on_mouse_down("left", (_e, cx) => cx.stopPropagation())`. The mark is three nested
`div()`s: `size(16).rounded(8).border(1)` at `${color}38`, inside it
`size(11).rounded(6).border(1)` at the status colour, inside that
`size(5).rounded(3).bg(t.background)`.

**`mods/artemis-head`** (no `props`) is a `v_flex().size_full()` with a flexible spacer and
then the plate at its foot — it paints no background of its own, so the block's photograph
shows through behind it. It imports `theme`, `agents`, `notify`, `run`, `settings` from
`herdr`; it calls `notify()` for the caption and `run("agent.next")` from the dot, and hides
its date line and frame number under 250 px of width via `.on_size_change`. There is no mark
in it: the window's only drawn eclipse is the bar's 16 px mark, because the band above it is
the real one.

**Shipped mods used:** `spaces`, `agents`, `tabs`, `pane` (pane headers),
`workspace-status`, `files`, `changes`. Nothing needs `keys.json`, `programs.json`,
`settings.json` or a theme file: the look is all in the layout's root.

**The art.** Two JPEGs at quality 90, both composed by `tools/make-sky.py` (needs numpy,
scipy and Pillow; the untouched frame is not in this repository):

- `mods/artemis-head/sky.jpg`, 3200×2000 — 16:10, the window's own shape. The Sun sits below
the frame (`2400, 5390`, radius 3400) so its limb is the hot line the window rests on and
the corona climbs the frame.
- `mods/artemis-head/rail.jpg`, 1800×1200 — landscape on purpose, so `cover` in a 400 px band
crops width and never height: the top and bottom fades always survive. The Sun sits to the
right (`1750, 600`, radius 900), its limb runs vertically, and the JPEG fades to `#04060b`
over its top 16 % and bottom 42 %, which is what lets the band bleed out of the layout.

```sh
python3 tools/make-sky.py art_orig.jpg mods/artemis-head/sky.jpg sky
python3 tools/make-sky.py art_orig.jpg mods/artemis-head/rail.jpg rail
```

Both use only pixels the photograph has: the Moon's disc measured on its rim ridge (centre
`3357.5, 2794.0`; radii `1247.5 × 1238.0`), a 1720×2752 crop of the frame's empty sky for
the star field (its own noise floor subtracted, boosted, faded where the glow is bright), and
the corona's angle profile measured at 1.08–2.9 disc radii and re-radiated around the chosen
Sun. The grade is the photograph's own warm cream.

## Watch out

- **The sky is the window's band, not a picture in it.** The root's `background` image is
  painted behind the window, but every layout node paints its own fill over it, so
  `sky.jpg` shows only in the root's `padding` — 28 px above and below, and the work
  column's 20 px right inset — plus behind the `bar` block, which has no fill. That is the
  design: the window sits on the sky and the top 66 px of it are open. Don't try to make the
  image show under the lists or the terminals: transparency there is painted black, not
  through.
- **The rail's band is the block's own `background` image**, which does render — a leaf
  block with a mod that paints nothing shows it. `fit: contain` did not draw the image at
  all in the builds this was made on; `cover` did. `rail.jpg` is landscape for exactly that
  reason: a `cover` crop of a landscape source inside a tall, narrow band cuts width, never
  height, so the baked fades survive.
- **`terminal_opacity` fades terminal text as well as its background.** It is left at `1`
  on purpose; dropping it dims every command in the window.
- **The window has one drawn eclipse and one real one.** The bar's 16 px mark is the only
  drawn one — don't add a second to the band, the band *is* the photograph.
- **The band is fixed at 400 px.** A longer title truncates; under 250 px of rail the date
  line and the frame number disappear and the kicker, title and credit remain. If you add a
  line, raise the block's `px`.
- **The bar keeps 78 px clear on the left on macOS** (`pl(mac ? 78 : 12)`) for the traffic
  lights at `[14, 13]`; drop that and the mark sits under the window buttons. Where the
  system draws no buttons (`window().buttons`), the bar draws its own at the right instead.
- **Zero tallies keep their dot** and lose the plate and the number, so the four statuses
  stay in place instead of dropping out of the row when a count reaches zero.
- **The `files` / `changes` panel starts hidden** and is reachable from the tab bar; it is
  340 px (`min` 280, `max` 900) and takes its width from the pane area.
- **The plate's dot and the bar's tally both act on agents**, not on panes: `agent.next`
  and `agent.focus` do nothing when there is no agent in that status.- **No letterspacing exists** in gpui-kit; the wordmark is bold caps, not spaced caps.
- **The two plates ship in this repository** (`mods/artemis-head/sky.jpg`,
  `mods/artemis-head/rail.jpg`) because the layout needs them; the untouched original does
  not. Rebuilding them needs the original frame, numpy, scipy and Pillow, and their
  measurements are hard-coded, so they are tuned to this one photograph only. The photograph
  is public domain — credit NASA / JSC, imply no endorsement.

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

- the sky is open across the top 66 px, stars behind the bar, and the bottom 28 px of the
  window carry the hot cream rim line;
- the rail opens with the photograph: the Moon's limb running down the band's left, corona
  to its left and the Moon's dark face to its right, no hard edge anywhere, and the credit
  printed at its foot;
- the bar shows `ARTEMIS` `II`, the active space with its branch and folder, the four
  tallies and a UTC clock that advances every second;
- the band shows the kicker `ARTEMIS II · ART002E015967`, the title, the date line, a
  hairline, and `NASA / JSC · public domain` with `ART002E015967` on the right;
- with two panes open, the one holding the keyboard has a cream hairline and the other a
  grey one, and both have a 30 px header with split / zoom / close;
- an agent that starts working pulses the bar's mark and lights the `working` tally blue;
  blocking turns the mark coral and pulses it faster; a finished agent lights `done` cream;
- clicking a non-empty tally focuses that agent; clicking the band posts a toast with the
  credit and the caption; clicking the band's dot jumps to the next agent;
- dragging the bar moves the window and no press that starts on a control ever does;
- the tab bar's Files button opens a 340 px panel on the right and nothing else moves;
- `ctrl-shift-l` returns to the person's other layouts.
