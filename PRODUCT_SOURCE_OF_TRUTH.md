# **Tattoo Lock System Product Source of Truth**

## **Document Purpose**

This document defines the product truth for **Tattoo Lock System** .


It exists to prevent the build from drifting into a generic AI image generator, a cluttered editing app, or a
developer-driven feature pile.


Tattoo Lock System must be designed around one central idea:


Protect the artist’s original work while making client-requested revisions faster, cleaner, and
more controllable.


This document should guide product decisions, UI decisions, AI prompt routing, model behavior, data flow,
phase design, database structure, and workspace architecture.


No code should be written if the proposed implementation conflicts with this document.

## **Official Product Name**


The official product name is:


**Tattoo Lock System**


Acceptable shorthand in internal planning:


**TLS**


Avoid treating “TattooLock” as the formal product name unless it is being used only as shorthand, legacy
naming, or codebase terminology that has not yet been renamed.

## **Core Problem**


Tattoo artists spend too much time manually redrawing client revisions.


The common workflow is painful:



1.
2.
3.



The artist creates an original design.
The client asks for changes.
The artist redraws or adjusts the design manually.


1


4.
5.
6.
7.



The client asks for another change.
The artist repeats the process again.
The design may slowly drift away from the original approved direction.
The artist loses time, energy, and creative momentum.



The original insight behind Tattoo Lock System came from watching artists struggle with this repeated
revision loop.


Artists are not struggling because they cannot draw.


Artists are struggling because client revision cycles are slow, repetitive, and often inefficient.


Tattoo Lock System exists to reduce that revision burden without replacing the artist.

## **Foundational Product Insight**


The artist should still create the original design.


The expected starting workflow is:



1.
2.
3.
4.
5.



The artist draws the original artwork in Procreate or another drawing tool.
The artist imports that artwork into Tattoo Lock System.
Tattoo Lock System analyzes the design and extracts the important visual locks.
The artist uses client revision language to request controlled changes.
Tattoo Lock System generates a faithful revision without losing the approved identity of the piece.



The system is not meant to replace the first creative act.


It is meant to protect the first creative act.

## **Product Definition**


Tattoo Lock System is a controlled AI revision system for artists.


It takes an artist-made original, extracts protected visual locks, and lets the artist turn client revision
language into faithful, bounded revisions without losing the approved design identity.


The system should help artists move from:

```
 Manual redraw after manual redraw

```

into:


2


```
 Original artist-made design
 → locked visual identity
 → client wording
 → controlled AI revision
 → artist approval

```

The system should make revisions faster, but not at the cost of fidelity.

## **Primary Product Mission**


Tattoo Lock System exists to help artists make client revisions faster while keeping the original artwork

intact.


The mission is not:

```
 Generate random tattoo designs.

```

The mission is:

```
 Protect the artist’s design and accelerate controlled revision labor.

## **Primary User**

```

The first primary user is:


**A tattoo artist doing custom client revision work.**


This user:


   - Creates original designs.

   - Works with clients.

   - Receives revision requests in plain language.

   - Needs to preserve the approved direction of the piece.

   - Needs to move quickly without losing control.

   - May use Procreate as the original drawing environment.

   - Needs outputs that can move toward stencil, mockup, variants, and client presentation.


3


## **Larger User Vision**

Tattoo Lock System starts with tattoo artists, but the underlying system should support three larger
workflow versions:



1.
2.
3.



Tattoo workflow
Character / animation workflow
General illustration workflow



Tattoo is the first adapter because the pain is obvious and immediate:

```
 Client revisions are slow when every change requires manual redraw work.

```

The broader system should remain artist-general enough to support other creative workflows later.


The tattoo workflow should be specific where tattooing requires specificity, but the core architecture should
not be so rigid that future artist workflows become impossible.

## **Version 1: Tattoo Workflow**


The tattoo workflow is the first build priority.


The intended workflow:

```
 Artist draws original in Procreate
 → Artist imports file into Tattoo Lock System
 → Artist selects Base v1
 → Tattoo Lock System extracts locks
 → Artist reviews or approves active LockSet
 → Client asks for a revision
 → Artist types or speaks the client’s wording
 → Tattoo Lock System generates a controlled revision
 → Artist reviews the output
 → Artist approves, refines, creates variants, creates stencil, creates mockup,
 or shows the client

```

