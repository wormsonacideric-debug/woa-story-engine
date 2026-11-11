#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const root=process.cwd(), errors=[], warnings=[], info=[];
const readJson=(p)=>{try{return JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));}catch(e){errors.push(p+": "+e.message);return null;}};
if(process.argv.includes("--help")||process.argv.includes("-h")){console.log("WOA validator: node scripts/woa-check.mjs [--strict]");process.exit(0);}
const strict=process.argv.includes("--strict");
const reg=readJson("canon/artwork-registry.json"), scenes=readJson("story/scene-registry.json"), timeline=readJson("story/timeline.json");
const ids=new Set();
if(reg&&Array.isArray(reg.assets)){for(const a of reg.assets){
if(!a.asset_id||!/^ASSET-[A-Z0-9-]+$/.test(a.asset_id))errors.push("Invalid asset_id.");
if(a.asset_id&&ids.has(a.asset_id))errors.push("Duplicate asset_id: "+a.asset_id);
if(a.asset_id)ids.add(a.asset_id);
if(!/^[a-fA-F0-9]{64}$/.test(a.sha256||""))errors.push("Invalid SHA-256 for "+(a.asset_id||"unknown"));
if(!["candidate","approved","deprecated","rejected"].includes(a.status))errors.push("Invalid status for "+(a.asset_id||"unknown"));
if(!a.filename)errors.push("Missing filename for "+(a.asset_id||"unknown"));
}info.push("Artwork records: "+reg.assets.length);}
if(scenes&&Array.isArray(scenes.scenes)){const seen=new Set();for(const s of scenes.scenes){
if(!s.scene_id||!/^WOA-[A-Z0-9-]+$/.test(s.scene_id))errors.push("Invalid scene_id.");
if(s.scene_id&&seen.has(s.scene_id))errors.push("Duplicate scene_id: "+s.scene_id);
if(s.scene_id)seen.add(s.scene_id);
for(const k of ["title","action","narrative_purpose"])if(typeof s[k]!=="string"||!s[k].trim())errors.push("Scene "+(s.scene_id||"unknown")+" missing "+k);
if(!Array.isArray(s.characters))errors.push("Scene "+s.scene_id+" characters must be an array.");
if(["ready","in_production","candidate_review","approved"].includes(s.status)&&!s.reference_manifest)errors.push("Scene "+s.scene_id+" lacks reference_manifest.");
if(s.approval?.status==="approved"&&(!s.approval.approved_by||!s.approval.approved_at))errors.push("Scene "+s.scene_id+" lacks approval evidence.");
if(s.characters?.includes("Eric")&&Array.isArray(s.props)&&s.props.some(p=>p?.held_by==="Eric"))errors.push("Eric cannot hold objects in scene "+s.scene_id);
}info.push("Scene records: "+scenes.scenes.length);}
if(timeline&&!Array.isArray(timeline.events))errors.push("timeline.events must be an array.");
if(reg?.assets?.length===0)warnings.push("No canonical artwork registered; image production must remain blocked.");
if(scenes?.scenes?.length===0)warnings.push("No scenes registered; import current approved story before production.");
if(reg?.assets?.some(a=>a.status==="candidate"))warnings.push("Candidate assets must not be used as canonical references.");
if(strict&&warnings.length)errors.push("Strict mode: warnings treated as errors.");
console.log("WOA Story Engine — validation report");
info.forEach(x=>console.log("INFO: "+x));warnings.forEach(x=>console.log("WARN: "+x));errors.forEach(x=>console.log("ERROR: "+x));
console.log("\nResult: "+(errors.length?"FAIL":warnings.length?"PASS WITH WARNINGS":"PASS")+" ("+errors.length+" errors, "+warnings.length+" warnings)");
process.exit(errors.length?1:0);
