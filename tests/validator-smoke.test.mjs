import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, cpSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
test("starter project validates with warnings, not errors", () => {
  const r = spawnSync(process.execPath, ["scripts/woa-check.mjs"], {cwd:root, encoding:"utf8"});
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /PASS WITH WARNINGS/);
});
test("strict mode blocks an incomplete starter project", () => {
  const r = spawnSync(process.execPath, ["scripts/woa-check.mjs", "--strict"], {cwd:root, encoding:"utf8"});
  assert.equal(r.status, 1);
  assert.match(r.stdout, /Strict mode/);
});
test("validator rejects malformed asset identifiers and hashes", () => {
  const temp = mkdtempSync(path.join(os.tmpdir(), "woa-check-"));
  try {
    cpSync(path.join(root, "scripts"), path.join(temp, "scripts"), {recursive:true});
    cpSync(path.join(root, "story"), path.join(temp, "story"), {recursive:true});
    cpSync(path.join(root, "canon"), path.join(temp, "canon"), {recursive:true});
    const registry = {registry_version:"1.0.0",assets:[{asset_id:"BAD",filename:"x.png",sha256:"bad",status:"approved"}]};
    const fs = awaitImportFs();
    fs.writeFileSync(path.join(temp,"canon","artwork-registry.json"), JSON.stringify(registry));
    const r = spawnSync(process.execPath, ["scripts/woa-check.mjs"], {cwd:temp, encoding:"utf8"});
    assert.equal(r.status, 1);
    assert.match(r.stdout, /Invalid asset_id/);
    assert.match(r.stdout, /Invalid SHA-256/);
  } finally { rmSync(temp,{recursive:true,force:true}); }
});
function awaitImportFs(){ return requireFs; }
import * as requireFs from "node:fs";
