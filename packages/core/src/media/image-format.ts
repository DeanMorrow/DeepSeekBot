import { parse, walk } from 'css-tree';
import { SaxesParser } from 'saxes';

export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
export const MAX_SVG_BYTES = 1024 * 1024;
/** Header edge and pixel caps already enforced by inspectImage. Concept art reuses these. */
export const MAX_IMAGE_EDGE = 16384;
export const MAX_IMAGE_PIXELS = 40_000_000;
export type ImageMime = 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp' | 'image/svg+xml';
export interface ImageFormat {
  mime: ImageMime;
  extension: string;
  width: number;
  height: number;
}
export class ImageFormatError extends Error {
  constructor(readonly status: 'unsupported' | 'too-large') {
    super(status);
  }
}
const refuse = (status: 'unsupported' | 'too-large' = 'unsupported'): never => {
  throw new ImageFormatError(status);
};
const size = (width: number, height: number) => {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) refuse();
  width = Math.ceil(width);
  height = Math.ceil(height);
  if (width > MAX_IMAGE_EDGE || height > MAX_IMAGE_EDGE || width * height > MAX_IMAGE_PIXELS)
    refuse('too-large');
  return { width: Math.ceil(width), height: Math.ceil(height) };
};
const ascii = (b: Uint8Array, at: number, n: number) =>
  String.fromCharCode(...b.subarray(at, at + n));
const fragment = (value: string): string =>
  /^#[A-Za-z_][\w.:-]*$/u.test(value) ? value.slice(1) : refuse();
const SVG = 'http://www.w3.org/2000/svg';
const XLINK = 'http://www.w3.org/1999/xlink';
const XMLNS = 'http://www.w3.org/2000/xmlns/';
const elements = new Set(
  'svg g marker path rect circle ellipse line polyline polygon text tspan defs linearGradient radialGradient stop clipPath mask pattern use symbol title desc metadata style'.split(
    ' ',
  ),
);
const properties = new Set(
  'fill fill-opacity fill-rule stroke stroke-width stroke-opacity stroke-linecap stroke-linejoin stroke-miterlimit stroke-dasharray stroke-dashoffset opacity color font font-family font-size font-style font-weight font-variant text-anchor dominant-baseline alignment-baseline baseline-shift letter-spacing word-spacing text-decoration white-space display visibility clip-path clip-rule mask marker-start marker-mid marker-end paint-order vector-effect shape-rendering text-rendering stop-color stop-opacity transform transform-origin'.split(
    ' ',
  ),
);
const functions = new Set(
  'rgb rgba hsl hsla hwb lab lch oklab oklch color color-mix calc min max clamp var translate translateX translateY scale scaleX scaleY rotate skewX skewY matrix'
    .toLowerCase()
    .split(' '),
);
type SvgNode = { children: number[]; refs: string[] };

