#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const hashFile=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const safe=p=>typeof p==="string"&&p.length>0&&!path.isAbsolute(p)&&!p.split(/[\\\\/]/).includes("..");
function parseArgs(argv){const o={};for(let i=0;i<argv.length;i++)if(argv[i].startsWith("--"))o[argv[i].slice(2)]=argv[++i];return o;}
export function createCorrectionAttempt({attemptDir,evaluationPath,correctionId,createdAt=new Date().toISOString(),maxAttempts=3}){
 const parent=path.resolve(attemptDir),realParent=fs.realpathSync(parent),pkgPath=path.join(parent,"candidate-package.json");
 if(!fs.existsSync(pkgPath))throw new Error("Parent candidate package not found.");
 const pkg=JSON.parse(fs.readFileSync(pkgPath,"utf8"));
 if(pkg.immutable!==true||pkg.stage!=="candidate_input_package")throw new Error("Parent package is not immutable.");
 if(!safe(evaluationPath))throw new Error("Unsafe evaluation record path.");
 const evalPath=path.resolve(parent,evaluationPath),evalRoot=path.join(parent,"evaluations");
 if(!evalPath.startsWith(evalRoot+path.sep)||!fs.existsSync(evalPath)||!fs.realpathSync(evalPath).startsWith(fs.realpathSync(evalRoot)+path.sep))throw new Error("Evaluation record must exist inside the parent attempt evaluations directory.");
 const evaluation=JSON.parse(fs.readFileSync(evalPath,"utf8"));
 if(evaluation.attempt_id!==pkg.attempt_id||evaluation.scene_id!==pkg.scene_id)throw new Error("Evaluation does not belong to this candidate attempt.");
 if(evaluation.decision!=="needs_correction")throw new Error("Only a needs_correction decision can create a correction attempt.");
 const current=pkg.iteration||1;
 if(!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>10)throw new Error("maxAttempts must be between 1 and 10.");
 if(current>=maxAttempts)throw new Error("Correction limit reached; human review is required before any further attempt.");
 const id=correctionId||("ATT-"+pkg.scene_id.replace(/[^A-Z0-9]/g,"-")+"-R"+(current+1)+"-"+crypto.randomBytes(3).toString("hex"));
 if(!/^[A-Za-z0-9][A-Za-z0-9._-]{2,100}$/.test(id))throw new Error("Invalid correction attempt ID.");
 const sceneDir=path.dirname(parent),dest=path.join(sceneDir,id);
 fs.mkdirSync(dest,{recursive:false});
 try{
  const snapshots={};
  const copySnapshot=(key,item)=>{if(!item||!safe(item.path))throw new Error("Invalid snapshot path: "+key);const source=path.join(parent,item.path);if(!fs.existsSync(source)||!fs.realpathSync(source).startsWith(realParent+path.sep)||hashFile(source)!==item.sha256)throw new Error("Parent snapshot integrity check failed: "+key);const target=path.join(dest,item.path);fs.mkdirSync(path.dirname(target),{recursive:true});if(fs.existsSync(target))throw new Error("Correction snapshot target already exists: "+key);fs.copyFileSync(source,target);snapshots[key]={...item};};
  for(const [key,value] of Object.entries(pkg.snapshots)){if(Array.isArray(value))snapshots[key]=value.map((item,i)=>{const k=key+"-"+i;copySnapshot(k,item);return {...item};});else copySnapshot(key,value);}
  const guidance=evaluation.correction_guidance||[];
  if(!guidance.length)throw new Error("Correction evaluation has no actionable correction_guidance.");
  const next={...pkg,attempt_id:id,created_at:createdAt,iteration:current+1,parent_attempt:{attempt_id:pkg.attempt_id,evaluation_id:evaluation.evaluation_id,evaluation_sha256:hashFile(evalPath),candidate_sha256:evaluation.candidate?.sha256},prompt:{...pkg.prompt,text:pkg.prompt.text+String.fromCharCode(10,10)+"CORRECTION INSTRUCTIONS (human/evaluator supplied):"+String.fromCharCode(10)+guidance.map(x=>"- "+x).join(String.fromCharCode(10))},snapshots,output:{status:"not_generated",path:null,sha256:null},evaluation:{status:"not_evaluated",evaluation_ids:[]},approval:{status:"pending",approved_by:null,approved_at:null}};
  fs.writeFileSync(path.join(dest,"candidate-package.json"),JSON.stringify(next,null,2)+String.fromCharCode(10),{flag:"wx"});
  fs.writeFileSync(path.join(dest,"CORRECTION.txt"),"Correction attempt. Parent attempt and evaluation are hash-linked. Do not overwrite this folder. Human approval remains mandatory.\\n",{flag:"wx"});
  return {attemptId:id,directory:path.relative(path.dirname(sceneDir),dest),iteration:next.iteration,maxAttempts,parentAttempt:pkg.attempt_id,evaluationId:evaluation.evaluation_id};
 }catch(e){fs.rmSync(dest,{recursive:true,force:true});throw e;}
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const a=parseArgs(process.argv.slice(2));
 if(a.help){console.log("Usage: node scripts/create-correction-attempt.mjs --attempt-dir work/candidates/SCENE/ATTEMPT --evaluation evaluations/evaluation-01.json [--max-attempts 3] [--correction-id ID]");process.exit(0);}
 try{if(!a["attempt-dir"]||!a.evaluation)throw new Error("Required: --attempt-dir and --evaluation.");const result=createCorrectionAttempt({attemptDir:a["attempt-dir"],evaluationPath:a.evaluation,correctionId:a["correction-id"],maxAttempts:a["max-attempts"]?Number(a["max-attempts"]):3});console.log("BOUNDED CORRECTION ATTEMPT CREATED");console.log(JSON.stringify(result,null,2));console.log("No image was generated; previous attempts remain unchanged.");}
 catch(e){console.error("BLOCKED: "+e.message);process.exitCode=1;}
}
