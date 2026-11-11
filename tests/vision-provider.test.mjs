import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { createVisionTask } from "../scripts/vision-evaluation-adapter.mjs";
import { runVisionProvider } from "../scripts/run-vision-provider.mjs";
const sha256=b=>crypto.createHash("sha256").update(b).digest("hex");
const gitBlobSha=b=>crypto.createHash("sha1").update(Buffer.concat([Buffer.from("blob "+b.length+"\\0"),b])).digest("hex");
const ids=["reference_provenance","character_identity","anatomy_form","character_count","location_continuity","props_object_state","composition","negative_constraints","story_beat","technical_quality"];
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"woa-provider-")),attempt=path.join(root,"ATT-PROVIDER");fs.mkdirSync(attempt);
 const candidate=Buffer.from("candidate image bytes"),reference=Buffer.from("approved reference bytes");
 fs.writeFileSync(path.join(attempt,"candidate.png"),candidate);
 fs.writeFileSync(path.join(attempt,"artwork-registry-snapshot.json"),JSON.stringify({assets:[{asset_id:"ASSET-ERIC",status:"approved",git_blob_sha:gitBlobSha(reference),source:"https://github.com/wormsonacideric-debug/website-/blob/main/assets/eric.png"}]}));
 const pkg={immutable:true,stage:"candidate_input_package",attempt_id:"ATT-PROVIDER",scene_id:"WOA-CH01-SC01",scene:{title:"Test",characters:["Eric"]},prompt:{text:"Test prompt"},references:[{asset_id:"ASSET-ERIC",purpose:"character",required:true,git_blob_sha:gitBlobSha(reference)}]};
 fs.writeFileSync(path.join(attempt,"candidate-package.json"),JSON.stringify(pkg));
 const task=createVisionTask({attemptDir:attempt,candidatePath:"candidate.png"});
 return {root,attempt,reference,task};
}
test("provider verifies reference bytes and writes a hash-bound response",async()=>{
 const f=fixture();try{
  const task=JSON.parse(fs.readFileSync(path.join(f.attempt,f.task.taskPath),"utf8"));
  const response={attempt_id:task.attempt_id,scene_id:task.scene_id,package_sha256:task.package_sha256,candidate_sha256:task.candidate.sha256,evaluator:{name:"test-provider",version:"1"},evaluation:{decision:"pass",correction_guidance:[],criteria:ids.map(id=>({criterion_id:id,status:"pass",confidence:0.9,evidence:["Observed."],reference_ids:["ASSET-ERIC"]}))}};
  let calls=0;
  const fetchImpl=async(url,options)=>{
   calls++;
   if(String(url).includes("raw.githubusercontent.com"))return new Response(f.reference,{status:200,headers:{"content-type":"image/png"}});
   assert.equal(options.method,"POST");
   const body=JSON.parse(options.body);
   assert.equal(body.messages[0].content.filter(x=>x.type==="image_url").length,2);
   return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(response)}}],usage:{total_tokens:123}}),{status:200,headers:{"content-type":"application/json"}});
  };
  const out=await runVisionProvider({attemptDir:f.attempt,taskPath:f.task.taskPath,apiKey:"test-key",fetchImpl});
  assert.equal(calls,2);assert.equal(out.model,"gpt-4.1");assert.equal(out.usage.total_tokens,123);
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.attempt,out.responsePath),"utf8")).attempt_id,"ATT-PROVIDER");
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test("provider refuses a reference whose Git blob SHA does not match",async()=>{
 const f=fixture();try{
  await assert.rejects(runVisionProvider({attemptDir:f.attempt,taskPath:f.task.taskPath,apiKey:"test-key",fetchImpl:async()=>new Response("tampered",{status:200})}),/integrity check failed/);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test("provider refuses missing credentials before making requests",async()=>{
 const f=fixture();try{
  await assert.rejects(runVisionProvider({attemptDir:f.attempt,taskPath:f.task.taskPath,apiKey:"",fetchImpl:async()=>{throw new Error("must not call");}}),/OPENAI_API_KEY/);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
