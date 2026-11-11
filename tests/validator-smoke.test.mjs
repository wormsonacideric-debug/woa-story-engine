import test from "node:test";
import { createCandidatePackage } from "../scripts/candidate-package.mjs";
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

test("scene-state ledger is sourced, scoped and keeps unresolved continuity visible", () => {
  const fs = awaitImportFs();
  const ledger = JSON.parse(fs.readFileSync(path.join(root,"story","scene-state-ledger.json"),"utf8"));
  assert.equal(ledger.state_events.length,10);
  assert.ok(ledger.state_events.every(e => e.epistemic_status === "source_explicit" && e.source_ref && Number.isInteger(e.source_transcript_index)));
  assert.ok(ledger.unresolved.some(q => q.issue_id === "STATE-OPEN-001"));
  assert.ok(ledger.snapshots.length === 0);
});
test("validator rejects scene-state source transcript index outside imported source", () => {
  const temp = mkdtempSync(path.join(os.tmpdir(), "woa-state-source-"));
  try {
    cpSync(path.join(root,"scripts"),path.join(temp,"scripts"),{recursive:true});
    cpSync(path.join(root,"story"),path.join(temp,"story"),{recursive:true});
    cpSync(path.join(root,"canon"),path.join(temp,"canon"),{recursive:true});
    const fs = awaitImportFs();
    const p = path.join(temp,"story","scene-state-ledger.json");
    const ledger = JSON.parse(fs.readFileSync(p,"utf8"));
    ledger.state_events[0].source_transcript_index = 999;
    fs.writeFileSync(p,JSON.stringify(ledger));
    const r = spawnSync(process.execPath,["scripts/woa-check.mjs"],{cwd:temp,encoding:"utf8"});
    assert.equal(r.status,1);
    assert.match(r.stdout,/invalid source_transcript_index/);
  } finally { rmSync(temp,{recursive:true,force:true}); }
});
test("validator rejects inferred scene-state events", () => {
  const temp = mkdtempSync(path.join(os.tmpdir(), "woa-state-inference-"));
  try {
    cpSync(path.join(root,"scripts"),path.join(temp,"scripts"),{recursive:true});
    cpSync(path.join(root,"story"),path.join(temp,"story"),{recursive:true});
    cpSync(path.join(root,"canon"),path.join(temp,"canon"),{recursive:true});
    const fs = awaitImportFs();
    const p = path.join(temp,"story","scene-state-ledger.json");
    const ledger = JSON.parse(fs.readFileSync(p,"utf8"));
    ledger.state_events[0].epistemic_status = "inferred";
    fs.writeFileSync(p,JSON.stringify(ledger));
    const r = spawnSync(process.execPath,["scripts/woa-check.mjs"],{cwd:temp,encoding:"utf8"});
    assert.equal(r.status,1);
    assert.match(r.stdout,/must be source_explicit/);
  } finally { rmSync(temp,{recursive:true,force:true}); }
});

test("relationship graph contains only canon-backed edges", () => {
  const fs = awaitImportFs();
  const graph = JSON.parse(fs.readFileSync(path.join(root,"story","relationship-graph.json"),"utf8"));
  assert.equal(graph.edges.length,4);
  assert.ok(graph.edges.every(e => fs.existsSync(path.join(root,e.source_record))));
  assert.ok(graph.unresolved.some(q => q.characters.includes("CHAR-TAPPY")));
});
test("validator rejects an invented relationship edge", () => {
  const temp = mkdtempSync(path.join(os.tmpdir(), "woa-relationship-"));
  try {
    cpSync(path.join(root,"scripts"),path.join(temp,"scripts"),{recursive:true});
    cpSync(path.join(root,"story"),path.join(temp,"story"),{recursive:true});
    cpSync(path.join(root,"canon"),path.join(temp,"canon"),{recursive:true});
    const fs = awaitImportFs();
    const p = path.join(temp,"story","relationship-graph.json");
    const graph = JSON.parse(fs.readFileSync(p,"utf8"));
    graph.edges[0].type = "siblings";
    fs.writeFileSync(p,JSON.stringify(graph));
    const r = spawnSync(process.execPath,["scripts/woa-check.mjs"],{cwd:temp,encoding:"utf8"});
    assert.equal(r.status,1);
    assert.match(r.stdout,/not supported by its character record/);
  } finally { rmSync(temp,{recursive:true,force:true}); }
});

