# **Tattoo Lock System Product Source of Truth**

## **Document Purpose**

This document defines the product truth for **Tattoo Lock System**.

It exists to prevent the build from drifting into a generic AI image generator, a cluttered editing app, or a developer-driven feature pile.

Tattoo Lock System must be designed around one central idea:

**Protect the artist’s original work while making client-requested revisions faster, cleaner, and more controllable.**

This document should guide product decisions, UI decisions, AI prompt routing, model behavior, data flow, phase design, database structure, and workspace architecture.

No code should be written if the proposed implementation conflicts with this document.

## **Official Product Name**

The official product name is:
**Tattoo Lock System**

Acceptable shorthand in internal planning:
**TLS**

## **Core Problem**

Tattoo artists spend too much time manually redrawing client revisions.

The common workflow is painful:
1. The artist creates an original design.
2. The client asks for changes.
3. The artist redraws or adjusts the design manually.
4. The client asks for another change.
5. The artist repeats the process again.
6. The design may slowly drift away from the original approved direction.
7. The artist loses time, energy, and creative momentum.

Tattoo Lock System exists to reduce that revision burden without replacing the artist.

## **Foundational Product Insight**

The artist should still create the original design.

The expected starting workflow is:
1. The artist draws the original artwork in Procreate or another drawing tool.
2. The artist imports that artwork into Tattoo Lock System.
3. Tattoo Lock System analyzes the design and extracts the important visual locks.
4. The artist uses client revision language to request controlled changes.
5. Tattoo Lock System generates a faithful revision without losing the approved identity of the piece.

The system is meant to protect the first creative act, not replace it.

## **Product Definition**

Tattoo Lock System is a controlled AI revision system for artists.

It takes an artist-made original, extracts protected visual locks, and lets the artist turn client revision language into faithful, bounded revisions without losing the approved design identity.

## **Success Definition**

Success means the artist can make client-requested revisions in seconds or minutes instead of repeated manual redraw cycles.

The highest priority is **preventing design drift**. A fast redesign is failure. A faithful controlled revision is success.

## **Core Workflow Objects**

*   **Reference Image**: The original imported image (e.g., from Procreate).
*   **Base v1**: The selected approved base image that acts as the first working source of truth.
*   **Lock**: Structured visual facts extracted from the image. Locks are protection rules.
*   **LockSet**: The active group of locks attached to the current design state.
*   **Revision / Delta**: A bounded change requested by the artist.
*   **Output Stack**: Where revisions/deltas are saved for review.
*   **Stencil**: Production-oriented derivative prepared for tattoo transfer.
*   **Skin Mockup**: Visualization of the design on skin placement.

## **Phase Philosophy**

Tattoo Lock System must be phase-aware. The interface and AI behavior must match the active phase:
1. **Reference Board**: Manage source material and select Base v1.
2. **Lock Extraction**: Read/analyze phase (no redraw). Extract visual facts.
3. **Surgical Edit**: Precise, bounded client revisions.
4. **Variants**: Broader alternate versions.
5. **Stencil**: Production preparation.
6. **Mockup**: Visualization.

## **Non-Negotiable Principle**

**Protect the artist’s work while accelerating revision labor.**
Every feature should serve that principle.
