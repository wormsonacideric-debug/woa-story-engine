import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { createCorrectionAttempt } from "../scripts/create-correction-attempt.mjs";
const hash=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
function fixture(iteration=1,decision="needs_correction"){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"woa-correct-")),attempt=path.join(root,"ATT-ORIGINAL");
 fs.mkdirSync(path.join(attempt,"snapshots"),{recursive:true});fs.mkdirSync(path.join(attempt,"evaluations"));
 fs.writeFileSync(path.join(attempt,"snapshots","scene.json"),"{}");
 const pkg={immutable:true,stage:"candidate_input_package",attempt_id:"ATT-ORIGINAL",scene_id:"WOA-CH01-SC01",iteration,prompt:{text:"Original prompt",provider:"test",model:"test"},snapshots:{scene:{path:"snapshots/scene.json",sha256:hash(path.join(attempt,"snapshots","scene.json"))}},output:{status:"not_generated"},evaluation:{status:"not_evaluated"},approval:{status:"pending"}};
 fs.writeFileSync(path.join(attempt,"candidate-package.json"),JSON.stringify(pkg));
 const ev={attempt_id:"ATT-ORIGINAL",scene_id:"WOA-CH01-SC01",evaluation_id:"evaluation-01",decision,correction_guidance:["Correct the hat using the approved reference."],candidate:{sha256:"a".repeat(64)}};
 fs.writeFileSync(path.join(attempt,"evaluations","evaluation-01.json"),JSON.stringify(ev));
 return {root,attempt};
}
test("correction creates a new immutable attempt with linked evidence and copied snapshots",()=>{
 const f=fixture();try{
  const r=createCorrectionAttempt({attemptDir:f.attempt,evaluationPath:"evaluations/evaluation-01.json",correctionId:"ATT-REVISION-02",createdAt:"2026-11-11T13:00:00.000Z"});
  const next=path.join(f.root,"ATT-REVISION-02"),pkg=JSON.parse(fs.readFileSync(path.join(next,"candidate-package.json"),"utf8"));
  assert.equal(pkg.iteration,2);assert.equal(pkg.parent_attempt.attempt_id,"ATT-ORIGINAL");assert.equal(pkg.output.status,"not_generated");assert.equal(pkg.approval.status,"pending");
  assert.equal(fs.readFileSync(path.join(next,"snapshots","scene.json"),"utf8"),"{}");
  assert.match(pkg.prompt.text,/Correct the hat/);assert.ok(fs.existsSync(path.join(f.attempt,"candidate-package.json")));
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test("correction limit blocks another attempt",()=>{
 const f=fixture(3);try{assert.throws(()=>createCorrectionAttempt({attemptDir:f.attempt,evaluationPath:"evaluations/evaluation-01.json"}),/limit reached/);}finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test("only needs_correction evaluations can create a correction",()=>{
 const f=fixture(1,"pass");try{assert.throws(()=>createCorrectionAttempt({attemptDir:f.attempt,evaluationPath:"evaluations/evaluation-01.json"}),/Only a needs_correction/);}finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test("snapshot tampering blocks correction",()=>{
 const f=fixture();try{fs.writeFileSync(path.join(f.attempt,"snapshots","scene.json"),"tampered");assert.throws(()=>createCorrectionAttempt({attemptDir:f.attempt,evaluationPath:"evaluations/evaluation-01.json"}),/integrity check failed/);}finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
