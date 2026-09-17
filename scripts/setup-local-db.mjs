import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawnSync } from "node:child_process";
const root = fileURLToPath(new URL("../", import.meta.url));
await mkdir(path.join(root, "work"), { recursive: true });
const config = path.join(root, "work/d1-local.json");
await writeFile(config, JSON.stringify({
  name: "htll-local-db", compatibility_date: "2026-09-01",
  d1_databases: [{ binding: "DB", database_name: "site-creator-d1", database_id: "00000000-0000-4000-8000-000000000000", migrations_dir: path.join(root, "drizzle") }],
}));
const result = spawnSync(process.execPath, [path.join(root, "node_modules/wrangler/bin/wrangler.js"), "d1", "migrations", "apply", "DB", "--local", "--config", config, "--persist-to", path.join(root, ".wrangler/state")], {
  cwd: root, stdio: "inherit", env: { ...process.env, WRANGLER_SEND_METRICS: "false", WRANGLER_LOG_PATH: path.join(root, ".wrangler/logs") },
});
process.exitCode = result.status ?? 1;
