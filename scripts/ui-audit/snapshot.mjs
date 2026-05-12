#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * UI / contrast audit for Overline.
 *
 * Walks every public route on the user-web (and admin-web if reachable),
 * captures a full-page screenshot in BOTH light and dark mode, and runs a
 * basic WCAG contrast check on every visible text node. Anything below
 * 4.5:1 (AA) is written to a per-page JSON + a top-level summary.md.
 *
 * Usage:
 *   pnpm dlx playwright install chromium       # one-time
 *   node scripts/ui-audit/snapshot.mjs          # default targets
 *   USER_BASE=http://localhost:3000 \
 *   ADMIN_BASE=http://localhost:3002 \
 *     node scripts/ui-audit/snapshot.mjs
 *
 * Output: ./scripts/ui-audit/output/<timestamp>/
 *   user/light/<route>.png
 *   user/dark/<route>.png
 *   user/light/<route>.contrast.json
 *   summary.md
 *
 * This script is a tool — it never modifies app code, never logs in, and
 * only hits public routes. Add private routes with your own session cookie
 * via the AUTH_COOKIE env var if you need them.
 */

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const USER_BASE = process.env.USER_BASE || 'http://localhost:3000';
const ADMIN_BASE = process.env.ADMIN_BASE || 'http://localhost:3002';
const AUTH_COOKIE = process.env.AUTH_COOKIE || '';

const TS = new Date().toISOString().replace(/[:.]/g, '-');
const OUT = join(__dirname, 'output', TS);

const USER_ROUTES = [
  '/',
  '/explore',
  '/blog',
  '/privacy',
  '/terms',
  '/auth/login',
  '/auth/signup',
  '/bookings',
  '/profile',
  '/notifications',
  '/shops',          // expect 301 -> /explore
  '/shops/undefined' // expect redirect to /explore
];

const ADMIN_ROUTES = [
  '/',
  '/login',
  '/privacy',
  '/terms',
  '/support',
];

/* ───────────────────────────── helpers ───────────────────────────── */

