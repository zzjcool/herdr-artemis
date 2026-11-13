// sysmon — the bottom-right block of layouts/artemis.json: the CPU, memory and
// network of the machine the shown space lives on.
//
// Herdr has no system-stats API, so the numbers come from what each machine
// ships: on macOS `iostat`, `vm_stat` and `netstat -ib`, on Linux `/proc`. All of
// it goes through `exec(..., {on})` — herdr-core on that machine, over the
// connection Herdr already has — so the mod never runs ssh itself, holds no key
// and needs no host in a config; an unreachable machine simply reads as nothing.
//
// Every machine that has a space is sampled, not only the shown one: the shown
// machine every tick (3 s), one other machine per tick too, stalest first, so a
// host costs one probe every few ticks and switching spaces never empties a
// strip — the machine you land on already has its history. The snapshot is
// published with `setShared`, which is how the rail (`mods/artemis-spaces`) draws
// the same reading under each machine's name.
//
// Each metric is a label, a value in the bar's mono face, and a sparkline of the
// last twelve samples — history ticks in `idle`, the newest in `accent`, so the
// strip reads left to right and its right edge is "now". CPU and memory are
// heights on a fixed 0–100 %, the network one on the busiest sample of the
// window, because a link has no ceiling worth drawing against. Heights are
// 1–11 px, so a quiet machine is a line of short ticks and a busy one is a comb.

