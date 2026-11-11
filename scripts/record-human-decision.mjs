#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
const hash=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const safe=p=>typeof p==="string"&&p.length>0&&!path.isAbsolute(p)&&!p.split(/[\\\\/]/).includes("..");
function args(argv){const o={};for(let i=0;i<argv.length;i++)if(argv[i].startsWith("--"))o[argv[i].slice(2)]=argv[++i];return o;}
export function recordHumanDecision({attemptDir,evaluationPath,decision,approver,reason,decidedAt=new Date().toISOString(),approvalId}){
 const base=path.resolve(attemptDir),realBase=fs.realpathSync(base),pkgPath=path.join(base,"candidate-package.json");
 if(!fs.existsSync(pkgPath)||!fs.realpathSync(pkgPath).startsWith(realBase+path.sep))throw new Error("Candidate package missing or outside attempt directory.");
 const pkg=JSON.parse(fs.readFileSync(pkgPath,"utf8"));
 if(pkg.immutable!==true||pkg.human_approval_required!==true)throw new Error("Candidate package is not eligible for human decision.");
 if(!safe(evaluationPath))throw new Error("Unsafe evaluation path.");
 const evalRoot=path.join(base,"evaluations"),evalFile=path.resolve(base,evaluationPath);
 if(!evalFile.startsWith(evalRoot+path.sep)||!fs.existsSync(evalFile)||!fs.realpathSync(evalFile).startsWith(fs.realpathSync(evalRoot)+path.sep))throw new Error("Evaluation must exist inside this attempt.");
 const ev=JSON.parse(fs.readFileSync(evalFile,"utf8"));
 if(ev.attempt_id!==pkg.attempt_id||ev.scene_id!==pkg.scene_id)throw new Error("Evaluation does not belong to this attempt.");
 if(!["approve","reject"].includes(decision))throw new Error("Decision must be approve or reject.");
 if(decision==="approve"&&ev.decision!=="pass")throw new Error("Human approval requires a PASS evaluation.");
 if(ev.candidate?.path==null||!safe(ev.candidate.path))throw new Error("Evaluation has no safe candidate path.");
 const candidate=path.resolve(base,ev.candidate.path);
 if(!candidate.startsWith(realBase+path.sep)||!fs.existsSync(candidate)||!fs.realpathSync(candidate).startsWith(realBase+path.sep)||hash(candidate)!==ev.candidate.sha256)throw new Error("Candidate file is missing or its hash differs from the evaluated candidate.");
 if(hash(pkgPath)!==ev.package_sha256)throw new Error("Candidate package hash differs from the evaluated package.");
 if(!approver?.trim()||!reason?.trim())throw new Error("A named human approver and decision rationale are required.");
 if(!Number.isFinite(Date.parse(decidedAt)))throw new Error("Decision timestamp must be valid.");
 const id=approvalId||"DEC-"+pkg.attempt_id+"-"+crypto.randomBytes(3).toString("hex");
 if(!/^[A-Za-z0-9][A-Za-z0-9._-]{2,100}$/.test(id))throw new Error("Invalid decision ID.");
 const dir=path.join(base,"approvals");fs.mkdirSync(dir,{recursive:true});
 const file=path.join(dir,id+".json");if(fs.existsSync(file))throw new Error("Approval decisions are append-only; this decision already exists.");
 const record={schema_version:"1.0.0",decision_id:id,attempt_id:pkg.attempt_id,scene_id:pkg.scene_id,evaluation_id:ev.evaluation_id,evaluation_sha256:hash(evalFile),package_sha256:hash(pkgPath),candidate:{path:ev.candidate.path,sha256:hash(candidate)},decision,approver:approver.trim(),decided_at:decidedAt,rationale:reason.trim(),canonical_asset_created:false,canonical_asset_status:"not_ingested"};
 fs.writeFileSync(file,JSON.stringify(record,null,2)+String.fromCharCode(10),{flag:"wx"});
 return {decisionId:id,path:path.relative(base,file),decision,canonicalAssetCreated:false};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const a=args(process.argv.slice(2));
 if(a.help){console.log("Usage: node scripts/record-human-decision.mjs --attempt-dir DIR --evaluation evaluations/evaluation-01.json --decision approve|reject --approver NAME --reason TEXT [--decision-id ID]");process.exit(0);}
 try{for(const k of ["attempt-dir","evaluation","decision","approver","reason"])if(!a[k])throw new Error("Missing required --"+k+".");const r=recordHumanDecision({attemptDir:a["attempt-dir"],evaluationPath:a.evaluation,decision:a.decision,approver:a.approver,reason:a.reason,approvalId:a["decision-id"]});console.log("HUMAN DECISION RECORDED");console.log(JSON.stringify(r,null,2));console.log("Canonical artwork registry was not modified.");}
 catch(e){console.error("BLOCKED: "+e.message);process.exitCode=1;}
}
