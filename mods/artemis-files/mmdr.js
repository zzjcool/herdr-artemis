// A mermaid fence, drawn. One small pure-Rust binary turns the fence's source into
// SVG and Herdr's own `image()` rasterizes that, so a diagram needs no browser, no
// node and no DOM — only a process that exits in a few milliseconds.
//
// `image()` reads only from Herdr's folder, so the pictures live under it, named by
// the request that produced one: this pipeline, the theme, the font, the source. The
// renderer is deterministic, so the same request is the same picture and a different
// request is a different name — which is also why a change to the rule below renames
// every file instead of reviving the old ones.
import * as fs from "fs/promises";
import { Buffer } from "buffer";
import { createHash, randomUUID } from "crypto";
import { arch } from "os";
import { appHome, exec, setShared, shared, window } from "herdr";
import { dimensions } from "./preview.js";

// Pinned: this binary is the one thing this mod fetches, and a machine that cannot
// reach it still gets the fence's source on screen (the caller degrades).
const VERSION = "0.3.1";
const DIR = "data/artemis-files/diagram";
const BIN = "data/artemis-files/bin";
const RELEASE = `https://github.com/1jehuang/mermaid-rs-renderer/releases/download/v${VERSION}`;
// Part of every name, so a new renderer or a different drawing rule starts from an
// empty cache rather than from pictures this code would not have drawn.
const TAG = `mmdr${VERSION}/card`;
// The diagram cache is a folder, not an archive: the newest few hundred stay.
const KEPT = 240;
// What a diagram with its own light palette is drawn on. Some types bring that palette
// and the renderer keeps it whatever `-t` says, while the words still follow the theme,
// so on a dark window they arrive as light words on light bands — a picture of nothing.
// The card is mermaid's own printout instead: light paper, dark words on it.
const CARD = "#f7f7f7";

// Platform and architecture to the archive and the sha256 of its bytes, so a download
// that is not the file that was published is deleted rather than unpacked. The shell
// names an architecture the way rustc does — "aarch64", "x86_64" — where the release
// files use node's names, so both spellings are folded onto the same row first.
const ASSETS = {
  "macos arm64": ["mmdr-aarch64-apple-darwin.tar.gz", "562d0250cb8588adefe398a23e4bbdf67f242849ea8d888c38268bcc3edf3223"],
  "macos x64": ["mmdr-x86_64-apple-darwin.tar.gz", "ad035258822b60ee6bb3c086c3c7325dafe314bfab16a3bb99d692c18fad59cd"],
  "linux arm64": ["mmdr-aarch64-unknown-linux-gnu.tar.gz", "a74a121a2dd3bc8d30c17c954b3a036e7467a53b21532e889601a26cc6dc39d9"],
  "linux x64": ["mmdr-x86_64-unknown-linux-gnu.tar.gz", "e1da47b758769bff21b82a480fad640a3b893a90fc0dc321551486f8b50c7200"],
  "windows arm64": ["mmdr-aarch64-pc-windows-msvc.zip", "965192bcb95912d22c6d2e7b74db82930949eefbf25c064076353bafa566ac07"],
  "windows x64": ["mmdr-x86_64-pc-windows-msvc.zip", "11df20c6a2b22c6dad95a8f0176c5530d4dc9de36ef289653ee9fea13027b14c"],
};
const ARCH = { aarch64: "arm64", arm64: "arm64", x86_64: "x64", x64: "x64", amd64: "x64" };

// The names this renderer writes into its own attributes, so a band can be read
// without a colour library.
const NAMES = {
  white: "#ffffff", black: "#000000", lightgrey: "#d3d3d3", lightgray: "#d3d3d3", darkgrey: "#a9a9a9", darkgray: "#a9a9a9",
  grey: "#808080", gray: "#808080", silver: "#c0c0c0", whitesmoke: "#f5f5f5", red: "#ff0000", blue: "#0000ff",
  green: "#008000", yellow: "#ffff00", orange: "#ffa500", purple: "#800080", pink: "#ffc0cb", lightblue: "#add8e6",
};

// One render per hash: two fences, or two preview tabs, with the same source wait on
// the same process instead of writing the same file at once.
const pending = new Map();
// A fence that cannot be drawn says why for the rest of the session; a page that is
// scrolled would otherwise start the renderer again for every frame that asks.
const failures = new Map();
// The binary to run, asked once. A failed install is the session's answer too: an
// offline machine must not spend another minute per fence finding that out.
let installed = null, installError = null;

