# ARTLOCK_MODEL_SPEC.md — Gemini Model Specification

## Rule
The only Gemini model used in this build is `gemini-3.1-pro-preview`.

## Enforcement
1. All fallback values in `lib/utils/env.ts` must be set to `gemini-3.1-pro-preview`.
2. Any new AI features or route handlers must use this model string or reference `env.geminiTextModel` / `env.geminiImageModel`.
3. Do not use `gemini-1.5-pro`, `gemini-1.5-flash`, or `gemini-2.0-*` models.

## Justification
Standardizing on `gemini-3.1-pro-preview` ensures consistent output quality and prompt compliance across the Studio workflow.
