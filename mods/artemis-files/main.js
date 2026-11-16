// A lazy file browser for the focused pane's folder, with bounded read-only previews
// — and a right-click that takes a file (or a whole folder) off the machine it lives
// on and puts it on this one, in ~/Downloads. The transfer runs here rather than in
// the menu: the menu is a popup and is gone the moment it is clicked.
import { View, div, svg, image } from "gpui-kit";
import { v_flex, h_flex, Editor, EditorState, TextView } from "gpui-base";
import * as fs from "fs/promises";
import { kindOf, dimensions, cacheName, decode, extOf, CACHE } from "./preview.js";
import { spaces, panes, focused, appHome, exec, hc, home, notify, openOverlay, props, readTextFile, run, setShared, shared, watchFolder, theme, settings, window } from "herdr";

function location() {
  const space = spaces().find(s => s.active), f = focused();
  const pane = f?.pane ? panes().find(p => p.pane === f.pane) : null;
  const on = f?.pane === null ? (f.terminal?.includes("/") ? f.terminal.split("/")[0] : null) : space?.machine ?? null;
  return { cwd: pane?.cwd || f?.cwd || space?.folder, on, space: space?.id };
}
const key = () => JSON.stringify(location());
const LANG = { ts: "js", tsx: "js", mts: "js", cts: "js", jsx: "js", mjs: "js", toml: "yaml", jsonc: "json", svelte: "html", vue: "html" };
const PER_FOLDER = 500, TOTAL = 5000;
const DOWNLOADS = "Downloads", PICKUP = 15000, SHOWN = 9000, SSH_TIMEOUT = 590000;
// herdr-core's channel carries text and stops at 8 MiB; base64 grows a file by a third,
// so a little over 5 MB of picture is what fits through it.
const CORE_MAX = 5 * 1024 * 1024;

// `on` names a machine the way herdr-core does, and ssh needs that machine's `target`,
// which is a different string (`nj-host` is reached as `nj-host-ts`). A target is an
// ssh-config host, `user@host[:port]`, or `ssh://user@host:port` — scp refuses the
// last form (measured: "Connection closed"), so it is split here.
const lastLine = (text) => String(text ?? "").trim().split("\n").filter(Boolean).pop() ?? "";

// A markdown document is cut at its code fences: prose keeps the host's renderer
// (headings, lists, tables, quotes, links — none of which a mod should re-invent),
// and each fence becomes a real `Editor`, which is the only thing in the shell that
// knows how to colour code. `TextView` cannot: inline CSS is not supported, so a
// fence drawn by it is monochrome no matter what.
// `dir/README.md` + `../img/a.png` → `img/a.png`, or null when it climbs out of the
// folder the panel is showing.
export function resolve(base, link) {
  const out = [];
  for (const part of `${base}/${link}`.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") { if (!out.length) return null; out.pop(); continue; }
    out.push(part);
  }
  return out.join("/");
}

// Every block of a path but the last: "docs/a/b.md" → "docs/a".
export const folderOf = (path) => {
  const cut = String(path ?? "").lastIndexOf("/");
  return cut < 0 ? "" : path.slice(0, cut);
};

export function blocks(text) {
  const out = [], prose = [];
  let code = null;
  const flush = () => { if (prose.length) { out.push({ kind: "md", text: prose.join("\n") }); prose.length = 0; } };
  // A CRLF file otherwise fails every fence test — a host that hands over `\r\n`
  // would turn the whole document into one code block, or none at all.
  const lines = String(text).replace(/\r\n?/g, "\n").split("\n");
  // Reference definitions, `[label]: text/url "title"`, for the `![alt][label]` spelling.
  // They are read but not removed: the host still gets the line, and a link that uses the
  // same label keeps working.
  const refs = {};
  for (const line of lines) {
    const def = /^\s{0,3}\[([^\]]+)\]:\s*<?([^\s>]+)>?(?:\s+["'(].*)?$/.exec(line);
    if (def) refs[def[1].trim().toLowerCase()] = def[2];
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (code) {
      // The closing fence must be at least as long as the opening one and carry no
      // info string; anything else is content (which is what lets a document about
      // markdown nest fences).
      const close = /^\s*(`{3,}|~{3,})\s*$/.exec(line);
      if (close && close[1][0] === code.fence[0] && close[1].length >= code.fence.length) {
        out.push({ kind: "code", lang: code.lang, text: code.lines.join("\n") });
        code = null;
      } else code.lines.push(line);
      continue;
    }
    // Any info string is allowed — `js {1,3}`, `bash tab="macOS"`, `{ .python }`. A
    // fence this reader rejects is not merely left plain: it inverts the document,
    // because the closing line then opens a block of its own.
    const open = /^\s*(`{3,}|~{3,})\s*(.*)$/.exec(line);
    if (open && !(open[1][0] === "`" && open[2].includes("`"))) {
      flush();
      code = { fence: open[1], lang: language(open[2]), lines: [] };
      continue;
    }
    // A fence inside a blockquote. `> \`\`\`sh` is not a fence to a reader that only
    // looks at the start of the line, so the block stayed grey — but its content lines
    // all carry the same `> ` and so does its closing line, which is enough to lift the
    // whole block out and leave the quote's prose to the host. A quote that ends before
    // its fence does is left alone rather than guessed at.
    const quoted = /^([ \t]{0,3}(?:>[ \t]?)+)(`{3,}|~{3,})[ \t]*(.*)$/.exec(line);
    if (quoted && !(quoted[2][0] === "`" && quoted[3].includes("`"))) {
      const prefix = quoted[1], fence = quoted[2], body = [];
      let j = i + 1, closed = false;
      for (; j < lines.length; j++) {
        const close = /^([ \t]{0,3}(?:>[ \t]?)+)(`{3,}|~{3,})[ \t]*$/.exec(lines[j]);
        if (close && close[1] === prefix && close[2][0] === fence[0] && close[2].length >= fence.length) { closed = true; break; }
        if (!lines[j].startsWith(prefix)) break;
        body.push(lines[j].slice(prefix.length));
      }
      if (closed) {
        flush();
        out.push({ kind: "code", lang: language(quoted[3]), text: body.join("\n"), quote: prefix.trim() });
        i = j;
        continue;
      }
    }
    // Every spelling of a picture, in one pass: whole line, inside a sentence, the HTML
    // `<img>`, the reference forms, and a Pandoc `{width=…}` tail. All of them are drawn
    // broken by the host — it resolves the path against its own folder — so all of them
    // leave this reader as blocks.
    const pictures = picturesIn(line, refs);
    if (pictures.length) {
      const first = pictures[0], last = pictures[pictures.length - 1];
      const alone = pictures.length === 1 && !line.slice(0, first.index).trim() && !line.slice(last.index + last.length).trim();
      flush();
      let at = 0;
      for (const picture of pictures) {
        // The words before a picture are closed into a paragraph first, or the picture
        // lands after them; the words after the last one go back into the prose that
        // follows, so two sides of one sentence do not become two paragraphs.
        if (line.slice(at, picture.index).trim()) prose.push(line.slice(at, picture.index));
        flush();
        out.push({ kind: "image", alt: picture.alt, src: picture.src, width: picture.width, height: picture.height, inline: !alone });
        at = picture.index + picture.length;
      }
      if (line.slice(at).trim()) prose.push(line.slice(at));
      continue;
    }
    prose.push(line);
  }
  if (code) out.push({ kind: "code", lang: code.lang, text: code.lines.join("\n") });
  else flush();
  return out;
}

