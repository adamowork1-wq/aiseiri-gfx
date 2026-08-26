/**
 * render.mjs — renders one composition to Infographics/, per AISEIRI.md's
 * "every beat outputs ProRes 4444 with alpha, plus an H.264 preview" rule.
 *
 *   npm run render         -- <compositionId>   ProRes 4444 + alpha, .mov
 *   npm run render:preview -- <compositionId>   H.264, .mp4
 *
 * A wrapper script rather than a plain npm script string (same reasoning
 * as scripts/sync.mjs) because the output filename is derived from the
 * composition id — a static package.json script can't compute that
 * itself. Matches Infographics/'s existing manual naming convention
 * (bar-chart-b-alpha.mov, pillar-burst-alpha.mov, *-preview.mp4) rather
 * than creating a second, differently-cased directory.
 */

import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const [, , mode, compositionId] = process.argv;

if (mode !== "alpha" && mode !== "preview") {
  console.error(`Unknown render mode "${mode}" — expected "alpha" or "preview".`);
  process.exit(1);
}
if (!compositionId) {
  console.error("Usage: npm run render -- <compositionId>  (or render:preview)");
  process.exit(1);
}

// PascalCase/hyphenated composition ids -> kebab-case filenames, e.g.
// "Slam-SingleLineXL" -> "slam-single-line-xl".
const kebab = compositionId
  .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
  .replace(/-+/g, "-")
  .toLowerCase();

const OUT_DIR = "Infographics";
mkdirSync(OUT_DIR, { recursive: true });

const outFile = mode === "alpha" ? `${OUT_DIR}/${kebab}-alpha.mov` : `${OUT_DIR}/${kebab}-preview.mp4`;

const flags =
  mode === "alpha"
    ? [
        "--codec=prores",
        "--prores-profile=4444",
        "--pixel-format=yuva444p10le",
        // remotion.config.ts sets the default video image format to
        // jpeg (no alpha channel) — overridden here so the alpha
        // actually survives from frame capture through to the file.
        "--image-format=png",
      ]
    : ["--codec=h264"];

const cmd = ["npx", "remotion", "render", compositionId, outFile, ...flags].join(" ");
console.log(`> ${cmd}`);
execSync(cmd, { stdio: "inherit" });