test("candidate package generator blocks imported scenes before creating attempts", () => {
  const temp = mkdtempSync(path.join(os.tmpdir(), "woa-candidate-block-"));
  try {
    cpSync(path.join(root,"story"),path.join(temp,"story"),{recursive:true});
    cpSync(path.join(root,"canon"),path.join(temp,"canon"),{recursive:true});
    assert.throws(() => createCandidatePackage({rootDir:temp,sceneId:"WOA-CH01-SC01",prompt:"A sourced prompt",provider:"test",model:"test",attemptId:"ATT-BLOCK-001"}),/not human-approved/);
    assert.equal(requireFs.existsSync(path.join(temp,"work","candidates")),false);
  } finally { rmSync(temp,{recursive:true,force:true}); }
});
test("candidate package snapshots approved inputs and refuses overwrite", () => {
  const temp = mkdtempSync(path.join(os.tmpdir(), "woa-candidate-ok-"));
  try {
    cpSync(path.join(root,"story"),path.join(temp,"story"),{recursive:true});
    cpSync(path.join(root,"canon"),path.join(temp,"canon"),{recursive:true});
    cpSync(path.join(root,"work"),path.join(temp,"work"),{recursive:true});
    const regPath=path.join(temp,"story","scene-registry.json");
    const reg=JSON.parse(requireFs.readFileSync(regPath,"utf8"));
    const scene=reg.scenes[0];scene.status="approved";scene.approval={status:"approved",approved_by:"test",approved_at:"2026-11-11"};
    scene.reference_manifest="work/manifests/test-scene-01.json";scene.location_id="LOC-HIGH-SCRAPARRAL";
    requireFs.writeFileSync(regPath,JSON.stringify(reg));
    const assets=JSON.parse(requireFs.readFileSync(path.join(temp,"canon","artwork-registry.json"),"utf8"));
    const location=JSON.parse(requireFs.readFileSync(path.join(temp,"canon","locations","high-scraparral.json"),"utf8"));
    const refs=[...scene.required_assets, ...location.canonical_asset_ids].map(id=>{const a=assets.assets.find(x=>x.asset_id===id);return {asset_id:id,purpose:"canonical scene reference",required:true,git_blob_sha:a.git_blob_sha};});
    const mp=path.join(temp,scene.reference_manifest);requireFs.mkdirSync(path.dirname(mp),{recursive:true});
    requireFs.writeFileSync(mp,JSON.stringify({manifest_id:"MANIFEST-TEST-01",scene_id:scene.scene_id,created_at:"2026-11-11T10:00:00.000Z",references:refs,generation_gate:"ready"}));
    const result=createCandidatePackage({rootDir:temp,sceneId:scene.scene_id,prompt:"Only the actions supported by the imported scene.",provider:"test-provider",model:"test-model",attemptId:"ATT-TEST-001",createdAt:"2026-11-11T10:00:00.000Z"});
    const pkg=JSON.parse(requireFs.readFileSync(path.join(temp,result.packagePath),"utf8"));
    assert.equal(pkg.immutable,true);assert.equal(pkg.output.status,"not_generated");assert.equal(pkg.approval.status,"pending");
    assert.ok(pkg.snapshots.scene.sha256.match(/^[a-f0-9]{64}$/));\n    assert.ok(pkg.snapshots.relationship_graph.sha256.match(/^[a-f0-9]{64}$/));\n    assert.ok(pkg.snapshots.continuity_ledger.sha256.match(/^[a-f0-9]{64}$/));\n    assert.ok(pkg.snapshots.characters.some(x=>x.path==="character-tappy.json"));\n    assert.ok(pkg.snapshots.location.sha256.match(/^[a-f0-9]{64}$/));
    assert.ok(requireFs.existsSync(path.join(temp,result.directory,"IMMUTABLE.txt")));
    assert.throws(() => createCandidatePackage({rootDir:temp,sceneId:scene.scene_id,prompt:"retry",provider:"test",model:"test",attemptId:"ATT-TEST-001"}));
  } finally { rmSync(temp,{recursive:true,force:true}); }
});

test("candidate package generator rejects unsafe source paths", () => {
  const temp = mkdtempSync(path.join(os.tmpdir(), "woa-candidate-path-"));
  try {
    cpSync(path.join(root,"story"),path.join(temp,"story"),{recursive:true});
    cpSync(path.join(root,"canon"),path.join(temp,"canon"),{recursive:true});
    const p=path.join(temp,"story","scene-registry.json"),reg=JSON.parse(requireFs.readFileSync(p,"utf8"));
    reg.scenes[0].status="approved";reg.scenes[0].approval={status:"approved"};reg.scenes[0].source_record="../../outside.json";reg.scenes[0].reference_manifest="work/manifests/x.json";
    requireFs.writeFileSync(p,JSON.stringify(reg));
    assert.throws(()=>createCandidatePackage({rootDir:temp,sceneId:reg.scenes[0].scene_id,prompt:"prompt",provider:"p",model:"m"}),/safe source record path/);
  } finally { rmSync(temp,{recursive:true,force:true}); }
});
