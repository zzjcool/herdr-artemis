# Artemis

A quiet, printed window for a terminal workspace, drawn from one photograph: NASA's
*The Planets Shine Bright* — the Artemis II crew's view of the Sun eclipsed by the Moon.
The layout does not paste the picture into a corner. It borrows what the picture gives:
its palette (near-black sky, one warm cream), its subject as a mark (corona, rim, Moon —
three rings), and its credit, stated plainly in the sidebar's mission plate. Everything
else is hairlines, small caps and mono numerals on black.

![Artemis](preview.png)

This preview was taken on a real machine, so the spaces and agents lists in the rail are
dimmed and blurred here on purpose: they hold that machine's own spaces. The rest is the
layout as built.

## What you see

**Top bar — 38 px, full width, `window_drag`.** `chrome` `#080b11`, a 1 px hairline
(`#ffffff0f`) under it. One row, 11.5 px, `muted` `#9aa6b4`, left to right:

- **the eclipse mark**, 16 px: an outer 1 px ring at 22 % cream (the corona), an inner
  1 px cream ring (the rim), a 5 px `background` disc (the Moon). It pulses when agents
  work (see *How it behaves*).
- `ARTEMIS` 10.5 px `font_semibold` in `foreground` `#e6ebf2`, then `II` 9 px in the accent.
- `│` at `${muted}44`, 11 px margin each side.
- the active space's name, 12 px `foreground`; then, when present, its git branch, the
  focused terminal's folder leaf and the tab's name — 11.5 px `dim` `#5f6a78`, each capped
  (240 / 180 / 160 / 200 px) and truncated. The folder is left out when it equals the
  space's name.
- a flexible spacer, then **four tallies** — `working`, `blocked`, `done`, `idle`. A tally
  with agents is a 19 px pill, rounded 5, 6 px side padding, a 5 px dot and its count at
  10.5 px, drawn in that status colour on that colour at 12 % alpha. A zero tally is only
  the 4 px dot, in `dim`, no plate, no number — so the four read as an unlit/lit LED strip.
- the **UTC clock**, `HH:MM:SS` 11 px in the mono face plus `UTC` 9 px, 10 px left margin.
- On Linux and Windows only (`window().buttons`): minimise, maximise/restore, close —
  30 px each, glyphs `–` `▢`/`❐` `✕`, close turning `blocked` `#e08a6c`.

**Sidebar — 292 px** (`min` 220, `max` 420, resizable), a vertical gradient `#0c121a` →
`#080b11` (light from above), a 1 px hairline to its right. Three stacked blocks, hairline
dividers between them:

1. **Mission plate — 132 px**, 14 px side padding, 13 px above, 12 px below:
   - the same eclipse mark at 24 px (outer ring 15 % cream, inner ring cream, 10 px Moon
     disc) with, beside it, a two-line block: `ARTEMIS II` at 8.5 px in the **accent**,
     and the photograph's title, `The Planets Shine Bright`, at 12.5 px `font_semibold`
     `foreground`, truncated to one line.
   - `Orion · 6 Apr 2026 · 4,067 mi from the Moon` — 9 px `muted`, 10 px below.
   - a 1 px rule `#ffffff12`, full width, 9 px below that.
   - `● NASA / JSC · public domain` at 9 px `dim` on the left (the dot is the crew's
     status), and `ART002E015967` at 8.5 px mono `dim` on the right, 8 px under the rule.
   - the block's remaining height is air; the plate is printed, not boxed.
2. **Spaces** — the shipped `spaces` mod, `weight: 1`, `min` 90.
3. **Agents** — the shipped `agents` mod, `weight: 1`, `min` 90.

**Work column.** `tabs` (shipped, 38 px) → a body row with 12 px padding and 10 px gap →
the pane area → `workspace-status` (shipped, 26 px). The window's own ground is a gradient
`#080b12` → `#0a0908` at 168° (space above, a hint of warm dust below).

