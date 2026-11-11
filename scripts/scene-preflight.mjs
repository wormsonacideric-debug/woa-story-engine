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
 if(s.status!=="approved")reasons.push("scene is not human-approved for production");
 if(!s.location_id)reasons.push("no location_id is bound");
 for(const name of s.characters||[]){
  const ids=chars.get(name);
  if(!ids){reasons.push("no canonical character record: "+name);continue;}
  for(const id of ids)if(!assetById.has(id)||assetById.get(id).status!=="approved")reasons.push("character asset not approved: "+id);
 }
 if(s.location_id){
  const ids=locations.get(s.location_id);
  if(!ids)reasons.push("no canonical location record: "+s.location_id);
  else for(const id of ids)if(!assetById.has(id)||assetById.get(id).status!=="approved")reasons.push("location asset not approved: "+id);
 }
 if(!s.reference_manifest)reasons.push("no reference manifest bound");
 if(reasons.length){blocked++;console.log("BLOCKED "+s.scene_id+" — "+reasons.join("; "));}
 else console.log("READY "+s.scene_id);
}
console.log("Summary: "+(scenes.length-blocked)+" ready, "+blocked+" blocked, "+scenes.length+" total.");
if(blocked)process.exitCode=1;
