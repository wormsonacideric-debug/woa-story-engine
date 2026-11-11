#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root=process.cwd();
const args=process.argv.slice(2);
const get=(name)=>{const i=args.indexOf(name);return i>=0?args[i+1]:null;};
if(args.includes("--help")||args.includes("-h")){
 console.log("Usage: npm run package -- --scene-id WOA-CH01-SCXX [--attempt-id ID]");
 console.log("Creates an immutable candidate input package only when the scene passes production gates.");
 process.exit(0);
}
const sceneId=get("--scene-id");
if(!sceneId){console.error("Missing --scene-id.");process.exit(2);}
if(!/^WOA-[A-Z0-9-]+$/.test(sceneId)){console.error("Invalid scene ID.");process.exit(2);}
const read=(p)=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const sha=(s)=>crypto.createHash("sha256").update(s).digest("hex");
const safe=(p)=>typeof p==="string"&&!path.isAbsolute(p)&&!p.split(/[\\/]/).includes("..");
const fail=(m)=>{console.error("BLOCKED: "+m);process.exit(1);};
const registry=read("story/scene-registry.json");
const scene=registry.scenes.find(s=>s.scene_id===sceneId);
if(!scene)fail("scene is not registered.");
if(scene.status!=="approved"||scene.approval?.status!=="approved"||!scene.approval.approved_by||!scene.approval.approved_at)fail("scene lacks explicit human production approval.");
if(!scene.location_id)fail("scene has no approved location binding.");
if(!safe(scene.source_record)||!fs.existsSync(path.join(root,scene.source_record)))fail("scene source record is missing or unsafe.");
if(!safe(scene.reference_manifest)||!fs.existsSync(path.join(root,scene.reference_manifest)))fail("reference manifest is missing or unsafe.");
const source=read(scene.source_record),manifest=read(scene.reference_manifest),art=read("canon/artwork-registry.json");
if(source.scene_id!==sceneId)fail("source record scene_id mismatch.");
if(manifest.scene_id!==sceneId||manifest.generation_gate!=="ready")fail("reference manifest is not ready for this scene.");
if(!Array.isArray(manifest.references)||!manifest.references.length)fail("reference manifest has no references.");
const byId=new Map(art.assets.map(a=>[a.asset_id,a]));
const bound=new Map(manifest.references.map(r=>[r.asset_id,r]));
for(const id of scene.required_assets||[]){
 const a=byId.get(id),b=bound.get(id);
 if(!a||a.status!=="approved")fail("required asset is missing or not approved: "+id);
 if(!b)fail("required asset is not bound: "+id);
 if(!b.git_blob_sha||b.git_blob_sha!==a.git_blob_sha)fail("required asset Git blob pin mismatch: "+id);
 if(a.sha256&&b.sha256!==a.sha256)fail("required asset SHA-256 pin mismatch: "+id);
}
for(const r of manifest.references){
 const a=byId.get(r.asset_id);
 if(!a||a.status!=="approved")fail("manifest includes an unknown or non-approved asset: "+r.asset_id);
 if(r.git_blob_sha!==a.git_blob_sha)fail("manifest Git blob pin mismatch: "+r.asset_id);
}
const attemptId=get("--attempt-id")||("ATT-"+new Date().toISOString().replace(/[-:.TZ]/g,"").slice(0,14)+"-"+crypto.randomUUID().slice(0,8));
if(!/^[A-Za-z0-9][A-Za-z0-9._-]{5,79}$/.test(attemptId))fail("attempt ID must be 6–80 safe filename characters.");
const base=path.join(root,"work","attempts",sceneId);
fs.mkdirSync(base,{recursive:true});
const dir=path.join(base,attemptId);
try{fs.mkdirSync(dir,{recursive:false});}catch{fail("attempt directory already exists; attempts are never overwritten.");}
const transcript=Array.isArray(source.transcript)?source.transcript:[];
const prompt=[
 "WORMS ON ACID — candidate generation brief",
 "Scene: "+scene.title+" ("+sceneId+")",
 "Action (approved scene record): "+scene.action,
 "Narrative purpose: "+scene.narrative_purpose,
 "Source transcript follows verbatim as structured speaker/text pairs. Preserve all dialogue exactly; do not add dialogue.",
 JSON.stringify(transcript,null,2),
 "Depicted characters: "+(scene.characters||[]).join(", "),
 "Location ID: "+scene.location_id,
 "Required asset IDs: "+(scene.required_assets||[]).join(", "),
 "Negative constraints: "+(scene.must_not_include||[]).join(" | "),
 "Use only the bound canonical references in reference-lock.json. Do not invent character anatomy, costume, props, setting details or unapproved story facts.",
 "This is a candidate, not canonical artwork. Human approval is required."
].join("\n\n");
const lock={
 lock_version:"1.0.0",scene_id:sceneId,manifest_id:manifest.manifest_id,
 scene_record:{path:scene.source_record,sha256:sha(fs.readFileSync(path.join(root,scene.source_record)))},
 scene_registry:{path:"story/scene-registry.json",sha256:sha(fs.readFileSync(path.join(root,"story/scene-registry.json")))},
 reference_manifest:{path:scene.reference_manifest,sha256:sha(fs.readFileSync(path.join(root,scene.reference_manifest)))},
 references:manifest.references.map(r=>{const a=byId.get(r.asset_id);return {asset_id:r.asset_id,purpose:r.purpose,required:r.required,source_repository:art.source_repository,source_ref:a.source_ref,source_path:a.filename,git_blob_sha:a.git_blob_sha,sha256:a.sha256??null,source_url:a.source};}),
 generated_at:new Date().toISOString()
};
const attempt={
 attempt_id:attemptId,scene_id:sceneId,created_at:new Date().toISOString(),
 status:"prepared",iteration:1,reference_manifest_id:manifest.manifest_id,
 input_lock_sha256:sha(JSON.stringify(lock)),prompt_sha256:sha(prompt),
 provider:null,model:null,output:null,
 lifecycle:"immutable_input_package; generation and evaluation not yet performed",
 human_approval_required:true
};
fs.writeFileSync(path.join(dir,"generation-prompt.md"),prompt+"\n",{flag:"wx"});
fs.writeFileSync(path.join(dir,"reference-lock.json"),JSON.stringify(lock,null,2)+"\n",{flag:"wx"});
fs.writeFileSync(path.join(dir,"attempt.json"),JSON.stringify(attempt,null,2)+"\n",{flag:"wx"});
fs.writeFileSync(path.join(dir,"README.md"),"# Candidate attempt "+attemptId+"\n\nThis directory is an immutable input package. No image has been generated. Store provider outputs and evaluation records as new files; never overwrite these inputs. A prepared attempt is not an approved asset.\n",{flag:"wx"});
console.log("PACKAGE CREATED: "+path.relative(root,dir));
console.log("Scene: "+sceneId);
console.log("Attempt: "+attemptId);
console.log("References pinned: "+lock.references.length);
console.log("Prompt SHA-256: "+attempt.prompt_sha256);
console.log("Status: prepared (no image generated; human approval still required).");
