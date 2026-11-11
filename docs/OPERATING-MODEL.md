# Operating Model

Pipeline: story brief → scene record → continuity preflight → reference binding → art direction → generation → evaluation → human approval → archive → downstream adaptation.

Roles: Story Editor, Continuity Editor, Art Director, Image Producer, Canon Auditor, Story Auditor, Archivist and Human Editor. One model may perform several roles, but boundaries and independent checks remain explicit.

State path: draft → ready → in_production → candidate_review → approved. Alternative exits: blocked or rejected. A rejected candidate can be revised into a new attempt, never overwritten.

Three validation layers:
1. Deterministic: data shape, required fields, IDs, hashes, status and path rules.
2. Model-assisted: visual comparison, narrative evaluation and self-correction suggestions. Fallible evidence only.
3. Human authority: approval, rejection, conflict resolution and rule promotion.

Bounded self-correction: default proposal is two iterations. Each iteration must change a prompt or parameter based on explicit evaluator evidence. If the same failure repeats, stop and escalate. Never optimise by violating scene constraints.

Markdown skills are portable across Codex and Claude Code. Runtime adapters may be added later, but canon data and production records remain tool-agnostic.