This workflow must stay centered on the artist’s original imported design.


The AI should not become the owner of the artwork.


The AI should act as a controlled revision assistant.


4


## **Version 2: Character / Animation Workflow**

The character / animation version is a later workflow built on the same core idea.


The intended workflow:

```
 Artist imports a character or concept image
 → System extracts visual identity locks
 → Artist requests controlled pose, expression, turnaround, keyframe, or sheet
 changes
 → System preserves character identity and style continuity
 → Artist reviews and approves outputs

```

This version would care about:


   - Character identity preservation

   - Pose consistency

   - Expression control

   - Turnaround sheets

   - Model sheets

   - Keyframe continuity

   - Style consistency

   - Drift checking


This version should not override the tattoo workflow, but the tattoo workflow should not block it from
existing later.

## **Version 3: General Illustration Workflow**


The general illustration version is the broadest future workflow.


The intended workflow:

```
 Artist imports an illustration, concept, object, creature, symbol, logo, or
 visual asset
 → System extracts the important visual locks
 → Artist requests bounded changes
 → System creates controlled revisions while preserving identity and style

```

This version would support artists who need revision control but are not specifically tattoo artists or
animation artists.


The general principle remains the same:


5


```
 The original artist-made visual is the source of truth.

## **Core Product Thesis**

```

Tattoo Lock System is not only a tattoo app.


Tattoo Lock System is a controlled AI revision system for artists.


Tattooing is the first use case because tattoo artists have a strong need for controlled revision speed, stencil
preparation, placement awareness, and client communication.


The deeper product thesis:

```
 Artists need AI that can revise without redesigning.

## **Success Definition**

```

Success means the artist can make client-requested revisions in seconds or minutes instead of repeated
manual redraw cycles.


However, speed is not the highest priority.


The highest priority is preventing design drift.


A fast redesign is failure.


A faithful controlled revision is success.

## **Success Priorities**


The success priorities are:



1.
2.
3.
4.
5.
6.
7.



Prevent design drift.
Preserve the artist’s original design identity.
Speed up client revisions.
Let the artist use the client’s own words.
Keep the artist in control.
Make outputs reviewable, not silently final.
Support downstream tattoo outputs only after the design is properly locked and approved.


6


## **What Success Looks Like in Practice**

A successful first tattoo version should allow this:

```
 A client says:
 “Can you make the snake wrap tighter around the dagger and make the flowers less
 bulky?”

 The artist speaks or types that exact wording into Tattoo Lock System.

 Tattoo Lock System understands the active design, active locks, active phase,
 and allowed edit type.

 Tattoo Lock System produces a revision that keeps the original design identity
 intact while applying the requested change.

 The artist reviews the result, accepts it, refines it, or runs another bounded
 pass.

```

The artist should not need to manually paste technical lock data.


The artist should not need to understand AI sampling settings.


The artist should not need to fight generic AI behavior.

## **What Tattoo Lock System Must Not Do**


Tattoo Lock System must not replace the artist’s original drawing.


Tattoo Lock System must not behave like a generic AI image generator.


Tattoo Lock System must not redesign the entire piece unless the artist explicitly chooses a bounded
creative mode.


Tattoo Lock System must not expose normal artists to AI jargon such as:


   - Temperature

   - Top P

   - System instructions

   - Tokens

   - Prompt routing

   - Raw model settings


7


Tattoo Lock System must not pretend every output is automatically stencil-ready.


Tattoo Lock System must not bury the artist in unnecessary controls.


Tattoo Lock System must not require the artist to manually paste lock data.


Tattoo Lock System must not let the sidebar, prompt, model, route, or output type get out of sync with the
phase the artist is actually in.


Tattoo Lock System must not silently overwrite the approved base image.


Tattoo Lock System must not treat AI outputs as final without artist review.


Tattoo Lock System must not allow phase skipping when required source assets are missing.


Tattoo Lock System must not let a revision destroy the visual identity that was already approved.

## **Non-Negotiable Product Principle**


Tattoo Lock System exists to protect the artist’s work while accelerating revision labor.


