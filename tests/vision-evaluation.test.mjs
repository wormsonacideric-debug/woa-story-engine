import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { createVisionTask, ingestVisionResponse } from "../scripts/vision-evaluation-adapter.mjs";
const hash=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const ids=["reference_provenance","character_identity","anatomy_form","character_count","location_continuity","props_object_state","composition","negative_constraints","story_beat","technical_quality"];
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"woa-vision-")),attempt=path.join(root,"ATT-VISION");fs.mkdirSync(attempt);
 fs.writeFileSync(path.join(attempt,"candidate.png"),"image bytes");
 const registry={assets:[{asset_id:"ASSET-CHAR-ERIC",status:"approved",git_blob_sha:"a".repeat(40),source:"https://github.com/wormsonacideric-debug/website-/blob/main/assets/eric.webp"}]};
 fs.writeFileSync(path.join(attempt,"artwork-registry-snapshot.json"),JSON.stringify(registry));
 const pkg={immutable:true,stage:"candidate_input_package",attempt_id:"ATT-VISION",scene_id:"WOA-CH01-SC01",scene:{title:"Test scene",characters:["Eric"]},prompt:{text:"A test prompt"},references:[{asset_id:"ASSET-CHAR-ERIC",purpose:"character",required:true,git_blob_sha:"a".repeat(40)}]};
 fs.writeFileSync(path.join(attempt,"candidate-package.json"),JSON.stringify(pkg));
 return {root,attempt,pkg};
}
function response(f,decision="pass"){
 const pkgPath=path.join(f.attempt,"candidate-package.json"),candidate=path.join(f.attempt,"candidate.png");
 return {attempt_id:f.pkg.attempt_id,scene_id:f.pkg.scene_id,package_sha256:hash(pkgPath),candidate_sha256:hash(candidate),evaluator:{name:"vision-test",version:"1"},evaluation:{decision,correction_guidance:[],criteria:ids.map(id=>({criterion_id:id,status:"pass",confidence:0.95,evidence:["Inspected candidate against task references."],reference_ids:["ASSET-CHAR-ERIC"],blocking:!["composition","technical_quality"].includes(id)}))}};
}
test("vision task binds exact hashes and pinned reference URLs",()=>{
 const f=fixture();try{
  const r=createVisionTask({attemptDir:f.attempt,candidatePath:"candidate.png"});
  const task=JSON.parse(fs.readFileSync(path.join(f.attempt,r.taskPath),"utf8"));
  assert.equal(task.candidate.sha256,hash(path.join(f.attempt,"candidate.png")));
  assert.equal(task.references[0].view_url,"https://raw.githubusercontent.com/wormsonacideric-debug/website-/main/assets/eric.webp");
  assert.equal(task.criteria.length,10);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test("ingest accepts complete response and creates pending evaluation",()=>{
 const f=fixture();try{
  fs.writeFileSync(path.join(f.root,"response.json"),JSON.stringify(response(f)));
  const r=ingestVisionResponse({attemptDir:f.attempt,candidatePath:"candidate.png",responsePath:path.join(f.root,"response.json")});
  const ev=JSON.parse(fs.readFileSync(path.join(f.attempt,r.evaluationPath),"utf8"));
  assert.equal(ev.decision,"pass");assert.equal(ev.approval_status,"pending");
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test("ingest rejects stale response hashes",()=>{
 const f=fixture();try{
  const res=response(f);res.candidate_sha256="0".repeat(64);fs.writeFileSync(path.join(f.root,"response.json"),JSON.stringify(res));
  assert.throws(()=>ingestVisionResponse({attemptDir:f.attempt,candidatePath:"candidate.png",responsePath:path.join(f.root,"response.json")}),/different package or candidate/);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test("ingest rejects missing rubric dimensions and unbound references",()=>{
 const f=fixture();try{
  const res=response(f);res.evaluation.criteria.pop();fs.writeFileSync(path.join(f.root,"response.json"),JSON.stringify(res));
  assert.throws(()=>ingestVisionResponse({attemptDir:f.attempt,candidatePath:"candidate.png",responsePath:path.join(f.root,"response.json")}),/omits criterion/);
  const res2=response(f);res2.evaluation.criteria[0].reference_ids=["ASSET-UNKNOWN"];fs.writeFileSync(path.join(f.root,"response.json"),JSON.stringify(res2));
  assert.throws(()=>ingestVisionResponse({attemptDir:f.attempt,candidatePath:"candidate.png",responsePath:path.join(f.root,"response.json")}),/unbound reference/);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test("provider cannot downgrade a canon-blocking criterion",()=>{\n const f=fixture();try{\n  const res=response(f);res.evaluation.criteria[1].status="fail";res.evaluation.criteria[1].evidence=["Character identity visibly differs."];res.evaluation.criteria[1].blocking=false;res.evaluation.decision="needs_correction";\n  fs.writeFileSync(path.join(f.root,"response.json"),JSON.stringify(res));\n  const r=ingestVisionResponse({attemptDir:f.attempt,candidatePath:"candidate.png",responsePath:path.join(f.root,"response.json")});\n  const ev=JSON.parse(fs.readFileSync(path.join(f.attempt,r.evaluationPath),"utf8"));\n  assert.equal(ev.criteria[1].blocking,true);\n }finally{fs.rmSync(f.root,{recursive:true,force:true});}\n});\ntest("task IDs cannot overwrite prior vision task",()=>{
 const f=fixture();try{createVisionTask({attemptDir:f.attempt,candidatePath:"candidate.png",taskId:"vision-review-01"});assert.throws(()=>createVisionTask({attemptDir:f.attempt,candidatePath:"candidate.png",taskId:"vision-review-01"}),/immutable/);}finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
