// A mermaid fence, drawn. merman-cli turns the fence's source into SVG and Herdr's own
// `image()` rasterizes that, so a diagram needs no browser, no node and no DOM — only a
// process that exits in a few milliseconds.
//
// `image()` reads only from Herdr's folder, so the pictures live under it, named by
// the request that produced one: this pipeline, the theme, the font, the source. Two
// requests are two names, and the rule a picture was drawn under is part of the name as
// well — the host rasterizes a path once and hands that picture back for as long as the
// name lives, so a change to how a fence is drawn asks for a new name rather than
// rewriting the old one.
import * as fs from "fs/promises";
import { createHash, randomUUID } from "crypto";
import { arch } from "os";
import { appHome, exec, home, setShared, shared, window } from "herdr";
import { dimensions } from "./preview.js";

// Pinned: this binary is the one thing this mod fetches, and a machine that cannot
// reach it still gets the fence's source on screen (the caller degrades).
const VERSION = "0.10.0";
const DIR = "data/artemis-files/diagram";
const BIN = "data/artemis-files/bin";
const RELEASE = `https://github.com/Latias94/merman/releases/download/v${VERSION}`;
// Part of every name, so a new renderer or a different drawing rule starts from an
// empty cache rather than from pictures this code would not have drawn. The rule is all
// of it: the pipeline the SVG is written for and the fonts its boxes were measured
// with, because the host rasterizes a picture once per path and hands the same one back
// for as long as the name lives — so a picture that would be drawn differently has to be
// asked for by a different name, not rewritten under the old one.
const TAG = `merman${VERSION}-resvg-safe-fonts`;
// The diagram cache is a folder, not an archive: the newest few hundred stay.
const KEPT = 240;

// Where the person's own fonts are kept, per platform — inside their home, because that is
// where their `font_family` came from and because a mod may only look where it was
// granted: the all-users folders are outside those roots and naming one fails the whole
// fence. A label is measured at about 0.4 em a character unless the renderer is handed the
// fonts the reader will draw with — its own default assumes nothing about a face — and a
// real one is half again wider: a JetBrains Mono label came out a third wider than its box
// and the `resvg-safe` pipeline's own clip cut both ends off it, so a class diagram arrived
// reading `nima`, `ring name +int`, `feed(`. Measured with the fonts they are drawn with,
// the box and the words agree. The system font library is deliberately not handed over: it
// is over the renderer's font-byte budget, and a diagram with CJK labels in it would then
// fail outright (`native_font_resources`) instead of drawing — which is what happened when
// this asked for full system discovery.
const FONTS = {
  macos: ["Library/Fonts"],
  windows: ["AppData/Local/Microsoft/Windows/Fonts"],
  linux: [".local/share/fonts", ".fonts"],
};
// A path the mod may not look at is a throw, not a `false`, so both are caught here.
async function there(path) {
  try { return await fs.exists(path); } catch { return false; }
}

// Platform and architecture to the archive and the sha256 of its bytes, so a download
// that is not the file that was published is deleted rather than unpacked. The shell
// names an architecture the way rustc does — "aarch64", "x86_64" — where the release
// files use node's names, so both spellings are folded onto the same row first.
//
// There is no aarch64 Windows build in this release — the previous renderer published
// one and merman publishes four targets and an x86_64 Windows zip — so that row is not
// here: a Windows on ARM machine is told it has no renderer rather than served a build
// that cannot run.
const ASSETS = {
  "macos arm64": ["merman-cli-aarch64-apple-darwin.tar.xz", "2a538e9634fa1852f459ad642179d4eee2efcbcfaa27d993fd0d856e2caab318"],
  "macos x64": ["merman-cli-x86_64-apple-darwin.tar.xz", "c29f091d2abfc9327d44dead4ee43764c742822afe1076b7f865f35fbd9f0ae4"],
  "linux arm64": ["merman-cli-aarch64-unknown-linux-gnu.tar.xz", "5481cfebf8b642d77e9924d001330b6eb3a1cf75fb7f56aa1cd8f01115d76223"],
  "linux x64": ["merman-cli-x86_64-unknown-linux-gnu.tar.xz", "f0273090f6c0973793139365bbe496035d1e89cd5bd514663ceaffb3d4f00926"],
  "windows x64": ["merman-cli-x86_64-pc-windows-msvc.zip", "0c223ce7fff97153ace64c69602bbd005d76317cac019927b80623c710510879"],
};
const ARCH = { aarch64: "arm64", arm64: "arm64", x86_64: "x64", x64: "x64", amd64: "x64" };

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
// The renderer and curl speak to a terminal, not to a person: their last line is kept
// and their "error:" is not, because the fence says what happened in its own words.
const lastLine = (text) => String(text ?? "").trim().split("\n").filter(Boolean).pop()?.replace(/^error:\s*/i, "") ?? "";
const fingerprint = (text) => String(createHash("sha1").update(text).digest("hex")).slice(0, 8);
const digest = (source, theme, font) => String(createHash("sha1").update(`${TAG}/${theme}/${fingerprint(font)}/${source}`).digest("hex"));
const binary = () => (window()?.platform === "windows" ? "merman-cli.exe" : "merman-cli");