**Panes** are cards: 10 px between them, radius 8, `background` `#05070cf7`, a 1 px
`border` `#1c2532`, and while a pane holds the keyboard a 1 px `accent` `#e9d8b9` border
instead. Each carries the shipped `pane` header at the top, 28 px, always visible:
program icon, title, folder, split / zoom / close. Terminal padding is 14 px vertical,
18 px horizontal.

**Panel** — the shipped `files` / `changes` stack, 340 px (`min` 280, `max` 900), `hidden`
by default, opened from the tab bar's Files and Changes buttons, remembered per space.

**Colours** are theme `graphite` with overrides on the root, so every shipped mod follows:
`canvas #04060a`, `background #05070cf7`, `chrome #080b11`, `surface #0a0e15`,
`popover #0b1018`, `raised #121a24`, `hover #16202c`, `selected #1d2836`,
`border #1c2532`, `input #28313f`, `foreground #e6ebf2`, `muted #9aa6b4`,
`dim #5f6a78`, `accent #e9d8b9`, `accent_foreground #0a0c11`, `solid #e9d8b9`,
`solid_foreground #0a0c11`, `selection #2a3a4d66`, `working #8bb3d9`,
`blocked #e08a6c`, `done #d8c8a6`, `idle #5f6a78`, `unknown #47525f`, and the ANSI ramp
`#121821 #dd7a63 #a3bd97 #e3c88d #7fa6cf #c39ecf #83bfc0 #c9d2dc #3b4655 #ef9781
#bcd4ab #f2dba3 #9cc0e6 #d8b5e2 #9ed8d6 #edf2f7` (ansi0–15) — the four status colours
and the accent are sampled from the photograph, the rest is its sky.

Fonts are the person's own (`settings.json`); the layout sets none. Herdr's JetBrains
Mono 14 / Geist are the fallback, and the clock and image number ask for
`settings().font_family` (else JetBrains Mono) because they are numerals.

## How it behaves

**Agent status, in three places, from the same four colours:**

| status | colour | the bar tally | the bar mark | the plate dot |
|---|---|---|---|---|
| `working` | `#8bb3d9` | dot fades 0.45 → 1 every 2000 ms, count in blue | pulses, 2400 ms | pulses, 2000 ms |
| `blocked` | `#e08a6c` | dot fades 0.3 → 1 every 900 ms, plate in orange | pulses fast (900 ms), in `blocked` | pulses fast (900 ms) |
| `done` | `#d8c8a6` | steady cream dot and count | steady cream | steady cream |
| `idle` | `#5f6a78` | steady dim dot and count | steady cream | steady dim |
| none / zero | — | dim 4 px dot, no plate, no number | steady cream | dim dot |

The bar's mark and the plate's dot show only the **most urgent** status present, in the
order blocked > working > done > idle. The bar shows all four counts; the plate shows one.

**Clicks and hovers**

- Clicking a non-zero tally runs `agent.focus {terminal}` for the first agent in that
  status.
- Clicking the plate's mark-and-title or its credit row posts a notification with the
  photograph's caption, its number, the credit and the source URL. Hovering the credit
  text lifts it from `dim` to `muted`.
- Clicking the plate's status dot runs `agent.next`; it is only clickable when an agent
  exists.
- Everything else — lists, tabs, pane headers, status bar — behaves as in Herdr's own
  layouts, because it is those mods.

**What moves**

- Dragging the bar moves the window; double-clicking it maximises. Every control in the
  bar stops the press, so dragging never starts from a button or the clock.
- Dragging the sidebar's right edge resizes it 220–420 px. The plate stays 132 px tall;
  below 260 px of rail its date line and image number drop out, and the title truncates.
- Dragging the boundary between spaces and agents reshuffles their 1:1 split.
- Motion is native GPUI (`.loop` on opacity): nothing redraws from JS for it. The only
  timer is the clock — one tick a second, and it calls `cx.notify()` only when the digits
  changed.
