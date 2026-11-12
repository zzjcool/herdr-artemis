# Artemis

A dark mission-console window built around one photograph: NASA's *The Planets Shine Bright*
(the Artemis II crew's view of the Sun eclipsed by the Moon, with its zodiacal-light corona).
The picture is the top third of the left sidebar, with its number, title, date and credit printed
on it. Above everything runs a 38 px bar that reads like an instrument strip — a cream corona ring
around a black Moon, the wordmark, where the keyboard is, one tally per agent status and a UTC
clock. Terminals are cards on a near-black field; the only colours are the photo's own: black,
starlight grey and the warm cream of the corona.

![Artemis](preview.png)

This preview was taken on a real machine, so the spaces and agents lists in the sidebar are
blurred here on purpose: they hold that machine's own spaces. The rest is the layout as built.

## What you see

**Top bar — 38 px, full width, `window_drag`.** Background `chrome` `#080b11`, a 1 px
`border` hairline under it. Left to right, all on one row, 11.5 px, `muted` `#94a1b0`:

- an **eclipse mark**: a 15 px circle, 1 px border, `accent` `#e9d8b9`, with an 8 px `canvas`
  `#04060a` disc centred in it — a corona ring around a black Moon.
- `ARTEMIS` at 10.5 px, `font_semibold`, `foreground` `#e2e8f0`; then `II` at 9 px in `accent`.
- a `│` separator (11 px margin each side, `border` colour).
- the active space's name, 12 px `foreground`; then, only when there is one, its git branch,
  then the focused terminal's folder leaf (e.g. `artemis-demo`), then the tab's name when the tab
  has one — all `#5d6877` `dim`, 11.5 px, each capped (240 / 180 / 160 / 200 px) and truncated.
  The focused folder is left out when it equals the space's name.
- a flexible spacer, then **four tallies** — `working`, `blocked`, `done`, `idle` — each a 19 px
  high rounded-5 pill, 6 px side padding, a 5 px dot and the count at 10.5 px. A zero tally is
  dim, on no background; a non-zero one is drawn in its status colour on that colour at 12 % alpha.
- the **UTC clock**, `HH:MM:SS` at 11.5 px plus a `UTC` label at 9 px, 10 px left margin.
- On Linux and Windows only (`window().buttons`): minimise, maximise/restore and close, 30 px
  wide each, glyphs `–` `▢`/`❐` `✕`, the close one turning `blocked` `#e08a6c`.

**Sidebar — 302 px** (`min` 220, `max` 460, resizable), background `canvas` `#04060a`, a 1 px
`border` divider to its right. Three stacked blocks:

1. **The plaque — 300 px.** The photograph fills the block (`background` image, `fit: cover`,
   corner-square). Two small plates sit on the scrim at the top: the image number
   `ART002E015967` at 9 px, left, and `NASA` right, each on `#04060ab3`, rounded 4. Over the
   photo's black bottom, a caption plate (`#04060a9e`, 1 px top hairline `#ffffff14`, 12 px
   side padding, 9 px above / 10 px below, 1 px gap between lines) holds:
   - `The Planets Shine Bright` — 13 px `font_semibold`, `foreground`.
   - `Orion · 6 Apr 2026 · 4,067 mi from the Moon` — 10 px `muted` (hidden below 250 px of
     sidebar width).
   - a 6 px status dot, then `NASA / JSC · public domain` — 9.5 px `dim`.
2. **Spaces** — the shipped `spaces` mod, `weight: 1`, `min` 90.
3. **Agents** — the shipped `agents` mod, `weight: 1`, `min` 90.

**Work column.** `tabs` (shipped, 40 px) → a body row with 8 px padding and 8 px gap → the pane
area → `workspace-status` (shipped, 26 px, `chrome` with a 1 px top hairline).

**Panes** are cards: 8 px between them, radius 10, background `background` `#05070c`, 1 px
`border` `#1a2230`, and while a pane holds the keyboard a 1 px `accent` border instead. Each has
the shipped `pane` header at the top, 30 px, always visible: program icon, title, folder, and
split / zoom / close. 12 px vertical and 14 px horizontal terminal padding.

**Panel** — the shipped `files` / `changes` stack, 360 px (`min` 280, `max` 900), `hidden` by
default, opened from the tab bar's Files and Changes buttons and remembered per space.

**Colours** are theme `graphite` with overrides on the root, so every shipped mod follows:
`canvas #04060a`, `background #05070c`, `chrome #080b11`, `surface #0a0e15`, `popover #0b1018`,
`raised #101620`, `hover #161e29`, `selected #1d2836`, `border #1a2230`, `input #28313f`,
`foreground #e2e8f0`, `muted #94a1b0`, `dim #5d6877`, `accent #e9d8b9`,
`accent_foreground #0a0c11`, `solid #e9d8b9`, `solid_foreground #0a0c11`,
`selection #243243`, `working #8bb3d9`, `blocked #e08a6c`, `done #d8c8a6`, `idle #5d6877`,
`unknown #47525f`, and the ANSI ramp `#121821 #dd7a63 #a3bd97 #e3c88d #7fa6cf #c39ecf #83bfc0
#c9d2dc #3b4655 #ef9781 #bcd4ab #f2dba3 #9cc0e6 #d8b5e2 #9ed8d6 #edf2f7` (ansi0–15).