import { View, div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { exec, machines, setShared, settings, spaces, theme } from "herdr";

const TICKS = 12;        // samples in a sparkline; at the poll below, 36 s of history
const POLL = 3000;       // ms between samples of the shown machine
const BAR = 11;          // px: the tallest tick
const SLOW = 20;         // ticks to wait after three failures in a row: one minute
const STALE = 12000;     // a reading older than this is not "now" any more
const FLOOR = 4096;      // bytes/s: the network strip's smallest full scale
const GIB = 1024 ** 3;
const SHARED = "sysmon.machines";

// One round trip, one line-oriented format: `@@name` starts a section and a
// section may appear twice. CPU is a delta, so it is read at both ends of the
// probe's own second — the interval `iostat -c 2` reports, and the one Linux
// gets from reading `/proc/stat` twice.
const LINUX_PROBE =
  "echo @@cpu; head -1 /proc/stat; echo @@mem; grep -E '^(MemTotal|MemAvailable):' /proc/meminfo; " +
  "echo @@net; cat /proc/net/dev; sleep 1; echo @@cpu; head -1 /proc/stat";

const MAC_PROBE =
  "echo @@cpu; iostat -c 2 -w 1; echo @@mem; vm_stat; echo @@net; netstat -ib";

// Only the machine's own links: a VPN tunnel on top of one of these carries the
// same bytes twice, and a container bridge is not the host's traffic at all.
const MAC_IFACE = /^(en|eth|ppp)/;
const LINUX_IFACE = /^(eth|en|wl|wwan|ppp|ib)/;

// null (this computer) and "" would otherwise be two cache slots for one machine.
const keyOf = (on) => on ?? "";

// "@@name" sections, in order; a repeated name gives another block.
function sections(stdout) {
  const out = {};
  let name = null;
  for (const line of stdout.split("\n")) {
    const mark = /^@@(\w+)\s*$/.exec(line);
    if (mark) {
      name = mark[1];
      (out[name] ??= []).push([]);
      continue;
    }
    if (name) out[name][out[name].length - 1].push(line);
  }
  return out;
}

const block = (s, name, i = 0) => (s[name]?.[i] ?? []).join("\n");

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
function linuxOf(first, second, meminfo) {
  const line = (block) => block.split("\n").find((l) => l.startsWith("cpu "));
  const fields = (l) => l.trim().split(/\s+/).slice(1, 9).map(Number);
  const a = line(first);
  const b = line(second);
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
    const m = meminfo.match(new RegExp(`^${name}:\\s+(\\d+) kB`, "m"));
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

// Cumulative bytes through the machine's own links. The `<Link#n>` row is the
// one that carries the counters (the address rows above it print "-"), and the
// column order is fixed: Name Mtu Network Address Ipkts Ierrs Ibytes Opkts
// Oerrs Obytes Coll.
function macNet(text) {
  let rx = 0;
  let tx = 0;
  let seen = false;
  for (const line of text.split("\n")) {
    const f = line.trim().split(/\s+/);
    if (f.length < 10 || !MAC_IFACE.test(f[0]) || !f[2]?.startsWith("<Link#")) continue;
    const i = Number(f[6]);
    const o = Number(f[9]);
    if (!Number.isFinite(i) || !Number.isFinite(o)) continue;
    rx += i;
    tx += o;
    seen = true;
  }
  return seen ? { rx, tx } : null;
}

// /proc/net/dev: `iface:` then sixteen numbers, receive bytes first and
// transmit bytes ninth.
function linuxNet(text) {
  let rx = 0;
  let tx = 0;
  let seen = false;
  for (const line of text.split("\n")) {
    const m = /^\s*([\w.@-]+):\s*(.*)$/.exec(line);
    if (!m || !LINUX_IFACE.test(m[1])) continue;
    const n = m[2].trim().split(/\s+/).map(Number);
    if (n.length < 16 || n.some((x) => !Number.isFinite(x))) continue;
    rx += n[0];
    tx += n[8];
    seen = true;
  }
  return seen ? { rx, tx } : null;
}

// "23.2/32G", or "97/128G" once the total needs three digits to be useful.
function memory(used, total) {
  const u = used / GIB;
  const t = total / GIB;
  return `${t >= 100 ? Math.round(u) : u.toFixed(1)}/${Math.round(t)}G`;
}

// A rate without a unit of time: the label says NET, and "/s" twice per line is
// two words spent on something the eye already knows.
function rate(bps) {
  if (!(bps > 0)) return "0";
  if (bps >= GIB) return `${(bps / GIB).toFixed(bps >= 10 * GIB ? 0 : 1)}G`;
  if (bps >= 1024 ** 2) return `${(bps / 1024 ** 2).toFixed(bps >= 10 * 1024 ** 2 ? 0 : 1)}M`;
  if (bps >= 1024) return `${(bps / 1024).toFixed(bps >= 10 * 1024 ? 0 : 1)}K`;
  return `${Math.round(bps)}`;
}

export default class Sysmon extends View {
  init(_props, cx) {
    this.hosts = {};                     // machine key -> its reading and history
    this.systemJobs = {};                // in-flight answers, so a tick cannot double-ask
    this.sizeJobs = {};
    this.shown = undefined;              // the key the bar last drew
    this.published = 0;

    cx.timer.after(1, (cx) => this.pump(cx));
    cx.timer.every(POLL, (cx) => this.pump(cx));
  }

  // The machine the window is looking at: the active space's, null for this one.
  current() {
    return spaces().find((s) => s.active)?.machine ?? null;
  }

  // Every machine worth a probe: this computer, whatever the app knows about,
  // and whatever a space sits on.
  keys() {
    const names = new Set([""]);
    for (const m of machines()) if (m.name) names.add(m.name);
    for (const s of spaces()) if (s.machine) names.add(s.machine);
    return [...names];
  }

  host(key) {
    return (this.hosts[key] ??= {
      cpu: [],                           // percent, oldest first
      mem: [],                           // percent of total, oldest first
      net: [],                           // bytes/s in+out, oldest first
      used: 0,                           // bytes, last sample
      total: 0,                          // bytes, last sample
      inBps: 0,                          // bytes/s, last sample
      outBps: 0,
      netKnown: false,                   // a rate needs two samples, not one
      rx: null,                          // cumulative counters behind the rates
      tx: null,
      at: 0,                             // when the last sample was taken
      live: false,                       // whether the last sample landed
      missing: 0,                        // failed samples in a row
      wait: 0,                           // ticks left to skip after a run of failures
      busy: false,
      system: null,                      // "Darwin" | "Linux"
      size: 0,                           // bytes (macOS hw.memsize)
    });
  }

  // `uname -s`, once per machine. A failure is not cached: an unreachable host
  // is asked again next tick instead of being written off for the session.
  systemOf(key, on) {
    const host = this.host(key);
    if (host.system) return Promise.resolve(host.system);
    if (!this.systemJobs[key]) {
      this.systemJobs[key] = exec("uname", ["-s"], { on, timeout: 8000 })
        .then((r) => {
          const name = r.stdout.trim();
          if (name !== "Darwin" && name !== "Linux") throw new Error(`unknown system: ${name}`);
          host.system = name;
          return name;
        })
        .finally(() => { delete this.systemJobs[key]; });
    }
    return this.systemJobs[key];
  }

  // hw.memsize, once per macOS machine.
  sizeOf(key, on) {
    const host = this.host(key);
    if (host.size) return Promise.resolve();
    if (!this.sizeJobs[key]) {
      this.sizeJobs[key] = exec("sysctl", ["-n", "hw.memsize"], { on, timeout: 8000 })
        .then((r) => {
          const n = Number(r.stdout.trim());
          if (Number.isFinite(n) && n > 0) host.size = n;
        })
        .catch(() => {})
        .finally(() => { delete this.sizeJobs[key]; });
    }
    return this.sizeJobs[key];
  }

  // One reading of the machine, in its own dialect; `null` when the machine
  // cannot answer or answers something this mod cannot read.
  async read(key, on) {
    const host = this.host(key);
    const system = await this.systemOf(key, on);
    if (system === "Darwin") {
      await this.sizeOf(key, on);
      if (!host.size) return null;
      const r = await exec("sh", ["-c", MAC_PROBE], { on, timeout: 9000 });
      const s = sections(r.stdout);
      const net = macNet(block(s, "net"));
      return {
        cpu: cpuOf(block(s, "cpu")),
        used: memOf(block(s, "mem")),
        total: host.size,
        rx: net?.rx ?? null,
        tx: net?.tx ?? null,
      };
    }
    const r = await exec("sh", ["-c", LINUX_PROBE], { on, timeout: 9000 });
    const s = sections(r.stdout);
    const mem = linuxOf(block(s, "cpu", 0), block(s, "cpu", 1), block(s, "mem"));
    if (!mem) return null;
    const net = linuxNet(block(s, "net"));
    return { ...mem, rx: net?.rx ?? null, tx: net?.tx ?? null };
  }

  // Which machines want a probe this tick. The shown one first and on every
  // tick; then the stalest of the rest, one per tick, so four remote machines
  // cost a probe each every ~12 s instead of four connections at once.
  pump(cx) {
    const active = keyOf(this.current());
    const now = Date.now();
    const due = [];
    for (const key of this.keys()) {
      const host = this.host(key);
      if (host.wait > 0) host.wait--;
      if (host.busy || host.wait > 0) continue;
      if (now - host.at < (key === active ? POLL - 800 : STALE)) continue;
      due.push(key);
    }
    if (!due.length) return;
    const first = due.includes(active) ? active : due[0];
    this.sample(first, cx);
    const other = due.find((key) => key !== first && key !== active);
    if (other && first === active) this.sample(other, cx);
  }

  // One sample. macOS needs ~1 s for iostat's second sample and Linux sleeps a
  // second inside its own probe, so each machine runs one round trip; `busy`
  // keeps a slow answer from stacking under the next tick.
  sample(key, cx) {
    const host = this.host(key);
    const on = key || null;
    const at = Date.now();
    host.busy = true;
    cx.spawn(async (cx) => {
      let r = null;
      try {
        r = await this.read(key, on);
      } catch {
        r = null;
      }
      host.busy = false;
      if (!r || r.cpu === null || !(r.total > 0) || !(r.used >= 0)) {
        this.fail(key, cx);
        return;
      }
      const seconds = (at - host.at) / 1000;
      if (r.rx !== null && host.rx !== null && seconds > 0 && r.rx >= host.rx && r.tx >= host.tx) {
        host.inBps = (r.rx - host.rx) / seconds;
        host.outBps = (r.tx - host.tx) / seconds;
        host.netKnown = true;
      } else {
        host.inBps = 0;
        host.outBps = 0;
        host.netKnown = false;
      }
      if (r.rx !== null) {
        host.rx = r.rx;
        host.tx = r.tx;
      }
      host.missing = 0;
      host.wait = 0;
      host.live = true;
      host.at = at;
      host.used = r.used;
      host.total = r.total;
      this.push(host.cpu, Math.round(r.cpu));
      this.push(host.mem, Math.round((r.used / r.total) * 100));
      this.push(host.net, Math.round(host.inBps + host.outBps));
      this.publish();
      cx.notify();
    });
  }

  // Three failures in a row mean the machine is not answering (asleep, offline,
  // no iostat): the monitor keeps trying, but once a minute instead of every
  // tick, so a transient failure recovers and a host that will never answer
  // costs almost nothing. Until a sample lands the reading goes quiet — numbers
  // in `dim`, no cream tick — rather than passing old numbers off as "now".
  fail(key, cx) {
    const host = this.host(key);
    host.missing++;
    host.live = false;
    if (host.missing >= 3) host.wait = SLOW;
    this.publish();
    cx.notify();
  }

  // What the rail draws. `setShared` re-renders every mod, so the monitor under
  // a machine's name in `mods/artemis-spaces` is this same snapshot.
  publish() {
    const now = Date.now();
    if (now - this.published < 900) return;
    this.published = now;
    const hosts = {};
    for (const [key, host] of Object.entries(this.hosts)) {
      if (!host.cpu.length) continue;
      hosts[key] = {
        cpu: [...host.cpu],
        mem: [...host.mem],
        net: [...host.net],
        used: host.used,
        total: host.total,
        inBps: host.inBps,
        outBps: host.outBps,
        netKnown: host.netKnown,
        live: host.live && now - host.at < STALE,
        at: host.at,
      };
    }
    setShared(SHARED, { at: now, hosts });
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

  tick(t, value, newest, now, scale) {
    const p = Math.min(1, Math.max(0, value / scale));
    return div().w(2).h(1 + Math.round(p * (BAR - 1))).bg(newest ? now : t.idle);
  }

  metric(t, { label, value, history, width, mono, color, now, scale }) {
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
          .children(history.map((p, i) => this.tick(t, p, i === history.length - 1, now, scale))));
  }

  render(cx) {
    const t = theme();
    const key = keyOf(this.current());
    const host = this.host(key);

    // A machine the window has just moved to is asked at once rather than at the
    // next tick. Nothing is cleared: its own history is already here.
    if (this.shown !== key) {
      this.shown = key;
      if (Date.now() - host.at > 800 && !host.busy) cx.timer.after(1, (cx) => this.pump(cx));
    }
    if (!host.cpu.length) return div();

    // A stale reading goes quiet: `dim` numbers and no cream tick, so nothing on
    // the bar claims to be "now" when the last sample failed.
    const live = host.live && Date.now() - host.at < STALE;
    const shared = {
      mono: settings().font_family ?? "JetBrains Mono",
      color: live ? t.muted : t.dim,
      now: live ? t.accent : t.unknown,
      scale: 100,
    };
    const net = Math.max(FLOOR, ...host.net);

    return h_flex()
      .size_full()
      .items_center()
      .justify_end()
      .overflow_hidden()
      .gap(10)
      .px(12)
      .border_l(1)
      .border_color(t.border)
      .child(
        this.metric(t, {
          ...shared,
          label: "CPU",
          value: `${host.cpu[host.cpu.length - 1]}%`,
          history: host.cpu,
          width: 34,
        }))
      .child(div().flex_none().w(1).h(BAR).bg(t.border))
      .child(
        this.metric(t, {
          ...shared,
          label: "MEM",
          value: memory(host.used, host.total),
          history: host.mem,
          width: 58,
        }))
      .child(div().flex_none().w(1).h(BAR).bg(t.border))
      .child(
        this.metric(t, {
          ...shared,
          label: "NET",
          value: host.netKnown ? `↓${rate(host.inBps)} ↑${rate(host.outBps)}` : "—",
          history: host.net,
          width: 74,
          scale: net,
        }));
  }
}