function rgbToLum([r, g, b]) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
function contrast(rgb1, rgb2) {
  const l1 = rgbToLum(rgb1);
  const l2 = rgbToLum(rgb2);
  const [a, b] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (a + 0.05) / (b + 0.05);
}
function parseRgb(s) {
  const m = s && s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

async function ensureDir(p) {
  await mkdir(p, { recursive: true });
}

async function applyTheme(page, mode) {
  await page.evaluate((m) => {
    try {
      window.localStorage.setItem('theme', m);
      document.documentElement.classList.remove('dark', 'light');
      if (m === 'dark') document.documentElement.classList.add('dark');
    } catch {}
  }, mode);
  await page.emulateMedia({ colorScheme: mode });
}

async function gatherContrastIssues(page) {
  return page.evaluate(() => {
    function rgbToLum([r, g, b]) {
      const a = [r, g, b].map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    }
    function contrast(c1, c2) {
      const l1 = rgbToLum(c1);
      const l2 = rgbToLum(c2);
      const [a, b] = l1 > l2 ? [l1, l2] : [l2, l1];
      return (a + 0.05) / (b + 0.05);
    }
    function parseRgb(s) {
      const m = s && s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return null;
      return [Number(m[1]), Number(m[2]), Number(m[3])];
    }
    function effectiveBg(el) {
      let cur = el;
      while (cur && cur !== document.documentElement) {
        const cs = getComputedStyle(cur);
        const bg = parseRgb(cs.backgroundColor);
        if (bg && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') return bg;
        cur = cur.parentElement;
      }
      const cs = getComputedStyle(document.documentElement);
      return parseRgb(cs.backgroundColor) || [255, 255, 255];
    }

    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const text = n.nodeValue && n.nodeValue.trim();
      if (!text) continue;
      const el = n.parentElement;
      if (!el) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.1) continue;
      const fg = parseRgb(cs.color);
      const bg = effectiveBg(el);
      if (!fg) continue;
      const ratio = contrast(fg, bg);
      const fontSizePx = parseFloat(cs.fontSize);
      const isLarge = fontSizePx >= 24 || (fontSizePx >= 18.66 && Number(cs.fontWeight) >= 700);
      const min = isLarge ? 3 : 4.5;
      if (ratio < min) {
        const rect = el.getBoundingClientRect();
        out.push({
          text: text.slice(0, 80),
          ratio: Number(ratio.toFixed(2)),
          required: min,
          fg: `rgb(${fg.join(',')})`,
          bg: `rgb(${bg.join(',')})`,
          fontSize: fontSizePx,
          tag: el.tagName.toLowerCase(),
          classes: el.className && typeof el.className === 'string' ? el.className.slice(0, 120) : '',
          x: Math.round(rect.x), y: Math.round(rect.y),
        });
      }
    }
    // Dedupe by class+text
    const seen = new Set();
    return out.filter((i) => {
      const k = i.classes + '|' + i.text;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  });
}

/* ───────────────────────────── runner ───────────────────────────── */

async function snapshot(browser, base, route, mode, kind) {
  const ctx = await browser.newContext({
    colorScheme: mode,
    viewport: { width: 1440, height: 900 },
  });
  if (AUTH_COOKIE && base === USER_BASE) {
    await ctx.addCookies([{
      name: 'auth-token',
      value: AUTH_COOKIE,
      url: USER_BASE,
    }]);
  }
  const page = await ctx.newPage();
  const safeRoute = route.replace(/\W+/g, '_').replace(/^_|_$/g, '') || 'root';
  const dir = join(OUT, kind, mode);
  await ensureDir(dir);

  const url = base + route;
  let status = 0, finalUrl = url, error = null, issues = [];
  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
    status = resp ? resp.status() : 0;
    finalUrl = page.url();
    await applyTheme(page, mode);
    await page.waitForTimeout(400); // allow theme transitions
    await page.screenshot({ path: join(dir, `${safeRoute}.png`), fullPage: true });
    issues = await gatherContrastIssues(page);
    await writeFile(join(dir, `${safeRoute}.contrast.json`), JSON.stringify(issues, null, 2));
  } catch (e) {
    error = e.message;
  } finally {
    await ctx.close();
  }

  return { route, mode, kind, status, finalUrl, issueCount: issues.length, error };
}

(async () => {
  await ensureDir(OUT);
  const browser = await chromium.launch();
  const results = [];

  for (const route of USER_ROUTES) {
    for (const mode of ['light', 'dark']) {
      const r = await snapshot(browser, USER_BASE, route, mode, 'user');
      console.log(`[user/${mode}] ${route} -> ${r.status} (${r.issueCount} contrast issues)${r.error ? ' ERROR: ' + r.error : ''}`);
      results.push(r);
    }
  }

  for (const route of ADMIN_ROUTES) {
    for (const mode of ['light', 'dark']) {
      const r = await snapshot(browser, ADMIN_BASE, route, mode, 'admin');
      console.log(`[admin/${mode}] ${route} -> ${r.status} (${r.issueCount} contrast issues)${r.error ? ' ERROR: ' + r.error : ''}`);
      results.push(r);
    }
  }

  await browser.close();

  // summary.md
  const lines = [];
  lines.push(`# UI Audit — ${TS}`);
  lines.push('');
  lines.push(`User base: \`${USER_BASE}\`  Admin base: \`${ADMIN_BASE}\``);
  lines.push('');
  lines.push('| App | Mode | Route | Status | Final URL | Contrast Issues | Error |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const r of results) {
    lines.push(`| ${r.kind} | ${r.mode} | \`${r.route}\` | ${r.status} | \`${r.finalUrl}\` | ${r.issueCount} | ${r.error ? '`' + r.error + '`' : ''} |`);
  }
  await writeFile(join(OUT, 'summary.md'), lines.join('\n'));
  console.log(`\nDone. Output: ${OUT}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
