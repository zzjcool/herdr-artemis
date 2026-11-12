// artemis-head — the mission plate: what the photograph is, printed at the
// head of the rail.
//
// The block paints nothing; the window's ground is the photograph itself
// (root "background", fit "contain"), so the type sits straight on it. This
// mod adds only what the picture cannot say for itself: kicker, title, the
// orbit line, the credit, the frame number, and the most urgent agent's
// status in the colours the bar's tallies use.

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
    this.w = 292; // the rail's width in the layout; corrected on first layout
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

  render() {
    const t = theme();
    const list = agents();
    const urgent = this.urgent(list);
    const color = urgent ? t[urgent] : t.dim;
    const wide = this.w >= 250;

    return v_flex()
      .id("head")
      .size_full()
      .overflow_hidden()
      .on_size_change((size, cx) => {
        const w = Math.round(size.width);
        if (w === this.w) return;
        this.w = w;
        cx.notify();
      })
      // the plate sits at the head of the rail, on the photograph
      .child(
        v_flex()
          .id("head-plate")
          .w_full()
          .px(14)
          .pt(14)
          .pb(12)
          .gap(1)
          .child(
            div().text_size(8.5).text_color(t.accent).child(`${KICKER} · ${ID}`))
          .child(
            v_flex().id("head-title").cursor_pointer().on_click(() => this.caption())
              .child(div().text_size(12.5).font_semibold().text_color(t.foreground).truncate().child(TITLE))
              .when(wide, (el) => el.child(div().text_size(9).text_color(t.muted).truncate().child(SUB))))
          .child(div().mt(8).h(1).w_full().bg("#ffffff14"))
          .child(
            h_flex()
              .id("head-credit")
              .mt(7)
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
                el.child(div().flex_none().font_family(this.mono()).text_size(8.5).text_color(t.dim).child(ID)))));
  }
}
