# WOA Story Engine — Agent Instructions

Read this file before working in this repository.

## Priority order
1. User's explicit instruction for the current task.
2. Canonical source artwork and explicitly approved canon records.
3. canon/canon-rules.md.
4. Approved story decisions and timeline.
5. Scene brief and reference-binding manifest.
6. Agent suggestions and generated candidates.

If sources conflict, report the conflict and request a decision.

## Absolute rules
- WOA means WORMS ON ACID.
- Canonical artwork is the sole visual authority. Never redesign or reconstruct a character from prose.
- Every image task requires exact approved source assets in a REFERENCE BINDING manifest.
- Never use an unapproved image as a reference for another generation.
- Never promote a candidate to canon. Only a human can approve.
- Do not infer missing character traits, relationships, geography, chronology, dialogue or props.
- Do not add text overlays, captions, logos, extra characters or objects unless specified.
- Work on the requested beat only. Do not foreshadow or jump ahead.
- Eric is a worm and cannot hold objects.
- Never overwrite, edit in place or delete canonical source artwork.
- Record user corrections as proposed rules; do not generalise beyond their stated scope.

## Before image work
1. Read the scene record and confirm its status.
2. Read the exact reference manifest.
3. Verify each reference ID exists and is approved.
4. Confirm character, location, timeline and prop constraints.
5. Stop if any required reference is missing or ambiguous.
6. Record model, prompt, reference IDs and output hash for every candidate.

## After image work
Run deterministic checks, then advisory visual/story evaluation. Report evidence and uncertainty. Request human review. Archive only after explicit approval. Record provenance without mutating original assets.

Use scripts/woa-check.mjs. Never claim a test ran unless it actually ran. Do not publish, post, merge, deploy or alter external assets unless explicitly requested.
