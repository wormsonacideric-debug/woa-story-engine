#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const root=process.cwd(), errors=[], warnings=[], info=[];
const readJson=(p)=>{try{return JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));}catch(e){errors.push(p+": "+e.message);return null;}};
if(process.argv.includes("--help")||process.argv.includes("-h")){console.log("WOA validator: node scripts/woa-check.mjs [--strict]");process.exit(0);}
const strict=process.argv.includes("--strict");
const reg=readJson("canon/artwork-registry.json"), scenes=readJson("story/scene-registry.json"), timeline=readJson("story/timeline.json");
const assets=new Map();
if(reg&&Array.isArray(reg.assets)){for(const a of reg.assets){
if(!a.asset_id||!/^ASSET-[A-Z0-9-]+$/.test(a.asset_id))errors.push("Invalid asset_id.");
if(a.asset_id&&assets.has(a.asset_id))errors.push("Duplicate asset_id: "+a.asset_id);
if(a.asset_id)assets.set(a.asset_id,a);
if(a.sha256!==null&&!/^[a-fA-F0-9]{64}$/.test(a.sha256||""))errors.push("Invalid SHA-256 for "+(a.asset_id||"unknown"));
if(!/^[a-fA-F0-9]{40}$/.test(a.git_blob_sha||""))errors.push("Invalid Git blob SHA for "+(a.asset_id||"unknown"));
if(!a.source_ref)errors.push("Missing source_ref for "+(a.asset_id||"unknown"));
if(!["candidate","approved","deprecated","rejected"].includes(a.status))errors.push("Invalid status for "+(a.asset_id||"unknown"));
if(!a.filename)errors.push("Missing filename for "+(a.asset_id||"unknown"));
}info.push("Artwork records: "+reg.assets.length);}
if(scenes&&Array.isArray(scenes.scenes)){const seen=new Set();for(const s of scenes.scenes){
if(!s.scene_id||!/^WOA-[A-Z0-9-]+$/.test(s.scene_id))errors.push("Invalid scene_id.");
if(s.scene_id&&seen.has(s.scene_id))errors.push("Duplicate scene_id: "+s.scene_id);
if(s.scene_id)seen.add(s.scene_id);
for(const k of ["title","action","narrative_purpose"])if(typeof s[k]!=="string"||!s[k].trim())errors.push("Scene "+(s.scene_id||"unknown")+" missing "+k);
if(!Array.isArray(s.characters))errors.push("Scene "+s.scene_id+" characters must be an array.");
if(s.characters?.includes("Eric")&&Array.isArray(s.props)&&s.props.some(p=>p?.held_by==="Eric"))errors.push("Eric cannot hold objects in scene "+s.scene_id);
if(["ready","in_production","candidate_review"].includes(s.status)){
if(!s.reference_manifest){errors.push("Scene "+s.scene_id+" lacks reference_manifest.");continue;}
const mp=s.reference_manifest;
if(typeof mp!=="string"||path.isAbsolute(mp)||mp.split(/[\\/]/).includes("..")){errors.push("Scene "+s.scene_id+" has unsafe reference_manifest path.");continue;}
const manifest=readJson(mp);
if(!manifest)continue;
if(manifest.scene_id!==s.scene_id)errors.push("Manifest "+mp+" belongs to a different scene.");
if(manifest.generation_gate!=="ready")errors.push("Manifest "+mp+" is not marked ready.");
if(!Array.isArray(manifest.references)||manifest.references.length===0)errors.push("Manifest "+mp+" has no bound references.");
for(const ref of manifest.references||[]){
const asset=assets.get(ref.asset_id);
if(!asset)errors.push("Manifest "+mp+" references unknown asset "+ref.asset_id+".");
else{
if(asset.status!=="approved")errors.push("Manifest "+mp+" references non-approved asset "+ref.asset_id+".");
if(ref.sha256&&asset.sha256&&ref.sha256.toLowerCase()!==String(asset.sha256).toLowerCase())errors.push("Manifest "+mp+" SHA-256 mismatch for "+ref.asset_id+".");
if(ref.git_blob_sha&&ref.git_blob_sha.toLowerCase()!==String(asset.git_blob_sha).toLowerCase())errors.push("Manifest "+mp+" Git blob mismatch for "+ref.asset_id+".");
if(ref.required===true&&!ref.sha256&&!ref.git_blob_sha)errors.push("Required reference "+ref.asset_id+" has no bound content hash.");
}
}
for(const id of s.required_assets||[])if(!(manifest.references||[]).some(x=>x.asset_id===id))errors.push("Scene "+s.scene_id+" required asset "+id+" is not bound.");
}
if(s.approval?.status==="approved"&&(!s.approval.approved_by||!s.approval.approved_at))errors.push("Scene "+s.scene_id+" lacks approval evidence.");
}info.push("Scene records: "+scenes.scenes.length);}
if(timeline&&!Array.isArray(timeline.events))errors.push("timeline.events must be an array.");
const characterPaths=["eric","manni","nigel","peter","rufus","tappy"].map(n=>"canon/characters/"+n+".json");
const characterIds=new Set();
for(const p of characterPaths){const c=readJson(p);if(!c)continue;
if(!c.character_id||!c.name)errors.push(p+" missing character identity.");
if(characterIds.has(c.character_id))errors.push("Duplicate character_id: "+c.character_id);
characterIds.add(c.character_id);
for(const id of c.canonical_asset_ids||[]){const a=assets.get(id);if(!a)errors.push(p+" references unknown canonical asset "+id+".");else if(a.status!=="approved")errors.push(p+" references non-approved asset "+id+".");}
}
info.push("Character records: "+characterIds.size);
const locationPaths=["high-scraparral","manchester","festivals"].map(n=>"canon/locations/"+n+".json");
let locationCount=0;
for(const p of locationPaths){const l=readJson(p);if(!l)continue;locationCount++;for(const id of l.canonical_asset_ids||[]){const a=assets.get(id);if(!a)errors.push(p+" references unknown canonical asset "+id+".");else if(a.status!=="approved")errors.push(p+" references non-approved asset "+id+".");}}
info.push("Location records: "+locationCount);
const chapters=readJson("story/chapter-registry.json");
if(chapters){if(!Array.isArray(chapters.chapters))errors.push("chapter-registry.chapters must be an array.");else{if(chapters.chapters.length!==17)errors.push("Expected imported 17-chapter structure; found "+chapters.chapters.length+".");info.push("Chapter records: "+chapters.chapters.length);}}
const knowledge=readJson("story/knowledge-ledger.json");
const knowledgeSceneSources=new Map((scenes?.scenes||[]).map(s=>[s.scene_id,s.source_record]));

