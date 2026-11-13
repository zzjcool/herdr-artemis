// A lazy file browser for the focused pane's folder, with bounded read-only previews
// — and a right-click that takes a file (or a whole folder) off the machine it lives
// on and puts it on this one, in ~/Downloads. The transfer runs here rather than in
// the menu: the menu is a popup and is gone the moment it is clicked.
import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex, Editor, EditorState } from "gpui-base";
import { spaces, panes, focused, exec, hc, home, notify, openOverlay, readTextFile, shared, watchFolder, theme, settings, window } from "herdr";

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

// `on` names a machine the way herdr-core does, and ssh needs that machine's `target`,
// which is a different string (`nj-host` is reached as `nj-host-ts`). A target is an
// ssh-config host, `user@host[:port]`, or `ssh://user@host:port` — scp refuses the
// last form (measured: "Connection closed"), so it is split here.
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
    this.refresh(cx);
    cx.timer.every(10000, cx => this.refresh(cx));
    // The right-click menu is an overlay: it cannot call back into this view, so it
    // leaves a request in shared state and this picks it up.
    cx.timer.every(500, cx => this.drain(cx));
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

  current(context) {
    return this.context === context && key() === context.key;
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
    const { cwd, on } = location(), next = key();
    if (next !== this.context?.key) {
      if (this.context) this.saved.set(this.context.key, { folders: this.folders, file: this.file });
      const saved = this.saved.get(next);
      this.context = { key: next, cwd, on }; this.root = cwd; this.on = on; this.entries = new Map(); this.folders = new Set(saved?.folders);
      this.pending = new Set(); this.marks = {}; this.show(null); this.watched = null; this.error = null; this.limited = false;
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

  show(path, cx) {
    this.code?.release(); this.code = null; this.file = path; this.fileError = null;
    if (!path || !cx) return;
    const context = this.context, root = this.root, on = this.on;
    cx.spawn(async cx => {
      try {
        const text = await readTextFile(`${root}/${path}`, { on });
        if (this.file !== path || !this.current(context)) return;
        if (text === null) { this.fileError = "This file is no longer available"; return; }
        if (text.includes("\0")) { this.fileError = "Binary file · no text preview"; return; }
        const t = theme(), ext = path.includes(".") ? path.split(".").pop() : "txt";
        this.code = EditorState.new({ language: LANG[ext] ?? ext, readonly: true,
          value: text.length > 400000 ? text.slice(0, 400000) + "\n… (file truncated)" : text,
          font_family: settings().font_family, font_size: 12,
          syntax: { keyword: t.ansi5, string: t.ansi2, comment: t.dim, function: t.ansi4, type: t.ansi3, number: t.ansi1, constant: t.ansi6 } });
      } catch { if (this.file === path && this.current(context)) this.fileError = "Cannot preview this file (binary, too large, or unreadable)"; }
      finally { cx.notify(); }
    });
  }

  menu(path, entry, cx) {
    cx.stop_propagation();
    openOverlay({
      mod: "artemis-files-menu", kind: "popup", width: 248,
      props: { name: entry.name, path: path ? `${this.root}/${path}` : this.root, dir: entry.dir, on: this.on },
    });
  }

  // One request, taken once, and the last word on the copy taken away again. Anything
  // older than PICKUP belongs to a window that is gone — shared state outlives the
  // session — so it is dropped rather than obeyed.
  drain(cx) {
    const request = shared("files.download");
    if (request && request.at && request.at !== this.picked) {
      this.picked = request.at;
      if (Date.now() - request.at < PICKUP) this.transfer(request, cx);
    }
    if (this.status && Date.now() - this.status.at > SHOWN) { this.status = null; cx.notify(); }
  }

  // Said in the panel's own footer, not only in a toast: a copy can outlast the toast's
  // few seconds, and the panel is where the person is looking.
  say(text, tone, cx) {
    this.status = { text, tone, at: Date.now() };
    cx.notify();
  }

  async transfer(request, cx) {
    const folder = `${home()}/${DOWNLOADS}`;
    this.say(`Downloading ${request.name}…`, "dim", cx);
    try {
      await exec("mkdir", ["-p", folder]).catch(() => null);
      const dest = await this.destination(request, folder);
      const result = request.on
        ? await this.pull(request, dest)
        : await exec("cp", ["-R", request.path, dest], { timeout: SSH_TIMEOUT });
      if (result.code !== 0) throw new Error((result.stderr ?? "").trim().split("\n").pop() || `exit ${result.code}`);
      const where = `${DOWNLOADS}/${dest.slice(folder.length + 1)}`;
      this.say(`Downloaded ${request.name} → ${where}`, "done", cx);
      notify({ title: "Downloaded", body: `${request.name} → ${where}`, level: "success" });
    } catch (e) {
      this.say(`Cannot download ${request.name}: ${String(e).split("\n")[0]}`, "error", cx);
      notify({ title: "Download failed", body: String(e).split("\n")[0], level: "error" });
    }
  }

  // Never overwrite what is already there: `report.pdf`, then `report (2).pdf`.
  async destination(request, folder) {
    const dot = request.dir ? -1 : request.name.lastIndexOf(".");
    const base = dot > 0 ? request.name.slice(0, dot) : request.name;
    const ext = dot > 0 ? request.name.slice(dot) : "";
    for (let i = 1; i <= 50; i++) {
      const path = `${folder}/${i === 1 ? request.name : `${base} (${i})${ext}`}`;
      if (!(await this.present(path))) return path;
    }
    return `${folder}/${Date.now()}-${request.name}`;
  }

  async present(path) {
    const r = await exec("sh", ["-c", 'test -e "$1"', "files", path]).catch(() => null);
    return Boolean(r) && r.code === 0;
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
    argv.push(`${user ? `${user}@` : ""}${host}:${request.path}`, dest);
    return exec("scp", argv, { timeout: SSH_TIMEOUT });
  }

  async target(name) {
    if (!this.targets) {
      this.targets = {};
      const r = await hc(["machine", "ls", "--json"]).catch(() => null);
      try { for (const m of JSON.parse(r?.stdout ?? "{}").machines ?? []) this.targets[m.name] = m.target; } catch { /* the name may already be reachable */ }
    }
    return this.targets[name] ?? name;
  }

  rows(prefix, depth, out, t) {
    if (out.length >= TOTAL || depth > 40) return out;
    for (const entry of this.entries.get(prefix) ?? []) {
      if (out.length >= TOTAL) break;
      const path = prefix ? `${prefix}/${entry.name}` : entry.name, open = this.folders.has(path), mark = this.marks[`${this.root}/${path}`];
      out.push(h_flex().id(`file-${path}`).h(28).flex_none().pl(8 + depth * 18).pr(8).gap(7).items_center().rounded(7).cursor_pointer().hover(s => s.bg(t.hover))
        .on_click((_e, cx) => entry.dir ? this.toggle(path, cx) : this.show(path, cx))
        .on_mouse_down("right", (_e, cx) => this.menu(path, entry, cx))
        .child(entry.dir ? svg(`mods/files/chevron-${open ? "down" : "right"}.svg`).size(12).flex_none().text_color(t.dim) : div().w(12).flex_none())
        .child(svg(`mods/files/${entry.dir ? "folder" : "file"}.svg`).size(14).flex_none().text_color(t.muted))
        .child(div().flex_1().min_w(0).truncate().child(entry.name))
        .when(Boolean(mark), el => el.child(div().text_size(11).text_color(mark === "A" ? t.ansi2 : mark === "D" || mark === "U" ? t.ansi1 : t.blocked).child(mark))));
      if (entry.dir && open) this.rows(path, depth + 1, out, t);
    }
    return out;
  }

  render(cx) {
    if (key() !== this.context?.key) this.refresh(cx);
    const t = theme();
    return v_flex().id("files").size_full().min_h(0).rounded(10).overflow_hidden().bg(t.background).border_1().border_color(t.border).text_color(t.foreground).text_size(13)
      .child(h_flex().h(42).flex_none().px(14).gap(8).items_center().border_b(1).border_color(t.border)
        .when(Boolean(this.file), el => el.child(div().id("files-back").w(20).cursor_pointer().text_color(t.muted).on_click((_e, cx) => { this.show(null); cx.notify(); }).child("←")))
        .child(div().font_semibold().child("Files"))
        .child(div().flex_1().min_w(0).truncate().text_right().text_size(12).text_color(t.dim).child(this.file ?? this.root?.split(/[\\/]/).pop() ?? "")))
      .when(!this.file, el => el.child(v_flex().id("files-tree").flex_1().min_h(0).overflow_y_scrollbar().p(6).children(this.rows("", 0, [], t))
        .when(Boolean(this.error) || !this.entries.get("")?.length, el => el.child(div().p(8).text_size(12).text_color(t.dim).child(this.error || (this.loading ? "Loading files…" : this.root ? "No files" : "No folder"))))
        .when(this.limited, el => el.child(div().p(8).text_size(11).text_color(t.dim).child("File list limited to 500 entries per folder and 5,000 total")))))
      .when(Boolean(this.file), el => el.child(this.code ? Editor.new(this.code).flex_1().min_h(0) : div().p(12).text_color(t.dim).child(this.fileError || "Loading file…")))
      .when(Boolean(this.status), el => el.child(h_flex().flex_none().px(12).py(7).items_center().border_t(1).border_color(t.border)
        .child(div().flex_1().min_w(0).truncate().text_size(11).text_color(this.status.tone === "error" ? t.blocked : this.status.tone === "done" ? t.ansi2 : t.dim).child(this.status.text))));
  }
}
