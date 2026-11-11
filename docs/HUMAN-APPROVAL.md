# Human approval decisions

Evaluation is not approval. This command records an explicit human decision against one exact evaluation, package and candidate. Approval is allowed only when the evaluation decision is `pass`; rejection may be recorded regardless of evaluation outcome.

```sh
node scripts/record-human-decision.mjs \
  --attempt-dir work/candidates/SCENE/ATTEMPT \
  --evaluation evaluations/evaluation-01.json \
  --decision approve \
  --approver "Human editor" \
  --reason "Reviewed against the approved canon and scene direction."
```

The record includes the evaluation, package and candidate hashes, named approver, timestamp and rationale. Records are append-only. The command refuses changed/missing files, mismatched attempt IDs, approval of non-PASS evaluations, or missing rationale.

An approval decision does **not** write to the canonical artwork registry, publish the image, or make it an official reference. It records that a human approved this exact candidate; a separate asset-ingestion stage must verify provenance, store the image and update the canonical registry through its own controlled workflow.
