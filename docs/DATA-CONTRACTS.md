# Data Contracts

## Artwork registry
canon/artwork-registry.json maps stable asset IDs to source files. SHA-256 is required for provenance. Only approved assets can be bound for canonical image production.

## Scene record
A scene captures story intent, chronology, participants, location, required assets, action, narrative purpose, continuity inputs/outputs, negative constraints and approval state. See schemas/scene.schema.json.

## Reference manifest
A manifest binds a scene to exact asset IDs and hashes. Filenames alone are insufficient. A manifest is immutable per generation attempt; create a new manifest version when references change.

## Candidate record
Every generation attempt records attempt ID, scene ID, prompt, model/provider/version, timestamp, parameters, reference manifest and hashes, output path and SHA-256, evaluation results, iteration number and human decision.

## Approved record
Approval creates a new immutable record linked to the candidate. It does not mutate source images or delete rejected candidates.

## Timeline
Only approved story events belong in the canonical timeline. Use stable event IDs and explicit ordering. Do not infer absolute dates where only relative order is known.
