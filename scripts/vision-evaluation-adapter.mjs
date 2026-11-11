#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { validateEvaluation } from "./evaluate-candidate.mjs";

const hash=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const inside=(base,target)=>{const r=path.relative(base,target);return r!==""&&!r.startsWith(".."+path.sep)&&r!==".."&&!path.isAbsolute(r);};
const safe=p=>typeof p==="string"&&p.length>0&&!path.isAbsolute(p)&&!p.split(/[\\\\/]/).includes("..");
const criteria=["reference_provenance","character_identity","anatomy_form","character_count","location_continuity","props_object_state","composition","negative_constraints","story_beat","technical_quality"];
const blockingCriteria=new Set(["reference_provenance","character_identity","anatomy_form","character_count","location_continuity","props_object_state","negative_constraints","story_beat"]);
const rubric={
 reference_provenance:"Verify every required reference is present and exactly matches its pinned approved source. Missing/unverifiable references are UNKNOWN or blocked, never assumed.",
 character_identity:"Compare each character's identity, distinctive features, silhouette, colours, clothing and accessories only against its bound canonical artwork.",
 anatomy_form:"Check anatomy and form against canonical artwork and approved character facts. Do not infer missing details from prose.",
 character_count:"Confirm only the specified characters appear; no duplicates or invented figures.",
 location_continuity:"Compare environment, structures and defining location features with the bound canonical location image.",
 props_object_state:"Check only scene-specified props and their sourced position/possession. Eric must not hold objects.",
 composition:"Assess requested framing, viewpoint, action and visual hierarchy without changing the story beat.",
 negative_constraints:"Check all scene prohibitions, including no unrequested text, captions, logos, objects or characters.",
 story_beat:"Confirm the image depicts only the approved scene action and does not foreshadow or jump ahead.",
 technical_quality:"Assess resolution, crop, clarity, artefacts, anatomy distortions and image integrity."
};
function parse(argv){const o={};for(let i=0;i<argv.length;i++)if(argv[i].startsWith("--"))o[argv[i].slice(2)]=argv[++i];return o;}
function loadAttempt(attemptDir,candidatePath){
 const base=path.resolve(attemptDir),real=fs.realpathSync(base),pkgPath=path.join(base,"candidate-package.json");
 if(!fs.existsSync(pkgPath)||!inside(real,fs.realpathSync(pkgPath)))throw new Error("Candidate package missing or outside attempt.");
 const pkg=JSON.parse(fs.readFileSync(pkgPath,"utf8"));
 if(pkg.immutable!==true||pkg.stage!=="candidate_input_package")throw new Error("Attempt package is not immutable.");
 if(!safe(candidatePath))throw new Error("Unsafe candidate path.");
 const candidate=path.resolve(base,candidatePath);
 if(!inside(base,candidate)||!fs.existsSync(candidate)||!fs.statSync(candidate).isFile()||!inside(real,fs.realpathSync(candidate)))throw new Error("Candidate image must be a regular file inside the attempt directory.");
 const registry=JSON.parse(fs.readFileSync(path.join(base,"artwork-registry-snapshot.json"),"utf8"));
 const byId=new Map(registry.assets.map(a=>[a.asset_id,a]));
 const refs=pkg.references.map(r=>{
  const a=byId.get(r.asset_id);
  if(!a||a.status!=="approved"||a.git_blob_sha!==r.git_blob_sha)throw new Error("Bound reference is missing or differs from pinned registry: "+r.asset_id);
  const match=a.source?.match(/^https:\/\/github\.com\/([^/]+\/[^/]+)\/blob\/([^/]+)\/(.+)$/);
  if(!match)throw new Error("Reference source is not a pinned GitHub blob URL: "+r.asset_id);
  return {asset_id:r.asset_id,purpose:r.purpose,required:r.required,git_blob_sha:r.git_blob_sha,integrity_requirement:"Verify downloaded image against this Git blob SHA before evaluation; URL is a locator, not the integrity proof.",sha256:r.sha256??null,source_url:a.source,view_url:"https://raw.githubusercontent.com/"+match[1]+"/"+match[2]+"/"+match[3]};
 });
 return {base,pkg,pkgPath,candidate,candidateSha256:hash(candidate),packageSha256:hash(pkgPath),refs};
}
export function createVisionTask({attemptDir,candidatePath,taskId="vision-review-01",createdAt=new Date().toISOString()}){
 const a=loadAttempt(attemptDir,candidatePath);
 if(!/^[A-Za-z0-9][A-Za-z0-9._-]{2,100}$/.test(taskId))throw new Error("Invalid task ID.");
 const scene=a.pkg.scene;
 const task={task_schema_version:"1.0.0",task_id:taskId,created_at:createdAt,attempt_id:a.pkg.attempt_id,scene_id:a.pkg.scene_id,package_sha256:a.packageSha256,candidate:{path:candidatePath,sha256:a.candidateSha256,media_type:"image/*"},scene_brief:scene,prompt_context:a.pkg.prompt.text,required_reference_ids:a.pkg.references.filter(r=>r.required).map(r=>r.asset_id),references:a.refs,rubric_version:"1.0.0",criteria:criteria.map(id=>({criterion_id:id,instructions:rubric[id],blocking:!["composition","technical_quality"].includes(id)})),response_contract:{criterion_status:["pass","fail","unknown"],decision:["pass","needs_correction","reject","inconclusive"],required_fields:["criteria","decision","correction_guidance"],human_approval_required:true},evaluator_instructions:["Evaluate the candidate image at candidate.path against every listed reference and criterion.","Use only the supplied references and scene brief; do not invent canon or infer unsupported facts.","For each criterion provide status, confidence 0..1, concrete visual evidence, and reference_ids actually inspected.","If an image/reference is inaccessible or unclear, use UNKNOWN and explain why.","Any canon/story failure must not be described as a stylistic preference.","Never approve canon; evaluation is advisory and human approval remains mandatory."]};
 const dir=path.join(a.base,"vision-tasks");fs.mkdirSync(dir,{recursive:true});
 const out=path.join(dir,taskId+".json");if(fs.existsSync(out))throw new Error("Vision task files are immutable; task ID already exists.");
 fs.writeFileSync(out,JSON.stringify(task,null,2)+String.fromCharCode(10),{flag:"wx"});
 return {taskPath:path.relative(a.base,out),taskId,candidateSha256:a.candidateSha256,packageSha256:a.packageSha256,referenceCount:a.refs.length};
}
export function ingestVisionResponse({attemptDir,candidatePath,responsePath,evaluator,evaluatorVersion,recordName="evaluation-01.json",evaluatedAt=new Date().toISOString()}){
 const a=loadAttempt(attemptDir,candidatePath),response=JSON.parse(fs.readFileSync(path.resolve(responsePath),"utf8"));
 if(response.attempt_id!==a.pkg.attempt_id||response.scene_id!==a.pkg.scene_id)throw new Error("Vision response attempt/scene does not match this candidate.");
 if(response.package_sha256!==a.packageSha256||response.candidate_sha256!==a.candidateSha256)throw new Error("Vision response was produced for a different package or candidate image.");
 if(!response.evaluation||!Array.isArray(response.evaluation.criteria))throw new Error("Vision response must contain evaluation.criteria.");
 const expected=new Set(criteria),received=new Set(response.evaluation.criteria.map(c=>c.criterion_id));
 for(const id of expected)if(!received.has(id))throw new Error("Vision response omits criterion: "+id);
 for(const c of response.evaluation.criteria)if(!expected.has(c.criterion_id))throw new Error("Vision response contains unknown criterion: "+c.criterion_id);
 const refs=new Set(a.refs.map(r=>r.asset_id));
 for(const c of response.evaluation.criteria)for(const id of c.reference_ids||[])if(!refs.has(id))throw new Error("Vision response cites an unbound reference: "+id);
 return validateEvaluation({attemptDir:a.base,candidatePath,evaluation:response.evaluation,evaluator:evaluator||response.evaluator?.name,evaluatorVersion:evaluatorVersion||response.evaluator?.version,rubricVersion:"1.0.0",evaluatedAt,recordName});
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const a=parse(process.argv.slice(2));
 if(a.help){console.log("Prepare: node scripts/vision-evaluation-adapter.mjs --prepare --attempt-dir DIR --candidate candidate.png [--task-id ID]
Ingest: node scripts/vision-evaluation-adapter.mjs --ingest --attempt-dir DIR --candidate candidate.png --response-file response.json --evaluator name --evaluator-version version");process.exit(0);}
 try{
  if(!a["attempt-dir"]||!a.candidate)throw new Error("Required: --attempt-dir and --candidate.");
  let result;
  if(a.prepare)result=createVisionTask({attemptDir:a["attempt-dir"],candidatePath:a.candidate,taskId:a["task-id"]});
  else if(a.ingest){if(!a["response-file"])throw new Error("--response-file is required with --ingest.");result=ingestVisionResponse({attemptDir:a["attempt-dir"],candidatePath:a.candidate,responsePath:a["response-file"],evaluator:a.evaluator,evaluatorVersion:a["evaluator-version"],recordName:a["record-name"]||"evaluation-01.json"});}
  else throw new Error("Choose --prepare or --ingest.");
  console.log(JSON.stringify(result,null,2));
 }catch(e){console.error("BLOCKED: "+e.message);process.exitCode=1;}
}