if(knowledge){
  if(!Array.isArray(knowledge.rules)||!Array.isArray(knowledge.state_events)||!Array.isArray(knowledge.unresolved))errors.push("Knowledge ledger collections must be arrays.");
  const seenKnowledge=new Set();
  const layers=new Set(knowledge.layers||[]);
  const epistemic=new Set(knowledge.epistemic_status||[]);
  for(const e of knowledge.state_events||[]){
    if(!e.event_id||seenKnowledge.has(e.event_id))errors.push("Duplicate knowledge event: "+(e.event_id||"unknown"));
    seenKnowledge.add(e.event_id);
    if(!e.claim||!e.holder||!e.subject||!e.source_ref||!e.scope)errors.push("Knowledge event "+(e.event_id||"unknown")+" is incomplete.");
    if(!layers.has(e.layer))errors.push("Knowledge event "+e.event_id+" has invalid layer.");
    if(!epistemic.has(e.epistemic_status))errors.push("Knowledge event "+e.event_id+" has invalid epistemic_status.");
    if(e.holder==="author"&&e.epistemic_status!=="author_only")errors.push("Author knowledge event "+e.event_id+" must remain author_only.");
    if(e.holder!=="author"&&e.epistemic_status==="author_only")errors.push("Author-only truth cannot be assigned to character "+e.holder+".");
    if(e.holder!=="author"&&!e.scene_id)errors.push("Character knowledge event "+e.event_id+" requires a scene_id.");
    if(e.scene_id&&!/^WOA-CH[0-9]{2}-SC[0-9]{2}$/.test(e.scene_id))errors.push("Knowledge event "+e.event_id+" has invalid scene_id.");
    if(typeof e.source_ref!=="string"||path.isAbsolute(e.source_ref)||e.source_ref.split(/[\\/]/).includes(".."))errors.push("Knowledge event "+e.event_id+" has unsafe source_ref.");
    else if(!fs.existsSync(path.join(root,e.source_ref)))errors.push("Knowledge event "+e.event_id+" source_ref does not exist.");
    if(e.scene_id&&knowledgeSceneSources.has(e.scene_id)&&knowledgeSceneSources.get(e.scene_id)!==e.source_ref)errors.push("Knowledge event "+e.event_id+" source_ref does not match its scene record.");
    if(e.scene_id&&!knowledgeSceneSources.has(e.scene_id))errors.push("Knowledge event "+e.event_id+" references an unregistered scene.");
  }
  info.push("Knowledge events: "+(knowledge.state_events||[]).length);
}
if(reg?.assets?.length===0)warnings.push("No canonical artwork registered; image production must remain blocked.");
if(scenes?.scenes?.length===0)warnings.push("No scenes registered; import current approved story before production.");
if(scenes?.scenes?.length>0&&!scenes.scenes.some(s=>s.status==="approved"))warnings.push("No scene has human approval for image production; imported website scenes remain source material until reviewed.");
if(scenes?.scenes?.some(s=>s.status==="approved"&&(!s.location_id||!s.reference_manifest)))warnings.push("At least one human-approved scene is still awaiting location/reference binding; production preflight remains mandatory.");
if(reg?.assets?.some(a=>a.status==="candidate"))warnings.push("Candidate assets must not be used as canonical references.");

