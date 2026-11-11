# Candidate package generator

This command creates an immutable, source-pinned **input package** for a future image-generation attempt. It does not call an image provider and does not create artwork.

## Gate
A scene must be explicitly human-approved (`status: approved`, `approval.status: approved`, and recorded approver/date), have a canonical location binding, have a safe reference manifest marked `ready`, and bind every required asset. Every bound asset must be approved and its Git blob SHA must match the manifest. Otherwise the command stops before creating an attempt folder.

## Run
```sh
node scripts/candidate-package.mjs --scene WOA-CH01-SC01 --prompt-file work/prompts/scene-01.txt --provider PROVIDER --model MODEL
```

The prompt file must be authored separately; the command will not invent missing scene direction. Run it with `npm run candidate:package -- --scene WOA-CH01-SCXX --prompt-file work/prompts/scene-XX.txt --provider PROVIDER --model MODEL`. An attempt ID may be supplied with `--attempt-id` for reproducible workflows. Attempt IDs are unique and directories are created exclusively; an existing attempt is never overwritten.

## Immutable contents
Each attempt snapshots the imported scene record, scene registry, reference manifest, artwork registry, character knowledge ledger, physical state ledger and prop ledger. SHA-256 hashes are recorded for every snapshot. The package records the selected prompt/provider/model, pinned reference identities, an empty output slot and pending human approval. It also snapshots the relationship graph, continuity ledger, timeline, each depicted character's canon record and the bound location record, so the package preserves the full approved context used at creation time.

No generated output is treated as approved or canonical. Future revisions must create a new attempt directory. Candidate generation, visual evaluation, bounded correction and human approval are separate later stages.
