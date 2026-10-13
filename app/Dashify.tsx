'use client';

import { useEffect } from 'react';

/**
 * Placeholder-text mode: every visible character becomes a dash, spaces are kept (same word and line structure).
 * Covers DOM/SVG text (live, via a MutationObserver) and canvas text (fillText/strokeText, which is how the 3D
 * screens and labels are drawn). measureText is left alone, so canvas layouts are computed from the real text
 * and every line keeps its original position and size. Add ?realText to the URL to see the original copy.
 */
/**
 * Kept by text: the post-intro control hint (it shares its element with the intro captions) and the
 * "? — Coming Soon" platform's label and description (registry MYSTERY_COPY), wherever they appear.
 */
const KEEP_TEXT = /^\s*Drag to rotate|Coming Soon|A new CyfroSec capability will appear here/;
const DASH = '-';
const dashify = (s: string) => (s.trim() === '?' || KEEP_TEXT.test(s) ? s : s.replace(/\S/g, DASH)); // a lone "?" (the Coming Soon platform's sign) stays
const enabled = () => typeof window !== 'undefined' && !new URLSearchParams(window.location.search).has('realText');

// canvas: patch at module load, before the 3D scenes draw their textures
if (enabled()) {
  const protos = [globalThis.CanvasRenderingContext2D?.prototype, globalThis.OffscreenCanvasRenderingContext2D?.prototype].filter(Boolean) as CanvasRenderingContext2D[];
  for (const p of protos) {
    for (const k of ['fillText', 'strokeText'] as const) {
      const orig = p[k];
      if ((orig as { __dash?: boolean }).__dash) continue;
      const patched = function (this: CanvasRenderingContext2D, text: string, ...rest: [number, number, number?]) {
        const real = String(text), d = dashify(real), n = d.length;
        // stretch the dashes to the real text's width (letterSpacing where supported), so the line keeps its size
        if (n > 1 && 'letterSpacing' in this) {
          const prev = this.letterSpacing, extra = (this.measureText(real).width - this.measureText(d).width) / n;
          this.letterSpacing = `${(parseFloat(prev) || 0) + extra}px`;
          try { return orig.call(this, d, ...rest); } finally { this.letterSpacing = prev; }
        }
        return orig.call(this, d, ...rest);
      };
      (patched as { __dash?: boolean }).__dash = true;
      p[k] = patched as typeof orig;
    }
  }
}

const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT']);
/**
 * Controls that keep their real text: the view tabs, the zoom/reset/labels/overview bar (and the Platforms menu's
 * trigger, not its list), skip/replay/pause, the 3D City CTA with its note, and the city page's title row
 * (Back to home, heading, description; not the badge). Content labels stay dashed.
 */
const KEEP = [
  'main [class*="__tabs"] > button',
  'main [class*="__viewCtl"] > button',
  'main [class*="__menuWrap"] > button',
  'main [class*="__hud"] > button',
  'main a[href*="platform-city"]',
  'main [class*="__cta"] > p',
  'main [class*="__pageBar"] > a',
  'main [class*="__pageBar"] > h1',
  'main [class*="__pageBar"] > p:not([class*="__badge"])',
].join(', ');
const skip = (el: Element | null) => !el || SKIP.has(el.tagName) || !!el.closest(KEEP);

function walk(root: Node) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (skip(n.parentElement) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const texts: Text[] = [];
  if (root.nodeType === Node.TEXT_NODE) { if (!skip(root.parentElement)) texts.push(root as Text); }
  else for (let n = w.nextNode() as Text | null; n; n = w.nextNode() as Text | null) texts.push(n);
  const changed: [Text, number][] = [];
  for (const n of texts) {
    const v = n.nodeValue ?? '', d = dashify(v);
    if (v === d) continue;
    // new real text in an element we already widened: measure it at the element's own spacing again
    const el = n.parentElement;
    if (el?.dataset.dashLs) { el.style.letterSpacing = el.dataset.dashBase ?? ''; delete el.dataset.dashLs; }
    changed.push([n, singleLineWidth(n)]);
    n.nodeValue = d;
  }
  // single-line text: widen its element's letter spacing so the dashes take the real text's width
  const byEl = new Map<HTMLElement, { gap: number; count: number }>();
  for (const [n, before] of changed) {
    const el = n.parentElement, count = (n.nodeValue ?? '').replace(/\s/g, '').length, after = singleLineWidth(n);
    if (!el || el.dataset.dashLs || before <= 0 || after <= 0 || count < 1) continue;
    const g = byEl.get(el) ?? { gap: 0, count: 0 };
    g.gap += before - after; g.count += count; byEl.set(el, g);
  }
  for (const [el, g] of byEl) {
    if (g.count < 2) continue;
    if (el.dataset.dashBase === undefined) el.dataset.dashBase = el.style.letterSpacing;
    const base = parseFloat(getComputedStyle(el).letterSpacing) || 0;
    el.style.letterSpacing = `${base + g.gap / g.count}px`;
    el.dataset.dashLs = '1';
  }
}
function singleLineWidth(n: Text) {
  const r = document.createRange(); r.selectNodeContents(n);
  const rects = r.getClientRects();
  return rects.length === 1 ? rects[0].width : -1;
}

export default function Dashify() {
  useEffect(() => {
    if (!enabled()) return;
    walk(document.body);
    const mo = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'characterData') walk(r.target);
        else r.addedNodes.forEach(walk);
      }
    });
    mo.observe(document.body, { subtree: true, childList: true, characterData: true });
    return () => mo.disconnect();
  }, []);
  return null;
}