const beats=readJson("story/beat-registry.json");
if(beats){
  if(!Array.isArray(beats.beats))errors.push("beat-registry.beats must be an array.");
  else{
    const seenBeats=new Set();
    for(const b of beats.beats){
      if(!b.beat_id||!/^WOA-CH[0-9]{2}-A[0-9]{2}-B[0-9]{3}$/.test(b.beat_id))errors.push("Invalid beat_id.");
      if(seenBeats.has(b.beat_id))errors.push("Duplicate beat_id: "+b.beat_id);
      seenBeats.add(b.beat_id);
      if(!Array.isArray(b.source_refs)||b.source_refs.length===0)errors.push("Beat "+b.beat_id+" has no source_refs.");
      if(!["approved_canon","approved_outline","creator_instruction"].includes(b.source_authority))errors.push("Beat "+b.beat_id+" has invalid source_authority.");
      if(!b.dramatic_function||!Array.isArray(b.action_beats)||!Array.isArray(b.unresolved_questions))errors.push("Beat "+b.beat_id+" is missing planning fields.");
    }
    info.push("Story beats: "+beats.beats.length);
  }
}
const continuity=readJson("story/continuity-ledger.json");
if(continuity&&(!Array.isArray(continuity.characters)||!Array.isArray(continuity.locations)||!Array.isArray(continuity.open_questions)))errors.push("Continuity ledger collections must be arrays.");
const props=readJson("story/prop-ledger.json");
if(props){
  if(!Array.isArray(props.props))errors.push("prop-ledger.props must be an array.");
  else{
    const seenProps=new Set();
    for(const p of props.props){
      if(!p.prop_id||seenProps.has(p.prop_id))errors.push("Missing or duplicate prop_id: "+(p.prop_id||"unknown"));
      seenProps.add(p.prop_id);
      if(p.held_by==="Eric")errors.push("Eric cannot hold prop "+(p.prop_id||p.name||"unknown")+".");
      if(!Array.isArray(p.state_events)||p.state_events.length===0)errors.push("Prop "+(p.prop_id||"unknown")+" has no sourced state events.");
      for(const event of p.state_events||[]){
        if(!/^WOA-CH[0-9]{2}-SC[0-9]{2}$/.test(event.scene_id||""))errors.push("Prop "+p.prop_id+" has invalid event scene_id.");
        if(!event.source_ref||!event.event)errors.push("Prop "+p.prop_id+" has an incomplete state event.");
      }
    }
  }
}
const characterAssets=new Map();
for(const p of characterPaths){const c=readJson(p);if(c?.name)characterAssets.set(c.name,c.canonical_asset_ids||[]);}
const locationAssets=new Map();
for(const p of locationPaths){const l=readJson(p);if(l?.location_id)locationAssets.set(l.location_id,l.canonical_asset_ids||[]);}
for(const s of scenes?.scenes||[]){
  if(["ready","in_production","candidate_review"].includes(s.status)){
    if(!s.location_id)errors.push("Production scene "+s.scene_id+" has no location_id.");
    const required=new Set(s.required_assets||[]);
    for(const name of s.characters||[]){
      const ids=characterAssets.get(name);
      if(!ids)errors.push("Production scene "+s.scene_id+" has no character canon record for "+name+".");
      else for(const id of ids)if(!required.has(id))errors.push("Production scene "+s.scene_id+" must require canonical character asset "+id+".");
    }
    const ids=locationAssets.get(s.location_id);
    if(!ids)errors.push("Production scene "+s.scene_id+" has no location canon record for "+s.location_id+".");
    else for(const id of ids)if(!required.has(id))errors.push("Production scene "+s.scene_id+" must require canonical location asset "+id+".");
  }
}


