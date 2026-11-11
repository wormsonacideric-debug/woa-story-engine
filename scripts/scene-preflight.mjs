#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const read=(p)=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const scenes=read("story/scene-registry.json").scenes;
const assets=read("canon/artwork-registry.json").assets;
const assetById=new Map(assets.map(a=>[a.asset_id,a]));
const chars=new Map();
for(const file of fs.readdirSync(path.join(root,"canon/characters")).filter(x=>x.endsWith(".json"))){
 const c=read("canon/characters/"+file); chars.set(c.name,c.canonical_asset_ids||[]);
}
const locations=new Map();
for(const file of fs.readdirSync(path.join(root,"canon/locations")).filter(x=>x.endsWith(".json"))){
 const l=read("canon/locations/"+file); locations.set(l.location_id,l.canonical_asset_ids||[]);
}
let blocked=0;
console.log("WOA scene production preflight");
for(const s of scenes){
 const reasons=[];
 const required=new Set(s.required_assets||[]);
 if(s.status!=="approved")reasons.push("scene is not human-approved for production");
 if(!s.location_id)reasons.push("no location_id is bound");
 for(const name of s.characters||[]){
  const ids=chars.get(name);
  if(!ids){reasons.push("no canonical character record: "+name);continue;}
  for(const id of ids){if(!required.has(id))reasons.push("required_assets omits character asset: "+id);if(!assetById.has(id)||assetById.get(id).status!=="approved")reasons.push("character asset not approved: "+id);}
 }
 if(s.location_id){
  const ids=locations.get(s.location_id);
  if(!ids)reasons.push("no canonical location record: "+s.location_id);
  else for(const id of ids){if(!required.has(id))reasons.push("required_assets omits location asset: "+id);if(!assetById.has(id)||assetById.get(id).status!=="approved")reasons.push("location asset not approved: "+id);}
 }
 if(!s.reference_manifest)reasons.push("no reference manifest bound");
 else if(typeof s.reference_manifest!=="string"||path.isAbsolute(s.reference_manifest)||s.reference_manifest.split(/[\\/]/).includes(".."))reasons.push("unsafe reference manifest path");
 else{
  try{
   const manifest=read(s.reference_manifest);
   if(manifest.scene_id!==s.scene_id)reasons.push("reference manifest scene_id mismatch");
   if(manifest.generation_gate!=="ready")reasons.push("reference manifest generation gate is not ready");
   const bound=new Set((manifest.references||[]).map(x=>x.asset_id));
   if(bound.size===0)reasons.push("reference manifest has no bound assets");
   for(const id of required)if(!bound.has(id))reasons.push("reference manifest omits required asset: "+id);
   for(const id of bound)if(!assetById.has(id)||assetById.get(id).status!=="approved")reasons.push("manifest asset is not approved: "+id);
  }catch(e){reasons.push("reference manifest cannot be read: "+e.message);}
 }
 if(reasons.length){blocked++;console.log("BLOCKED "+s.scene_id+" — "+reasons.join("; "));}
 else console.log("READY "+s.scene_id);
}
console.log("Summary: "+(scenes.length-blocked)+" ready, "+blocked+" blocked, "+scenes.length+" total.");
if(blocked)process.exitCode=1;
