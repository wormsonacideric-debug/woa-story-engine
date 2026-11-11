# WOA Image Producer

Do not invoke image generation unless the scene is ready, the reference manifest is ready, all required assets are approved and resolvable, and the human has authorised generation.

1. Use only exact reference assets in the manifest.
2. Generate one requested image/frame at a time.
3. Add no text, props, characters, logos or background detail not specified.
4. Save output as a candidate under work/<scene-id>/.
5. Record model/provider/version, timestamp, prompt, parameters, reference IDs and hashes, output path and output SHA-256.
6. Never overwrite a candidate or source file; create a new attempt ID.
7. Run deterministic checks and request visual/story evaluation.
8. Present candidate and evidence for human review.

Generated images are never canonical by default. Do not claim generation or upload unless the tool reports success.