const importedScenes=readJson("story/scene-registry.json");
if(importedScenes){
  if(!Array.isArray(importedScenes.scenes))errors.push("scene-registry.scenes must be an array.");
  else{
    const seenImported=new Set();
    for(const entry of importedScenes.scenes){
      if(!entry.scene_id||seenImported.has(entry.scene_id))errors.push("Missing or duplicate imported scene_id: "+(entry.scene_id||"unknown"));
      seenImported.add(entry.scene_id);
      if(!entry.source_record)errors.push("Imported scene "+entry.scene_id+" has no source_record.");
      else{
        const record=readJson(entry.source_record);
        if(record){
          if(record.scene_id!==entry.scene_id)errors.push("Imported scene record ID mismatch for "+entry.scene_id+".");
          if(record.status!=="source_imported")errors.push("Imported scene "+entry.scene_id+" has unexpected import status.");
          if(!Array.isArray(record.transcript)||record.transcript.length===0)errors.push("Imported scene "+entry.scene_id+" has no transcript.");
          if(!record.source?.commit_blob_sha||!record.source?.path)errors.push("Imported scene "+entry.scene_id+" lacks source provenance.");
          if(record.number!==entry.scene_id.match(/SC([0-9]{2})$/)?.[1]*1)errors.push("Imported scene "+entry.scene_id+" has inconsistent sequence number.");
        }
      }
    }
    info.push("Imported website scenes: "+importedScenes.scenes.length);
    if(importedScenes.scenes.length!==7)warnings.push("Expected seven published opening scenes; found "+importedScenes.scenes.length+".");
  }
}


