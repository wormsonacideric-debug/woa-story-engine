# WORMS ON ACID — Story Engine

**One canon. One story. Many outputs.**

A production system for the WOA story universe across illustrated chapters, social content, animation, games, trailers and interactive experiences. Designed for Codex, Claude Code and human editors.

## Principles
1. Canonical artwork is the visual source of truth; prose is not a substitute for bound reference images.
2. Reference binding happens before generation, using exact approved asset IDs and hashes.
3. Candidates are not canon. Human approval is mandatory.
4. Never silently rewrite history. Decisions and assets are versioned.
5. If story, timeline, character state or references are unclear, stop and ask.
6. Work on the requested beat only. Do not jump ahead or add unrequested content.
7. Automated evaluation is advisory, never proof of identity or canon.

## Included
Canon and artwork registry templates; story, scene, timeline and reference-manifest contracts; portable agent skills; deterministic Node.js validator; workflow, rubric, setup guide and roadmap.

## Quick start
Requires Node.js 18+.
~~~bash
node scripts/woa-check.mjs
node scripts/woa-check.mjs --help
~~~
Starter data is intentionally incomplete. The validator reports missing canon inputs rather than inventing them.

## First setup
1. Read canon/canon-rules.md and docs/OPERATING-MODEL.md.
2. Register real approved WOA reference assets with SHA-256 hashes.
3. Import the current authoritative story structure. Do not assume an old chapter count is current.
4. Create a scene record and bind exact references.
5. Generate one candidate, evaluate it, and request human approval.
6. Only approved material enters the archive.

## Layout
canon/ — rules, character/location records, artwork registry
story/ — story bible, timeline, chapters and scenes
schemas/ — JSON data contracts
skills/ — agent instructions
work/ — candidate packages
approved/ — approved manifests and provenance
evaluation/ — rubric
scripts/ — deterministic validation
tests/ — fixtures
docs/ — workflow, setup and roadmap

## Current status
This is the initial foundation, not an autonomous image-generation service. No image model, cloud asset store, Trello board or publishing platform is connected. Integrations must not bypass reference binding, provenance or human approval.

## Research influences
- Google's ADK On-Brand GenMedia sample: https://github.com/google/adk-samples/tree/main/python/agents/on-brand-genmedia — specialized prompt, generation, scoring and checker stages with bounded self-correction. WOA adds stricter reference provenance and mandatory human canon approval.
- Herk Edit Kit: https://github.com/ericonacid/herk-edit-kit — reusable skills, templates, validation and editorial feedback-to-rules loop, adapted to story and image continuity.
