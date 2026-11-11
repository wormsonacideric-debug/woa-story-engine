# Getting Started

## Imported foundation
- Six user-approved website canonical character images and three initial locations.
- Seven published opening scene pages imported verbatim into story/scenes/ and registered in story/scene-registry.json.
- Original page paths, Git blob SHAs, illustration paths, dialogue and stage directions are retained.
- Actual author chronology and audience reveal order stored separately.
- Character knowledge, continuity questions and prop constraints tracked independently.

## Limits
- The imported scenes are source material, not automatically approved image-generation briefs.
- Four editorial questions are logged in story/continuity-ledger.json. Preserve source text until the creator decides whether to amend anything.
- Arthur, Edwin and Brian remain without imported canonical character artwork.
- Chapters 6–17 remain outline-level summaries, not scene scripts.

## First production workflow
1. Read docs/SCENE-PRODUCTION.md and inspect the imported seven scene records.
2. Resolve or explicitly carry forward the open continuity questions; do not silently edit dialogue.
3. Create source-linked beats using story/templates/scene-beat.template.json.
4. Expand beats into scene plans only where the source supports the action.
5. Run continuity preflight against the knowledge ledger, timeline, prop ledger and character records.
6. Bind exact character/location asset IDs in an immutable reference manifest.
7. Generate one scene candidate only. The candidate input package generator now enforces the approval/reference gate and snapshots the source inputs; it does not itself generate an image.
8. Evaluate canon, narrative and composition; correct at most twice.
9. Present the candidate for human approval. Never self-approve.
10. Archive approved output as a new immutable asset; never overwrite canonical artwork.

## Validation
Run node scripts/woa-check.mjs for the normal validation pass. The validator checks imported scene IDs, sequence, transcripts and source provenance. Strict mode also treats starter warnings as errors.
