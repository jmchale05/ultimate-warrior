import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const source = resolve(root, ".env.local");
const target = resolve(root, ".env");

if (!existsSync(source)) {
  console.warn("[sync-local-env] .env.local not found, skipping .env sync");
  process.exit(0);
}

copyFileSync(source, target);
console.log("[sync-local-env] Copied .env.local -> .env");
