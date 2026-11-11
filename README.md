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
- Six user-approved canonical character images and three initial location images.
- Seven existing published WOA opening scenes imported from the website, including their exact dialogue, stage directions, descriptions and image paths.
- Source provenance recorded against the website repository and Git blob IDs.
- Five-chapter opening nested within a 17-chapter mystery arc.
- Actual author chronology, audience reveal order and character knowledge ledger.
- Character/location records, schemas, portable agent skills and deterministic validator.
- Source-linked beat registry, character knowledge and reveal ledger, canon-backed relationship graph, continuity and prop ledgers (including sourced ticket state), scene-production workflow and deterministic production preflight.
- Evidence-backed scene-state ledger with source transcript indexing and explicit unresolved continuity flags.

## Important limits
The seven imported website scenes are preserved as published source, not automatically approved for new image generation. Editorial questions are recorded separately; do not silently rewrite scene text to resolve them. Arthur, Edwin and Brian are known characters but their visual artwork is not yet imported. Chapters 6–17 remain outline-level, not full scripts.

## Quick start
Requires Node.js 18+.
~~~bash
node scripts/woa-check.mjs
node scripts/woa-check.mjs --strict
npm run preflight
npm run candidate:package -- --scene WOA-CH01-SC01 --prompt-file work/prompts/scene-01.txt --provider PROVIDER --model MODEL
npm test
~~~

Read docs/SCENE-PRODUCTION.md, docs/SCENE-STATE.md and docs/CANDIDATE-PACKAGES.md before production. The candidate package generator creates immutable, hash-pinned input packages only after a scene is approved and all canonical references are bound; it does not generate images. The scene-state ledger records explicit physical actions only; unknown states are not filled by inference, and the Tappy/tarpaulin repetition remains flagged for creator review. Knowledge events distinguish character recollection, inference, audience reveal and author-only truth; every event is tied to its exact scene source. Run `npm run preflight` before any image production; it reports why each scene is blocked or ready. The canon-backed relationship graph deliberately leaves unsupported relationships unfilled. Physical scene observations are recorded in story/scene-state-ledger.json; unresolved transitions remain flagged. The imported website scenes live in story/scenes/ and are indexed by story/scene-registry.json. Use story/templates/scene-beat.template.json for source-linked beat planning.

## Layout
- canon/: visual rules, character/location records and artwork registry
- story/: story bible, timeline, chapters, knowledge, imported scenes, beats, continuity, props and scenes
- schemas/: JSON data contracts
- skills/: agent instructions
- work/: candidate packages
- approved/: approved manifests and provenance
- evaluation/: evaluation rubric
- scripts/: deterministic validation
- tests/: fixtures
- docs/: workflow, setup and roadmap

## Current status
This is a structured story-production foundation, not yet an autonomous image-generation service. No image model, cloud asset store, Trello board or publishing platform is connected. Integrations must not bypass reference binding, provenance or human approval.
