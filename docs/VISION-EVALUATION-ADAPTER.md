# Vision evaluation adapter

This adapter bridges the immutable candidate package to a vision-capable evaluator without coupling the engine to one vendor SDK or API key. It creates a hash-bound task packet, then ingests a structured response from the selected vision model into the existing evaluation validator.

## Prepare a task

```sh
node scripts/vision-evaluation-adapter.mjs --prepare \
  --attempt-dir work/candidates/SCENE/ATTEMPT \
  --candidate candidate.png
```

The immutable task packet is written to `vision-tasks/`. It contains the exact candidate/package SHA-256 hashes, scene brief, prompt context, required reference IDs, approved reference locators accompanied by their pinned Git blob SHAs (the URL alone is not the integrity proof), and the ten evaluation criteria. It does not embed image bytes or call a model; provide the candidate image and task packet to a vision-capable model/provider.

## Response contract

The provider must fetch/inspect each reference and verify its bytes against the supplied Git blob SHA before evaluating it; if it cannot verify or access a reference, mark the affected criterion UNKNOWN. The adapter enforces blocking status itself, so a provider cannot downgrade canon-critical checks. The provider must return JSON in this shape (all ten criteria required):

```json
{
  "attempt_id": "ATT-...",
  "scene_id": "WOA-CH01-SC01",
  "package_sha256": "<64-char hash from task>",
  "candidate_sha256": "<64-char hash from task>",
  "evaluator": { "name": "provider/model", "version": "model-version" },
  "evaluation": {
    "decision": "needs_correction",
    "correction_guidance": ["Specific evidence-backed correction."],
    "criteria": [
      {
        "criterion_id": "character_identity",
        "status": "fail",
        "confidence": 0.96,
        "evidence": ["Visible hat differs from the approved Nigel reference."],
        "reference_ids": ["ASSET-CHAR-NIGEL"],
        "blocking": true
      }
    ]
  }
}
```

The example above is illustrative only; a real response must include all ten rubric dimensions. UNKNOWN is not PASS. Evidence must be visual and concrete. Reference IDs must belong to the package.

## Ingest a provider response

```sh
node scripts/vision-evaluation-adapter.mjs --ingest \
  --attempt-dir work/candidates/SCENE/ATTEMPT \
  --candidate candidate.png \
  --response-file work/vision-response.json \
  --evaluator provider/model \
  --evaluator-version model-version
```

Ingestion verifies attempt/scene identity, exact candidate and package hashes, all ten criteria, and that cited references are bound. It then delegates to the same evaluation gate and append-only record writer used by the deterministic CLI.

This is a provider-neutral adapter, not a live model integration. It does not make network calls, claim to have viewed an image, approve canon, or modify canonical assets. A future provider-specific connector can call the vision model and pass its structured response through this adapter.
