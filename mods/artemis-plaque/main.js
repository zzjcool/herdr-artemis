// artemis-plaque — the caption over the Artemis II photo in layouts/artemis.json.
//
// The picture itself is the layout's business: the `plaque` block carries
//   "background": { "image": "mods/artemis-plaque/plaque.jpg", "fit": "cover" }
// so Herdr crops it, not this mod. The mod draws only what must be legible on
// top of it and never paints a full background, which is what keeps the photo
// visible around the caption.
//
// Left is what the picture is and who made it; the dot beside the credit is the
// crew's status — the most urgent agent, in the same colours the bar's tallies
// use (blocked pulses fast, working slowly, done and idle hold still).

import { View, div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { agents, notify, run, theme } from "herdr";

const ID = "ART002E015967";
const TITLE = "The Planets Shine Bright";
const SUB = "Orion · 6 Apr 2026 · 4,067 mi from the Moon";
const CREDIT = "NASA / JSC · public domain";

// A press on the status dot must not also open the photo's caption.
const own = (el) => el.on_mouse_down("left", (_e, cx) => cx.stopPropagation());

export default class ArtemisPlaque extends View {
  init() {
    this.w = 302; // the sidebar's width in the layout; corrected on first layout
  }

  // Most urgent first, as a space's own status does it.
  urgent(list) {
    return ["blocked", "working", "done", "idle"].find((s) => list.some((a) => a.status === s)) ?? null;
  }

  caption() {
    notify({
      title: TITLE,
      body: `${ID} — the Moon's disc hides the Sun, with dusty zodiacal light for a corona; Saturn and Mars trail to the right. Orion, 6 April 2026, 4,067 miles from the Moon. Credit: NASA / Johnson Space Center. Public domain: use it, credit NASA, imply no endorsement. nasa.gov/image-detail/amf-art002e015967`,
      level: "info",
    });
  }

  render(cx) {
    const t = theme();
    const list = agents();
    const urgent = this.urgent(list);
    const color = urgent ? t[urgent] : t.dim;
    const wide = this.w >= 250;

    return v_flex()
      .id("plaque")
      .size_full()
      .justify_between()
      .on_size_change((size, cx) => {
        const w = Math.round(size.width);
        if (w === this.w) return;
        this.w = w;
        cx.notify();
      })
      .child(
        // The image number, on a scrim so it reads over the stars.
        h_flex()
          .items_center()
          .justify_between()
          .px(12)
          .pt(10)
          .child(div().rounded(4).px(6).py(2).bg("#04060ab3").text_size(9).text_color(t.dim).child(ID))
          .child(div().rounded(4).px(6).py(2).bg("#04060ab3").text_size(9).text_color(t.dim).child("NASA")))
      .child(
        v_flex()
          .id("plaque-caption")
          .w_full()
          .gap(1)
          .px(12)
          .pt(9)
          .pb(10)
          .bg("#04060a9e")
          .border_t(1)
          .border_color("#ffffff14")
          .cursor_pointer()
          .hover((s) => s.border_color(t.accent).bg("#04060ac4"))
          .on_click(() => this.caption())
          .child(div().text_size(13).font_semibold().text_color(t.foreground).child(TITLE))
          .when(wide, (el) => el.child(div().text_size(10).text_color(t.muted).child(SUB)))
          .child(
            h_flex()
              .items_center()
              .gap(6)
              .child(
                own(
                  div()
                    .id("plaque-status")
                    .size(6)
                    .rounded(3)
                    .bg(color)
                    .when(urgent === "blocked", (el) => el.loop("opacity", { from: 0.3, to: 1, period: 900 }))
                    .when(urgent === "working", (el) => el.loop("opacity", { from: 0.45, to: 1, period: 2000 }))
                    .when(Boolean(urgent), (el) =>
                      el.cursor_pointer().on_click(() => run("agent.next")))))
              .child(div().text_size(9.5).text_color(t.dim).child(CREDIT))));
  }
}
