# Workflow — Artist Feedback Routing

Classify artist feedback into engineering categories.

## Categories

```text
It changed the style -> style lock drift
It changed the design -> design lock drift
It edited the wrong image -> active asset bug
Nothing changed -> mask/target region or delta weakness
FAIL is confusing -> QA explanation UX
I need another option -> variant/secondary tool request
I need this on skin -> mockup secondary tool
I need stencil -> stencil secondary tool
```

## Output
For each feedback item, produce:

```text
Category:
Likely cause:
Files/routes to inspect:
Recommended patch:
Acceptance criteria:
```
