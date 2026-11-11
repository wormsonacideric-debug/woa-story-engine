# Getting Started

## Imported foundation
- Six user-approved website canonical character images: Eric, Manni, Nigel, Peter, Rufus and Tappy.
- Three initial locations: The High Scraparral, Manchester and The Festivals.
- Five-chapter opening nested inside the 17-chapter larger mystery arc.
- Actual author chronology and audience reveal order stored separately.
- Character knowledge separated from author-level truth.
- Beat registry, continuity ledger and prop ledger are in place; they start empty rather than inventing facts.

## Limits
- Arthur, Edwin and Brian are known characters but their visual records are deferred until artwork is supplied. Do not generate substitutes.
- Peter has only the confirmed Early Bird designation; no additional personality or plot role is inferred.
- Chapters 6–17 have outline-level summaries only; they are not scene scripts.
- No scene is approved for image production by this import alone.

## First production workflow
1. Read docs/SCENE-PRODUCTION.md and select a beat supported by source material.
2. Create a beat record using story/templates/scene-beat.template.json. Include source references, dramatic function and unresolved questions.
3. Expand the beat into a scene only where source material supports the action.
4. Create a scene record with explicit participants, location, action, purpose and constraints.
5. Run continuity preflight against the knowledge ledger, timeline, prop ledger and character records.
6. Bind exact character/location asset IDs in an immutable reference manifest. Production scenes must include every depicted character's and location's canonical asset IDs.
7. Generate one scene candidate only.
8. Evaluate canon, narrative and composition; correct at most twice.
9. Present the candidate for human approval. Never self-approve.
10. Archive approved output as a new immutable asset; never overwrite canonical artwork.

## Validation
Run node scripts/woa-check.mjs for the normal validation pass. The validator blocks explicit violations such as Eric holding a prop and production scenes missing their canonical reference bindings. Strict mode also treats starter warnings as errors.
