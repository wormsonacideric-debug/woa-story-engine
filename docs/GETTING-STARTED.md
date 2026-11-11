# Getting Started

## Clone and validate
~~~bash
git clone https://github.com/wormsonacideric-debug/woa-story-engine.git
cd woa-story-engine
node scripts/woa-check.mjs
~~~

The empty registry is expected. Missing source artwork and story outline are reported as warnings; production remains blocked.

## Add source artwork
Keep originals in a controlled asset location. Add a registry record for each explicitly approved source, including SHA-256. See canon/SOURCE-ASSETS-REQUIRED.md.

## Import current story canon
Populate story bible, timeline, chapters and scene registry from current approved sources. Historical summaries are not authority. Reconcile different historical chapter counts before declaring the structure definitive.

## Prepare and bind a scene
Copy story/templates/scene.template.json, assign a unique ID and fill story fields. Create a manifest using schemas/reference-manifest.schema.json. Each required asset must exist, be approved and match its recorded hash. Set status to ready only after editorial approval and reference binding.

## Generate and review
Use the skills in skills/. Save each attempt separately under work/. Evaluate with the rubric, then request explicit human approval. Only then create an approved archive record.