The window's own background is a gradient, `#070a11` → `#0b0908` at 165° — the photo's black
sky at the top, a hint of warm dust at the bottom. Fonts are whatever the person has in
`settings.json` (the layout sets none; Herdr's JetBrains Mono 14 / Geist are the fallback).

## How it behaves

**Agent status, in three places, all from the same `theme()` colours:**

| status | colour | the bar tally | the ring (left of the wordmark) | the plaque dot |
|---|---|---|---|---|
| `working` | `#8bb3d9` | dot fades 0.45 → 1 every 2000 ms, count in blue | pulses, period 2400 ms | pulses, period 2000 ms |
| `blocked` | `#e08a6c` | dot fades 0.3 → 1 every 900 ms, plate in orange | pulses fast (900 ms) in `blocked` | pulses fast (900 ms) |
| `done` | `#d8c8a6` | steady cream dot and count | steady cream | steady cream |
| `idle` | `#5d6877` | steady dim dot and count | steady cream (idle is not urgent) | steady dim |
| no agents / zero | `dim` | dim dot, no plate, a dim `0` | steady cream | dim dot |

The ring and the plaque dot show only the **most urgent** status present, in the order
blocked > working > done > idle. The bar shows all four counts at once.

**Clicks and hovers**

- Clicking a non-zero tally runs `agent.focus {terminal}` for the first agent in that status.
- Clicking the plaque caption (anywhere on the title / date / credit plate) posts a
  notification with the picture's full caption, its number, the credit and the source URL.
  Hovering it turns the hairline `accent` and darkens the plate.
- Clicking the plaque's status dot runs `agent.next`; it is only clickable when an agent exists.
- Hovering the eclipse mark or the tallies does nothing (the mark is not a control).
- Everything else — the lists, the tabs, the pane headers, the status bar — behaves as it does
  in Herdr's own layouts, because it is those mods.

**What moves**

- Dragging the bar moves the window; double-clicking it maximises. Every control in the bar
  stops the press, so dragging never starts from a button, a tally or the clock.
- Dragging the sidebar's right edge resizes it between 220 and 460 px. The plaque stays 300 px
  tall and the photo re-crops (`fit: cover`); its caption hides the date line below 250 px.
- Dragging the boundary between spaces and agents reshuffles their 1:1 split.
- Motion is native GPUI (`.loop` on opacity), so nothing redraws from JS for it. The only timer
  is the clock: one tick a second, and it calls `cx.notify()` only when the second changed.
- Dragging panes by their top grip still works (`movable` is left at its default).

**Keys** — the layout binds nothing of its own; it inherits the person's `keys.json`. In it, the
status bar's `⌘⇧P commands` hint comes from `workspace-status` reading the `app.palette` binding.

## Built from

```
layouts/artemis.json          the window
layouts/artemis.svg           the picture Settings shows for this layout (root "preview")
mods/artemis-bar/             main.js, mod.json {"place":"none","title":"Artemis bar"}
mods/artemis-plaque/          main.js, mod.json {"place":"none","title":"Artemis plaque"},
                              plaque.jpg  604x600, the photo crop the layout paints
```

**The node tree** (root is a `column`):

```
root  column   titlebar "none", traffic_lights [14,12], theme "graphite" + colors,
               background gradient #070a11 -> #0b0908 at 165, terminal_padding [12,14],
               divider {width:1,color:border}, preview "layouts/artemis.svg"
├ bar          block 38  window_drag  mod artemis-bar
└ body         row    divider {1, border}
  ├ sidebar    column 302  min 220  max 460  background canvas
  │ ├ plaque   block  300  mod artemis-plaque
  │ │                   background {image "mods/artemis-plaque/plaque.jpg", fit "cover"}
  │ ├ spaces   block  weight 1  min 90  mod spaces
  │ └ agents   block  weight 1  min 90  mod agents
  └ work       column  resizable false
    ├ tabs     block 40  mod tabs
    ├ work-body row  padding 8  gap 8
    │ ├ main   block  content {tab "active", pane {...}}   -- the pane frame below
    │ └ panel  column 360  min 280  max 900  hidden true
    │   └ panel-body stack active "files"  children: files, changes
    └ status   block 26  mod workspace-status
```

The pane frame is exactly
`{"gap":8,"radius":10,"background":"background","lone":true,"border":{"width":1,"color":"border"},"focus":{"width":1,"color":"accent"},"header":{"content":{"mod":"pane"},"height":30,"position":"top","reveal":"always"}}`.

**`mods/artemis-bar`** (no props) is one `h_flex().size_full()`: `.bg(t.chrome)`,
`.pl(mac ? 78 : 12).pr(4)`, `.text_size(11.5)`, `.overflow_hidden()`. It calls
`window()`, `theme()`, `agents()`, `spaces()`, `focused()` and `run()`; commands
`agent.focus`, `window.minimize`, `window.maximize`, `window.close`. The clock is
`cx.timer.every(1000, …)` over `new Date()` formatted as UTC. Each control is wrapped in
`.on_mouse_down("left", (_e, cx) => cx.stopPropagation())` so the bar's `window_drag` does not
take the press. On macOS it reserves 78 px on the left for the traffic lights
(`traffic_lights: [14, 12]` on the root).

**`mods/artemis-plaque`** (no props) draws *only the text*, never a full background, so the
layout's image shows through around it: a `v_flex().size_full().justify_between()` with the
number/credit plates as one child and the caption plate as the other. It calls `theme()` and
`agents()` for the dot, `notify()` for the click, `run("agent.next")` for the dot's click, and
uses `.on_size_change` to hide the date line under 250 px. It never reads `props()`.

**Shipped mods used:** `spaces`, `agents`, `tabs`, `pane` (pane headers), `workspace-status`,
`files`, `changes`. Nothing here needs `keys.json`, `programs.json`, `settings.json` or a theme
file: the look is all in the layout's root.

**The art.** `plaque.jpg` is a crop of NASA image `art002e015967`, *The Planets Shine Bright*,
Orion, 6 April 2026 (there: `images-assets.nasa.gov/image/art002e015967/art002e015967~orig.jpg`,
8256x5504). Crop a 5033x5000 box with its top at y=320, left at x=842 (the disc centre lands at
50 % of the width, 40 % of the height), resize to 604x600, brightness 0.96, contrast 1.05, JPEG
88. That aspect (1.007) matches the 302x300 block, so `cover` does not re-crop it. The image is
a US government work: public domain, credit NASA, no endorsement implied.

## Watch out

- **The plaque's image path names its mod folder.** `background.image` is
  `mods/artemis-plaque/plaque.jpg`; if you rename the mod, change that string in the layout or
  the plaque goes blank.
- **The crop is composed, not arbitrary.** In `plaque.jpg` the disc's bottom sits at ~65 % of
  the height, so the 71 px caption plate (which is ~24 % of the 300 px block) starts below it.
  Swap in an uncropped photo and the caption will cut through the disc. Keep the disc's centre
  near 40 % of the height.
- **The caption is ~71 px tall and grows with the font.** It is not a fixed-height area; a
  longer title pushes the plate up over the photo. Keep the title to one short line, or raise
  the plaque's `px` size.
- **`pl(78)` is the macOS traffic-light gap.** The screenshot does not include the window
  buttons (Herdr captures the app, not the system chrome), so on macOS the bar looks like it
  starts 78 px in. On Linux and Windows that space stays empty and the bar draws its own
  buttons instead, because `window().buttons` is true there.
- **No letterspacing.** gpui-kit has no `letter_spacing`, so the wordmark is bold caps. Writing
  `A R T E M I S` with spaces trims wrongly and reads as broken spacing — don't.
- **Windows are tall.** On a 2500 px-tall window the two lists get ~1100 px each and look
  empty. That is Herdr's own behaviour for any two `weight: 1` lists; the plaque stays 300 px.
  Narrower than 250 px of sidebar the caption drops its date line; below ~160 px the shipped
  lists switch to their compact rail while the plaque still draws its full caption — the
  sidebar's `min` of 220 px avoids that state.
- **Zero tallies are still drawn** (a dim dot and `0`) so the four statuses keep their places
  as counts change; don't hide them or the bar jumps.
- **The tallies are per agent, not per space**: `agents()` lists terminals whose program
  reports a status, including sub-agents started with `hc run`. A space with two working
  sub-agents shows `3` in `working`.
- **The `files` / `changes` panel starts hidden** and is only reachable from the tab bar (or
  `layout.show {id:"panel"}`). `workspace-status`'s palette hint needs the person's own
  `app.palette` binding; with none it prints `commands`.
- The plaque's status dot is `agent.next` — it walks the list, it does not jump to the blocked
  agent specifically. The tallies do target one.

## Done when

```sh
herdr-app check ~/.config/herdr-app/mods/artemis-bar      # exit 0
herdr-app check ~/.config/herdr-app/mods/artemis-plaque   # exit 0
herdr-app do layout.switch --name artemis
herdr-app status                                          # "layout": "artemis", "errors": []
herdr-app shot /tmp/artemis.png
```

…and in the window:

- the bar shows a UTC clock that advances every second, and `ARTEMIS II` with the `II` in cream;
- the left sidebar starts with the photograph, its disc whole, `The Planets Shine Bright` printed
  on it, `ART002E015967` and `NASA` on the scrim at the top;
- with two panes open, the pane holding the keyboard has a cream hairline and the other a
  grey-blue one, and both have a 30 px header with split / zoom / close;
- an agent that starts working makes the ring pulse and the `working` tally turn blue; blocking
  turns both orange and pulses faster; a finished-but-unseen agent turns the `done` tally cream;
- clicking a tally focuses an agent; clicking the caption posts a toast with the credit;
- the tab bar's Files button opens the panel on the right at 360 px and the layout does not
  otherwise move;
- the layout appears in Settings with the picture from `artemis.svg`, and `ctrl-shift-l`
  returns to the person's other layouts.
