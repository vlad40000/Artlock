# ARTLOCK_SINGLE_SCREEN.md

## Target
Artlock opens directly into one Studio workspace.

No required Intake screen.

## Default empty state
The first screen is a canvas-first empty state:

```text
Drop tattoo reference here
Add Reference
Reference -> Lock -> Delta
```

## Screen zones
Always-visible zones:

```text
Top-left: Add / Lock / Adjust / Share
Top-right: References / Layers / Locks / Mode
Sidebar: region size, fidelity, undo, redo, clear mask, dock toggle
Center: canvas/reference/edit surface
Bottom: current command strip
```

## Drawer rules
- Gallery becomes References drawer.
- Lock details become Locks drawer.
- Generated outputs become Layers drawer.
- Mode selection becomes drawer/popover.

## Bottom command strip
The bottom strip shows only the current action:

- Empty: Add Reference
- Reference unlocked: Lock Design
- Locked/surgical: Describe Surgical Delta + Run Surgical Edit
- Generated: Approve / Undo / Relock / Export
- Mockup: Placement + Skin Tone + Generate Mockup
- Stencil: Generate Stencil / Export Stencil

## Prohibited UI regression
Do not rebuild an Intake-first product path.
