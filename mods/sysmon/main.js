// sysmon — the bottom-right block of layouts/artemis.json: the CPU and memory of
// the machine the shown space lives on.
//
// Herdr has no system-stats API, so the numbers come from what each machine
// ships: on macOS `iostat` and `vm_stat`, on Linux two reads of /proc/stat a
// second apart plus /proc/meminfo. All of it goes through `exec(..., {on})` —
// herdr-core on that machine, over the connection Herdr already has — so the mod
// never runs ssh itself, holds no key and needs no host in a config; an
// unreachable machine simply reads as nothing.
//
// Which machine: the active space's (`spaces()[i].machine`, null for this
// computer). Switching to a space on another host retargets the monitor — the old
// numbers go at once, the strip starts empty, and a sample for the machine we
// just left is thrown away (`gen`). The bar's own left end already names that
// machine, so the block does not repeat it.
//
// Each metric is a label, a value in the bar's mono face, and a sparkline of the
// last twelve samples — history ticks in `idle`, the newest in `accent`, so the
// strip reads left to right and its right edge is "now". Heights are 1–11 px, so
// a quiet machine is a line of short ticks and a busy one is a comb.

import { View, div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { exec, settings, spaces, theme } from "herdr";

const TICKS = 12;        // samples in a sparkline; at the poll below, 36 s of history
const POLL = 3000;       // ms between samples
const BAR = 11;          // px: the tallest tick
const SLOW = 20;         // ticks to wait after three failures in a row: one minute
const GIB = 1024 ** 3;

// Linux, in one round trip: the aggregate cpu line, the two memory numbers, a
// marker, a second of wall clock, then the cpu line again. The delta of the two
// is the last second's CPU — the interval iostat reports on macOS.
const LINUX_PROBE =
  'grep -m1 "^cpu " /proc/stat; grep -E "^(MemTotal|MemAvailable):" /proc/meminfo; ' +
  'echo @@; sleep 1; grep -m1 "^cpu " /proc/stat';

// null (this computer) and "" would otherwise be two cache slots for one machine.
const keyOf = (on) => on ?? "";

// macOS: iostat prints one data line per sample; its last six fields are always
// `us sy id 1m 5m 15m`, whatever disks stand before them. `-c 2` gives two
// samples and only the last is the last second — a single line cannot be told
// from the average since boot, so it is refused rather than reported as "now".
function cpuOf(stdout) {
  const lines = stdout.split("\n").filter((l) => /^\s*\d/.test(l));
  if (lines.length < 2) return null;
  const f = lines[lines.length - 1].trim().split(/\s+/);
  if (f.length < 6) return null;
  const us = Number(f[f.length - 6]);
  const sy = Number(f[f.length - 5]);
  if (!Number.isFinite(us) || !Number.isFinite(sy)) return null;
  return Math.min(100, Math.max(0, us + sy));
}

// macOS memory in use, the way a person reads it: the pages that are active,
// wired or held by the compressor. Free and inactive pages are not "used" — the
// kernel hands them back without asking — and counting them would pin this at
// ~99 %, which is how a healthy Mac always looks to `top`.
function memOf(stdout) {
  const page = Number(stdout.match(/page size of (\d+) bytes/)?.[1] ?? 0);
  const pages = (name) => Number(stdout.match(new RegExp(`^Pages ${name}:\\s+(\\d+)`, "m"))?.[1] ?? 0);
  const used = (pages("active") + pages("wired down") + pages("occupied by compressor")) * page;
  return page > 0 ? used : null;
}

// Linux: the two `cpu` lines give user/nice/system/idle/iowait/irq/softirq/steal
// ticks; busy is everything but idle+iowait over the elapsed ticks. Memory in use
// is MemTotal − MemAvailable, the figure `free` means by "used".
function linuxOf(stdout) {
  const parts = stdout.split(/^@@$/m);
  if (parts.length < 2) return null;
  const line = (block) => block.split("\n").find((l) => l.startsWith("cpu "));
  const fields = (l) => l.trim().split(/\s+/).slice(1, 9).map(Number);
  const a = line(parts[0]);
  const b = line(parts[1]);
  if (!a || !b) return null;
  const fa = fields(a);
  const fb = fields(b);
  if (fa.length < 4 || fb.length < 4 || fa.some((n) => !Number.isFinite(n))) return null;
  const sum = (f) => f.reduce((x, y) => x + y, 0);
  const idle = (f) => f[3] + (f[4] ?? 0);
  const dt = sum(fb) - sum(fa);
  const di = idle(fb) - idle(fa);
  if (!(dt > 0)) return null;
  const kb = (name) => {
    const m = parts[0].match(new RegExp(`^${name}:\\s+(\\d+) kB`, "m"));
    return m ? Number(m[1]) * 1024 : 0;
  };
  const total = kb("MemTotal");
  const available = kb("MemAvailable");
  if (!(total > 0)) return null;
  return {
    cpu: Math.min(100, Math.max(0, 100 * (1 - di / dt))),
    used: Math.max(0, total - available),
    total,
  };
}

// "23.2/32G", or "97/128G" once the total needs three digits to be useful.
function memory(used, total) {
  const u = used / GIB;
  const t = total / GIB;
  return `${t >= 100 ? Math.round(u) : u.toFixed(1)}/${Math.round(t)}G`;
}

export default class Sysmon extends View {
  init(_props, cx) {
    this.machine = undefined;            // null: this computer; undefined: not looked yet
    this.gen = 0;                        // bumped on every retarget; late samples are dropped
    this.used = 0;                       // bytes, last sample
    this.total = 0;                      // bytes, last sample
    this.cpu = [];                       // percent, oldest first
    this.mem = [];                       // percent of total, oldest first
    this.missing = 0;                    // failed samples in a row
    this.wait = 0;                       // ticks left to skip after a run of failures
    this.live = false;                   // whether the last sample landed
    this.busy = false;
    this.systems = {};                   // machine key -> "Darwin" | "Linux"
    this.sizes = {};                     // machine key -> bytes (macOS hw.memsize)
    this.systemJobs = {};                // in-flight answers, so a switch cannot double-ask
    this.sizeJobs = {};

    cx.timer.after(1, (cx) => this.sample(cx));
    cx.timer.every(POLL, (cx) => this.sample(cx));
  }

  // The machine the window is looking at: the active space's, null for this one.
  current() {
    return spaces().find((s) => s.active)?.machine ?? null;
  }

  // The reading on screen belongs to another machine now: drop it and take one
  // from the new machine as soon as possible, rather than let a stranger's
  // numbers stand for three seconds.
  retarget(on, cx) {
    this.machine = on;
    this.gen++;
    this.cpu.length = 0;
    this.mem.length = 0;
    this.used = 0;
    this.total = 0;
    this.missing = 0;
    this.wait = 0;
    this.live = false;
    this.busy = false;
    cx.timer.after(1, (cx) => this.sample(cx));
  }

  // `uname -s`, once per machine. A failure is not cached: an unreachable host
  // is asked again next tick instead of being written off for the session.
  systemOf(on) {
    const key = keyOf(on);
    if (this.systems[key]) return Promise.resolve(this.systems[key]);
    if (!this.systemJobs[key]) {
      this.systemJobs[key] = exec("uname", ["-s"], { on, timeout: 8000 })
        .then((r) => {
          const name = r.stdout.trim();
          if (name !== "Darwin" && name !== "Linux") throw new Error(`unknown system: ${name}`);
          this.systems[key] = name;
          return name;
        })
        .finally(() => { delete this.systemJobs[key]; });
    }
    return this.systemJobs[key];
  }

  // hw.memsize, once per macOS machine.
  sizeOf(on) {
    const key = keyOf(on);
    if (this.sizes[key]) return Promise.resolve();
    if (!this.sizeJobs[key]) {
      this.sizeJobs[key] = exec("sysctl", ["-n", "hw.memsize"], { on, timeout: 8000 })
        .then((r) => {
          const n = Number(r.stdout.trim());
          if (Number.isFinite(n) && n > 0) this.sizes[key] = n;
        })
        .catch(() => {})
        .finally(() => { delete this.sizeJobs[key]; });
    }
    return this.sizeJobs[key];
  }

  // One reading of the machine, in its own dialect; `null` when the machine
  // cannot answer or answers something this mod cannot read.
  async read(on) {
    const system = await this.systemOf(on);
    if (system === "Darwin") {
      await this.sizeOf(on);
      const total = this.sizes[keyOf(on)];
      if (!total) return null;
      const [c, m] = await Promise.all([
        exec("iostat", ["-c", "2", "-w", "1"], { on, timeout: 8000 }),
        exec("vm_stat", [], { on, timeout: 8000 }),
      ]);
      return { cpu: cpuOf(c.stdout), used: memOf(m.stdout), total };
    }
    const r = await exec("sh", ["-c", LINUX_PROBE], { on, timeout: 8000 });
    return linuxOf(r.stdout);
  }

  // One sample: macOS needs ~1 s for iostat's second sample, Linux sleeps a
  // second inside its own probe, so they run as one round trip. `busy` keeps a
  // slow answer — a host over a slow link, say — from stacking under the next tick.
  sample(cx) {
    if (this.busy) return;
    if (this.wait > 0) {
      this.wait--;
      return;
    }
    const gen = this.gen;
    const on = this.machine ?? null;
    this.busy = true;
    cx.spawn(async (cx) => {
      let r = null;
      try {
        r = await this.read(on);
      } catch {
        r = null;
      }
      if (gen !== this.gen) return;      // the space moved: this answer is about another machine
      this.busy = false;
      if (!r || r.cpu === null || !(r.total > 0) || !(r.used >= 0)) {
        this.fail(cx);
        return;
      }
      this.missing = 0;
      this.wait = 0;
      this.live = true;
      this.used = r.used;
      this.total = r.total;
      this.push(this.cpu, Math.round(r.cpu));
      this.push(this.mem, Math.round((r.used / r.total) * 100));
      cx.notify();
    });
  }

  // Three failures in a row mean the machine is not answering (asleep, offline,
  // no iostat): the monitor keeps trying, but once a minute instead of every
  // tick, so a transient failure recovers and a host that will never answer
  // costs almost nothing. Until a sample lands the reading goes quiet — numbers
  // in `dim`, no cream tick — rather than passing old numbers off as "now".
  fail(cx) {
    this.missing++;
    this.live = false;
    if (this.missing >= 3) this.wait = SLOW;
    cx.notify();
  }

  // The first sample fills the strip flat, so a fresh window has a line at
  // today's level rather than twelve claims of history it never saw.
  push(history, value) {
    if (history.length === 0) {
      for (let i = 0; i < TICKS; i++) history.push(value);
      return;
    }
    history.push(value);
    if (history.length > TICKS) history.shift();
  }

  tick(t, percent, newest, now) {
    const h = 1 + Math.round((Math.min(100, Math.max(0, percent)) / 100) * (BAR - 1));
    return div().w(2).h(h).bg(newest ? now : t.idle);
  }

  metric(t, { label, value, history, width, mono, color, now }) {
    return h_flex()
      .flex_none()
      .gap(7)
      .items_center()
      .child(div().flex_none().w(24).text_size(9).text_color(t.dim).child(label))
      .child(
        // Right-aligned in a fixed box, so the % and the G land in the same
        // column on every sample and the sparkline never shifts.
        h_flex()
          .flex_none()
          .w(width)
          .justify_end()
          .child(
            div()
              .flex_none()
              .font_family(mono)
              .text_size(11.5)
              .text_color(color)
              .child(value)))
      .child(
        h_flex()
          .flex_none()
          .gap(2)
          .h(BAR)
          .items_end()
          .children(history.map((p, i) => this.tick(t, p, i === history.length - 1, now))));
  }

  render(cx) {
    const t = theme();
    const on = this.current();
    if (on !== this.machine) this.retarget(on, cx);
    if (!this.total || this.cpu.length === 0) return div();

    // A stale reading goes quiet: `dim` numbers and no cream tick, so nothing
    // on the bar claims to be "now" when the last sample failed.
    const shared = {
      mono: settings().font_family ?? "JetBrains Mono",
      color: this.live ? t.muted : t.dim,
      now: this.live ? t.accent : t.unknown,
    };

    return h_flex()
      .size_full()
      .items_center()
      .justify_end()
      .overflow_hidden()
      .gap(10)
      .px(12)
      .border_t(1)
      .border_l(1)
      .border_color(t.border)
      .child(
        this.metric(t, {
          ...shared,
          label: "CPU",
          value: `${this.cpu[this.cpu.length - 1]}%`,
          history: this.cpu,
          width: 34,
        }))
      .child(div().flex_none().w(1).h(BAR).bg(t.border))
      .child(
        this.metric(t, {
          ...shared,
          label: "MEM",
          value: memory(this.used, this.total),
          history: this.mem,
          width: 58,
        }));
  }
}