It should make client revisions faster without turning the artist’s original into generic AI output.


Every feature should serve that principle.

## **Core Workflow Objects**


**Reference Image**


The original imported image or uploaded source material used to begin the workflow.


For the first tattoo workflow, this is often artwork created by the artist in Procreate.


**Base v1**


The selected approved base image that acts as the first working source of truth.


Base v1 should not be silently replaced.


All major AI actions should know which Base v1 they are operating from.


8


**Lock**


A structured description of visually important facts extracted from the active image.


Locks are not creative suggestions.


Locks are protection rules.


They define what must remain stable unless the artist explicitly chooses to change it.


**LockSet**


The active group of locks attached to the current base or approved design state.


The LockSet should be system-owned metadata.


The artist should not need to manually paste it into prompts.


**Revision**


A bounded change requested by the artist, often based on the client’s own words.


A revision should create a new output.


A revision should not silently replace the base.


**Variant**


A broader alternate version of the design.


A variant may allow more visible change than a surgical revision, but it should still remain tied to the active

locks unless the artist explicitly chooses a looser creative mode.


**Stencil**


A production-oriented derivative prepared for tattoo transfer or tracing.


A stencil should not be treated as automatic after every generation.


Stencil readiness should be a separate phase or review state.


**Skin Mockup**


A visualization of the approved design on skin placement.


Skin mockup is a sales and placement visualization tool, not the source of design truth.


9


## **Phase Philosophy**

Tattoo Lock System must be phase-aware.


Each phase has a purpose.


The interface, available controls, prompt, model behavior, output type, and persistence rules must match
the active phase.


The system should never show controls that imply the artist can do something that the current phase does
not support.


The system should never send a prompt that contradicts the visible phase.


The system should never save an output as the wrong artifact type.

## **Required Phase Alignment**


Every AI action must answer these questions before it runs:

```
 What phase is the artist in?
 What image is the active source?
 What LockSet is active?
 What kind of change is allowed?
 What output type is being created?
 Where is it saved?

```

If the system cannot answer those questions, the action should be blocked.

## **First Build Direction**


The first `workspace-client.tsx` build should prioritize these capabilities:



1.
2.
3.
4.
5.
6.
7.
8.



Reference Board
Base v1 selection
Lock Extraction
Active LockSet visibility
Voice/text revision entry
Phase-aware sidebar controls
Parent-owned Run Edit orchestration
Output saved as a new revision or variant


10


9.
10.



No silent overwrite of approved base
Clear phase gates



This build should not prioritize advanced UI decoration, unnecessary model controls, or generic image
generation features before the core revision loop works.

## **Reference Board Requirements**


The Reference Board is where the artist manages source material.


It should support:


   - Uploading reference images

   - Viewing reference images

   - Selecting the active Base v1

   - Inspecting source material

   - Reordering or managing references if needed

   - Keeping additional references available for later edit phases


The Reference Board should not act like the Lock Extraction phase.


The Reference Board should not run surgical edits.


The Reference Board should not imply that skin mockups or stencils can happen before an active base and
locks exist.


The Reference Board should answer:

```
 What source material does the artist have?
 Which image is the active Base v1?
 What can be used as supporting reference later?

## **Lock Extraction Requirements**

```

Lock Extraction is a read/observe phase.


Its job is to analyze the selected Base v1 and extract structured visual locks.


Lock Extraction should not generate a new image.


Lock Extraction should not clean up the design.


11


Lock Extraction should not redraw the design.


Lock Extraction should not modify the image.


Lock Extraction should answer:

```
 What visual facts must be preserved downstream?

```

The artist should be able to see that locks exist and know whether they are:


   - Not started

   - Draft

   - Saved

   - Approved


The system should allow the artist to approve or replace the active LockSet.


The active LockSet should be injected automatically into downstream AI actions.

## **Surgical Edit Requirements**


Surgical Edit is for precise, bounded client revisions.


This is likely the most important early AI edit mode.


It should be used when the client asks for a specific change while the overall design identity should remain
the same.


Examples:

```
 Make the flowers smaller.
 Move the dagger slightly lower.
 Make the snake wrap tighter.
```