function svgFormat(bytes: Uint8Array): Pick<ImageFormat, 'width' | 'height'> {
  if (bytes.length > MAX_SVG_BYTES) refuse('too-large');
  let source: string;
  try {
    source = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return refuse();
  }
  const nodes: SvgNode[] = [];
  const stack: number[] = [];
  const ids = new Map<string, number>();
  const stylesheetRefs: string[] = [];
  let dimensions: ReturnType<typeof size> | undefined;
  let cssBytes = 0,
    cssNodes = 0;
  let style = false;
  let css = '';
  const validateCss = (
    value: string,
    context: 'stylesheet' | 'declarationList' | 'value',
    refs: string[],
  ) => {
    cssBytes += value.length;
    if (cssBytes > 65536) refuse('too-large');
    if (value.includes('\\')) refuse();
    const ast = parse(value, { context, onParseError: () => refuse() });
    walk(ast, (node) => {
      if (++cssNodes > 10000) refuse('too-large');
      if (node.type === 'Atrule' || node.type === 'Raw') refuse();
      if (node.type === 'Url') refs.push(fragment(node.value));
      if (
        node.type === 'Declaration' &&
        !properties.has(node.property.toLowerCase()) &&
        !/^--[\w-]+$/u.test(node.property)
      )
        refuse();
      if (node.type === 'Function' && !functions.has(node.name.toLowerCase())) refuse();
    });
  };
  const parser = new SaxesParser({ xmlns: true });
  parser.on('error', () => refuse());
  parser.on('doctype', () => refuse());
  parser.on('processinginstruction', () => refuse());
  parser.on('opentag', (tag) => {
    if (style) refuse();
    if (nodes.length >= 10000 || stack.length >= 64) refuse('too-large');
    if (tag.uri !== SVG || !elements.has(tag.local)) refuse();
    if (!nodes.length && tag.local !== 'svg') refuse();
    const index = nodes.length;
    const current: SvgNode = { children: [], refs: [] };
    nodes.push(current);
    if (stack.length) nodes[stack.at(-1)!]!.children.push(index);
    stack.push(index);
    const attrs: Record<string, string> = {};
    for (const attribute of Object.values(tag.attributes)) {
      const name = attribute.local;
      const value = attribute.value;
      if (value.length > 65536) refuse('too-large');
      if (attribute.uri === XMLNS) {
        if (![SVG, XLINK].includes(value)) refuse();
        continue;
      }
      if (
        /^on/iu.test(name) ||
        attribute.name === 'xml:base' ||
        name === 'src' ||
        name === 'filter'
      )
        refuse();
      if (
        attribute.uri &&
        attribute.uri !== XLINK &&
        attribute.uri !== 'http://www.w3.org/XML/1998/namespace'
      )
        refuse();
      if (name === 'href') current.refs.push(fragment(value));
      else if (name === 'style') validateCss(value, 'declarationList', current.refs);
      else if (properties.has(name)) validateCss(value, 'value', current.refs);
      else if (/url\s*\(|\\/iu.test(value)) refuse();
      if (name === 'id') {
        if (!/^[A-Za-z_][\w.:-]*$/u.test(value) || ids.has(value)) refuse();
        ids.set(value, index);
      }
      attrs[name] = value;
    }
    if (index === 0) {
      const box = attrs['viewBox']
        ?.trim()
        .split(/[\s,]+/u)
        .map(Number);
      if (
        box &&
        (box.length !== 4 || box.some((n) => !Number.isFinite(n)) || box[2]! <= 0 || box[3]! <= 0)
      )
        refuse();
      const length = (value: string | undefined) => {
        if (!value || /^\d+(?:\.\d+)?%$/u.test(value)) return undefined;
        const match = /^(\d+(?:\.\d+)?|\.\d+)(px|pt|pc|in|cm|mm)?$/u.exec(value);
        if (!match) return refuse();
        return (
          Number(match[1]) *
          ({ px: 1, pt: 96 / 72, pc: 16, in: 96, cm: 96 / 2.54, mm: 96 / 25.4 }[match[2] ?? 'px'] ??
            1)
        );
      };
      let width = length(attrs['width']),
        height = length(attrs['height']);
      if (width !== undefined && height === undefined && box) height = (width * box[3]!) / box[2]!;
      if (height !== undefined && width === undefined && box) width = (height * box[2]!) / box[3]!;
      dimensions = size(width ?? box?.[2] ?? 300, height ?? box?.[3] ?? 150);
    }
    if (tag.local === 'style') {
      style = true;
      css = '';
    }
  });
  const text = (value: string) => {
    if (style) {
      css += value;
      if (css.length > 65536) refuse('too-large');
    }
  };
  parser.on('text', text);
  parser.on('cdata', text);
  parser.on('closetag', (tag) => {
    if (tag.local === 'style') {
      validateCss(css, 'stylesheet', stylesheetRefs);
      style = false;
    }
    stack.pop();
  });
  try {
    parser.write(source).close();
  } catch (error) {
    if (error instanceof ImageFormatError) throw error;
    return refuse();
  }
  if (!dimensions || stack.length || !nodes.length) return refuse();
  const memo = new Map<number, number>();
  const expanded = (index: number, visiting: Set<number>): number => {
    if (visiting.has(index)) return refuse();
    if (visiting.size >= 64) return refuse('too-large');
    const known = memo.get(index);
    if (known !== undefined) return known;
    visiting.add(index);
    const node = nodes[index]!;
    let cost = 1;
    for (const child of node.children) cost += expanded(child, visiting);
    for (const reference of node.refs) {
      const target = ids.get(reference) ?? refuse();
      cost += expanded(target, visiting);
      if (cost > 20000) refuse('too-large');
    }
    visiting.delete(index);
    if (cost > 20000) refuse('too-large');
    memo.set(index, cost);
    return cost;
  };
  let expandedNodes = expanded(0, new Set());
  for (const reference of stylesheetRefs) {
    const target = ids.get(reference) ?? refuse();
    expandedNodes += expanded(target, new Set()) * nodes.length;
    if (expandedNodes > 20000) refuse('too-large');
  }
  return dimensions;
}

export function inspectImage(bytes: Uint8Array): ImageFormat {
  if (bytes.length > MAX_IMAGE_BYTES) return refuse('too-large');
  const b = bytes,
    n = b.length;
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const format = (mime: ImageMime, extension: string, width: number, height: number) => ({
    mime,
    extension,
    ...size(width, height),
  });
  if (
    n >= 33 &&
    ascii(b, 0, 8) === '\x89PNG\r\n\x1a\n' &&
    view.getUint32(8) === 13 &&
    ascii(b, 12, 4) === 'IHDR'
  )
    return format('image/png', 'png', view.getUint32(16), view.getUint32(20));
  if (n >= 4 && b[0] === 255 && b[1] === 216) {
    if (b[n - 2] !== 255 || b[n - 1] !== 217) return refuse();
    let at = 2,
      dimensions: ImageFormat | undefined;
    while (at + 3 < n) {
      if (b[at++] !== 255) return refuse();
      while (at < n && b[at] === 255) at++;
      if (at + 2 >= n) return refuse();
      const marker = b[at++]!;
      if (marker === 0 || marker === 216 || marker === 217 || (marker >= 208 && marker <= 215))
        return refuse();
      const length = view.getUint16(at);
      if (length < 2 || at + length > n - 2) return refuse();
      if (marker === 218) {
        const components = b[at + 2] ?? 0;
        if (
          components < 1 ||
          components > 4 ||
          length !== 6 + 2 * components ||
          at + length >= n - 2
        )
          return refuse();
        return dimensions ?? refuse();
      }
      if (marker >= 192 && marker <= 207 && ![196, 200, 204].includes(marker)) {
        const components = b[at + 7] ?? 0;
        if (components < 1 || components > 4 || length !== 8 + 3 * components) return refuse();
        dimensions = format('image/jpeg', 'jpg', view.getUint16(at + 5), view.getUint16(at + 3));
      }
      at += length;
    }
    return refuse();
  }
  if (n >= 14 && ['GIF87a', 'GIF89a'].includes(ascii(b, 0, 6))) {
    const width = view.getUint16(6, true),
      height = view.getUint16(8, true);
    const result = format('image/gif', 'gif', width, height);
    let at = 13 + (b[10]! & 128 ? 3 * (1 << ((b[10]! & 7) + 1)) : 0),
      frames = 0,
      pixels = 0;
    const blocks = () => {
      for (;;) {
        if (at >= n) return refuse();
        const length = b[at++]!;
        if (!length) return;
        at += length;
        if (at > n) return refuse();
      }
    };
    while (at < n) {
      const marker = b[at++]!;
      if (marker === 59) return frames && at === n ? result : refuse();
      if (marker === 33) {
        at++;
        blocks();
        continue;
      }
      if (marker !== 44 || at + 9 >= n) return refuse();
      const w = view.getUint16(at + 4, true),
        h = view.getUint16(at + 6, true);
      size(w, h);
      pixels += width * height;
      if (++frames > 256 || pixels > MAX_IMAGE_PIXELS) return refuse('too-large');
      if (view.getUint16(at, true) + w > width || view.getUint16(at + 2, true) + h > height)
        return refuse();
      const packed = b[at + 8]!;
      at += 9;
      if (packed & 128) at += 3 * (1 << ((packed & 7) + 1));
      const code = b[at++]!;
      if (code < 2 || code > 8) return refuse();
      blocks();
    }
    return refuse();
  }
  if (n >= 20 && ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') {
    if (view.getUint32(4, true) + 8 !== n) return refuse();
    let result: ImageFormat | undefined,
      frames = 0,
      pixels = 0,
      image = false;
    const u24 = (at: number) => b[at]! | (b[at + 1]! << 8) | (b[at + 2]! << 16);
    const payload = (tag: string, start: number, length: number) => {
      if (tag === 'VP8 ') {
        if (length < 10 || ascii(b, start + 3, 3) !== '\x9d\x01\x2a') return refuse();
        return size(
          view.getUint16(start + 6, true) & 16383,
          view.getUint16(start + 8, true) & 16383,
        );
      }
      if (tag === 'VP8L') {
        if (length < 5 || b[start] !== 47) return refuse();
        const bits = view.getUint32(start + 1, true);
        return size(1 + (bits & 16383), 1 + ((bits >>> 14) & 16383));
      }
      return undefined;
    };
    for (let at = 12; at < n;) {
      if (at + 8 > n) return refuse();
      const tag = ascii(b, at, 4),
        length = view.getUint32(at + 4, true),
        start = at + 8;
      if (start + length > n) return refuse();
      if (tag === 'VP8X') {
        if (length !== 10 || at !== 12) return refuse();
        result = format('image/webp', 'webp', u24(start + 4) + 1, u24(start + 7) + 1);
      }
      const frame = payload(tag, start, length);
      if (frame) {
        result ??= format('image/webp', 'webp', frame.width, frame.height);
        if (frame.width > result.width || frame.height > result.height) return refuse();
        image = true;
      }
      if (tag === 'ANMF') {
        if (length < 24 || !result) return refuse();
        const w = u24(start + 6) + 1,
          h = u24(start + 9) + 1;
        size(w, h);
        pixels += result.width * result.height;
        if (++frames > 256 || pixels > MAX_IMAGE_PIXELS) return refuse('too-large');
        if (u24(start) * 2 + w > result.width || u24(start + 3) * 2 + h > result.height)
          return refuse();
        let encoded = false;
        for (let part = start + 16; part < start + length;) {
          if (part + 8 > start + length) return refuse();
          const count = view.getUint32(part + 4, true);
          if (part + 8 + count > start + length) return refuse();
          const inner = payload(ascii(b, part, 4), part + 8, count);
          if (inner) {
            if (inner.width !== w || inner.height !== h) return refuse();
            encoded = true;
          }
          part += 8 + count + (count & 1);
          if (part > start + length) return refuse();
        }
        if (!encoded) return refuse();
        image = true;
      }
      at = start + length + (length & 1);
      if (at > n) return refuse();
    }
    return image && result ? result : refuse();
  }
  if (
    n &&
    new TextDecoder()
      .decode(b.subarray(0, Math.min(n, 512)))
      .trimStart()
      .startsWith('<')
  )
    return { mime: 'image/svg+xml', extension: 'svg', ...svgFormat(bytes) };
  return refuse();
}

export const isMemoryImagePath = (path: string) => /\.(?:png|jpe?g|gif|webp|svg)$/iu.test(path);
