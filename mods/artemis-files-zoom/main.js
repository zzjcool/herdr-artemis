// A diagram, big enough to read. The page fits one to the width it has, which is right
// for the page — a diagram must not push the prose sideways — and wrong for a wide
// sequence diagram, whose labels arrive at six pixels. A click on the picture opens it
// here instead: a dialog with both axes scrolling and steps of zoom, drawn from the very
// same cached SVG the page drew. A bigger look at one picture, not a second render.
//
// It is a mod like any other, so it also opens as a tab (`tab.new --mod
// artemis-files-zoom`), where there is no overlay to close and the tab closes itself.
import * as fs from "fs/promises";
import { View, div, image } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { appHome, closeOverlay, props, theme } from "herdr";

// The steps `+` and `−` land on, taken from wherever the picture is now. Fit is not one
// of them: it is the page's own rule and the button is how it comes back.
const STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
// The wheel is continuous, so it is clamped instead of stepped: past six the picture is
// a smear, below a quarter there is nothing left to see.
const MIN = 0.25, MAX = 6;

const absolute = (path) => `${appHome()}/${path}`;

// The host rasterizes an SVG once, at the size its header declares, and then scales that
// bitmap to whatever box it is given — so the same picture painted at twice its own size
// is the same picture blurred. A bigger look therefore asks for a bigger header: the same
// bytes with the two attributes doubled and the viewBox untouched, written beside the
// original so the rasterizer starts from as many pixels as the dialog will paint. The
// name says what is in it, because the answer is a pure function of the file, and the copy
// is the same six kilobytes of picture as the one it was made from.
async function dense(path) {
  const cut = path.lastIndexOf("/"), dir = path.slice(0, cut + 1), name = path.slice(cut + 1);
  const variant = `${dir}${name.replace(/\.svg$/i, "")}-2x.svg`;
  if (await fs.exists(absolute(variant)).catch(() => false)) return variant;
  const text = await fs.readFile(absolute(path), "utf8").catch(() => null);
  // A picture whose file cannot be read is drawn as it is: soft beats nothing.
  if (!text) return path;
  const opening = /<svg\b[^>]*>/i.exec(text)?.[0] ?? "";
  // Only plain numbers are multiplied. A percentage or a missing attribute is a file that
  // does not declare its own size, and there is nothing there to make bigger.
  const width = /\bwidth="([0-9]*\.?[0-9]+)"/i.exec(opening)?.[1];
  const height = /\bheight="([0-9]*\.?[0-9]+)"/i.exec(opening)?.[1];
  if (!width || !height) return path;
  const sized = opening
    .replace(/\bwidth="[^"]*"/i, `width="${Math.round(Number(width) * 2)}"`)
    .replace(/\bheight="[^"]*"/i, `height="${Math.round(Number(height) * 2)}"`);
  const written = await fs.writeFile(absolute(variant), text.replace(opening, sized)).catch(() => null);
  return written === null ? path : variant;
}

export default class Zoom extends View {
  init(_props, cx) {
    // Null means fit. The open is the page's answer, not the person's, so the first step
    // taken is what makes the scale theirs and Fit is a deliberate way back.
    this.scale = null;
    // The body's own measured size, so fit() is a question about this dialog rather
    // than about the window, which a dialog only ever fills part of.
    this.box = null;
    // The file this dialog draws from: the original, or the dense copy of the same
    // picture chosen once, while the first frame is still on screen. It is chosen once and
    // never swapped while the person zooms — a new path is a new raster on the host, and a
    // raster in the middle of a gesture is exactly the stutter a zoom must not have.
    this.art = null;
    this.artFor = null;
    this.handle = cx.focus_handle();
    // A dialog opens without the keyboard, so the keys below are dead until this lands;
    // one tick, once the overlay is really on screen.
    cx.timer.after(80, () => this.handle.focus());
  }

  // The picture's own pixels, which the panel has already measured from the file: the
  // host reports no intrinsic size, and a dialog cannot ask for one.
  size() {
    const p = props() ?? {};
    return { width: Number(p.width) || 0, height: Number(p.height) || 0 };
  }

  // The page's own rule at the dialog's size — as large as it fits, never larger than
  // the picture itself. Before the first measure there is no box, and 1:1 is the honest
  // guess; the measured frame follows at once.
  fit() {
    const { width, height } = this.size(), box = this.box;
    if (!box || !width || !height) return 1;
    return Math.min(box.width / width, box.height / height, 1);
  }

  // What is on screen: the step the person took, or the page's rule while they have not.
  current() {
    return this.scale ?? this.fit();
  }

  // One step from where the picture is now rather than from the last step taken, so a
  // fitted 34 % goes to 50 % and not to whatever came before. Below the smallest step
  // there is nothing smaller to ask for, and that is answered by leaving it alone.
  step(by) {
    const now = this.current();
    if (by > 0) this.scale = STEPS.find(step => step > now + 0.005) ?? STEPS[STEPS.length - 1];
    else {
      const below = STEPS.filter(step => step < now - 0.005).pop();
      if (below !== undefined) this.scale = below;
    }
  }