const absolute = (path) => `${appHome()}/${path}`;
const read = (name) => fs.readFile(absolute(name), "utf8").catch(() => "");
// The renderer and curl speak to a terminal, not to a person: their last line is kept
// and their "error:" is not, because the fence says what happened in its own words.
const lastLine = (text) => String(text ?? "").trim().split("\n").filter(Boolean).pop()?.replace(/^error:\s*/i, "") ?? "";
const fingerprint = (text) => String(createHash("sha1").update(text).digest("hex")).slice(0, 8);
const digest = (source, theme, font) => String(createHash("sha1").update(`${TAG}\n${theme}\n${font}\n${source}`).digest("hex"));
const binary = () => (window()?.platform === "windows" ? "mmdr.exe" : "mmdr");

// What the caller asked for: `theme` is "dark" or "default" and `font` a family list,
// both decided by the panel because only the panel knows the window it is drawn in.
// `card` says the picture carries its own light paper and must be clipped to a corner.
export async function diagram(source, { theme, font }) {
  const text = String(source ?? "");
  const hash = digest(text, theme, font);
  const failed = failures.get(hash);
  if (failed) throw new Error(failed);
  // The in-flight render is looked at before the cache: a file being written right now
  // must not be measured, and must not be deleted as a leftover either.
  const running = pending.get(hash);
  if (running) return running;
  const name = `${DIR}/${hash}.svg`;
  const known = await measure(name, hash);
  if (known) {
    keep(name);
    return { path: name, width: known.width, height: known.height, card: known.card };
  }
  const job = draw(text, name, hash, theme, font)
    .catch((error) => {
      failures.set(hash, lastLine(error?.message ?? error) || "cannot draw this diagram");
      throw error;
    })
    .finally(() => pending.delete(hash));
  pending.set(hash, job);
  return job;
}

// The size and whether the picture carries its own paper, both read from the bytes. A
// file that cannot be measured is a render that was cut short: it is removed and drawn
// again — unless a render for it is in flight, because that one is writing it now.
async function measure(name, hash) {
  const bytes = await fs.readFile(absolute(name)).catch(() => null);
  if (!bytes) return null;
  const size = dimensions(bytes, "svg");
  if (!size) {
    if (!pending.has(hash)) await fs.unlink(absolute(name)).catch(() => null);
    return null;
  }
  return { ...size, card: isCard(Buffer.from(bytes).toString("utf8")) };
}

async function draw(text, name, hash, theme, font) {
  const bin = await install();
  const dir = absolute(DIR);
  await fs.mkdir(dir, { recursive: true }).catch(() => null);
  // `exec` has no stdin, so the source becomes a file; its name carries the request and
  // a random tail, because two panels can be drawing at the same moment.
  const source = `${dir}/in-${hash.slice(0, 8)}-${randomUUID().slice(0, 8)}.mmd`;
  await fs.writeFile(source, `${text}\n`);
  try {
    let size = await render(bin, source, name, hash, theme, false, font);
    // A light window is already the right ground for a type with its own light palette,
    // so it keeps the transparent canvas. A dark one does not: the picture is redrawn
    // once as a card, and that card is what makes its words readable. They are read
    // from the picture that came back, so no table of types has to be kept.
    if (theme === "dark" && lightBands(await read(name))) {
      size = await render(bin, source, name, hash, "default", true, font).catch(async (error) => {
        await fs.unlink(absolute(name)).catch(() => null);
        throw error;
      });
      // Still light on light even on paper: this picture's own colours cannot be read
      // here, so it is thrown away rather than cached and the fence keeps its source.
      if (lightMean(await read(name), "text") > 0.5) {
        await fs.unlink(absolute(name)).catch(() => null);
        throw new Error("this diagram's own colours cannot be read here");
      }
      size = { ...size, card: true };
    }
    keep(name);
    return { path: name, width: size.width, height: size.height, card: Boolean(size.card) };
  } finally {
    await fs.unlink(source).catch(() => null);
  }
}

// One process: the renderer, the config it is handed (one per theme, font and paper)
// and the size the picture turned out to be.
async function render(bin, source, name, hash, theme, card, font) {
  const dir = absolute(DIR);
  // The font is part of the request, so it is part of the config's name: a page drawn
  // in another face must not reuse a config written for the old one.
  const config = `${dir}/${card ? "card" : "theme"}-${theme}-${fingerprint(font)}.json`;
  if (!(await fs.exists(config).catch(() => false))) {
    await fs.writeFile(config, JSON.stringify({ themeVariables: { fontFamily: font, background: card ? CARD : "#00000000" } }));
  }
  // Written beside the final name and copied over it afterwards: the shim has no
  // rename, and a picture that is read while the renderer is still writing it measures
  // as nothing — or worse, as half of itself.
  const temp = `${dir}/out-${randomUUID().slice(0, 8)}.svg`;
  const result = await exec(bin.command, ["-i", source, "-o", temp, "-t", theme, "-c", config], { timeout: 10000 })
    .catch(async (error) => {
      await fs.unlink(temp).catch(() => null);
      throw error;
    });
  if (result.code !== 0) {
    await fs.unlink(temp).catch(() => null);
    // A renderer that came off the person's PATH is named as such: the one this mod
    // downloaded is the one it can vouch for, and the fix differs.
    throw new Error(`${lastLine(result.stderr) || "the renderer refused this diagram"}${bin.from === "path" ? " (mmdr on PATH)" : ""}`);
  }
  const bytes = await fs.readFile(temp).catch(() => null);
  await fs.unlink(temp).catch(() => null);
  if (!bytes) throw new Error("the renderer wrote no picture");
  await fs.writeFile(absolute(name), bytes);
  const size = await measure(name, hash);
  if (!size) throw new Error("the renderer wrote no picture");
  return size;
}

