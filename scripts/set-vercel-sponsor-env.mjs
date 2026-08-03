import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

function load(path) {
  const out = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

const tee = load("tee/.env");
const ext = load("tee/config/extension.env");
const pkRaw = tee.PRIVATE_KEY || tee.SPONSOR_PRIVATE_KEY;
if (!pkRaw) {
  console.error("Missing PRIVATE_KEY in tee/.env");
  process.exit(1);
}
const pk = pkRaw.startsWith("0x") ? pkRaw : `0x${pkRaw}`;
const sender =
  ext.INSTRUCTION_SENDER ||
  tee.INSTRUCTION_SENDER ||
  "0x23E9d227a2b1741b8e23915D7F7f592f5FEDe36A";

console.log("Setting Vercel env (key not printed). hex chars:", pk.length - 2);
console.log("INSTRUCTION_SENDER", sender);

function addEnv(name, value, envName) {
  const r = spawnSync("vercel", ["env", "add", name, envName, "--force"], {
    input: `${value}\n`,
    encoding: "utf8",
    shell: true,
  });
  const out = `${r.stdout || ""}${r.stderr || ""}`.replace(/\s+/g, " ").trim();
  console.log(`${name} → ${envName}: exit=${r.status} ${out.slice(0, 160)}`);
  return r.status === 0;
}

let ok = true;
for (const envName of ["production", "preview", "development"]) {
  ok = addEnv("SPONSOR_PRIVATE_KEY", pk, envName) && ok;
  ok = addEnv("INSTRUCTION_SENDER", sender, envName) && ok;
}
if (!ok) process.exit(1);
console.log("Done. Redeploy production for the API to pick this up.");