  // One read and one write, off the first frame: the copy this dialog will draw from for
  // its whole life, so the host's one big raster lands while nobody is dragging a wheel.
  prepare(path, cx) {
    if (!path || this.artFor === path) return;
    this.artFor = path;
    cx.spawn(async cx => {
      const art = await dense(path);
      if (this.artFor !== path) return;
      this.art = art === path ? null : art;
      cx.notify();
    });
  }

  header(t, p, scale, cx) {
    const button = (id, label, on) =>
      h_flex().id(`zoom-${id}`).h(21).px(8).flex_none().items_center().justify_center().rounded(5).cursor_pointer()
        .text_size(11.5).text_color(t.dim).hover(s => s.bg(t.hover).text_color(t.foreground))
        .on_click(() => on())
        .child(label);
    return h_flex().flex_none().h(38).px(14).gap(8).items_center().border_b(1).border_color(t.border)
      // The document this picture came out of, because a dialog has no other way to say
      // which page it belongs to.
      .child(div().flex_1().min_w(0).truncate().text_size(11.5).text_color(t.dim).child(String(p.name ?? "diagram")))
      .child(div().flex_none().text_size(11).text_color(t.muted).child(`${Math.round(scale * 100)}%`))
      .child(button("out", "−", () => { this.step(-1); cx.notify(); }))
      .child(button("fit", "Fit", () => { this.scale = null; cx.notify(); }))
      .child(button("in", "+", () => { this.step(1); cx.notify(); }))
      // A tab has nothing to close; its own close button is in the strip above it.
      .when(typeof p.overlay === "string", el => el.child(button("close", "✕", () => closeOverlay(p.overlay))));
  }

  render(cx) {
    const t = theme(), p = props() ?? {};
    const path = typeof p.path === "string" ? p.path : "";
    const { width, height } = this.size();
    // A dialog with nothing to draw is one dim line, not a crash: the props are handed
    // over by another mod, and a picture this one cannot find must not take the window
    // with it.
    if (!path || !width || !height) return v_flex().id("zoom").track_focus(this.handle).size_full().min_h(0).p(14).bg(t.popover)
      .text_size(12).text_color(t.dim).child("Nothing to zoom here · click a diagram in a markdown page");
    const scale = this.current();
    this.prepare(path, cx);
    // The dense copy is a fixed 2x, so every step up to 200 % lands on real pixels and the
    // ones past it are a bigger look at a picture rather than a sharper one.
    const art = this.artFor === path && this.art ? this.art : path;
    // The canvas is never smaller than the dialog, so a picture that fits sits in the
    // middle of it; a bigger one overflows and starts at the top-left, which is what
    // scrolling needs — a centred overflow would put the left edge out of reach.
    const canvas = {
      width: Math.max(width * scale + 24, this.box?.width ?? 0),
      height: Math.max(height * scale + 24, this.box?.height ?? 0),
    };
    return v_flex().id("zoom").track_focus(this.handle).size_full().min_h(0).rounded(8).bg(t.popover).text_color(t.foreground)
      // Escape is the host's too — it closes the top dialog — and this is the same
      // answer for a keyboard that is already in here; the rest only this dialog has.
      .on_key_down((e, cx) => {
        if (e.key === "escape") {
          if (typeof p.overlay === "string") closeOverlay(p.overlay);
          return;
        }
        if (e.key === "+" || e.key === "=") this.step(1);
        else if (e.key === "-" || e.key === "_") this.step(-1);
        else if (e.key === "0") this.scale = null;
        else return;
        cx.stop_propagation();
        cx.notify();
      })
      .child(this.header(t, p, scale, cx))
      .child(
        div().id("zoom-body").flex_1().min_h(0).min_w(0).overflow_scrollbar()
          .on_size_change((size, cx) => {
            if (this.box && Math.abs(this.box.width - size.width) < 1 && Math.abs(this.box.height - size.height) < 1) return;
            this.box = size;
            cx.notify();
          })
          // A bare wheel is the zoom this dialog exists for — proportional, so a notch near
          // 400 % moves further than one near 50 %. ⌥ or ⇧ leaves it to the scroll area,
          // which is how a picture bigger than the frame is panned on a trackpad; only the
          // branch that consumed the wheel stops it on its way down.
          .on_scroll_wheel((e, cx) => {
            if (e.modifiers.alt || e.modifiers.shift) return;
            this.scale = Math.min(MAX, Math.max(MIN, this.current() * Math.exp(-e.delta.y * 0.0025)));
            cx.stop_propagation();
            cx.notify();
          })
          .child(div().flex_none().w(canvas.width).h(canvas.height).flex().items_center().justify_center()
            .child(image(art).flex_none().w(Math.max(1, Math.round(width * scale))).h(Math.max(1, Math.round(height * scale))))),
      )
      // The hint stays on screen rather than in a tooltip: a lightbox whose wheel does not
      // scroll says so once, in the corner, and then stops explaining itself.
      .child(h_flex().flex_none().h(24).px(14).items_center().justify_end().border_t(1).border_color(t.border)
        .child(div().text_size(10).text_color(t.muted).child("wheel zooms · ⌥/⇧ wheel scrolls")));
  }
}
