#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const hashFile = p => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const safeRelative = p => typeof p === "string" && p.length > 0 && !path.isAbsolute(p) && !p.split(/[\\\\/]/).includes("..");
const inside = (base, target) => { const rel=path.relative(base,target); return rel !== "" && !rel.startsWith(".."+path.sep) && rel !== ".." && !path.isAbsolute(rel); };
function parseArgs(argv){const o={};for(let i=0;i<argv.length;i++){if(argv[i].startsWith("--"))o[argv[i].slice(2)]=argv[++i];}return o;}
export function validateEvaluation({attemptDir,candidatePath,evaluation,evaluator,evaluatorVersion,rubricVersion,evaluatedAt=new Date().toISOString(),recordName="evaluation-01.json"}){
 const base=path.resolve(attemptDir);
 const packagePath=path.join(base,"candidate-package.json");
 if(!fs.existsSync(packagePath))throw new Error("Candidate package not found.");
 const pkg=JSON.parse(fs.readFileSync(packagePath,"utf8"));
 if(pkg.immutable!==true||pkg.human_approval_required!==true||pkg.stage!=="candidate_input_package")throw new Error("Input package is not a valid immutable candidate package.");
 if(!safeRelative(candidatePath))throw new Error("Candidate output path must be a safe relative path inside the attempt directory.");
 const candidate=path.resolve(base,candidatePath);
 if(!inside(base,candidate)||!fs.existsSync(candidate)||!fs.statSync(candidate).isFile())throw new Error("Candidate output must be an existing file inside the attempt directory.");
 if(!Array.isArray(evaluation.criteria)||evaluation.criteria.length===0)throw new Error("Evaluation must include criterion results.");
 const ids=new Set();
 for(const c of evaluation.criteria){
  if(!c.criterion_id||ids.has(c.criterion_id))throw new Error("Criterion IDs must be present and unique.");
  ids.add(c.criterion_id);
  if(!["pass","fail","unknown"].includes(c.status))throw new Error("Criterion status must be pass, fail or unknown: "+c.criterion_id);
  if(typeof c.confidence!=="number"||c.confidence<0||c.confidence>1)throw new Error("Criterion confidence must be between 0 and 1: "+c.criterion_id);
  if(!Array.isArray(c.evidence)||!Array.isArray(c.reference_ids))throw new Error("Each criterion needs evidence and reference_ids arrays.");
  if(c.status!=="pass"&&c.evidence.length===0)throw new Error("Fail/unknown criteria require evidence or an explicit reason: "+c.criterion_id);
 }
 const blockingFails=evaluation.criteria.filter(c=>c.blocking===true&&c.status==="fail");
 const unknowns=evaluation.criteria.filter(c=>c.status==="unknown");
 const fails=evaluation.criteria.filter(c=>c.status==="fail");
 const decision=evaluation.decision;
 if(!["pass","needs_correction","reject","inconclusive"].includes(decision))throw new Error("Invalid evaluation decision.");
 if(decision==="pass"&&(fails.length||unknowns.length))throw new Error("A candidate with FAIL or UNKNOWN criteria cannot pass.");
 if(blockingFails.length&&decision!=="needs_correction"&&decision!=="reject")throw new Error("Blocking failures require needs_correction or reject.");
 if(unknowns.length&&decision!=="inconclusive"&&decision!=="needs_correction"&&decision!=="reject")throw new Error("UNKNOWN criteria cannot pass.");
 if(!evaluator?.trim()||!evaluatorVersion?.trim()||!rubricVersion?.trim())throw new Error("Evaluator, evaluator version and rubric version are required.");
 if(!Number.isFinite(Date.parse(evaluatedAt)))throw new Error("evaluatedAt must be a valid date-time.");
 const output={schema_version:"1.0.0",evaluation_id:recordName.replace(/\\.json$/,""),attempt_id:pkg.attempt_id,scene_id:pkg.scene_id,package_sha256:hashFile(packagePath),candidate:{path:candidatePath,sha256:hashFile(candidate)},evaluator:{name:evaluator.trim(),version:evaluatorVersion.trim()},rubric_version:rubricVersion.trim(),evaluated_at:evaluatedAt,criteria:evaluation.criteria,summary:{pass:evaluation.criteria.filter(c=>c.status==="pass").length,fail:fails.length,unknown:unknowns.length,blocking_failures:blockingFails.length},decision,correction_guidance:evaluation.correction_guidance??[],human_approval_required:true,approval_status:"pending"};
 const outDir=path.join(base,"evaluations");
 fs.mkdirSync(outDir,{recursive:true});
 const outPath=path.join(outDir,recordName);
 if(fs.existsSync(outPath))throw new Error("Evaluation records are append-only; this record already exists.");
 if(!/^[A-Za-z0-9][A-Za-z0-9._-]*\\.json$/.test(recordName))throw new Error("Unsafe evaluation record name.");
 fs.writeFileSync(outPath,JSON.stringify(output,null,2)+"\\n",{flag:"wx"});
 return {evaluationPath:path.relative(base,outPath),evaluationId:output.evaluation_id,decision,packageSha256:output.package_sha256,candidateSha256:output.candidate.sha256};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const a=parseArgs(process.argv.slice(2));
 if(a.help){console.log("Usage: node scripts/evaluate-candidate.mjs --attempt-dir work/candidates/SCENE/ATTEMPT --candidate candidate.png --evaluation-file evaluation-input.json --evaluator name --evaluator-version version --rubric-version version [--record-name evaluation-01.json]");process.exit(0);}
 try{
  for(const k of ["attempt-dir","candidate","evaluation-file","evaluator","evaluator-version","rubric-version"])if(!a[k])throw new Error("Missing required --"+k+".");
  const dir=path.resolve(a["attempt-dir"]);
  const evaluation=JSON.parse(fs.readFileSync(path.resolve(a["evaluation-file"]),"utf8"));
  const result=validateEvaluation({attemptDir:dir,candidatePath:a.candidate,evaluation,evaluator:a.evaluator,evaluatorVersion:a["evaluator-version"],rubricVersion:a["rubric-version"],recordName:a["record-name"]||"evaluation-01.json"});
  console.log("EVALUATION RECORD VALIDATED AND APPENDED");console.log(JSON.stringify(result,null,2));console.log("Human approval remains pending; no canonical asset was changed.");
 }catch(e){console.error("BLOCKED: "+e.message);process.exitCode=1;}
}
