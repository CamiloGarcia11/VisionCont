import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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

// 3. Ensure `require` is defined via node:module createRequire inside server handler.mjs
const handlerPath = join(
  workerOutDir,
  "server-functions",
  "default",
  "handler.mjs"
);
if (existsSync(handlerPath)) {
  const content = readFileSync(handlerPath, "utf8");
  if (!content.includes("createRequire")) {
    const shim =
      'import { createRequire as __cfCreateRequire } from "node:module";\n' +
      'const __cfBaseRequire = __cfCreateRequire(import.meta.url || "file:///worker.js");\n' +
      "const __cfModuleCache = new Map();\n" +
      "const require = (id) => {\n" +
      '  if (id === "node:inspector" || id === "inspector") {\n' +
      "    return { url: () => undefined, open: () => {}, close: () => {} };\n" +
      "  }\n" +
      "  if (__cfModuleCache.has(id)) {\n" +
      "    return __cfModuleCache.get(id);\n" +
      "  }\n" +
      "  const mod = __cfBaseRequire(id);\n" +
      '  if (mod && typeof mod === "object" && (Object.isFrozen(mod) || mod[Symbol.toStringTag] === "Module" || Object.prototype.toString.call(mod) === "[object Module]")) {\n' +
      "    const mutable = { ...mod };\n" +
      "    __cfModuleCache.set(id, mutable);\n" +
      "    return mutable;\n" +
      "  }\n" +
      "  return mod;\n" +
      "};\n";
    writeFileSync(handlerPath, shim + content, "utf8");
  }
}

// 4. Generate _routes.json so static assets bypass _worker.js
const routesJson = {
  version: 1,
  include: ["/*"],
  exclude: [
    "/_next/static/*",
    "/favicon.ico",
    "/icon.svg",
    "/apple-touch-icon.png",
  ],
};
writeFileSync(
  join(pagesDistDir, "_routes.json"),
  JSON.stringify(routesJson, null, 2),
  "utf8"
);

console.log("Cloudflare Pages output prepared in .pages-dist/");
