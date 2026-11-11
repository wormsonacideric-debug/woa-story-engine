# Scene Production and Continuity

## Production unit hierarchy

The engine separates chapter, act, story beat, scene, generation attempt, and approved output. A chapter outline is not a script. A beat is a bounded dramatic unit, not permission to invent dialogue or visual detail. A scene is only production-ready after its source, participants, location, continuity, and canonical references are bound.

## Workflow

1. Select a chapter and cite its source material.
2. Create a beat record from established outline material. Mark its source authority and unresolved questions.
3. Expand a beat into a scene only where the source supports the action. Keep unsupported details in unresolved questions, not in prose as facts.
4. Run `npm run check` and `npm run preflight`.
5. Bind every depicted character and location to approved canonical assets. Characters without approved artwork block image production when depicted.
6. Generate a candidate only after preflight passes. Record the exact prompt, model/provider, parameters, reference manifest and output hash.
7. Evaluate against canon, story purpose and visual composition. Iterate as a new attempt; do not overwrite prior attempts.
8. Human review is the only route to approval.

## Continuity model

Continuity is represented as explicit facts with provenance and scope. The engine distinguishes author truth, audience knowledge, character knowledge, physical state and uncertainty. Never promote author truth into character knowledge without a supported reveal. Never treat a mystery as a missing-data problem to be solved by invention.

## Props and object handling

Ownership, possession, location and physical handling are separate. Eric cannot hold objects. A prop may be near Eric, in his possession, or carried by another character, but a scene must not depict him holding it. The validator blocks an explicit held_by assignment to Eric. The prop ledger records sourced state changes and unresolved details separately; it does not fill gaps by inference.

## Reference binding

The approved website images registered in canon/artwork-registry.json are the current canonical visual sources for six characters and three locations. Every production scene must bind the exact asset IDs in a reference manifest. A file name or character name alone is not a visual reference.

## Current scope

The seven published opening scenes are preserved as source records and are not automatically approved for new image generation. Chapters 6–17 remain outline-level. Scenes remain blocked until editorial approval, a location, and complete approved reference manifests are bound.