const sceneState=readJson("story/scene-state-ledger.json");
if(sceneState){
  if(!Array.isArray(sceneState.state_events)||!Array.isArray(sceneState.snapshots)||!Array.isArray(sceneState.unresolved))errors.push("Scene-state ledger collections must be arrays.");
  const seenState=new Set();
  for(const e of sceneState.state_events||[]){
    if(!e.event_id||seenState.has(e.event_id))errors.push("Missing or duplicate scene-state event: "+(e.event_id||"unknown"));
    seenState.add(e.event_id);
    if(!e.scene_id||!e.source_ref||!e.subject||!e.dimension||!e.value||!e.state_scope||!e.epistemic_status||!e.carry_forward)errors.push("Scene-state event "+(e.event_id||"unknown")+" is incomplete.");
    if(e.epistemic_status!=="source_explicit")errors.push("Scene-state event "+e.event_id+" must be source_explicit; inferred state is not permitted.");
    if(typeof e.source_ref!=="string"||path.isAbsolute(e.source_ref)||e.source_ref.split(/[\\/]/).includes(".."))errors.push("Scene-state event "+e.event_id+" has unsafe source_ref.");
    else if(!fs.existsSync(path.join(root,e.source_ref)))errors.push("Scene-state event "+e.event_id+" source_ref does not exist.");
    const recordPath=knowledgeSceneSources.get(e.scene_id);
    if(!recordPath)errors.push("Scene-state event "+e.event_id+" references an unregistered scene.");
    else if(e.source_ref!==recordPath)errors.push("Scene-state event "+e.event_id+" source_ref does not match its scene record.");
    else{
      const record=readJson(recordPath);
      if(!Number.isInteger(e.source_transcript_index)||!record?.transcript?.[e.source_transcript_index])errors.push("Scene-state event "+e.event_id+" has an invalid source_transcript_index.");
    }
    if(e.subject==="Eric"&&/hold|holding|held/i.test(e.value))errors.push("Scene-state event "+e.event_id+" assigns object holding to Eric.");
  }
  info.push("Scene-state events: "+(sceneState.state_events||[]).length);
}


const relationshipGraph=readJson("story/relationship-graph.json");
if(relationshipGraph){
  if(!Array.isArray(relationshipGraph.nodes)||!Array.isArray(relationshipGraph.edges)||!Array.isArray(relationshipGraph.unresolved))errors.push("Relationship graph collections must be arrays.");
  const nodeIds=new Set();
  for(const n of relationshipGraph.nodes||[]){
    if(!n.character_id||nodeIds.has(n.character_id))errors.push("Missing or duplicate relationship node: "+(n.character_id||"unknown"));
    nodeIds.add(n.character_id);
    if(!n.record||!fs.existsSync(path.join(root,n.record)))errors.push("Relationship node "+n.character_id+" has no valid character record.");
    else{
      const c=readJson(n.record);
      if(c?.character_id!==n.character_id)errors.push("Relationship node "+n.character_id+" does not match its character record.");
    }
  }
  const edgeIds=new Set();
  for(const e of relationshipGraph.edges||[]){
    if(!e.edge_id||edgeIds.has(e.edge_id))errors.push("Missing or duplicate relationship edge: "+(e.edge_id||"unknown"));
    edgeIds.add(e.edge_id);
    if(!nodeIds.has(e.from)||!nodeIds.has(e.to))errors.push("Relationship edge "+e.edge_id+" references an unknown character.");
    if(!["mutual","directed"].includes(e.direction))errors.push("Relationship edge "+e.edge_id+" has invalid direction.");
    if(!e.source_record||!fs.existsSync(path.join(root,e.source_record)))errors.push("Relationship edge "+e.edge_id+" has no valid source record.");
    else{
      const source=readJson(e.source_record);
      const target=(source?.relationships||[]).some(r=>r.character_id===e.to&&r.type===e.type);
      if(!target)errors.push("Relationship edge "+e.edge_id+" is not supported by its character record.");
    }
  }
  info.push("Relationship edges: "+(relationshipGraph.edges||[]).length);
}

if(strict&&warnings.length)errors.push("Strict mode: warnings treated as errors.");
console.log("WOA Story Engine — validation report");
info.forEach(x=>console.log("INFO: "+x));warnings.forEach(x=>console.log("WARN: "+x));errors.forEach(x=>console.log("ERROR: "+x));
console.log("\\nResult: "+(errors.length?"FAIL":warnings.length?"PASS WITH WARNINGS":"PASS")+" ("+errors.length+" errors, "+warnings.length+" warnings)");
process.exit(errors.length?1:0);
