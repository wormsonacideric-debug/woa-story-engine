# Bounded correction attempts

A correction is a new immutable attempt, never an edit to the previous candidate or package. The controller accepts only an evaluation record with decision `needs_correction`, matching the parent attempt and scene, and containing actionable correction guidance.

## Run

```sh
node scripts/create-correction-attempt.mjs \
  --attempt-dir work/candidates/SCENE/ATTEMPT \
  --evaluation evaluations/evaluation-01.json \
  --max-attempts 3
```

The default limit is three total candidate attempts (initial plus at most two corrections). The controller verifies every parent snapshot hash, copies the exact snapshots, records the parent attempt/evaluation/candidate hashes, and appends the supplied correction guidance to the next prompt. The new package resets output/evaluation/approval state. It does not generate an image or approve canon.

Only `needs_correction` creates a new attempt. `reject`, `inconclusive`, and `pass` stop this correction path. A limit breach stops and requires human review; no automatic reset or retry loop exists. A fresh attempt ID is mandatory and existing directories are never overwritten.