// A band is a `<rect>` that actually paints: `none` is not one, nor is a zero opacity,
// and neither is the transparent canvas this mod asks for. Every colour the renderer
// writes is read — names, three- and six-digit hex, rgb() and hsl() — because a table
// of "the diagram types that bring their own palette" would be a table to maintain.
function bands(text) {
  const out = [];
  for (const found of text.matchAll(/<rect\b[^>]*>/gi)) {
    const tag = found[0];
    if (/(?:fill-opacity|opacity)="0(?:\.0*)?"/i.test(tag)) continue;
    const paint = color(/fill="([^"]*)"/i.exec(tag)?.[1] ?? "#000000");
    if (paint && paint.a > 0) out.push(luminance(paint));
  }
  return out;
}

// Light bands outnumber dark ones: the picture is drawn on a light palette of its own,
// whatever theme was asked for.
function lightBands(text) {
  const values = bands(text);
  return values.filter((value) => value > 0.6).length > values.filter((value) => value < 0.4).length;
}

// The mean of everything a tag paints, so a page of light words is distinguishable from
// a page of dark ones.
function lightMean(text, tag) {
  const values = [];
  for (const found of text.matchAll(new RegExp(`<${tag}\\b[^>]*>`, "gi"))) {
    const paint = color(/fill="([^"]*)"/i.exec(found[0])?.[1] ?? "#000000");
    if (paint && paint.a > 0) values.push(luminance(paint));
  }
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

// The canvas is the first rectangle in every picture, and it is the one number that
// says whether this is a card: an opaque light fill is paper the diagram brought.
function isCard(text) {
  const first = /<rect\b[^>]*>/i.exec(text)?.[0] ?? "";
  const paint = color(/fill="([^"]*)"/i.exec(first)?.[1] ?? "");
  return Boolean(paint) && paint.a > 0 && luminance(paint) > 0.6;
}

const luminance = (paint) => 0.2126 * paint.r + 0.7152 * paint.g + 0.0722 * paint.b;

function color(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text || text === "none" || text === "transparent") return null;
  if (NAMES[text]) return color(NAMES[text]);
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(text);
  if (hex) {
    const digits = hex[1], wide = digits.length > 4, parts = [];
    for (let at = 0; at < digits.length; at += wide ? 2 : 1) parts.push(parseInt(wide ? digits.slice(at, at + 2) : digits[at] + digits[at], 16) / 255);
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  }
  const rgb = /^rgba?\(([^)]*)\)$/.exec(text);
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean).map((part) => (part.endsWith("%") ? Number(part.slice(0, -1)) / 100 : Number(part)));
    if (parts.length < 3 || !parts.every((part) => Number.isFinite(part))) return null;
    // css writes whole numbers here and fractions in the percentage form, so the scale
    // is whichever of the two the numbers say they are.
    const scale = parts.slice(0, 3).some((part) => part > 1) ? 255 : 1;
    return { r: parts[0] / scale, g: parts[1] / scale, b: parts[2] / scale, a: parts[3] ?? 1 };
  }
  const hsl = /^hsla?\(([^)]*)\)$/.exec(text);
  if (hsl) {
    const parts = hsl[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const hue = Number(parts[0].replace(/deg$/, "")), sat = Number(parts[1].replace("%", "")) / 100, light = Number(parts[2].replace("%", "")) / 100;
    if (![hue, sat, light].every((part) => Number.isFinite(part))) return null;
    const chroma = (1 - Math.abs(2 * light - 1)) * sat, at = (((hue % 360) + 360) % 360) / 60, second = chroma * (1 - Math.abs((at % 2) - 1));
    const [r, g, b] = at < 1 ? [chroma, second, 0] : at < 2 ? [second, chroma, 0] : at < 3 ? [0, chroma, second] : at < 4 ? [0, second, chroma] : at < 5 ? [second, 0, chroma] : [chroma, 0, second];
    const base = light - chroma / 2;
    return { r: r + base, g: g + base, b: b + base, a: parts[3] ? Number(parts[3]) : 1 };
  }
  return null;
}

