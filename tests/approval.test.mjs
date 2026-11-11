import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { recordHumanDecision } from "../scripts/record-human-decision.mjs";
const hash=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
function fixture(evalDecision="pass"){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"woa-approval-")),attempt=path.join(root,"ATT-APPROVE");
 fs.mkdirSync(path.join(attempt,"evaluations"),{recursive:true});
 fs.writeFileSync(path.join(attempt,"candidate.png"),"candidate image bytes");
 const pkg={immutable:true,human_approval_required:true,attempt_id:"ATT-APPROVE",scene_id:"WOA-CH01-SC01"};
 fs.writeFileSync(path.join(attempt,"candidate-package.json"),JSON.stringify(pkg));
 const ev={evaluation_id:"evaluation-01",attempt_id:pkg.attempt_id,scene_id:pkg.scene_id,decision:evalDecision,package_sha256:hash(path.join(attempt,"candidate-package.json")),candidate:{path:"candidate.png",sha256:hash(path.join(attempt,"candidate.png"))}};
 fs.writeFileSync(path.join(attempt,"evaluations","evaluation-01.json"),JSON.stringify(ev));
 return {root,attempt};
}
test("human approval records immutable hashes but does not ingest canon",()=>{
 const f=fixture();try{
  const r=recordHumanDecision({attemptDir:f.attempt,evaluationPath:"evaluations/evaluation-01.json",decision:"approve",approver:"Human editor",reason:"Reviewed candidate against approved WOA canon.",decidedAt:"2026-11-11T14:00:00.000Z",approvalId:"DEC-TEST-001"});
  const record=JSON.parse(fs.readFileSync(path.join(f.attempt,r.path),"utf8"));
  assert.equal(record.decision,"approve");assert.equal(record.canonical_asset_created,false);assert.equal(record.canonical_asset_status,"not_ingested");
  assert.match(record.candidate.sha256,/^[a-f0-9]{64}$/);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test("approval is blocked unless evaluation decision is pass",()=>{
 const f=fixture("needs_correction");try{assert.throws(()=>recordHumanDecision({attemptDir:f.attempt,evaluationPath:"evaluations/evaluation-01.json",decision:"approve",approver:"Human editor",reason:"Looks good"}),/requires a PASS/);}finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test("candidate or package tampering blocks approval",()=>{
 const f=fixture();try{fs.writeFileSync(path.join(f.attempt,"candidate.png"),"changed");assert.throws(()=>recordHumanDecision({attemptDir:f.attempt,evaluationPath:"evaluations/evaluation-01.json",decision:"approve",approver:"Human editor",reason:"Reviewed"}),/hash differs/);}finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test("decision records are append-only and reject missing rationale",()=>{
 const f=fixture();try{
  const input={attemptDir:f.attempt,evaluationPath:"evaluations/evaluation-01.json",decision:"approve",approver:"Human editor",reason:"Reviewed."};
  recordHumanDecision({...input,approvalId:"DEC-TEST-002"});assert.throws(()=>recordHumanDecision({...input,approvalId:"DEC-TEST-002"}),/append-only/);
  assert.throws(()=>recordHumanDecision({...input,reason:" "}),/rationale/);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