// What the caller asked for: `theme` is "dark" or "default" and `font` a family list,
// both decided by the panel because only the panel knows the window it is drawn in.
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
  const known = await measure(name);
  if (known) {
    keep(name);
    return { path: name, width: known.width, height: known.height };
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

// The size, read from the bytes. A file that cannot be measured is a render that was
// cut short, so it is removed rather than read again; nothing that is being written
// now is measured at all, because the caller answers from `pending` first.
// `dimensions()` reads the root `<svg>` and knows both spellings this renderer writes:
// a width/height pair, and the `width="100%"` merman puts on every picture, whose real
// size is then the `viewBox`'s two extents — with whatever origin the viewBox has,
// which is 5 5 on a mindmap and -50 -10 on a sequence diagram, and is not part of the
// picture's size.
async function measure(name) {
  const bytes = await fs.readFile(absolute(name)).catch(() => null);
  if (!bytes) return null;
  const size = dimensions(bytes, "svg");
  if (!size) await fs.unlink(absolute(name)).catch(() => null);
  return size;
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
    const size = await render(bin, source, name, theme, font);
    keep(name);
    return { path: name, width: size.width, height: size.height };
  } finally {
    await fs.unlink(source).catch(() => null);
  }
}

// One process: the renderer, the config it is handed and the size the picture turned
// out to be. `resvg-safe` is the pipeline this picture needs: mermaid's own output
// labels a node with HTML in a `foreignObject` and writes `var(--x)` colours, and the
// rasterizer behind `image()` understands neither — the safe pipeline flattens the
// labels to `<text>` and every colour to a literal, which is also what makes the
// picture readable at all. `-q` drops the one line it prints about the theme.
async function render(bin, source, name, theme, font) {
  const dir = absolute(DIR);
  // The font is part of the request, so it is part of the config's name: a page drawn
  // in another face must not reuse a config written for the old one. The theme is not
  // in it — `-t` carries that — and neither is a background: merman paints no canvas of
  // its own, so the panel's smoke shows through without being asked for.
  const config = `${dir}/font-${fingerprint(font)}.json`;
  if (!(await fs.exists(config).catch(() => false))) {
    await fs.writeFile(config, JSON.stringify({ themeVariables: { fontFamily: font } }));
  }
  // A folder that is not there is a hard error for the renderer, not a hint, so only the
  // ones that exist are named; a machine with none of them keeps the renderer's own
  // measurements, which is a picture with narrower boxes rather than no picture.
  const dirs = [];
  for (const folder of FONTS[window()?.platform] ?? FONTS.linux) {
    const path = `${home()}/${folder}`;
    if (await there(path)) dirs.push(path);
  }
  const measured = dirs.flatMap((path) => ["--font-dir", path]);
  // Written beside the final name and copied over it afterwards: the shim has no
  // rename, and a picture that is read while the renderer is still writing it measures
  // as nothing — or worse, as half of itself.
  const temp = `${dir}/out-${randomUUID().slice(0, 8)}.svg`;
  const result = await exec(bin.command, ["render", source, "-o", temp, "--svg-pipeline", "resvg-safe", ...(measured.length ? ["--font-measurement", "native", ...measured] : []), "-t", theme, "-c", config, "-q"], { timeout: 10000 })
    .catch(async (error) => {
      await fs.unlink(temp).catch(() => null);
      throw error;
    });
  if (result.code !== 0) {
    await fs.unlink(temp).catch(() => null);
    // A renderer that came off the person's PATH is named as such: the one this mod
    // downloaded is the one it can vouch for, and the fix differs.
    throw new Error(`${lastLine(result.stderr) || "the renderer refused this diagram"}${bin.from === "path" ? " (merman-cli on PATH)" : ""}`);
  }
  const bytes = await fs.readFile(temp).catch(() => null);
  await fs.unlink(temp).catch(() => null);
  if (!bytes) throw new Error("the renderer wrote no picture");
  await fs.writeFile(absolute(name), bytes);
  const size = await measure(name);
  if (!size) throw new Error("the renderer wrote no picture");
  return size;
}

