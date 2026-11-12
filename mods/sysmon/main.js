// sysmon — the bottom-right block of layouts/artemis.json: this computer's CPU
// and memory, read every three seconds.
//
// Herdr has no system-stats API, so the numbers come from the two programs macOS
// ships for exactly this: `iostat` for CPU (its second sample, one second after
// the first, is the real one; the first is the average since boot) and `vm_stat`
// for the pages memory is made of. Both are read-only queries: no shell, no
// network, no files of the person's.
//
// Each metric is a label, a value in the bar's mono face, and a sparkline of the
// last twelve samples — history ticks in `idle`, the newest in `accent`, so the
// strip reads left to right and its right edge is "now". Heights are 1–11 px, so
// a quiet machine is a line of short ticks and a busy one is a comb.
//
// A machine without these programs (Linux, Windows) gets nothing drawn: after a
// run of failures the block draws no numbers at all and asks once a minute
// instead of once a tick, rather than showing a permanent "—".

import { View, div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { exec, settings, theme } from "herdr";

const TICKS = 12;        // samples in a sparkline; at the poll below, 36 s of history
const POLL = 3000;       // ms between samples
const BAR = 11;          // px: the tallest tick
const SLOW = 20;         // ticks to wait after three failures in a row: one minute
const GIB = 1024 ** 3;

// iostat prints one data line per sample; its last six fields are always
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

// Memory in use, the way a person reads it: the pages that are active, wired or
// held by the compressor. Free and inactive pages are not "used" — the kernel
// hands them back without asking — and counting them would pin this at ~99 %,
// which is how a healthy Mac always looks to `top`.
function memOf(stdout) {
  const page = Number(stdout.match(/page size of (\d+) bytes/)?.[1] ?? 0);
  const pages = (name) => Number(stdout.match(new RegExp(`^Pages ${name}:\\s+(\\d+)`, "m"))?.[1] ?? 0);
  const used = (pages("active") + pages("wired down") + pages("occupied by compressor")) * page;
  return page > 0 ? used : null;
}

// "23.2/32G", or "97/128G" once the total needs three digits to be useful.
function memory(used, total) {
  const u = used / GIB;
  const t = total / GIB;
  return `${t >= 100 ? Math.round(u) : u.toFixed(1)}/${Math.round(t)}G`;
}

export default class Sysmon extends View {
  init(_props, cx) {
    this.phys = null;                    // bytes, asked once (again if that failed)
    this.physTask = null;
    this.used = 0;                       // bytes, last sample
    this.cpu = [];                       // percent, oldest first
    this.mem = [];                       // percent of phys, oldest first
    this.missing = 0;                    // failed samples in a row
    this.wait = 0;                       // ticks left to skip after a run of failures
    this.live = false;                   // whether the last sample landed
    this.busy = false;

    cx.timer.after(1, (cx) => this.sample(cx));
    cx.timer.every(POLL, (cx) => this.sample(cx));
  }

  // hw.memsize, asked on the first sample and asked again after a failure —
  // one bad sysctl at startup must not veto every sample that follows.
  memSize() {
    if (this.phys) return Promise.resolve();
    if (!this.physTask) {
      this.physTask = exec("sysctl", ["-n", "hw.memsize"])
        .then((r) => {
          const n = Number(r.stdout.trim());
          if (Number.isFinite(n) && n > 0) this.phys = n;
        })
        .catch(() => {})
        .then(() => { this.physTask = null; });
    }
    return this.physTask;
  }

  // One sample: iostat needs ~1 s, vm_stat is instant, so they run together.
  // `busy` keeps a slow sample from stacking under the next tick.
  sample(cx) {
    if (this.busy) return;
    if (this.wait > 0) {
      this.wait--;
      return;
    }
    this.busy = true;
    cx.spawn(async (cx) => {
      try {
        await this.memSize();
        const [c, m] = await Promise.all([
          exec("iostat", ["-c", "2", "-w", "1"], { timeout: 8000 }),
          exec("vm_stat", [], { timeout: 8000 }),
        ]);
        const cpu = cpuOf(c.stdout);
        const used = memOf(m.stdout);
        if (!this.phys || cpu === null || used === null) {
          this.fail(cx);
          return;
        }
        this.missing = 0;
        this.wait = 0;
        this.live = true;
        this.used = used;
        this.push(this.cpu, Math.round(cpu));
        this.push(this.mem, Math.round((used / this.phys) * 100));
        cx.notify();
      } catch {
        this.fail(cx);
      } finally {
        this.busy = false;
      }
    });
  }

  // Three failures in a row mean the machine is not answering (no iostat, a
  // timeout): the monitor keeps trying, but once a minute instead of every tick,
  // so a transient failure recovers and a machine without the programs costs
  // almost nothing. Until a sample lands the reading goes quiet — numbers in
  // `dim`, no cream tick — rather than passing old numbers off as "now".
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

  render() {
    const t = theme();
    if (!this.phys || this.cpu.length === 0) return div();

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
          value: memory(this.used, this.phys),
          history: this.mem,
          width: 58,
        }));
  }
}