- Panes still drag by their top grip (`movable` is left at its default).

**Keys** — the layout binds nothing and inherits the person's `keys.json`. The status
bar's `⌘⇧P commands` hint is `workspace-status` reading the `app.palette` binding.

## Built from

```
layouts/artemis.json          the window
layouts/artemis.svg           the picture Settings shows for this layout (root "preview")
mods/artemis-bar/             main.js, mod.json {"place":"none","title":"Artemis bar"}
mods/artemis-head/            main.js, mod.json {"place":"none","title":"Artemis head"}
```

No image ships with it: the window draws no photograph at all. `preview.png` is the only
raster in the folder.

**The node tree** (root is a `column`):

```
root  column   titlebar "none", traffic_lights [14,11], theme "graphite" + colors,
               background gradient #080b12 -> #0a0908 at 168, terminal_padding [14,18],
               divider {width:1,color:"#ffffff0f"}, preview "layouts/artemis.svg"
├ bar          block 38  window_drag  mod artemis-bar
└ body         row    divider {1, "#ffffff0f"}
  ├ sidebar    column 292  min 220  max 420  background gradient #0c121a -> #080b11 at 180
  │ ├ plate    block 132  mod artemis-head
  │ ├ spaces   block weight 1 min 90  mod spaces
  │ └ agents   block weight 1 min 90  mod agents
  └ work       column resizable false
    ├ tabs     block 38  mod tabs
    ├ work-body row padding 12 gap 10
    │ ├ main   block content {tab "active", pane {...}}
    │ └ panel  column 340 min 280 max 900 hidden true
    │   └ panel-body stack active "files" children: files, changes
    └ status   block 26  mod workspace-status
```

The pane frame is exactly
`{"gap":10,"radius":8,"background":"background","lone":true,"border":{"width":1,"color":"border"},"focus":{"width":1,"color":"accent"},"header":{"content":{"mod":"pane"},"height":28,"position":"top","reveal":"always"}}`.

**`mods/artemis-bar`** (no props) is one `h_flex().size_full()`: `.bg(t.chrome)`,
`.pl(mac ? 78 : 12).pr(4)`, `.text_size(11.5)`, `.overflow_hidden()`. It reads `theme()`,
`window()`, `agents()`, `spaces()`, `focused()` and `settings()`; it runs `agent.focus`,
`window.minimize`, `window.maximize`, `window.close`. The clock is `cx.timer.every(1000, …)`
over `new Date()` formatted as UTC, notifying only on a changed second. Every control is
wrapped in `.on_mouse_down("left", (_e, cx) => cx.stopPropagation())` so the bar's
`window_drag` does not take the press. On macOS it reserves 78 px on the left for the
traffic lights (`traffic_lights: [14, 11]`).

**`mods/artemis-head`** (no props) draws the plate with no background of its own — the
rail's gradient shows through. It reads `theme()`, `agents()` and `settings()`; it calls
`notify()` and `run("agent.next")`, and hides two of its lines under 260 px of width via
`.on_size_change`. The mark is three nested `div()`s: `size(24).rounded(12).border(1)` at
`${accent}2e`, inside it `size(18).rounded(9).border(1)` at `accent`, inside that
`size(10).rounded(5).bg(t.background)`. The bar's mark is the same structure at 16 / 11 / 5.

**Shipped mods used:** `spaces`, `agents`, `tabs`, `pane` (pane headers),
`workspace-status`, `files`, `changes`. Nothing here needs `keys.json`, `programs.json`,
`settings.json` or a theme file: the look is all in the layout's root.

