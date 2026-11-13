// The menu a file row opens on right-click: take this thing off the machine it sits
// on and put it on this one, or put its path on the clipboard. Nothing else — a file
// browser's context menu has no reason to be longer than what the row is for.
//
// The download itself runs in the panel, not here: this view is a popup and is gone
// the moment it is clicked, while the copy can take a while. So a click leaves a
// request in shared state (`files.download`) and `mods/artemis-files` picks it up.
import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { closeOverlay, exec, notify, props, setShared, theme } from "herdr";

const ICON = { download: "mods/artemis-files-menu/download.svg", copy: "mods/artemis-files-menu/copy.svg" };
const SELF = "mods/artemis-files-menu";

export default class FilesMenu extends View {
  init(_props, cx) {
    this.at = 0;
    this.handle = cx.focus_handle();
    this.handle.focus();
  }

  items(p) {
    return [
      ["download", p.dir ? "Download folder" : "Download file", "~/Downloads", () => this.download(p)],
      ["copy", "Copy path", "", () => this.copy(p.path)],
    ];
  }

  download(p) {
    setShared("files.download", { name: p.name, path: p.path, dir: Boolean(p.dir), on: p.on ?? null, at: Date.now() });
  }

  // exec has no stdin, so the path rides in as `$1` rather than down a pipe.
  async copy(path) {
    const script = 'printf %s "$1" | (command -v pbcopy >/dev/null && exec pbcopy; command -v wl-copy >/dev/null && exec wl-copy; command -v xclip >/dev/null && exec xclip -selection clipboard)';
    try {
      const r = await exec("sh", ["-c", script, "copy", path]);
      if (r.code !== 0) throw new Error("no clipboard command");
      notify({ title: "Path copied", body: path, level: "info" });
    } catch (e) {
      notify({ title: "Cannot copy", body: String(e).split("\n")[0], level: "error" });
    }
  }

  choose(i) {
    const p = props() ?? {}, it = this.items(p)[i];
    if (!it) return;
    closeOverlay(p.overlay);
    it[3]();
  }

  render(cx) {
    const t = theme(), p = props() ?? {}, list = this.items(p);
    return v_flex().id("files-menu").w_full().min_h(0).p(5).bg(t.popover).text_size(12.8)
      .track_focus(this.handle)
      .on_key_down((e, cx) => {
        if (e.key === "down") this.at = (this.at + 1) % list.length;
        else if (e.key === "up") this.at = (this.at + list.length - 1) % list.length;
        else if (e.key === "enter") return this.choose(this.at);
        else if (e.key === "escape") return closeOverlay(p.overlay);
        else return;
        cx.notify();
      })
      .children(list.map(([icon, label, hint, _action], i) =>
        h_flex().id(`files-menu-${i}`).h(31).px(8).gap(9).rounded(7).items_center().flex_none().cursor_pointer()
          .when(i === this.at, el => el.bg(t.selected))
          .hover(s => s.bg(t.hover))
          .on_click(() => this.choose(i))
          .child(svg(`${SELF}/${icon}.svg`).size(14).flex_none().text_color(t.muted))
          .child(div().flex_1().child(label))
          .when(Boolean(hint), el => el.child(div().text_size(11).text_color(t.dim).child(hint)))));
  }
}
