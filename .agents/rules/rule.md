# rule.md - Gemini Model Rule

## Rule
The only Gemini model used in this build is `gemini-3.1-pro-preview`.

## Enforcement
- Keep every Gemini model fallback in `lib/utils/env.ts` set to `gemini-3.1-pro-preview`.
- New AI routes, helpers, prompt contracts, and generation features must use `gemini-3.1-pro-preview` directly or reference the existing Gemini env helpers that resolve to it.
- Do not introduce `gemini-1.5-*`, `gemini-2.0-*`, `gemini-2.5-*`, Flash, or any other Gemini model in this build.

## Scope
This rule applies to text, lock extraction, image generation, stencil, mockup, surgical delta, creative delta, export, and any future Gemini-backed Artlock workflow.
