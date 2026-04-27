# UI Debug Checklist (React + Gemini preview)

If your Studio-style UI will not start, check these in order:

1. **Do not paste escaped newlines (`\\n`) into source files.**
   - A file should contain real line breaks, not literal backslash-n characters.

2. **Ensure the component appears only once per file.**
   - If the same module is pasted multiple times, the build fails with duplicate declarations/import errors.

3. **Use a real API key source.**
   - `const apiKey = ""` will return HTTP 401/403 from Gemini.
   - Use an env var instead (for example: `process.env.NEXT_PUBLIC_GEMINI_API_KEY`).

4. **Fix JSON schema mismatch in brainstorm call.**
   - If you expect an array (`Array.isArray(result)`), set response schema to array, not object.

5. **Guard JSON parsing.**
   - Gemini may return plain text or wrapped JSON. Wrap `JSON.parse` in a safe parser and show a user-facing error.

6. **Confirm image model response shape.**
   - For image generation, verify your response contains `inlineData` and expected MIME type.

## Known bug pattern from pasted code

A common failure is expecting this branch to run:

- `const result = await callGeminiText(..., true)`
- `if (result && Array.isArray(result)) { ... }`

while `callGeminiText(..., true)` sends `responseSchema: { type: "OBJECT" }`, which prevents array output.

## Minimal patch pattern

- In text helper, pass a schema type parameter.
- Use `ARRAY` for brainstorm output.
- Keep `OBJECT` for lock extraction.

```ts
const callGeminiText = async (
  userText: string,
  systemText: string,
  expectJson = false,
  jsonType: 'OBJECT' | 'ARRAY' = 'OBJECT',
) => {
  // ...
  if (expectJson) {
    payload.generationConfig = {
      responseMimeType: 'application/json',
      responseSchema: { type: jsonType },
    };
  }
  // ...
};

// Brainstorm:
const ideas = await callGeminiText(prompt, sys, true, 'ARRAY');
```