**The photograph** (`art002e015967`, *The Planets Shine Bright*, Orion, 6 April 2026,
[nasa.gov](https://www.nasa.gov/image-detail/amf-art002e015967/)) is not drawn: it is
credited in the plate, and clicking the plate states the whole caption. It is a US
government work, public domain — credit NASA, imply no endorsement. If you want it in the
window, add it deliberately, e.g. a 12 px inset print in the rail:

```json
{ "id": "print", "type": "block", "size": { "px": 198 },
  "content": { "mod": "artemis-head", "props": { "part": "print" } } }
```

…and have the mod draw `image("mods/artemis-head/print.jpg").size_full()` for that part.
Bake the crop at the block's own aspect (1.33) so `cover` cannot re-crop it, and keep the
disc's centre near 45 % of the height.

## Watch out

- **A painted box needs a mod.** In a layout, `block` requires `content` and `row` /
  `column` require `children`, so there is no way to paint a bare rectangle: a photo, a
  swatch or a rule must be a mod. Two saves fail on this (`missing field content`, then
  `missing field children`) before it clicks.
- **The rail's gradient is the only "light".** A photograph as the layout's background
  does not survive `fit: cover`: at 1292×900 it crops 30 % of a 16:10 image, at 1440×2530
  it keeps only the central 57 % of the width — so any subject in it lands somewhere else
  or disappears. That is why this layout uses a gradient there and a mark instead.
- **The mark is drawn twice** — 16 px in the bar, 24 px in the plate — and they must stay
  the same three rings, or the window reads as two different logos.
- **Zero tallies keep their dot.** Dropping them makes the four statuses shuffle sideways
  as counts appear; the dot without a number is the compromise. The `mr` differs for zero
  (4 px) and non-zero (3 px) so the strip stays even.
- **`pl(78)` is the macOS traffic-light gap.** Herdr's screenshot does not include the
  window buttons, so on macOS the bar appears to start 78 px in. Where the system draws no
  buttons (`window().buttons`), the bar draws its own there instead.
- **No letterspacing exists** in gpui-kit, so the wordmark is bold caps; writing
  `A R T E M I S` with spaces reads as broken spacing.
- **The plate is 132 px and its type is fixed**: a longer title truncates, and the date
  line plus the image number disappear below 260 px of rail. If you add a line, raise the
  block's `px`.
- **A second divider looks like a box.** The plate ends with a rule the mod draws; the
  column's own divider draws the next one under it. Both are 1 px `#ffffff0f`/`#ffffff12`
  and 8 px apart — if you move one, move the other or the plate looks underlined twice.
- **The `files` / `changes` panel starts hidden** and is reachable from the tab bar (or
  `layout.show {id:"panel"}`). `workspace-status`'s palette hint needs the person's own
  `app.palette` binding; with none it prints `commands`.
- The preview's rail is dimmed because it holds real spaces. A rebuild's screenshot will
  show its own; do not ship a machine's space names to a public repository.

## Done when

```sh
herdr-app check ~/.config/herdr-app/mods/artemis-bar      # exit 0
herdr-app check ~/.config/herdr-app/mods/artemis-head     # exit 0
herdr-app do layout.switch --name artemis
herdr-app status                                          # "layout": "artemis", "errors": []
herdr-app shot /tmp/artemis.png
```

…and in the window:

- the bar shows a UTC clock advancing every second, `ARTEMIS` `II`, and the four tallies
  as a dot strip where only non-zero counts carry a number;
- the rail opens with the plate: the mark, `ARTEMIS II` in cream, the title, the date
  line, a hairline, and `NASA / JSC · public domain` with the image number on the right;
- with two panes open, the one holding the keyboard has a cream hairline and the other a
  grey-blue one, and both have a 28 px header with split / zoom / close;
- an agent that starts working pulses the bar's mark and turns the `working` tally blue;
  blocking turns both orange and pulses faster; a finished-but-unseen agent turns the
  `done` tally cream;
- clicking a tally focuses an agent; clicking the plate posts a toast with the credit;
- the tab bar's Files button opens a 340 px panel on the right and nothing else moves;
- Settings shows `artemis.svg` as this layout's picture, and `ctrl-shift-l` returns to the
  person's other layouts.
