import { View, div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, agents, theme, run, window, keys } from "herdr";

export default class WorkspaceStatus extends View {
  // The palette key as actually bound, not a hardcoded one; without a
  // binding the hint stays useful ("commands") instead of lying.
  hint(t) {
    const mac = window()?.platform === "macos";
    const mod = { cmd: mac ? "⌘" : "Ctrl+", ctrl: mac ? "⌃" : "Ctrl+", shift: mac ? "⇧" : "Shift+", alt: mac ? "⌥" : "Alt+", option: mac ? "⌥" : "Alt+" };
    const b = keys().find((k) => k.section === "global" && k.action === "app.palette");
    const parts = b && b.keys.endsWith("--") ? [...b.keys.slice(0, -2).split("-"), "-"] : b?.keys.split("-");
    const key = parts && parts.map((p) => mod[p.toLowerCase()] ?? p.toUpperCase()).join("");
    return key ? `${key}  commands` : "commands";
  }

  // The bar's mark, moved here: the eclipse ring and the wordmark, at the far left of the
  // status bar, and the one thing in this row that is clickable — `app.settings`, the same
  // command the shipped sidebar's Settings row runs (`workspace-chrome/main.js:44`).
  // The ring keeps the job it had in the bar: a lamp for the whole app, breathing while an
  // agent works and faster while one is blocked, so the colour reads as the app's state even
  // with no agent list in sight.
  mark(t, list) {
    const blocked = list.some(a => a.status === "blocked");
    const busy = list.some(a => a.status === "working");
    const color = blocked ? t.blocked : t.accent;
    return h_flex().id("settings").flex_none().gap(7).items_center().cursor_pointer()
      .on_click(() => run("app.settings"))
      .hover(s => s.text_color(t.foreground))
      .child(div().flex_none().size(13).rounded(7).border(1).border_color(`${color}38`)
        .flex().items_center().justify_center()
        .when(blocked, el => el.loop("opacity", { from: 0.35, to: 1, period: 900 }))
        .when(!blocked && busy, el => el.loop("opacity", { from: 0.5, to: 1, period: 2400 }))
        // An opaque core, not a hole: the status bar's own fill is a 20 % tint of the photo.
        .child(div().size(9).rounded(5).border(1).border_color(color)
          .flex().items_center().justify_center()
          .child(div().size(4).rounded(2).bg("#05080c"))))
      .child(div().text_size(9.5).font_semibold().text_color(t.foreground).child("ARTEMIS"))
      .child(div().text_size(8).text_color(t.accent).child("II"));
  }

  render() {
    const t = theme();
    const space = spaces().find(s => s.active);
    const list = agents();
    const needs = list.filter(a => a.status === "blocked").length;
    const label = (icon, text) => h_flex().gap(6).items_center().child(svg(`mods/workspace-chrome/${icon}.svg`).size(13)).child(text);
    return h_flex().size_full().px(14).gap(16).items_center().bg(t.chrome).text_size(11.8).text_color(t.muted)
      .child(this.mark(t, list))
      .child(label(space?.machine ? "server" : "monitor", space?.machine ?? "This computer"))
      .when(Boolean(space?.branch), el => el.child(label("branch", space.branch)))
      .child(h_flex().gap(6).items_center().child(div().size(6).rounded(3).bg(t.dim)).child(`${list.length} agents`)
        .when(needs > 0, el => el.child(div().text_color(t.blocked).child(`· ${needs} needs you`))))
      .child(div().flex_1())
      .child(div().id("palette").text_color(t.dim).on_click(() => run("app.palette")).child(this.hint(t)));
  }
}
