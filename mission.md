# Mission — Artlock

Artlock lets tattoo artists use AI without losing the design identity.

Core loop:

```text
Reference -> Lock -> Delta
```

1. Add or select a reference.
2. Extract a structured lock from the reference.
3. Apply bounded surgical deltas against that lock.
4. Approve, relock, export, or continue.

## Active UX direction
Artlock must feel like an artist tool, not a setup wizard.

The app should open directly into a single Studio screen:

```text
Empty canvas -> Add Reference -> Lock Design -> Surgical Delta
```

## Primary interface
- Canvas first
- Top-left actions: Add, Lock, Adjust, Share
- Top-right studio menus: References, Layers, Locks, Mode
- Sidebar: region/mask size, fidelity, undo/redo, clear mask, dock toggle
- Bottom command strip: current action only

## Secondary tools
Trace, Stencil, Mockup, Variants, and Export may exist as hidden secondary actions.
They must not dominate the primary flow.

## Not the product unless explicitly approved
- CRM
- billing
- scheduler
- consent forms
- aftercare
- admin panel
- marketing suite as primary workflow
