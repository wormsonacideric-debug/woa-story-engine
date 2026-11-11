# Roadmap

## Foundation
- [x] Canon-first operating principles
- [x] Scene, asset and reference-manifest contracts
- [x] Portable specialist skills
- [x] Deterministic validation CLI
- [x] Human approval and provenance gates

## Ingest real WOA canon
- [x] Import canonical character artwork and hashes
- [x] Import canonical location artwork, including current High Scraparral source
- [x] Reconcile active character roster and approved facts
- [x] Import current authoritative story outline and timeline
- [x] Confirm current chapter/act structure

## Production runtime
- [x] Deterministic scene production preflight with explicit block reasons
- [x] Sourced ticket state ledger and Eric object-handling guard
- [x] Scene-scoped physical state ledger with source-index validation and unresolved continuity flags
- [x] Candidate input package generator and immutable attempt folders
- [x] Evaluation record contract with evidence, confidence, candidate/package hashes and decision guardrails
- [ ] Vision evaluator adapter with evidence and confidence
- [ ] Bounded self-correction controller
- [ ] Approval command and append-only decision log
- [ ] Asset manifest/hash verification for local and remote sources

## Workflow integrations
- [ ] Codex and Claude Code entrypoints and context loading
- [ ] Optional image-provider adapters
- [ ] Optional Trello production queue and review states
- [ ] Optional object storage / backup
- [ ] Export profiles for social, story, animation, game and promo outputs

## Advanced
- [x] Scene-scoped character knowledge/reveal ledger; [x] canon-sourced relationship graph
- [x] Initial sourced prop ledger; [ ] full location/prop continuity graph
- [ ] Multi-format adaptation planner
- [ ] Story beat dependency graph and change-impact analysis
- [ ] Asset lineage visualiser and audit report

No integration may bypass reference binding, provenance or human approval.
