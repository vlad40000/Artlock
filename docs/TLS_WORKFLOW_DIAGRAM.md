# Tattoo Lock System (TLS) Workflow

This diagram outlines the core operational loop of the TLS studio, from initial design intake to final production assets.

```mermaid
graph TD
    %% Phase 0: Intake
    subgraph Intake ["Phase 0: Reference Board"]
        A[Upload Original Art] --> B[Browse Bento Wall]
        B -->|Double Click| C[Select Base v1]
    end

    %% Phase 1: Locking
    subgraph Locking ["Phase 1: Lock Extraction"]
        C --> D[Extract Design Locks]
        D --> E{Review LockSet}
        E -->|Adjust/Relock| D
        E -->|Approve| F[Locked Design State]
    end

    %% Phase 2: Refinement
    subgraph Refinement ["Phase 2: Iterative Editing"]
        F --> G[Surgical Edit]
        F --> H[Creative Pivot]
        G --> I[Define Region / Mask]
        I --> J[Apply Client Request]
        H --> J
        J --> K[Generate Design Delta]
    end

    %% The Loop
    K --> L{Review Delta}
    L -->|Promote to Ref| B
    L -->|Accept| M[Approved Design]

    %% Phase 3: Production
    subgraph Production ["Phase 3: Delivery"]
        M --> N[Flash Sheet]
        M --> O[Skin Mockup]
        M --> P[Model Sheet]
        M --> Q[Stencil Export]
    end

    %% Navigation & Controls
    subgraph Controls ["Global Orchestration"]
        R[Phase Sidebar] -.->|Direct Navigation| Intake
        R -.->|Direct Navigation| Locking
        R -.->|Direct Navigation| Refinement
        R -.->|Direct Navigation| Production
        S[Zustand History] -.->|Undo / Redo| K
    end

    classDef primary fill:#fbbf24,stroke:#211500,stroke-width:2px,color:#211500;
    classDef secondary fill:#1e1b4b,stroke:#312e81,stroke-width:1px,color:#e0e7ff;
    classDef success fill:#064e3b,stroke:#059669,stroke-width:1px,color:#ecfdf5;

    class C,F,M primary;
    class K,N,O,P,Q secondary;
    class M success;
```

## Workflow Principles

1.  **Artist-First Intake**: The process starts with an artist's original work (e.g., from Procreate). The system is a **controlled assistant**, not a replacement for the first creative act.
2.  **Design Identity Protection**: "Locks" are extracted early and enforced throughout the refinement phases to prevent "AI drift" and preserve the approved identity.
3.  **Client-Driven Revisions**: The **Surgical Edit** phase translates natural client language ("make the snake wrap tighter") into precise visual adjustments.
4.  **Promote & Loop**: The "Promote to Reference" mechanism allows for a non-linear workflow where any output can become the new source of truth for the next iteration.
5.  **Production Readiness**: Deliverables like Stencils and Mockups are only prioritized after the design is locked and approved.
