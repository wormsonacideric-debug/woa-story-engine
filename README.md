# WORMS ON ACID — Story Engine

**One canon. One story. Many outputs.**

A production system for the WOA story universe across illustrated chapters, social content, animation, games, trailers and interactive experiences.

## Principles
1. Canonical artwork is the visual source of truth; prose is not a substitute for bound reference images.
2. Reference binding happens before generation, using exact approved asset IDs and source hashes.
3. Candidates are not canon. Human approval is mandatory.
4. Author-level truth and character-level knowledge are separate.
5. Actual chronology and audience reveal order are separate.
6. Never silently rewrite history. Decisions and assets are versioned.
7. If story, timeline, character state or references are unclear, stop and ask.

## Imported foundation
- Six user-approved canonical character images: Eric, Manni, Nigel, Peter, Rufus and Tappy.
- Three initial location images: The High Scraparral, Manchester and The Festivals.
- Five-chapter opening nested within a 17-chapter mystery arc.
- Actual author chronology, audience reveal order and character knowledge ledger.
- Character and location records, schemas, portable agent skills and deterministic validator.

## Important limits
Arthur, Edwin and Brian are known characters but their visual artwork is not yet imported. Peter has only the confirmed Early Bird designation. Chapters 6–17 have outline-level summaries, not full scripts. No scene has been approved for image production by this import alone.

## Quick start
Requires Node.js 18+.
~~~bash
node scripts/woa-check.mjs
node scripts/woa-check.mjs --strict
~~~

## Layout
`canon/` visual rules, character/location records and artwork registry
`story/` story bible, timeline, chapters, knowledge and scenes
`schemas/` JSON data contracts
`skills/` agent instructions
`work/` candidate packages
`approved/` approved manifests and provenance
`evaluation/` evaluation rubric
`scripts/` deterministic validation
`tests/` fixtures
`docs/` workflow, setup and roadmap

## Current status
This is a structured story-production foundation, not yet an autonomous image-generation service. No image model, cloud asset store, Trello board or publishing platform is connected. Integrations must not bypass reference binding, provenance or human approval.
