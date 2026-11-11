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
  assert.match(r.stdout, /Imported website scenes: 7/);
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

test("validator blocks Eric being assigned a held prop", () => {
  const temp = mkdtempSync(path.join(os.tmpdir(), "woa-eric-prop-"));
  try {
    cpSync(path.join(root, "scripts"), path.join(temp, "scripts"), {recursive:true});
    cpSync(path.join(root, "story"), path.join(temp, "story"), {recursive:true});
    cpSync(path.join(root, "canon"), path.join(temp, "canon"), {recursive:true});
    const fs = awaitImportFs();
    const ledgerPath = path.join(temp, "story", "prop-ledger.json");
    const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
    ledger.props.push({prop_id:"PROP-TEST",name:"Test prop",held_by:"Eric"});
    fs.writeFileSync(ledgerPath, JSON.stringify(ledger));
    const r = spawnSync(process.execPath, ["scripts/woa-check.mjs"], {cwd:temp, encoding:"utf8"});
    assert.equal(r.status, 1);
    assert.match(r.stdout, /Eric cannot hold prop PROP-TEST/);
  } finally { rmSync(temp,{recursive:true,force:true}); }
});

test("ticket continuity is sourced and Eric is never its holder", () => {
  const ledger = JSON.parse((awaitImportFs()).readFileSync(path.join(root,"story","prop-ledger.json"),"utf8"));
  const ticket = ledger.props.find(p => p.prop_id === "PROP-TICKET-CH01");
  assert.ok(ticket);
  assert.equal(ticket.possessor,"Eric");
  assert.equal(ticket.held_by,null);
  assert.equal(ticket.state_events.length,5);
  assert.ok(ticket.state_events.every(e => /^WOA-CH01-SC0[1-7]$/.test(e.scene_id) && e.source_ref && e.event));
});
test("preflight blocks source-imported scenes without production approval and location binding", () => {
  const r = spawnSync(process.execPath, ["scripts/scene-preflight.mjs"], {cwd:root, encoding:"utf8"});
  assert.equal(r.status,1);
  assert.match(r.stdout,/BLOCKED WOA-CH01-SC01/);
  assert.match(r.stdout,/no location_id is bound/);
  assert.match(r.stdout,/0 ready, 7 blocked, 7 total/);
});

test("knowledge ledger separates character recollection from author-only truth", () => {
  const fs = awaitImportFs();
  const ledger = JSON.parse(fs.readFileSync(path.join(root,"story","knowledge-ledger.json"),"utf8"));
  assert.ok(ledger.state_events.some(e => e.holder === "Tappy" && e.epistemic_status === "character_recollection"));
  assert.ok(ledger.state_events.some(e => e.holder === "author" && e.epistemic_status === "author_only"));
  assert.ok(ledger.state_events.every(e => e.holder === "author" || e.scene_id));
  assert.ok(ledger.unresolved.some(q => q.includes("independently verified")));
});
test("validator rejects duplicate knowledge events", () => {
  const temp = mkdtempSync(path.join(os.tmpdir(), "woa-knowledge-"));
  try {
    cpSync(path.join(root,"scripts"),path.join(temp,"scripts"),{recursive:true});
    cpSync(path.join(root,"story"),path.join(temp,"story"),{recursive:true});
    cpSync(path.join(root,"canon"),path.join(temp,"canon"),{recursive:true});
    const fs = awaitImportFs();
    const p = path.join(temp,"story","knowledge-ledger.json");
    const ledger = JSON.parse(fs.readFileSync(p,"utf8"));
    ledger.state_events.push({...ledger.state_events[0]});
    fs.writeFileSync(p,JSON.stringify(ledger));
    const r = spawnSync(process.execPath,["scripts/woa-check.mjs"],{cwd:temp,encoding:"utf8"});
    assert.equal(r.status,1);
    assert.match(r.stdout,/Duplicate knowledge event/);
  } finally { rmSync(temp,{recursive:true,force:true}); }
});

test("validator prevents author-only truth being assigned to a character", () => {
  const temp = mkdtempSync(path.join(os.tmpdir(), "woa-author-truth-"));
  try {
    cpSync(path.join(root,"scripts"),path.join(temp,"scripts"),{recursive:true});
    cpSync(path.join(root,"story"),path.join(temp,"story"),{recursive:true});
    cpSync(path.join(root,"canon"),path.join(temp,"canon"),{recursive:true});
    const fs = awaitImportFs();
    const p = path.join(temp,"story","knowledge-ledger.json");
    const ledger = JSON.parse(fs.readFileSync(p,"utf8"));
    ledger.state_events[0].epistemic_status = "author_only";
    fs.writeFileSync(p,JSON.stringify(ledger));
    const r = spawnSync(process.execPath,["scripts/woa-check.mjs"],{cwd:temp,encoding:"utf8"});
    assert.equal(r.status,1);
    assert.match(r.stdout,/Author-only truth cannot be assigned to character/);
  } finally { rmSync(temp,{recursive:true,force:true}); }
});
test("validator rejects knowledge events linked to the wrong scene source", () => {
  const temp = mkdtempSync(path.join(os.tmpdir(), "woa-source-link-"));
  try {
    cpSync(path.join(root,"scripts"),path.join(temp,"scripts"),{recursive:true});
    cpSync(path.join(root,"story"),path.join(temp,"story"),{recursive:true});
    cpSync(path.join(root,"canon"),path.join(temp,"canon"),{recursive:true});
    const fs = awaitImportFs();
    const p = path.join(temp,"story","knowledge-ledger.json");
    const ledger = JSON.parse(fs.readFileSync(p,"utf8"));
    ledger.state_events[0].source_ref = "story/scenes/scene-02.json";
    fs.writeFileSync(p,JSON.stringify(ledger));
    const r = spawnSync(process.execPath,["scripts/woa-check.mjs"],{cwd:temp,encoding:"utf8"});
    assert.equal(r.status,1);
    assert.match(r.stdout,/source_ref does not match its scene record/);
  } finally { rmSync(temp,{recursive:true,force:true}); }
});
