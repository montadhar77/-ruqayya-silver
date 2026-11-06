#!/usr/bin/env node
/* Production build for Cloudflare Pages (no dependencies):
     node scripts/build.mjs [outDir=dist]
   * copies ONLY the public files (index.html, admin/, assets/, robots.txt) — never tests,
     database files, scripts or documentation;
   * adds ?v=<content hash> to every local CSS/JS reference, so browsers and the CDN can keep
     those files for a year and still get a new version the moment it changes;
   * removes the local-test address from the Content Security Policy;
   * writes _headers (security + caching) and _redirects from cloudflare/.
   Cloudflare Pages settings: build command "node scripts/build.mjs", output directory "dist".
   The functions/ folder (catalogue proxy) is picked up by Pages from the project root. */
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, process.argv[2] || "dist");
const PUBLIC = ["index.html", "admin", "assets"];
const LOCAL_ORIGIN = " http://127.0.0.1:54331";

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const p of PUBLIC) cpSync(join(ROOT, p), join(OUT, p), { recursive: true });
cpSync(join(ROOT, "cloudflare", "_headers"), join(OUT, "_headers"));
cpSync(join(ROOT, "cloudflare", "_redirects"), join(OUT, "_redirects"));
cpSync(join(ROOT, "cloudflare", "robots.txt"), join(OUT, "robots.txt"));
// unknown paths: a real 404, not the shop page. RQ_BASE = the site's base path (GitHub Pages project sites live under /<repo>/)
const BASE = process.env.RQ_BASE || "/";
writeFileSync(join(OUT, "404.html"), readFileSync(join(ROOT, "cloudflare", "404.html"), "utf8").replace('href="/"', `href="${BASE}"`));
writeFileSync(join(OUT, ".nojekyll"), "");   // GitHub Pages: serve the files as they are

const hashOf = (file) => createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 10);
const stamped = [];
for (const page of ["index.html", "admin/index.html"]) {
  const file = join(OUT, page);
  let html = readFileSync(file, "utf8");
  html = html.replace(/(<(?:script|link)\b[^>]*?\b(?:src|href)=")((?:\.\.\/)?assets\/[^"?#]+\.(?:js|css))(")/g, (m, a, ref, b) => {
    const target = resolve(dirname(file), ref);
    if (!existsSync(target)) throw new Error(`${page}: missing ${ref}`);
    stamped.push(`${page} → ${ref}`);
    return `${a}${ref}?v=${hashOf(target)}${b}`;
  });
  if (!html.includes("Content-Security-Policy")) throw new Error(`${page}: Content Security Policy missing`);
  if (!process.env.RQ_KEEP_LOCAL) html = html.split(LOCAL_ORIGIN).join("");   // tests keep it to talk to the local stand-in
  writeFileSync(file, html);
}

// lazily loaded scripts get the same treatment inside site.js
const site = join(OUT, "assets/js/site.js");
let js = readFileSync(site, "utf8");
js = js.replace(/"assets\/vendor\/cobe\.min\.js"/, `"assets/vendor/cobe.min.js?v=${hashOf(join(OUT, "assets/vendor/cobe.min.js"))}"`);
writeFileSync(site, js);
// site.js changed after hashing: re-stamp its reference
let idx = readFileSync(join(OUT, "index.html"), "utf8");
idx = idx.replace(/assets\/js\/site\.js\?v=[0-9a-f]+/, `assets/js/site.js?v=${hashOf(site)}`);
writeFileSync(join(OUT, "index.html"), idx);

// nothing private may end up in the output
const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
const files = walk(OUT).map((f) => relative(OUT, f));
const bad = files.filter((f) => /(^|\/)(tests|supabase|scripts|docs|\.github|node_modules)(\/|$)|\.(sql|py|md|sh|mjs)$/.test(f));
if (bad.length) throw new Error("private files in build: " + bad.join(", "));
// a secret API key, a service-role JWT or a private key must never be shipped
const SECRET = /sb_secret_[A-Za-z0-9_-]{8,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]*c2VydmljZV9yb2xl|BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY/;
const secrets = files.filter((f) => /\.(js|html|json|txt)$/.test(f) && SECRET.test(readFileSync(join(OUT, f), "utf8")));
if (secrets.length) throw new Error("possible secret in build: " + secrets.join(", "));

const bytes = files.reduce((a, f) => a + statSync(join(OUT, f)).size, 0);
console.log(`built ${files.length} files (${(bytes / 1048576).toFixed(2)} MB) into ${relative(ROOT, OUT) || "."}`);
console.log(stamped.map((s) => "  stamped " + s).join("\n"));
