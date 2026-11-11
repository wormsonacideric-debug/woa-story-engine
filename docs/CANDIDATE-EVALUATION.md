# Candidate evaluation records

Evaluation is a separate, evidence-bearing stage after an image candidate exists. The evaluator does not certify canon and cannot approve an asset.

## Record an evaluation

Prepare a JSON input file containing criterion results. Each criterion has a stable `criterion_id`, `status` (`pass`, `fail`, or `unknown`), confidence from 0 to 1, evidence strings, reference IDs, and a blocking flag. UNKNOWN is not PASS. Use the criteria in `evaluation/IMAGE-EVALUATION-RUBRIC.md`; do not omit a mandatory criterion merely because evidence is unavailable.

Example input:
```json
{
  "decision": "needs_correction",
  "criteria": [
    {
      "criterion_id": "character_identity",
      "status": "fail",
      "confidence": 0.94,
      "evidence": ["The hat shape differs from the approved Nigel reference."],
      "reference_ids": ["ASSET-NIGEL-01"],
      "blocking": true
    }
  ],
  "correction_guidance": ["Re-align the hat to the bound canonical reference."]
}
```

Run:
```sh
node scripts/evaluate-candidate.mjs \
  --attempt-dir work/candidates/SCENE/ATTEMPT \
  --candidate candidate.png \
  --evaluation-file work/evaluation-input.json \
  --evaluator evaluator-name \
  --evaluator-version 1.0 \
  --rubric-version 1.0.0
```

The candidate file must already exist inside the attempt directory. The command records SHA-256 hashes for both the exact candidate package and image, verifies decision consistency, and appends a new evaluation record under `evaluations/`. It refuses path traversal and record overwrite.

## Decision semantics

- `pass`: every evaluated criterion is PASS; this is an evaluation result, not canon approval.
- `needs_correction`: at least one failure or unresolved issue needs a new candidate.
- `reject`: the candidate should not continue.
- `inconclusive`: evidence is insufficient to make a reliable judgement.

A blocking failure requires `needs_correction` or `reject`. UNKNOWN can never be treated as PASS. Evaluations are append-only. A correction is a new attempt/package; do not overwrite the original candidate, package, or evaluation. Human approval remains a distinct later action and is always pending in this record.

The evaluator contract is provider-neutral. It does not generate images, invoke a vision model, edit artwork, or update canonical asset records.
