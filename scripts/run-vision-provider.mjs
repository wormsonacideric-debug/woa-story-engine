#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const sha256=b=>crypto.createHash("sha256").update(b).digest("hex");
const gitBlobSha=b=>crypto.createHash("sha1").update(Buffer.concat([Buffer.from("blob "+b.length+"\\0"),b])).digest("hex");
const inside=(base,target)=>{const r=path.relative(base,target);return r!==""&&!r.startsWith(".."+path.sep)&&r!==".."&&!path.isAbsolute(r);};
const mime=p=>({".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".gif":"image/gif"}[path.extname(p).toLowerCase()]||"application/octet-stream");
function args(argv){const o={};for(let i=0;i<argv.length;i++)if(argv[i].startsWith("--"))o[argv[i].slice(2)]=argv[++i];return o;}

export async function runVisionProvider({attemptDir,taskPath,apiKey=process.env.OPENAI_API_KEY,baseUrl=process.env.OPENAI_BASE_URL||"https://api.openai.com/v1",model=process.env.WOA_VISION_MODEL||"gpt-4.1",fetchImpl=fetch}){
 if(!apiKey)throw new Error("OPENAI_API_KEY is not set. No request was sent.");
 const base=path.resolve(attemptDir),taskFile=path.resolve(base,taskPath);
 if(!inside(base,taskFile)||!fs.existsSync(taskFile)||!inside(fs.realpathSync(base),fs.realpathSync(taskFile)))throw new Error("Task file must be inside the attempt directory.");
 const task=JSON.parse(fs.readFileSync(taskFile,"utf8"));
 if(task.task_schema_version!=="1.0.0"||!Array.isArray(task.criteria)||task.criteria.length!==10)throw new Error("Unsupported or incomplete vision task packet.");
 const candidate=path.resolve(base,task.candidate.path);
 if(!inside(base,candidate)||!fs.existsSync(candidate)||!inside(fs.realpathSync(base),fs.realpathSync(candidate)))throw new Error("Candidate image must be inside the attempt directory.");
 const candidateBytes=fs.readFileSync(candidate);
 if(sha256(candidateBytes)!==task.candidate.sha256)throw new Error("Candidate image hash changed after task preparation.");
 if(sha256(fs.readFileSync(path.join(base,"candidate-package.json")))!==task.package_sha256)throw new Error("Candidate package hash changed after task preparation.");
 const imageParts=[{type:"text",text:"CANDIDATE IMAGE — evaluate this image against the task packet and reference images."},{type:"image_url",image_url:{url:"data:"+mime(candidate)+";base64,"+candidateBytes.toString("base64")}}];
 for(const ref of task.references){
  if(!ref.required)continue;
  if(!/^https:\/\/raw\.githubusercontent\.com\//.test(ref.view_url||""))throw new Error("Untrusted reference locator: "+ref.asset_id);
  const r=await fetchImpl(ref.view_url,{redirect:"error"});
  if(!r.ok)throw new Error("Could not retrieve required reference "+ref.asset_id+": HTTP "+r.status);
  const bytes=Buffer.from(await r.arrayBuffer());
  if(gitBlobSha(bytes)!==ref.git_blob_sha)throw new Error("Git blob integrity check failed for reference "+ref.asset_id);
  imageParts.push({type:"text",text:"APPROVED REFERENCE "+ref.asset_id+" — purpose: "+ref.purpose+" — verified Git blob SHA: "+ref.git_blob_sha});
  imageParts.push({type:"image_url",image_url:{url:"data:"+mime(ref.view_url)+";base64,"+bytes.toString("base64")}});
 }
 const schemaHint={
  attempt_id:task.attempt_id,scene_id:task.scene_id,package_sha256:task.package_sha256,candidate_sha256:task.candidate.sha256,
  evaluator:{name:"OpenAI-compatible vision API",version:model},
  evaluation:{decision:"pass | needs_correction | reject | inconclusive",correction_guidance:["evidence-backed correction guidance"],criteria:task.criteria.map(c=>({criterion_id:c.criterion_id,status:"pass | fail | unknown",confidence:0.0,evidence:["specific visible evidence"],reference_ids:["IDs of supplied references actually inspected"]}))}
 };
 const instructions="You are the visual evaluator for WORMS ON ACID. Evaluate the candidate image against the scene brief and supplied approved reference images. Use only supplied visual evidence and task data; do not invent canon. For every criterion return status pass, fail, or unknown; confidence from 0 to 1; concrete visual evidence; and only reference IDs actually inspected. UNKNOWN is not PASS. Any missing/unverifiable reference must be treated as unknown for affected checks. Do not change criterion IDs. Do not claim human approval. Return one JSON object only, matching this response shape: "+JSON.stringify(schemaHint)+"\\nTASK PACKET:\\n"+JSON.stringify(task);
 const url=baseUrl.replace(/\/+$/,"")+"/chat/completions";
 const res=await fetchImpl(url,{method:"POST",headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json"},body:JSON.stringify({model,temperature:0,response_format:{type:"json_object"},messages:[{role:"user",content:[{type:"text",text:instructions},...imageParts]}]})});
 if(!res.ok)throw new Error("Vision API request failed: HTTP "+res.status+" "+(await res.text()).slice(0,1000));
 const body=await res.json(),raw=body.choices?.[0]?.message?.content;
 if(typeof raw!=="string")throw new Error("Vision API returned no JSON message content.");
 let parsed;try{parsed=JSON.parse(raw);}catch{throw new Error("Vision API response was not valid JSON.");}
 if(parsed.attempt_id!==task.attempt_id||parsed.scene_id!==task.scene_id||parsed.package_sha256!==task.package_sha256||parsed.candidate_sha256!==task.candidate.sha256)throw new Error("Vision API response identity/hashes do not match the task.");
 const outDir=path.join(base,"vision-responses");fs.mkdirSync(outDir,{recursive:true});
 const out=path.join(outDir,task.task_id+"-response.json");
 fs.writeFileSync(out,JSON.stringify(parsed,null,2)+"\n",{flag:"wx"});
 return {responsePath:path.relative(base,out),model,usage:body.usage||null,referenceCount:imageParts.filter(x=>x.type==="image_url").length-1};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 const a=args(process.argv.slice(2));
 if(a.help){console.log("node scripts/run-vision-provider.mjs --attempt-dir DIR --task vision-tasks/TASK.json [--model MODEL]");process.exit(0);}
 try{if(!a["attempt-dir"]||!a.task)throw new Error("Required: --attempt-dir and --task.");const r=await runVisionProvider({attemptDir:a["attempt-dir"],taskPath:a.task,model:a.model||process.env.WOA_VISION_MODEL||"gpt-4.1"});console.log(JSON.stringify(r,null,2));}
 catch(e){console.error("BLOCKED: "+e.message);process.exitCode=1;}
}
