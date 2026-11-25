import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const openNextDir = join(root, ".open-next");
const pagesDistDir = join(root, ".pages-dist");
const workerOutDir = join(pagesDistDir, "_worker.js");

if (!existsSync(openNextDir)) {
  console.error("Error: .open-next directory not found. Run cf:build first.");
  process.exit(1);
}

rmSync(pagesDistDir, { recursive: true, force: true });
mkdirSync(pagesDistDir, { recursive: true });

// 1. Copy static assets to .pages-dist root
const assetsDir = join(openNextDir, "assets");
if (existsSync(assetsDir)) {
  cpSync(assetsDir, pagesDistDir, { recursive: true });
}

// 2. Copy worker + runtime modules into .pages-dist/_worker.js/
mkdirSync(workerOutDir, { recursive: true });
cpSync(join(openNextDir, "worker.js"), join(workerOutDir, "index.js"));

const runtimeDirs = [
  ".build",
  "cloudflare",
  "cloudflare-templates",
  "dynamodb-provider",
  "middleware",
  "server-functions",
  "cache",
];

for (const dir of runtimeDirs) {
  const src = join(openNextDir, dir);
  if (existsSync(src)) {
    cpSync(src, join(workerOutDir, dir), { recursive: true });
  }
}

console.log("Cloudflare Pages output prepared in .pages-dist/");
