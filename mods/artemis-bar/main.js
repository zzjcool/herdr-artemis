// artemis-bar — the title bar of layouts/artemis.json.
//
// One row, 38 px tall, drawn by this mod so the layout can use
// `"titlebar": "none"` and put the traffic lights at its left (macOS).
// The layout block is `window_drag: true`; every control here stops the press
// so dragging the window never starts from a button.
//
// It reads like the photo it belongs to: a cream corona ring around a black
// Moon (the mission mark, pulsing while agents work), the wordmark, where the
// keyboard is, then one tally per agent status and the UTC clock — the time the
// picture was taken in is stamped on it.

import { View, div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { agents, focused, home, run, settings, spaces, theme, window } from "herdr";

const STATUSES = ["working", "blocked", "done", "idle"];

// A press inside the bar must not become a window drag.
const own = (el) => el.on_mouse_down("left", (_e, cx) => cx.stopPropagation());
const pad2 = (n) => String(n).padStart(2, "0");
const utc = (d) => `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;

function leaf(cwd) {
  if (!cwd) return null;
  if (cwd === home()) return "~";
  return cwd.split("/").filter(Boolean).pop() ?? null;
}

export default class ArtemisBar extends View {
  init(_props, cx) {
    this.clock = utc(new Date());
    // A clock is data: one tick a second, and a redraw only when a digit changed.
    cx.timer.every(1000, (cx) => {
      const next = utc(new Date());
      if (next === this.clock) return;
      this.clock = next;
      cx.notify();
    });
  }

  // Corona, rim, Moon: the sidebar's mark at bar size, 16 px across.
  eclipse(t, blocked, busy) {
    const color = blocked ? t.blocked : t.accent;
    return div()
      .flex_none()
      .size(16)
      .rounded(8)
      .border(1)
      .border_color(`${color}38`)
      .flex()
      .items_center()
      .justify_center()
      .when(blocked, (el) => el.loop("opacity", { from: 0.35, to: 1, period: 900 }))
      .when(!blocked && busy, (el) => el.loop("opacity", { from: 0.5, to: 1, period: 2400 }))
      .child(
        div()
          .size(11)
          .rounded(6)
          .border(1)
          .border_color(color)
          .flex()
          .items_center()
          .justify_center()
          .child(div().size(5).rounded(3).bg("#05080c")));  // the Moon's dark face: an opaque core, not a hole
  }

  tally(t, status, list) {
    const n = list.filter((a) => a.status === status).length;
    const first = list.find((a) => a.status === status);
    const on = n > 0;
    const color = on ? t[status] : t.dim;
    return own(
      div()
        .id(`tally-${status}`)
        .flex_none()
        .h(19)
        .px(on ? 6 : 3)
        .mr(on ? 3 : 4)
        .rounded(5)
        .flex()
        .items_center()
        .gap(5)
        .bg(on ? `${color}1f` : "#00000000")
        .text_color(color)
        .when(on && Boolean(first), (el) =>
          el.cursor_pointer()
            .hover((s) => s.bg(`${color}33`).text_color(t.foreground))
            .on_click(() => run("agent.focus", { terminal: first.address })))
        .child(
          div()
            .size(5)
            .rounded(3)
            .bg(color)
            .when(status === "blocked", (el) => el.loop("opacity", { from: 0.3, to: 1, period: 900 }))
            .when(status === "working", (el) => el.loop("opacity", { from: 0.45, to: 1, period: 2000 })))
        .when(on, (el) => el.child(div().text_size(10.5).child(String(n)))));
  }

  // Where the system draws no traffic lights, the bar draws its own.
  windowButton(t, id, glyph, command, danger) {
    return own(
      div()
        .id(id)
        .flex_none()
        .w(30)
        .h_full()
        .ml(1)
        .flex()
        .items_center()
        .justify_center()
        .cursor_pointer()
        .text_size(11)
        .text_color(t.dim)
        .hover((s) => s.bg(danger ? t.blocked : t.hover).text_color(danger ? t.canvas : t.foreground))
        .on_click(() => run(command))
        .child(glyph));
  }

  render() {
    const t = theme();
    const w = window();
    const mac = w?.platform === "macos" && !w?.fullscreen;
    const list = agents();
    const space = spaces().find((s) => s.active);
    const tab = space?.tabs.find((x) => x.active);
    const here = leaf(focused()?.cwd);
    const blocked = list.some((a) => a.status === "blocked");
    const busy = list.some((a) => a.status === "working");
    const sep = () => div().flex_none().mx(11).text_color(`${t.muted}44`).child("│");

    return h_flex()
      .id("artemis-bar")
      .size_full()
      .items_center()
      .overflow_hidden()
      .bg(t.chrome)
      .pl(mac ? 78 : 12)
      .pr(4)
      .text_size(11.5)
      .text_color(t.muted)
      .child(this.eclipse(t, blocked, busy))
      .child(div().ml(9).flex_none().text_size(10.5).font_semibold().text_color(t.foreground).child("ARTEMIS"))
      .child(div().ml(4).flex_none().text_size(9).text_color(t.accent).child("II"))
      .when(Boolean(space), (el) =>
        el.child(sep())
          .child(div().flex_none().max_w(240).truncate().text_size(12).text_color(t.foreground).child(space.name))
          .when(Boolean(space.branch), (e) =>
            e.child(div().flex_none().ml(8).max_w(180).truncate().text_color(t.dim).child(space.branch)))
          .when(Boolean(here) && here !== space.name, (e) =>
            e.child(div().flex_none().ml(8).max_w(160).truncate().text_color(t.dim).child(here)))
          .when(Boolean(tab) && tab.name !== String(tab.index), (e) =>
            e.child(div().flex_none().ml(8).max_w(200).truncate().text_color(t.dim).child(tab.name))))
      .child(div().flex_1())
      .children(STATUSES.map((status) => this.tally(t, status, list)))
      .child(
        own(
          h_flex()
            .flex_none()
            .id("clock")
            .ml(10)
            .mr(4)
            .gap(5)
            .items_center()
            .text_color(t.muted)
            .child(div().font_family(settings().font_family ?? "JetBrains Mono").text_size(11).child(this.clock))
            .child(div().text_size(9).text_color(t.dim).child("UTC"))))
      .when(Boolean(w?.buttons), (el) =>
        el.child(this.windowButton(t, "wb-min", "–", "window.minimize"))
          .child(this.windowButton(t, "wb-max", w.maximized ? "❐" : "▢", "window.maximize"))
          .child(this.windowButton(t, "wb-close", "✕", "window.close", true)));
  }
}
