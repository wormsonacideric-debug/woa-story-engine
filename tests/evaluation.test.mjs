import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateEvaluation } from "../scripts/evaluate-candidate.mjs";

function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"woa-eval-"));
 fs.writeFileSync(path.join(root,"candidate-package.json"),JSON.stringify({immutable:true,human_approval_required:true,stage:"candidate_input_package",attempt_id:"ATT-TEST-001",scene_id:"WOA-CH01-SC01"}));
 fs.writeFileSync(path.join(root,"candidate.png"),"candidate-bytes");
 const criteria=["reference_provenance","character_identity","anatomy_form","character_count","location_continuity","props_object_state","composition","negative_constraints","story_beat","technical_quality"].map(id=>({criterion_id:id,status:"pass",confidence:0.98,evidence:["Inspected against the approved scene and references."],reference_ids:["ASSET-ERIC-01"],blocking:["reference_provenance","character_identity","anatomy_form","character_count","location_continuity","props_object_state","negative_constraints","story_beat"].includes(id)}));
 return {root,criteria};
}
const meta={evaluator:"test-evaluator",evaluatorVersion:"1",rubricVersion:"1.0.0",evaluatedAt:"2026-11-11T12:00:00.000Z"};
test("evaluation binds the exact package and candidate hashes and remains pending human approval",()=>{
 const f=fixture();try{
  const r=validateEvaluation({attemptDir:f.root,candidatePath:"candidate.png",evaluation:{criteria:f.criteria,decision:"pass"},...meta});
  const record=JSON.parse(fs.readFileSync(path.join(f.root,r.evaluationPath),"utf8"));
  assert.match(record.package_sha256,/^[a-f0-9]{64}$/);assert.match(record.candidate.sha256,/^[a-f0-9]{64}$/);
  assert.equal(record.attempt_id,"ATT-TEST-001");assert.equal(record.approval_status,"pending");assert.equal(record.human_approval_required,true);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test("UNKNOWN or FAIL criteria cannot receive pass decision",()=>{
 const f=fixture();try{
  assert.throws(()=>validateEvaluation({attemptDir:f.root,candidatePath:"candidate.png",evaluation:{criteria:f.criteria.map((c,i)=>i===0?{...c,status:"unknown",evidence:["Insufficient evidence."]}:c),decision:"pass"},...meta}),/cannot pass/);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test("blocking failure cannot be marked inconclusive or pass",()=>{
 const f=fixture();try{
  assert.throws(()=>validateEvaluation({attemptDir:f.root,candidatePath:"candidate.png",evaluation:{criteria:f.criteria.map((c,i)=>i===1?{...c,status:"fail",evidence:["Character anatomy conflicts with canon."]}:c),decision:"inconclusive"},...meta}),/require needs_correction or reject/);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test("candidate paths cannot escape the immutable attempt directory",()=>{
 const f=fixture();try{
  assert.throws(()=>validateEvaluation({attemptDir:f.root,candidatePath:"../outside.png",evaluation:{criteria:f.criteria,decision:"pass"},...meta}),/safe relative path/);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test("evaluation records are append-only",()=>{
 const f=fixture();try{
  const input={attemptDir:f.root,candidatePath:"candidate.png",evaluation:{criteria:f.criteria,decision:"pass"},...meta};
  validateEvaluation(input);assert.throws(()=>validateEvaluation(input),/append-only/);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
