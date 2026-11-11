#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root=process.cwd();
const read=(p)=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const hash=(p)=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const safe=(p)=>typeof p==="string"&&!path.isAbsolute(p)&&!p.split(/[\\/]/).includes("..");
function args(argv){
 const out={}; for(let i=0;i<argv.length;i++){const k=argv[i];if(k.startsWith("--"))out[k.slice(2)]=argv[++i];}
 return out;
}
export function createCandidatePackage({rootDir,sceneId,prompt,provider,model,attemptId,createdAt=new Date().toISOString()}){
 const readAt=(p)=>JSON.parse(fs.readFileSync(path.join(rootDir,p),"utf8"));
 const scenes=readAt("story/scene-registry.json").scenes;
 const scene=scenes.find(s=>s.scene_id===sceneId);
 if(!scene)throw new Error("Unknown scene_id: "+sceneId);
 if(scene.status!=="approved"||scene.approval?.status!=="approved"||!scene.approval.approved_by||!scene.approval.approved_at)throw new Error("Scene is not human-approved with recorded approver and date; candidate package generation is blocked.");
 if(!scene.location_id)throw new Error("Scene has no approved location binding.");
 if(!safe(scene.source_record)||!fs.existsSync(path.join(rootDir,scene.source_record)))throw new Error("Scene source record is missing or unsafe.");
 if(!scene.reference_manifest||!safe(scene.reference_manifest))throw new Error("Scene has no safe reference manifest.");
 const manifest=readAt(scene.reference_manifest);
 if(manifest.scene_id!==sceneId||manifest.generation_gate!=="ready"||!Array.isArray(manifest.references)||!manifest.references.length)throw new Error("Reference manifest is not ready for this scene.");
 const artwork=readAt("canon/artwork-registry.json");
 const assetMap=new Map(artwork.assets.map(a=>[a.asset_id,a]));
 const required=new Set(scene.required_assets||[]);
 const locationDir=path.join(rootDir,"canon","locations");
 const locationFile=fs.readdirSync(locationDir).filter(x=>x.endsWith(".json")).map(x=>"canon/locations/"+x).find(p=>readAt(p).location_id===scene.location_id);
 if(!locationFile)throw new Error("Canonical location record not found: "+scene.location_id);
 const locationRecord=readAt(locationFile);
 for(const id of locationRecord.canonical_asset_ids||[])required.add(id);
 for(const id of required)if(!manifest.references.some(r=>r.asset_id===id))throw new Error("Manifest omits required asset: "+id);
 const references=[];
 const seenReferences=new Set();
 for(const r of manifest.references){
  if(!r.asset_id||seenReferences.has(r.asset_id))throw new Error("Reference manifest contains a missing or duplicate asset ID.");
  seenReferences.add(r.asset_id);
  if(typeof r.purpose!=="string"||typeof r.required!=="boolean")throw new Error("Reference entry is missing purpose or required flag: "+r.asset_id);
  const asset=assetMap.get(r.asset_id);
  if(!asset||asset.status!=="approved")throw new Error("Reference asset is missing or not approved: "+r.asset_id);
  if(!/^[a-f0-9]{40}$/i.test(asset.git_blob_sha||""))throw new Error("Reference asset has no pinned Git blob SHA: "+r.asset_id);
  if(r.git_blob_sha!==asset.git_blob_sha)throw new Error("Manifest Git blob SHA mismatch: "+r.asset_id);
  references.push({asset_id:r.asset_id,purpose:r.purpose,required:r.required,git_blob_sha:r.git_blob_sha,source:asset.source,source_ref:asset.source_ref,sha256:asset.sha256??null});
 }
 if(!prompt?.trim())throw new Error("A non-empty candidate prompt is required.");
 if(!provider?.trim()||!model?.trim())throw new Error("Provider and model are required.");
 const id=attemptId||("ATT-"+sceneId.replace(/[^A-Z0-9]/g,"-")+"-"+createdAt.replace(/[^0-9]/g,"").slice(0,14)+"-"+crypto.randomBytes(3).toString("hex"));
 if(!/^[A-Za-z0-9][A-Za-z0-9._-]{2,100}$/.test(id))throw new Error("Invalid attempt ID.");
 const characterFiles=[];
 for(const name of scene.characters||[]){
  const dir=path.join(rootDir,"canon","characters");
  const file=fs.readdirSync(dir).filter(x=>x.endsWith(".json")).map(x=>"canon/characters/"+x).find(p=>readAt(p).name===name);
  if(!file)throw new Error("Canonical character record not found: "+name);
  characterFiles.push({name,source:file});
 }
 const workDir=path.join(rootDir,"work","candidates",sceneId,id);
 fs.mkdirSync(path.dirname(workDir),{recursive:true});
 fs.mkdirSync(workDir,{recursive:false});
 const copyJson=(src,name)=>{const from=path.join(rootDir,src);const dest=path.join(workDir,name);fs.copyFileSync(from,dest);return {path:name,sha256:hash(dest)};};
 const snapshot={scene:copyJson(scene.source_record,"scene-source.json"),scene_plan:copyJson("story/scene-registry.json","scene-registry-snapshot.json"),reference_manifest:copyJson(scene.reference_manifest,"reference-manifest.json"),artwork_registry:copyJson("canon/artwork-registry.json","artwork-registry-snapshot.json"),knowledge_ledger:copyJson("story/knowledge-ledger.json","knowledge-ledger-snapshot.json"),physical_state_ledger:copyJson("story/scene-state-ledger.json","scene-state-ledger-snapshot.json"),prop_ledger:copyJson("story/prop-ledger.json","prop-ledger-snapshot.json"),relationship_graph:copyJson("story/relationship-graph.json","relationship-graph-snapshot.json"),continuity_ledger:copyJson("story/continuity-ledger.json","continuity-ledger-snapshot.json"),timeline:copyJson("story/timeline.json","timeline-snapshot.json")};
 const characterSnapshots=[];
 for(const name of scene.characters||[]){const file=name.toLowerCase().replace(/[^a-z0-9-]/g,"")+".json";const p="canon/characters/"+file;if(!safe(p)||!fs.existsSync(path.join(rootDir,p)))throw new Error("Missing canonical character record for "+name);characterSnapshots.push(copyJson(p,"character-"+name.toLowerCase()+".json"));}
 snapshot.characters=characterSnapshots;
 snapshot.location=copyJson(locationFile,"location-"+scene.location_id.toLowerCase()+".json");
 const pkg={package_version:"1.0.0",attempt_id:id,scene_id:sceneId,created_at:createdAt,immutable:true,stage:"candidate_input_package",human_approval_required:true,scene:{title:scene.title,characters:scene.characters,action:scene.action,narrative_purpose:scene.narrative_purpose,must_not_include:scene.must_not_include,required_assets:[...required]},prompt:{text:prompt.trim(),provider:provider.trim(),model:model.trim()},references,snapshots:snapshot,output:{status:"not_generated",path:null,sha256:null},evaluation:{status:"not_evaluated",evaluation_ids:[]},approval:{status:"pending",approved_by:null,approved_at:null},iteration:1};
 fs.writeFileSync(path.join(workDir,"candidate-package.json"),JSON.stringify(pkg,null,2)+"\n",{flag:"wx"});
 fs.writeFileSync(path.join(workDir,"IMMUTABLE.txt"),"This attempt is immutable. Never overwrite or replace files in this directory. Corrections create a new attempt directory and retain this package.\n",{flag:"wx"});
 return {attemptId:id,directory:path.relative(rootDir,workDir),packagePath:path.relative(rootDir,path.join(workDir,"candidate-package.json"))};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const a=args(process.argv.slice(2));
 if(a.help){console.log("Usage: node scripts/candidate-package.mjs --scene WOA-CH01-SC01 --prompt-file path --provider name --model name [--attempt-id id]");process.exit(0);}
 try{
  if(!a.scene||!a["prompt-file"]||!a.provider||!a.model)throw new Error("Required: --scene, --prompt-file, --provider, --model.");
  if(!safe(a["prompt-file"]))throw new Error("Unsafe prompt file path.");
  const result=createCandidatePackage({rootDir:root,sceneId:a.scene,prompt:fs.readFileSync(path.join(root,a["prompt-file"]),"utf8"),provider:a.provider,model:a.model,attemptId:a["attempt-id"]});
  console.log("CANDIDATE INPUT PACKAGE CREATED");console.log(result.directory);console.log("No image was generated. Human approval remains required.");
 }catch(e){console.error("BLOCKED: "+e.message);process.exitCode=1;}
}