// The newest names stay and the rest of the folder goes, the way the preview cache is
// trimmed: a preview folder, not an archive. The picture just written is never one of
// them, and neither is one a render is still writing.
function keep(name) {
  const before = shared("artemis-files.diagrams") ?? [];
  const kept = [name, ...before.filter((one) => one !== name)].slice(0, KEPT);
  setShared("artemis-files.diagrams", kept);
  for (const gone of before.filter((one) => !kept.includes(one) && one !== name)) {
    if (pending.has(gone.replace(/\.svg$/, ""))) continue;
    fs.unlink(absolute(`${DIR}/${gone}`)).catch(() => null);
  }
}

function install() {
  if (installError) return Promise.reject(new Error(installError));
  if (!installed) {
    installed = resolve().catch((error) => {
      installError = lastLine(error?.message ?? error) || "cannot install the mermaid renderer";
      installed = null;
      throw error;
    });
  }
  return installed;
}

// Three answers, cheapest first: a renderer already on PATH, one this mod downloaded
// before, and only then the release archive. A person who installed it themselves —
// brew, cargo, a file in their own bin — wins over anything downloaded here.
async function resolve() {
  const known = await exec("mmdr", ["--version"], { timeout: 5000 }).catch(() => null);
  // The name is not proof it is this program, so the probe has to answer in its voice.
  if (known?.code === 0 && /mmdr/i.test(known.stdout ?? "")) return { command: "mmdr", from: "path" };
  const local = absolute(`${BIN}/${binary()}`);
  if (await fs.exists(local).catch(() => false)) {
    const written = await fs.readFile(absolute(`${BIN}/mmdr.version`), "utf8").catch(() => null);
    // The version file is what makes a leftover binary from an older release be renamed
    // again rather than trusted: the source was drawn for the version pinned here.
    if (String(written ?? "").trim() === VERSION) return { command: local, from: "download" };
  }
  return download();
}

async function download() {
  const named = arch();
  const key = `${window()?.platform} ${ARCH[named] ?? (named || "unknown architecture")}`;
  const asset = ASSETS[key];
  // A machine the release has no build for is named rather than served the wrong one.
  if (!asset) throw new Error(`no mermaid renderer is published for ${key}`);
  const [file, sha256] = asset;
  const dir = absolute(BIN);
  await fs.mkdir(dir, { recursive: true }).catch(() => null);
  const archive = `${dir}/${file}`;
  // `fetch` here carries text and json and no bytes at all, so the archive comes down
  // with curl: the one file this mod fetches, once per machine, and the digest below —
  // not the transport — is what makes it the binary this code was written against.
  const fetched = await exec("curl", ["-fL", "--retry", "2", "--max-time", "60", "--max-filesize", "20000000", "-o", archive, `${RELEASE}/${file}`], { timeout: 200000 });
  if (fetched.code !== 0) throw new Error(lastLine(fetched.stderr) || "cannot download the mermaid renderer");
  const bytes = await fs.readFile(archive).catch(() => null);
  if (!bytes || String(createHash("sha256").update(bytes).digest("hex")) !== sha256) {
    await fs.unlink(archive).catch(() => null);
    throw new Error(`checksum mismatch for ${file}`);
  }
  // Both archives hold one file and nothing else, and `tar` reads the zip on Windows
  // too, so there is no branch here beyond the flag.
  const unpacked = await exec("tar", [file.endsWith(".zip") ? "-xf" : "-xzf", archive, "-C", dir], { timeout: 60000 });
  if (unpacked.code !== 0) throw new Error(lastLine(unpacked.stderr) || "cannot unpack the mermaid renderer");
  const bin = `${dir}/${binary()}`;
  if (window()?.platform !== "windows") {
    const mode = await exec("chmod", ["755", bin]).catch(() => null);
    if (mode?.code !== 0) throw new Error(lastLine(mode?.stderr) || "cannot make the mermaid renderer executable");
  }
  // The version file is written last, because it is what says "this is installed": a
  // binary that does not run must not be left looking like one.
  const check = await exec(bin, ["--version"], { timeout: 10000 }).catch(() => null);
  if (check?.code !== 0) {
    await fs.unlink(bin).catch(() => null);
    await fs.unlink(absolute(`${BIN}/mmdr.version`)).catch(() => null);
    throw new Error("the downloaded mermaid renderer does not run");
  }
  await fs.writeFile(absolute(`${BIN}/mmdr.version`), VERSION);
  await fs.unlink(archive).catch(() => null);
  return { command: bin, from: "download" };
}