// Every spelling of a picture: `![](a.png)` with an optional Pandoc `{width=…}` tail, the
// HTML `<img>`, and the reference forms `![alt][label]`, `![label][]` and `![label]` — the
// last three only when the label is actually defined somewhere, because an undefined one
// is just text and must stay text.
const PICTURE = /<img\b[^>]*>|!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+["'][^"']*["'])?\s*\)\s*(?:\{([^}]*)\})?|!\[([^\]]*)\]\[([^\]]*)\]\s*(?:\{([^}]*)\})?|!\[([^\]]*)\](?![([])\s*(?:\{([^}]*)\})?/gi;

// Inline code spans, so a document may *show* a picture tag without drawing one. RECIPE
// and every other note about markdown is full of exactly that.
function codeSpans(line) {
  const spans = [], runs = [...line.matchAll(/`+/g)];
  for (let i = 0; i < runs.length; i++) {
    const open = runs[i];
    const close = runs.slice(i + 1).find(run => run[0].length === open[0].length);
    if (!close) continue;
    spans.push([open.index, close.index + close[0].length]);
    i = runs.indexOf(close);
  }
  return spans;
}

function picturesIn(line, refs) {
  const found = [], spans = codeSpans(line);
  const size = (attrs, name) => {
    const m = new RegExp(`\\b${name}\\s*=\\s*"?([0-9]+)`, "i").exec(attrs);
    return m ? Number(m[1]) : null;
  };
  for (const match of line.matchAll(PICTURE)) {
    if (spans.some(([open, close]) => match.index > open && match.index < close)) continue;
    const raw = match[0];
    let alt = "", src = "", attrs = "";
    if (/^<img/i.test(raw)) {
      const pick = (name) => {
        const m = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(raw);
        return m ? (m[1] ?? m[2] ?? m[3] ?? "") : "";
      };
      src = pick("src"); alt = pick("alt");
      attrs = `width=${pick("width")} height=${pick("height")}`;
    } else if (match[2] !== undefined) { alt = match[1]; src = match[2]; attrs = match[3] ?? ""; }
    else if (match[5] !== undefined) { alt = match[4]; src = refs[(match[5] || match[4]).trim().toLowerCase()] ?? ""; attrs = match[6] ?? ""; }
    else { alt = match[7] ?? ""; src = refs[alt.trim().toLowerCase()] ?? ""; attrs = match[8] ?? ""; }
    if (!src) continue;
    found.push({ index: match.index, length: raw.length, alt, src, width: size(attrs, "width"), height: size(attrs, "height") });
  }
  return found;
}

// The first word of a fence's info string, however it is dressed: `js`, `{.js}`,
// `js {1,3}`, `python title="a.py"`.
function language(info) {
  const text = String(info ?? "").trim();
  const braced = /^\{\s*\.?([\w#+.-]+)/.exec(text);
  if (braced) return braced[1].toLowerCase();
  return (text.split(/\s+/)[0] ?? "").replace(/[^\w#+.-]/g, "").toLowerCase();
}

// How wide a line is in the mono face: a wide character is two cells, a tab runs to
// the next stop. Counting characters instead clipped every block of CJK or tabs,
// because the height a sheet gets comes from this number.
export function columns(line) {
  let width = 0;
  for (const ch of String(line)) {
    const c = ch.codePointAt(0);
    if (ch === "\t") width += 8 - (width % 8);
    else if (c >= 0x1100 && (c <= 0x115f || c === 0x2329 || c === 0x232a || (c >= 0x2e80 && c <= 0xa4cf && c !== 0x303f) ||
      (c >= 0xac00 && c <= 0xd7a3) || (c >= 0xf900 && c <= 0xfaff) || (c >= 0xfe30 && c <= 0xfe6f) ||
      (c >= 0xff00 && c <= 0xff60) || (c >= 0xffe0 && c <= 0xffe6) || (c >= 0x1f300 && c <= 0x1f64f) ||
      (c >= 0x1f900 && c <= 0x1f9ff) || (c >= 0x20000 && c <= 0x3fffd))) width += 2;
    else width += 1;
  }
  return width;
}

// A folder path as a command that takes paths (not a shell) needs it: `cp` has no idea
// what `~` means.
const expanded = (path) => (path === "~" ? home() : path.startsWith("~/") ? `${home()}/${path.slice(2)}` : path);
const quoted = (path) => `'${String(path).replace(/'/g, "''")}'`;

function sshOf(target) {
  const m = /^(?:ssh:\/\/)?(?:([^@/]+)@)?([^:/]+?)(?::(\d+))?\/?$/.exec(String(target));
  return m ? { user: m[1] ?? null, host: m[2], port: m[3] ?? null } : { user: null, host: String(target), port: null };
}

async function directory(path, on) {
  const windowsDirectory = async () => {
    // Windows PowerShell otherwise uses the console code page; exec decodes UTF-8.
    // Links keep directory attributes even when dangling; check their target.
    // Other reparse points (OneDrive's folders) have no LinkType and are folders.
    // PowerShell reads curly single quotes as quotes too, so they're doubled like '.
    const r = await exec("powershell", ["-NoProfile", "-Command", "[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); & { param($p) @(Get-ChildItem -LiteralPath $p -Force -ErrorAction Stop | Where-Object Name -ne '.git' | Select-Object -First 501 | ForEach-Object { @{ name=$_.Name; dir=($_.PSIsContainer -and (-not ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -or -not $_.LinkType -or ($_.Target -and [IO.Directory]::Exists(([IO.Path]::Combine([IO.Path]::GetDirectoryName($_.FullName), $_.Target[0])))))) } }) | ConvertTo-Json -Compress } '" + path.replace(/['‘’‚‛]/g, "$&$&") + "'"], { on });
    if (r.code !== 0) throw new Error(r.stderr || "Cannot list this folder");
    const result = JSON.parse(r.stdout || "[]");
    return Array.isArray(result) ? result : [result];
  };
  if (!on && window()?.platform === "windows") return windowsDirectory();
  const script = 'n=0; for p in "$1"/* "$1"/.[!.]* "$1"/..?*; do [ -e "$p" ] || [ -L "$p" ] || continue; name=${p##*/}; [ "$name" = .git ] && continue; if [ -d "$p" ]; then kind=d; else kind=f; fi; printf "%s\\0%s\\0" "$kind" "$name"; n=$((n+1)); [ "$n" -gt 500 ] && break; done; test -d "$1"';
  let r;
  try { r = await exec("sh", ["-c", script, "files", path], { on }); }
  catch (e) {
    if (on && String(e).includes("cannot start sh: program not found")) return windowsDirectory();
    throw e;
  }
  if (r.code !== 0) throw new Error(r.stderr || "Cannot list this folder");
  const fields = r.stdout.split("\0"), out = [];
  for (let i = 0; i + 1 < fields.length; i += 2) out.push({ name: fields[i + 1], dir: fields[i] === "d" });
  return out;
}

export default class Files extends View {
  init(_props, cx) {
    this.saved = new Map();
    this.entries = new Map(); this.folders = new Set(); this.pending = new Set(); this.marks = {};
    this.trail = [];
    this.refresh(cx);
    cx.timer.every(10000, cx => this.refresh(cx));
    // The right-click menu is an overlay: it cannot call back into this view, so it
    // leaves a request in shared state and this picks it up.
    cx.timer.every(500, cx => this.drain(cx));
    // Markdown has two right answers — the rendered page and the text it was written
    // as — so the choice is remembered rather than re-made on every file.
    this.mdMode = shared("artemis-files.mdMode") === "source" ? "source" : "rendered";
    // A preview tab is this mod as its own pane, handed the file through `props()` — which
    // is empty in `init` and filled a moment later.
    this.wide = false;
    cx.timer.after(120, cx => this.adopt(cx));
  }

  // The panel's copy lives in a layout; a preview tab is the same mod as a pane of its own,
  // which the host hands a file through `props()`.
  adopt(cx) {
    const spec = props();
    if (!spec?.wide || !spec.file) return;
    this.wide = true;
    this.root = spec.root ?? null; this.on = spec.on ?? null;
    this.context = { key: "tab", cwd: this.root, on: this.on };
    this.show(spec.file, cx);
    cx.notify();
  }

  // The sidebar is a third of a thousand pixels: a table and a code block both want more.
  // A tab, not a floating window. The host's own tab has a native frame, native resizing
  // (the split handles, `layout.resize`) and a native way to close; a window overlay in this
  // API is sized by its content and has no edge resize at all, which is what four
  // hand-rolled versions were fighting and losing.
  popout(cx) {
    if (!this.file) return;
    run("tab.new", {
      name: this.file.split("/").pop(),
      mod: "artemis-files",
      props: { wide: true, file: this.file, root: this.root, on: this.on },
    });
  }

  watch(root, cx) {
    if (this.on || this.watched === root) return;
    this.watched = root;
    const context = this.context;
    cx.spawn(async cx => {
      try { while (this.context === context) { await watchFolder(root); if (this.current(context)) this.refresh(cx); } }
      catch { if (this.context === context) this.watched = null; }
    });
  }

  // A window's copy has no `location()` to agree with — it was handed its folder — so it
  // is asked only whether it is still the same context, not whether the space agrees.
  current(context) {
    return this.context === context && (this.wide || key() === context.key);
  }

  async loadFolder(path, context) {
    const { on, cwd: root } = context;
    const entries = await directory(path ? `${root}/${path}` : root, on);
    if (!this.current(context) || (path && !this.folders.has(path))) return;
    const used = [...this.entries.entries()].filter(([p]) => p !== path).reduce((n, [, e]) => n + e.length, 0);
    this.entries.set(path, entries.slice(0, Math.max(0, Math.min(PER_FOLDER, TOTAL - used))).sort((a, b) => Number(b.dir) - Number(a.dir) || a.name.localeCompare(b.name)));
    if (entries.length > PER_FOLDER || used + entries.length > TOTAL) this.limited = true;
  }

  refresh(cx) {
    if (this.wide) return;
    const { cwd, on } = location(), next = key();
    if (next !== this.context?.key) {
      if (this.context) this.saved.set(this.context.key, { folders: this.folders, file: this.file });
      const saved = this.saved.get(next);
      this.context = { key: next, cwd, on }; this.root = cwd; this.on = on; this.entries = new Map(); this.folders = new Set(saved?.folders);
      this.pending = new Set(); this.marks = {}; this.trail = []; this.show(null); this.watched = null; this.error = null; this.limited = false;
      this.loading = false;
      if (saved?.file) this.show(saved.file, cx);
    }
    if (!cwd || this.loading) return;
    const context = this.context;
    this.loading = true;
    this.limited = false;
    cx.spawn(async cx => {
      try {
        for (const path of ["", ...this.folders]) {
          if (!this.current(context)) return;
          await this.loadFolder(path, context);
        }
        const top = await exec("git", ["rev-parse", "--show-toplevel"], { cwd, on }).catch(() => null);
        const marks = {};
        if (top?.code === 0) {
          // Writes nothing under .git (index lock, fsmonitor cookie): the folder watch would refresh again.
          const status = await exec("git", ["--no-optional-locks", "-c", "core.fsmonitor=false", "status", "--porcelain=v1", "-z", "--no-renames", "--untracked-files=all"], { cwd, on }).catch(() => null);
          if (status?.code === 0) for (const entry of status.stdout.split("\0").filter(Boolean).slice(0, TOTAL)) {
            const xy = entry.slice(0, 2);
            marks[`${top.stdout.trim()}/${entry.slice(3)}`] = xy === "??" || xy.includes("A") ? "A" : xy.includes("U") ? "U" : xy.includes("D") ? "D" : "M";
          }
        }
        if (!this.current(context)) return;
        this.marks = marks; this.error = null; this.watch(cwd, cx);
      } catch (e) { if (this.current(context)) this.error = String(e); }
      finally { if (this.context === context) this.loading = false; cx.notify(); }
    });
  }

  toggle(path, cx) {
    if (this.folders.has(path)) {
      for (const folder of [...this.folders]) if (folder === path || folder.startsWith(path + "/")) {
        this.folders.delete(folder);
        this.entries.delete(folder);
      }
    } else {
      this.folders.add(path);
      if (!this.entries.has(path) && !this.pending.has(path)) {
        const context = this.context;
        this.pending.add(path);
        cx.spawn(async cx => {
          try { await this.loadFolder(path, context); }
          catch (e) { if (this.current(context)) this.error = String(e); }
          finally { if (this.context === context) this.pending.delete(path); cx.notify(); }
        });
      }
    }
    cx.notify();
  }

  // Three kinds, and the picture is the only one that does not begin with the text
  // it is: an image is copied in and drawn, markdown is rendered, everything else
  // stays the read-only editor it was.
  show(path, cx) {
    this.release();
    this.file = path; this.fileError = null; this.kind = path ? kindOf(path) : null;
    if (!path || !cx) return;
    const context = this.context, root = this.root, on = this.on;
    if (this.kind === "image") return this.showImage(path, `${root}/${path}`, on, context, cx);
    cx.spawn(async cx => {
      try {
        const text = await readTextFile(`${root}/${path}`, { on });
        if (this.file !== path || !this.current(context)) return;
        if (text === null) { this.fileError = "This file is no longer available"; return; }
        if (this.kind === "markdown") {
          this.markdown = text;
          if (this.mdMode === "source") this.code = this.editor(text, "markdown");
          else {
            this.blocks = this.build(text, path);
            if (this.blocks) this.loadImages(context, cx);
          }
          return;
        }
        if (text.includes("\0")) { this.fileError = "No preview for this kind of file · right-click to download it"; return; }
        this.code = this.editor(text, LANG[path.split(".").pop()] ?? (path.includes(".") ? path.split(".").pop() : "txt"));
      } catch { if (this.file === path && this.current(context)) this.fileError = "Cannot preview this file (binary, too large, or unreadable)"; }
      finally { cx.notify(); }
    });
  }

  // The read-only editor both a text file and a markdown file's source share. Built in
  // a handler or a load, never in `render`: `EditorState.new` needs a live host call.
  editor(text, language, options = {}) {
    const t = theme();
    return EditorState.new({
      language, readonly: true,
      value: text.length > 400000 ? text.slice(0, 400000) + "\n… (file truncated)" : text,
      font_family: settings().font_family,
      font_size: options.font_size ?? 12,
      line_numbers: options.line_numbers ?? true,
      folding: false,
      soft_wrap: options.soft_wrap ?? false,
      syntax: { keyword: t.ansi5, string: t.ansi2, comment: t.dim, function: t.ansi4, type: t.ansi3, number: t.ansi1, constant: t.ansi6, variable: t.foreground, operator: t.muted, punctuation: t.muted, boolean: t.ansi3 } });
  }

  // A picture inside a document, drawn at the width it has room for and never past
  // its own pixels; a tall one is capped and scaled to keep its shape.
  imageBlock(block) {
    const t = theme(), width = Math.max(80, (this.mdBox ?? 320) - 20);
    const note = (text) => div().flex_none().mb(10).py(8).px(10).rounded(6).border_1().border_color(t.border)
      .text_size(11).text_color(t.dim).child(text);
    if (block.linked) return note(`${block.alt || "image"} · ${block.src} (remote pictures are not fetched)`);
    if (block.status === "outside") return note(`${block.alt || block.src} · outside this folder, not opened`);
    if (block.status === "failed") return note(`${block.alt || block.path} · cannot read this picture`);
    if (!block.picture) return note(`${block.alt || block.path} · loading…`);
    const { width: iw, height: ih } = block.picture;
    // A size written in the document (`{width=200}`, `<img width=200>`) wins over the
    // panel's own measure — it may enlarge a small picture, which is the one case where
    // that is what the author asked for — but never past the panel or the 480 px cap.
    const wantW = block.width ?? null, wantH = block.height ?? null;
    let w = width, h = null;
    if (iw && ih) {
      let scale = Math.min(width / iw, 480 / ih, wantW || wantH ? Infinity : 1);
      if (wantW || wantH) {
        const tw = wantW ?? Math.round((wantH * iw) / ih);
        const th = wantH ?? Math.round((wantW * ih) / iw);
        scale = Math.min(tw / iw, th / ih, width / iw, 480 / ih);
      }
      w = Math.max(1, Math.round(iw * scale));
      h = Math.max(1, Math.round(ih * scale));
    } else if (wantW && wantH) { w = Math.min(wantW, width); h = Math.min(wantH, 480); }
    else if (wantW) w = Math.min(wantW, width);
    // A size the header did not give is not a licence to take the whole page: the
    // picture is still capped, it just gets clipped rather than scaled.
    if (!h) return div().flex_none().mb(10).max_h(480).overflow_hidden().child(image(block.picture.path).w(w));
    return h_flex().flex_none().mb(10).justify_center().child(image(block.picture.path).w(w).h(h));
  }

  // A link in a rendered page: an address goes to the system browser, a path opens in
  // this panel (that is what a README's relative links are for), and the trail behind
  // it is what the back arrow walks.
  follow(url, cx) {
    const raw = String(url ?? "").trim();
    if (!raw || raw.startsWith("#")) return;
    // Anything with a scheme is not a file in this folder. The two the system browser
    // can take are handed over; `tel:`, `data:`, `file:` and `javascript:` are simply
    // not opened — before this they became file paths and produced a preview error.
    const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(raw)?.[1]?.toLowerCase();
    if (scheme) {
      if (scheme === "http" || scheme === "https" || scheme === "mailto") cx.open_url(raw);
      return;
    }
    const target = raw.split("#")[0].split("?")[0];
    if (!target) return;
    const path = resolve(folderOf(this.file ?? ""), target.replace(/^\.\//, ""));
    if (!path) return;
    if (this.trail.length >= 16) this.trail.shift();
    this.trail.push(this.file);
    this.show(path, cx);
  }

  // One fence, drawn as its own block: a bordered sheet with the language in its
  // corner and a real editor inside, so the colours are the ones a `.py` file gets.
  codeBlock(block, index) {
    const t = theme(), size = this.wide ? 12.5 : 11.5;
    const width = Math.max(160, (this.mdBox ?? 300) - 24 - (block.quote ? 8 : 0));
    const perLine = Math.max(24, Math.floor((width - 16) / (size * 0.6)));
    const visual = block.text.split("\n").reduce((n, line) => n + Math.max(1, Math.ceil(columns(line) / perLine)), 0);
    // The editor will not size itself (measured: no height draws two lines), so the
    // block is measured here — wrapped lines counted at 0.6 em per character in the
    // mono face — with a line of slack so the last line is never clipped.
    const height = Math.round((visual + 0.35) * size * 1.55) + 6;
    // A sheet lifted out of a quote is indented and says so in its corner, because the
    // one thing a reader loses when a block leaves the quote is that it was in one.
    return v_flex().id(`files-code-${index}`).flex_none().mb(10).rounded(6).border_1().border_color(t.border).overflow_hidden()
      .when(Boolean(block.quote), el => el.ml(8))
      .child(h_flex().flex_none().px(8).pt(5).pb(1).justify_end()
        .child(div().text_size(9.5).text_color(t.dim).child(`${block.quote ? `${block.quote} ` : ""}${block.lang}`)))
      .child(div().flex_none().px(2).child(Editor.new(block.state).flex_none().h(height)));
  }

  mode(next, cx) {
    if (this.mdMode === next) return;
    this.mdMode = next;
    setShared("artemis-files.mdMode", next);
    if (next === "source") {
      // Built on the way in, not in `render`: the editor needs a live host call.
      if (this.markdown !== null && !this.code) this.code = this.editor(this.markdown, "markdown");
    } else {
      // Let the other face go rather than merely stop drawing it, or the panel keeps a
      // hidden editor and both previews can be laid out at once.
      this.code?.release();
      this.code = null;
      if (this.markdown !== null && !this.blocks) {
        this.blocks = this.build(this.markdown, this.file);
        if (this.blocks) this.loadImages(this.context, cx);
      }
    }
    this.touch(cx);
  }

  // Two chips, drawn the way a selected row is: the fill says which one you are looking at.
  // An icon button in the header: `svg` is a mask, so the icon follows the theme by
  // `text_color` and needs nothing but its own file.
  icon(name, on, t, cx) {
    return h_flex().id(`files-icon-${name}`).h(21).w(24).flex_none().justify_center().items_center().rounded(5).cursor_pointer()
      .text_color(t.dim).hover(s => s.bg(t.hover))
      .on_click((_e, cx) => on(cx))
      .child(svg(`mods/artemis-files/${name}.svg`).size(13).flex_none());
  }


  chip(label, mode, t, cx) {
    const on = this.mdMode === mode;
    return h_flex().id(`files-mode-${mode}`).h(21).px(8).rounded(5).flex_none().items_center().cursor_pointer().text_size(11)
      .when(on, el => el.bg(t.selected).text_color(t.foreground))
      .when(!on, el => el.text_color(t.dim).hover(s => s.bg(t.hover)))
      .on_click((_e, cx) => this.mode(mode, cx))
      .child(label);
  }

  menu(path, entry, cx) {
    cx.stop_propagation();
    openOverlay({
      mod: "artemis-files-menu", kind: "popup", width: 248,
      props: { name: entry.name, path: path ? `${this.root}/${path}` : this.root, dir: entry.dir, on: this.on },
    });
  }

  // One request, taken once for the *window* rather than once per panel: it is stamped
  // `at: 0` in shared state the moment it is taken, so a second Files panel — or this one
  // reopened — sees it as already spent. Anything older than PICKUP belongs to a window
  // that is gone, because shared state outlives the session; it is dropped, not obeyed.
  drain(cx) {
    const request = shared("files.download");
    if (request && request.at && typeof request.path === "string" && typeof request.name === "string") {
      setShared("files.download", { ...request, at: 0 });
      if (Date.now() - request.at < PICKUP) this.transfer(request, cx);
    }
    if (this.status && !this.busy && Date.now() - this.status.at > SHOWN) {
      this.status = null;
      this.touch(cx);
    }
  }

  // Said in the panel's own footer, not only in a toast: a copy can outlast the toast's
  // few seconds, and the panel is where the person is looking.
  say(text, tone, cx) {
    this.status = { text, tone, at: Date.now() };
    this.touch(cx);
  }

  // The panel can be gone by the time a copy lands, and a redraw asked of a dead context
  // throws into an async void.
  touch(cx) {
    try { cx.notify(); } catch { /* nothing left to draw */ }
  }

  async transfer(request, cx) {
    const folder = `${home()}/${DOWNLOADS}`;
    this.busy = true;
    this.say(`Downloading ${request.name}…`, "dim", cx);
    // Through a `.part` name: a copy killed by the timeout would otherwise leave a
    // truncated file under the real name, and the panel would have said it failed.
    let temp = null;
    try {
      await this.make(folder);
      const dest = await this.destination(request, folder);
      temp = `${dest}.part`;
      const result = request.on ? await this.pull(request, temp) : await this.copyLocal(request, temp);
      if (result.code !== 0) throw new Error(lastLine(result.stderr) || `exit ${result.code}`);
      const moved = await exec("mv", ["-f", temp, dest]);
      if (moved.code !== 0) throw new Error(lastLine(moved.stderr) || "cannot put the copy in place");
      temp = null;
      const where = `${DOWNLOADS}/${dest.slice(folder.length + 1)}`;
      this.say(`Downloaded ${request.name} → ${where}`, "done", cx);
      notify({ title: "Downloaded", body: `${request.name} → ${where}`, level: "success" });
    } catch (e) {
      const why = lastLine(e?.message ?? e) || "unknown error";
      this.say(`Cannot download ${request.name}: ${why}`, "error", cx);
      notify({ title: "Download failed", body: why, level: "error" });
    } finally {
      if (temp) await exec("rm", ["-f", temp]).catch(() => null);
      this.busy = false;
    }
  }

  async make(folder) {
    const r = window()?.platform === "windows"
      ? await exec("powershell", ["-NoProfile", "-Command", `New-Item -ItemType Directory -Force -Path ${quoted(folder)} | Out-Null`]).catch(() => null)
      : await exec("mkdir", ["-p", folder]).catch(() => null);
    // Not fatal on its own: the copy that follows says why more precisely. It is the
    // macOS permission dialog on `~/Downloads` that fails here first.
    if (r && r.code !== 0) throw new Error(lastLine(r.stderr) || `cannot make ${DOWNLOADS}`);
  }

  // `cp -R` where there is a shell; `Copy-Item` on Windows, which has neither `cp` nor
  // `sh` (the shipped mod carries the same split for its folder listing).
  async copyLocal(request, dest) {
    if (window()?.platform !== "windows") return exec("cp", ["-R", expanded(request.path), dest], { timeout: SSH_TIMEOUT });
    const cmd = request.dir
      ? `Copy-Item -LiteralPath ${quoted(expanded(request.path))} -Destination ${quoted(dest)} -Recurse -Force`
      : `Copy-Item -LiteralPath ${quoted(expanded(request.path))} -Destination ${quoted(dest)} -Force`;
    return exec("powershell", ["-NoProfile", "-Command", cmd], { timeout: SSH_TIMEOUT });
  }

  // Never overwrite what is already there: `report.pdf`, then `report (2).pdf`. A name
  // that cannot be asked about counts as taken — the copy then lands on `(2)` rather
  // than on top of something.
  async destination(request, folder) {
    const dot = request.dir ? -1 : request.name.lastIndexOf(".");
    const base = dot > 0 ? request.name.slice(0, dot) : request.name;
    const ext = dot > 0 ? request.name.slice(dot) : "";
    for (let i = 1; i <= 50; i++) {
      const path = `${folder}/${i === 1 ? request.name : `${base} (${i})${ext}`}`;
      if (!(await this.present(path))) return path;
    }
    // Fifty taken names in a row is no longer a collision; make one that cannot be.
    return `${folder}/${Date.now()}-${request.name}`;
  }

  async present(path) {
    if (window()?.platform === "windows") {
      const r = await exec("powershell", ["-NoProfile", "-Command", `Test-Path -LiteralPath ${quoted(path)}`]).catch(() => null);
      if (!r) return true;
      return (r.stdout ?? "").trim().toLowerCase() === "true";
    }
    const r = await exec("sh", ["-c", 'test -e "$1"', "files", path]).catch(() => null);
    return r ? r.code === 0 : true;
  }

  // Over the local ssh rather than herdr-core's channel: that one carries text and
  // stops at 8 MiB, which would refuse a video and corrupt anything binary. The path
  // goes to scp raw — since OpenSSH 9 it speaks sftp, so there is no remote shell to
  // quote for and a space in a name is just a space (measured on all four machines).
  async pull(request, dest) {
    const { user, host, port } = sshOf(await this.target(request.on));
    const argv = ["-q", "-o", "BatchMode=yes", "-o", "ConnectTimeout=10"];
    if (port) argv.push("-P", String(port));
    if (request.dir) argv.push("-r");
    const source = `${user ? `${user}@` : ""}${host}:${request.path}`;
    const first = await exec("scp", [...argv, source, dest], { timeout: SSH_TIMEOUT });
    if (first.code === 0) return first;
    // A host with no sftp subsystem, or one that closed the session: `-O` asks the
    // remote for its own `scp` instead of opening a sftp session. Measured as the
    // difference between `Connection closed` and a file.
    const second = await exec("scp", ["-O", ...argv, source, dest], { timeout: SSH_TIMEOUT });
    return second.code === 0 ? second : first;
  }

  // herdr-core names machines; ssh needs their `target`, a different string. A core that
  // cannot answer leaves the cache unset so the next copy asks again, and a machine that
  // is only a name here falls back to that name (an ssh-config alias).
  async target(name) {
    if (!this.targets) {
      const r = await hc(["machine", "ls", "--json"]).catch(() => null);
      if (r?.code === 0) {
        const map = {};
        try {
          for (const m of JSON.parse(r.stdout ?? "{}").machines ?? []) if (!m.temporary) map[m.name] = m.target;
        } catch { /* the cache stays empty and the name is used as it is */ }
        this.targets = Object.keys(map).length ? map : null;
      }
    }
    return this.targets?.[name] ?? name;
  }

  // Every fence gets a retained editor, so they are built (and released) in one place.
  build(text, path) {
    const chunks = blocks(text);
    // Every fence is a retained editor built in one pass; a document with a hundred of
    // them is a hundred host calls in a row. Past sixty the page goes back to the
    // host's own renderer — it keeps every word and loses only the colours.
    if (chunks.filter(chunk => chunk.kind === "code").length > 60) return null;
    return chunks.map(block => {
      if (block.kind === "code") {
        return { ...block, state: this.editor(block.text, block.lang || "text", { line_numbers: false, soft_wrap: true, font_size: this.wide ? 12.5 : 11.5 }) };
      }
      if (block.kind === "image") {
        // A remote picture (http) is not fetched: the host's image loader has no URL
        // and a document should not be able to make the window download things.
        const linked = /^([a-z][a-z0-9+.-]*:)?\/\//i.test(block.src);
        const target = linked ? null : resolve(folderOf(path), block.src);
        return { ...block, linked, path: target || null, status: target || linked ? undefined : "outside" };
      }
      return block;
    });
  }

  // Pictures are read after the page is on screen, one at a time, through the same
  // three doors a single-file preview uses.
  async loadImages(context, cx) {
    const root = this.root, on = this.on;
    for (const block of this.blocks ?? []) {
      if (block.kind !== "image" || block.picture || block.status) continue;
      if (!block.path) { block.status = "linked"; continue; }
      block.status = "loading";
      this.touch(cx);
      try {
        block.picture = await this.cache(await this.bytesOf(`${root}/${block.path}`, on), extOf(block.path));
        block.status = "ready";
      } catch {
        block.status = "failed";
      }
      if (this.current(context)) this.touch(cx);
    }
  }

  release() {
    this.code?.release(); this.code = null;
    // Only a fence has a retained editor; a picture's `status` is a word, and calling
    // `release()` on it is how this line threw "not a function" the first time.
    for (const block of this.blocks ?? []) if (block.kind === "code") block.state?.release();
    this.blocks = null; this.markdown = null; this.image = null;
  }

  // `image()` reads only from Herdr's own folder, so the bytes are brought in once and
  // drawn from there, named by their own hash — an edited picture is a new name, and
  // the host is never asked whether it reloaded a path it had already drawn. The two
  // routes are the download's: `cp` here, `scp` from another machine.
  async showImage(path, source, on, context, cx) {
    cx.spawn(async cx => {
      const dir = `${appHome()}/${CACHE}`, ext = extOf(path);
      try {
        await fs.mkdir(dir, { recursive: true }).catch(() => null);
        // Three ways in, cheapest and most reliable first: `fs` for a local file, the
        // core connection for another machine's, and only then a copy process.
        const picture = await this.cache(await this.bytesOf(source, on), ext);
        if (this.file !== path || !this.current(context)) return;
        this.image = picture;
      } catch (e) {
        if (this.file === path && this.current(context)) {
          this.fileError = `No preview of this picture · ${lastLine(e?.message ?? e)}`;
        }
      } finally {
        if (this.file === path && this.current(context)) this.touch(cx);
      }
    });
  }

  // Three doors, cheapest first: `fs` for a local file, the core connection for
  // another machine's, and only then a copy process.
  async bytesOf(source, on) {
    return (on ? await this.coreBytes(source, on).catch(() => null) : await fs.readFile(expanded(source)).catch(() => null))
      ?? await this.copied(source, on);
  }

  // Into Herdr's own folder under the hash of the bytes, which is both the cache key
  // and the answer to "has this picture changed".
  async cache(bytes, ext) {
    const dir = `${appHome()}/${CACHE}`;
    await fs.mkdir(dir, { recursive: true }).catch(() => null);
    const name = cacheName(bytes, ext);
    if (!(await fs.exists(`${dir}/${name}`).catch(() => false))) await fs.writeFile(`${dir}/${name}`, bytes);
    this.keep(name);
    const size = dimensions(bytes, ext);
    return { path: `${CACHE}/${name}`, width: size?.width ?? null, height: size?.height ?? null };
  }

  // Another machine's bytes through the connection herdr-core already holds: one
  // command, no new ssh session — which is the whole point, because `scp` opens one
  // and a host that has no sftp subsystem (or limits sessions) answers
  // `scp: Connection closed`.
  async coreBytes(path, on) {
    const r = await exec("sh", ["-c", 'base64 "$1" | tr -d "\\n"', "preview", path], { on });
    if (r.code !== 0) throw new Error(lastLine(r.stderr) || "cannot read this file");
    const text = (r.stdout ?? "").trim();
    if (text.length > CORE_MAX * 1.4) throw new Error("too large for the core channel");
    const bytes = decode(text);
    if (!bytes.length) throw new Error("empty file");
    return bytes;
  }

  // The long way: copy the file in, then read back what was written. Used when the core
  // channel cannot carry it, and for local paths `fs` is not allowed to open.
  async copied(source, on) {
    const dir = `${appHome()}/${CACHE}`, ext = extOf(source), temp = `${dir}/incoming-${Date.now()}.${ext || "bin"}`;
    await fs.mkdir(dir, { recursive: true }).catch(() => null);
    try {
      const result = on
        ? await this.pull({ path: source, dir: false }, temp)
        : await exec("cp", [expanded(source), temp], { timeout: SSH_TIMEOUT });
      if (result.code !== 0) throw new Error(lastLine(result.stderr) || "cannot read this file");
      return await fs.readFile(temp);
    } finally {
      await fs.unlink(temp).catch(() => null);
    }
  }

  // A preview folder, not an archive: the last forty pictures opened stay, the rest go.
  keep(name) {
    const before = shared("artemis-files.previews") ?? [];
    const kept = [name, ...before.filter(n => n !== name)].slice(0, 40);
    setShared("artemis-files.previews", kept);
    // Never unlink a picture this page is still drawing: a document with more than
    // forty of them would otherwise delete its own first ones as it loads.
    const shown = new Set((this.blocks ?? []).map(b => b.picture?.path?.split("/").pop()).filter(Boolean));
    if (this.image) shown.add(this.image.path.split("/").pop());
    for (const gone of before.filter(n => !kept.includes(n) && !shown.has(n))) {
      fs.unlink(`${appHome()}/${CACHE}/${gone}`).catch(() => null);
    }
  }

  // The host has no object-fit and cannot report an image's size, so the picture is
  // scaled here to fit the box the panel reports — and never enlarged past its own
  // pixels, so a 16 px icon does not become a blurred poster.
  picture() {
    const box = this.ibox, { width: iw, height: ih } = this.image;
    let w = box?.width ?? 0, h = box?.height ?? 0;
    if (iw && ih && box?.width && box?.height) {
      const scale = Math.min(box.width / iw, box.height / ih, 1);
      w = Math.max(1, Math.round(iw * scale));
      h = Math.max(1, Math.round(ih * scale));
    }
    return h_flex().size_full().min_h(0).items_center().justify_center().overflow_hidden()
      .on_size_change((size, cx) => {
        if (Math.abs((this.ibox?.width ?? 0) - size.width) < 1 && Math.abs((this.ibox?.height ?? 0) - size.height) < 1) return;
        this.ibox = size;
        this.touch(cx);
      })
      // Both numbers or neither: the elements take a length, and `undefined` is not one.
      .child(w && h ? image(this.image.path).w(w).h(h).flex_none() : image(this.image.path).flex_none());
  }

  rows(prefix, depth, out, t) {
    if (out.length >= TOTAL || depth > 40) return out;
    for (const entry of this.entries.get(prefix) ?? []) {
      if (out.length >= TOTAL) break;
      const path = prefix ? `${prefix}/${entry.name}` : entry.name, open = this.folders.has(path), mark = this.marks[`${this.root}/${path}`];
      out.push(h_flex().id(`file-${path}`).h(28).flex_none().pl(8 + depth * 18).pr(8).gap(7).items_center().rounded(7).cursor_pointer().hover(s => s.bg(t.hover))
        .on_click((_e, cx) => {
          if (entry.dir) return this.toggle(path, cx);
          this.trail = [];
          this.show(path, cx);
        })
        .on_mouse_down("right", (_e, cx) => this.menu(path, entry, cx))
        .child(entry.dir ? svg(`mods/artemis-files/chevron-${open ? "down" : "right"}.svg`).size(12).flex_none().text_color(t.dim) : div().w(12).flex_none())
        .child(svg(`mods/artemis-files/${entry.dir ? "folder" : "file"}.svg`).size(14).flex_none().text_color(t.muted))
        .child(div().flex_1().min_w(0).truncate().child(entry.name))
        .when(Boolean(mark), el => el.child(div().text_size(11).text_color(mark === "A" ? t.ansi2 : mark === "D" || mark === "U" ? t.ansi1 : t.blocked).child(mark))));
      if (entry.dir && open) this.rows(path, depth + 1, out, t);
    }
    return out;
  }

  render(cx) {
    if (!this.wide && key() !== this.context?.key) this.refresh(cx);
    const t = theme();
    // A window has room, so the page is set a little larger there.
    const prose = this.wide ? 14 : 12.5;
    // In the layout the panel draws its own rounded plate; as a tab the host draws the pane,
    // so a second frame inside it would only double the border.
    return v_flex().id("files").size_full().min_h(0).overflow_hidden().bg(t.background).text_color(t.foreground).text_size(13)
      .when(!this.wide, el => el.rounded(10).border_1().border_color(t.border))
      .child(h_flex().h(42).flex_none().px(14).gap(8).items_center().border_b(1).border_color(t.border)
        .when(Boolean(this.file) && !this.wide, el => el.child(div().id("files-back").w(20).cursor_pointer().text_color(t.muted)
          .on_click((_e, cx) => { this.show(this.trail.pop() ?? null, cx); cx.notify(); }).child("←")))
        .child(div().font_semibold().child("Files"))
        .when(this.kind === "markdown" && Boolean(this.file), el => el.child(
          h_flex().flex_none().ml(6).gap(2).p(2).rounded(7)
            .child(this.chip("Rendered", "rendered", t, cx))
            .child(this.chip("Source", "source", t, cx))))
        .child(div().flex_1().min_w(0).truncate().text_right().text_size(12).text_color(t.dim).child(this.file ?? this.root?.split(/[\\/]/).pop() ?? ""))
        // The way out sits in the corner it sits in everywhere else.
        .when(Boolean(this.file) && !this.wide, el => el.child(this.icon("expand", cx => this.popout(cx), t, cx)))
)
      .when(!this.file, el => el.child(v_flex().id("files-tree").flex_1().min_h(0).overflow_y_scrollbar().p(6).children(this.rows("", 0, [], t))
        .when(Boolean(this.error) || !this.entries.get("")?.length, el => el.child(div().p(8).text_size(12).text_color(t.dim).child(this.error || (this.loading ? "Loading files…" : this.root ? "No files" : "No folder"))))
        .when(this.limited, el => el.child(div().p(8).text_size(11).text_color(t.dim).child("File list limited to 500 entries per folder and 5,000 total")))))
      .when(Boolean(this.image), el => el.child(this.picture()))
      // More fences than the editor budget allows: one renderer for the whole page,
      // colours and all the words.
      .when(this.markdown !== null && this.mdMode === "rendered" && !this.blocks, el => el.child(div().id("files-md").flex_1().min_h(0).text_size(prose)
        .p(10)
        .child(TextView.markdown(`files-md-all-${this.file.replace(/[^a-zA-Z0-9]+/g, "-")}`, this.markdown).scrollable(true).selectable(true).size_full())))
      .when(this.markdown !== null && this.mdMode === "rendered" && Boolean(this.blocks), el => el.child(v_flex().id("files-md").flex_1().min_h(0).min_w(0).text_size(prose)
        .overflow_y_scrollbar().p(10)
        .on_size_change((size, cx) => {
          if (Math.abs((this.mdBox ?? 0) - size.width) < 1) return;
          this.mdBox = size.width;
          this.touch(cx);
        })
        .children((this.blocks ?? []).map((block, i) => {
          if (block.kind === "code") return this.codeBlock(block, i);
          if (block.kind === "image") return this.imageBlock(block);
          return div().id(`files-prose-${i}`).flex_none().child(
            TextView.markdown(`files-md-${i}-${this.file.replace(/[^a-zA-Z0-9]+/g, "-")}`, block.text)
              .selectable(true).on_link_click((url, cx) => this.follow(url, cx)));
        }))))
      .when(Boolean(this.code) && !(this.kind === "markdown" && this.mdMode === "rendered"),
        el => el.child(Editor.new(this.code).flex_1().min_h(0)))
      .when(Boolean(this.file) && !this.code && this.markdown === null && !this.image,
        el => el.child(div().p(12).text_size(12).text_color(t.dim).child(this.fileError || "Loading file…")))
      .when(Boolean(this.status), el => el.child(h_flex().flex_none().px(12).py(7).items_center().border_t(1).border_color(t.border)
        .child(div().flex_1().min_w(0).truncate().text_size(11).text_color(this.status.tone === "error" ? t.blocked : this.status.tone === "done" ? t.ansi2 : t.dim).child(this.status.text))));
  }
}