// The newest names stay and the rest of the folder goes, the way the preview cache is
// trimmed: a preview folder, not an archive. The picture just written is never one of
// them, and neither is one a render is still writing.
function keep(name) {
  const before = shared("artemis-files.diagrams") ?? [];
  const kept = [name, ...before.filter((one) => one !== name)].slice(0, KEPT);
  setShared("artemis-files.diagrams", kept);
  for (const gone of before) {
    if (kept.includes(gone)) continue;
    // A render that is still writing its own file must not have it deleted under it, and
    // the name in this list is the whole path under the app folder — the hash is its last
    // segment, which is what `pending` is keyed by.
    if (pending.has(gone.slice(gone.lastIndexOf("/") + 1).replace(/\.svg$/, ""))) continue;
    fs.unlink(absolute(gone)).catch(() => null);
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
  await sweep();
  const known = await exec("merman-cli", ["--version"], { timeout: 5000 }).catch(() => null);
  // The name is not proof it is this program, so the probe has to answer in its voice.
  if (known?.code === 0 && /merman-cli/i.test(known.stdout ?? "")) return { command: "merman-cli", from: "path" };
  const local = absolute(`${BIN}/${binary()}`);
  if (await fs.exists(local).catch(() => false)) {
    const written = await fs.readFile(absolute(`${BIN}/merman.version`), "utf8").catch(() => null);
    // The version file is what makes a leftover binary from an older release be renamed
    // again rather than trusted: the source was drawn for the version pinned here.
    if (String(written ?? "").trim() === VERSION) return { command: local, from: "download" };
  }
  return download();
}

// The bin folder holds one program. Anything else in it belongs to a renderer this mod
// no longer runs — the one it fetched before this one, whose binary and version file
// stayed behind — or to an archive that was never unpacked, and none of that is worth
// the disk: it goes the first time a diagram is drawn on that machine, which is once per
// session at most, because `install()` above settles a single answer. The same sweep,
// run once more after an archive is unpacked, is what clears the readme, the changelog,
// the licences and the man pages the release ships beside the program.
async function sweep() {
  for (const entry of await fs.readdir(absolute(BIN), { withFileTypes: true }).catch(() => [])) {
    if (entry.name === binary() || entry.name === "merman.version") continue;
    if (entry.isDirectory()) await remove(absolute(`${BIN}/${entry.name}`));
    else await fs.unlink(absolute(`${BIN}/${entry.name}`)).catch(() => null);
  }
}

// A folder of unpacked files is not one `unlink`: the shim has no recursive remove, so
// the tree goes a file at a time from the leaves up.
async function remove(path) {
  for (const entry of await fs.readdir(path, { withFileTypes: true }).catch(() => [])) {
    if (entry.isDirectory()) await remove(`${path}/${entry.name}`);
    else await fs.unlink(`${path}/${entry.name}`).catch(() => null);
  }
  await fs.rmdir(path).catch(() => null);
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
  // not the transport — is what makes it the binary this code was written against. The
  // timeouts are sized for a 15 MB archive, four times the one the previous renderer
  // shipped.
  const fetched = await exec("curl", ["-fL", "--retry", "2", "--max-time", "180", "--max-filesize", "32000000", "-o", archive, `${RELEASE}/${file}`], { timeout: 200000 });
  if (fetched.code !== 0) throw new Error(lastLine(fetched.stderr) || "cannot download the mermaid renderer");
  const bytes = await fs.readFile(archive).catch(() => null);
  if (!bytes || String(createHash("sha256").update(bytes).digest("hex")) !== sha256) {
    await fs.unlink(archive).catch(() => null);
    throw new Error(`checksum mismatch for ${file}`);
  }
  // The archive is unpacked straight into the folder the program lives in, because it
  // cannot be copied there afterwards: `fs.writeFile` here refuses anything over 32 MiB
  // and this binary is 63 MB. The two shapes differ and neither has to be assumed — a
  // tar.xz holds one directory named after the target, so its top level is stripped and
  // `merman-cli` lands at its final name, while the Windows zip already puts
  // `merman-cli.exe` at its root. `tar` reads both, and `-xf` takes the compression out
  // of the file itself (xz here, deflate in the zip).
  const bin = `${dir}/${binary()}`;
  const strip = file.endsWith(".zip") ? [] : ["--strip-components=1"];
  const unpacked = await exec("tar", ["-xf", archive, "-C", dir, ...strip], { timeout: 120000 });
  if (unpacked.code !== 0) throw new Error(lastLine(unpacked.stderr) || "cannot unpack the mermaid renderer");
  await fs.unlink(archive).catch(() => null);
  // What the archive brought besides the program — a readme, a changelog, the licences,
  // completions, man pages — is not what this folder is for.
  await sweep();
  if (!(await fs.exists(bin).catch(() => false))) throw new Error("the archive holds no mermaid renderer");
  // The version file says "installed", so it is not left standing over a binary that has
  // not answered yet: it is removed before the probe and written after it.
  await fs.unlink(absolute(`${BIN}/merman.version`)).catch(() => null);
  if (window()?.platform !== "windows") {
    const mode = await exec("chmod", ["755", bin]).catch(() => null);
    if (mode?.code !== 0) throw new Error(lastLine(mode?.stderr) || "cannot make the mermaid renderer executable");
  }
  // The version file is written last, because it is what says "this is installed": a
  // binary that does not run must not be left looking like one.
  const check = await exec(bin, ["--version"], { timeout: 10000 }).catch(() => null);
  if (check?.code !== 0) {
    await fs.unlink(bin).catch(() => null);
    throw new Error("the downloaded mermaid renderer does not run");
  }
  await fs.writeFile(absolute(`${BIN}/merman.version`), VERSION);
  return { command: bin, from: "download" };
}
