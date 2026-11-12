// artemis-head — the mission plate at the top of the sidebar.
//
// No photograph: a printed plate reads cleaner than a picture pasted into a
// corner, and this window is a workspace, not a gallery wall. What the picture
// gives the layout is here instead — its palette, its subject drawn as a mark
// (corona, disc, Moon: three rings), and its credit, stated plainly.
//
// The mark's rings are the bar's mark at a larger size, so the window has one
// eclipse and not two versions of one. The dot is the crew: the most urgent
// agent status, in the same colours the bar's tallies use.

import { View, div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { agents, notify, run, settings, theme } from "herdr";

const ID = "ART002E015967";
const TITLE = "The Planets Shine Bright";
const KICKER = "ARTEMIS II";
const SUB = "Orion · 6 Apr 2026 · 4,067 mi from the Moon";
const CREDIT = "NASA / JSC · public domain";

// A press on the status dot must not also open the caption.
const own = (el) => el.on_mouse_down("left", (_e, cx) => cx.stopPropagation());

export default class ArtemisHead extends View {
  init() {
    this.w = 292; // the sidebar's width in the layout; corrected on first layout
  }

  mono() {
    return settings().font_family ?? "JetBrains Mono";
  }

  // Most urgent first, as a space's own status does it.
  urgent(list) {
    return ["blocked", "working", "done", "idle"].find((s) => list.some((a) => a.status === s)) ?? null;
  }

  caption() {
    notify({
      title: TITLE,
      body: `${ID} — the Moon's disc hiding the Sun, its corona the zodiacal light; Saturn and Mars trail to the right. Orion, 6 April 2026, 4,067 miles from the Moon. Credit: NASA / Johnson Space Center. Public domain: use it, credit NASA, imply no endorsement. nasa.gov/image-detail/amf-art002e015967`,
      level: "info",
    });
  }

  // Corona, rim, Moon: three circles, the same mark the bar carries.
  mark(t) {
    return div()
      .flex_none()
      .size(24)
      .rounded(12)
      .border(1)
      .border_color(`${t.accent}2e`)
      .flex()
      .items_center()
      .justify_center()
      .child(div().size(18).rounded(9).border(1).border_color(t.accent).flex().items_center().justify_center()
        .child(div().size(10).rounded(5).bg(t.background)));
  }

  render(cx) {
    const t = theme();
    const list = agents();
    const urgent = this.urgent(list);
    const color = urgent ? t[urgent] : t.dim;
    const wide = this.w >= 260;

    return v_flex()
      .id("head")
      .size_full()
      .px(14)
      .pt(13)
      .pb(12)
      .overflow_hidden()
      .on_size_change((size, cx) => {
        const w = Math.round(size.width);
        if (w === this.w) return;
        this.w = w;
        cx.notify();
      })
      .child(
        h_flex()
          .id("head-title")
          .items_center()
          .gap(10)
          .cursor_pointer()
          .on_click(() => this.caption())
          .child(this.mark(t))
          .child(
            v_flex()
              .gap(1)
              .min_w(0)
              .child(div().text_size(8.5).text_color(t.accent).child(KICKER))
              .child(div().text_size(12.5).font_semibold().text_color(t.foreground).truncate().child(TITLE))))
      .when(wide, (el) => el.child(div().mt(10).text_size(9).text_color(t.muted).truncate().child(SUB)))
      .child(div().mt(9).h(1).w_full().bg("#ffffff12"))
      .child(
        h_flex()
          .id("head-credit")
          .mt(8)
          .items_center()
          .justify_between()
          .gap(8)
          .cursor_pointer()
          .on_click(() => this.caption())
          .child(
            h_flex()
              .items_center()
              .gap(5)
              .child(
                own(
                  div()
                    .id("head-status")
                    .flex_none()
                    .size(5)
                    .rounded(3)
                    .bg(color)
                    .when(urgent === "blocked", (el) => el.loop("opacity", { from: 0.3, to: 1, period: 900 }))
                    .when(urgent === "working", (el) => el.loop("opacity", { from: 0.45, to: 1, period: 2000 }))
                    .when(Boolean(urgent), (el) => el.cursor_pointer().on_click(() => run("agent.next")))))
              .child(div().text_size(9).text_color(t.dim).hover((s) => s.text_color(t.muted)).child(CREDIT)))
          .when(wide, (el) =>
            el.child(div().flex_none().font_family(this.mono()).text_size(8.5).text_color(t.dim).child(ID))))
      .child(div().flex_1());
  }
}
