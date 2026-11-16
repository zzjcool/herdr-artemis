// What a file in the panel can become, and how it is measured.
//
// The panel's preview used to be one thing — a read-only editor — so a PNG said
// "Binary file · no text preview" and a README showed its own asterisks. Three
// kinds now, decided by extension alone: an image, markdown, or text.
//
// `image()` reads only from Herdr's own folder (`~/.config/herdr-app`), so an image
// is copied in first. It is named by the SHA-1 of its bytes rather than by the file
// it came from: the bytes decide the name, so an edited picture is a new name and no
// question about whether the host reloaded a path it had already drawn.
import { Buffer } from "buffer";
import { createHash } from "crypto";

export const CACHE = "data/artemis-files/preview";

const IMAGE = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "avif", "svg"]);
const MARKDOWN = new Set(["md", "markdown", "mdx"]);

export const extOf = (path) => (/\.([^./\\]+)$/.exec(path)?.[1] ?? "").toLowerCase();

export function kindOf(path) {
  const ext = extOf(path);
  if (IMAGE.has(ext)) return "image";
  if (MARKDOWN.has(ext)) return "markdown";
  return "text";
}

export const decode = (base64) => Buffer.from(base64, "base64");

export const cacheName = (bytes, ext) => `${createHash("sha1").update(bytes).digest("hex")}${ext ? `.${ext}` : ""}`;

const u16 = (b, o) => (b[o] << 8) | b[o + 1];
const u32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const le16 = (b, o) => b[o] | (b[o + 1] << 8);
const le32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

// The host has no "object fit" and no way to ask an image how big it is, so the
// panel measures the header itself and scales the picture to fit its box. Every
// format here is read from its own header — no decoding, no library.
export function dimensions(bytes, ext) {
  const b = bytes;
  try {
    if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50) return { width: u32(b, 16), height: u32(b, 20) };          // PNG
    if (b.length > 10 && b[0] === 0x47 && b[1] === 0x49) return { width: le16(b, 6), height: le16(b, 8) };          // GIF
    // BMP height is signed: a top-down bitmap stores it negative, and reading it raw
    // gave a four-billion-pixel image that was then scaled to 1×1.
    if (b.length > 26 && b[0] === 0x42 && b[1] === 0x4d) return { width: le32(b, 18), height: Math.abs(le32(b, 22) | 0) }; // BMP
    if (b.length > 30 && b[0] === 0xff && b[1] === 0xd8) return jpeg(b);                                            // JPEG
    if (b.length > 30 && b[0] === 0x52 && b[8] === 0x57) return webp(b);                                            // RIFF/WEBP
    if (ext === "svg" || (b[0] === 0x3c && b[1] === 0x73)) return svg(b);                                           // <svg
  } catch { /* a header this short or this odd simply has no measurement */ }
  return null;
}

function jpeg(b) {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const marker = b[i + 1];
    // SOF0–SOF15 carry the size; C4 (Huffman), C8 (JPG) and CC (arithmetic) share
    // the range but are not frames.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { width: u16(b, i + 7), height: u16(b, i + 5) };   // height comes first
    }
    const length = u16(b, i + 2);
    if (length < 2) return null;
    i += 2 + length;
  }
  return null;
}

function webp(b) {
  if (b[15] === 0x20) return { width: le16(b, 26) & 0x3fff, height: le16(b, 28) & 0x3fff };   // "VP8 " lossy
  if (b[15] === 0x4c) {                                                                      // "VP8L"
    const bits = le32(b, 21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (b[15] === 0x58) {                                                                       // "VP8X"
    return {
      width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)),
      height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)),
    };
  }
  return null;
}

function svg(b) {
  const head = Buffer.from(b.subarray(0, 4096)).toString("utf8");
  const tag = /<svg\b[^>]*>/i.exec(head)?.[0];
  if (!tag) return null;
  const size = (name) => {
    const m = new RegExp(`${name}\\s*=\\s*["']([\\d.]+)(?:px)?["']`, "i").exec(tag);
    return m ? Math.round(Number(m[1])) : null;
  };
  const width = size("width"), height = size("height");
  if (width && height) return { width, height };
  const box = /viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(tag);
  return box ? { width: Math.round(Number(box[1])), height: Math.round(Number(box[2])) } : null;
}
