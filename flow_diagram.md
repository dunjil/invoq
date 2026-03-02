# INVOQ Flow Architecture

## Interaction Model

The following diagram illustrates the relationship-first interaction model between Contractors and Companies on the INVOQ platform. It highlights both the passive "invited" flow and the active "pro agency" onboarding flow.

```mermaid
flowchart TD
    %% Define Styles
    classDef contractor fill:#f9f0ff,stroke:#9333ea,stroke-width:2px,color:#000
    classDef company fill:#eff6ff,stroke:#2563eb,stroke-width:2px,color:#000
    classDef system fill:#f1f5f9,stroke:#64748b,stroke-width:1px,stroke-dasharray: 5 5,color:#000
    classDef premium fill:#fffbe1,stroke:#d97706,stroke-width:2px,color:#000

    %% Actor: Independent Contractor
    subgraph Contractor["Independent Contractor (Free/Pro)"]
        direction TB
        C1(["Sign Up & Create Profile"])
        C2(["Add Client Email"])
        C3(["Create Quote / Contract"])
        C4(["Convert Quote to Invoice"])
        C5(["Track Trust & Tax"])
        
        C1 --> C2 --> C3
        C3 -.-> C4
        C4 --> C5
    end

    %% The Platform Core (System)
    subgraph INVOQ["INVOQ Platform Core"]
        direction TB
        Sys1[("Relationship Hub")]
        Sys2[("Secure Document Link Generated")]
        Sys3[("Email Notification Sent")]
        Sys4[("Document Execution Engine\n(Signatures & Comments)")]
        
        Sys1 --> Sys2 --> Sys3 --> Sys4
    end

    %% Actor: Company (Passive & Active Flows)
    subgraph Company["Company / Agency"]
        direction TB
        
        subgraph Passive["Flow A: Passive Client (No Account Required)"]
            direction TB
            P1(["Receive Email Link"])
            P2(["Review Document in Portal"])
            P3(["Approve/Sign or Discard"])
            
            P1 --> P2 --> P3
        end
        
        subgraph Active["Flow B: Pro Agency (Paid Account)"]
            direction TB
            A1{{"Upgrade to Pro Tier"}}
            A2(["Upload Standard Templates\n(NDA, MSA)"])
            A3(["Create Onboarding Bundle"])
            A4["Invoke Bundle for New Hire"]
            
            A1 --> A2 --> A3 --> A4
        end
    end

    %% Connections
    C2 -. "Initializes" .-> Sys1
    C3 == "Generates Document" ==> Sys2
    Sys3 == "Delivers To" ==> P1
    P3 -. "Updates Status in" .-> Sys4
    Sys4 -. "Notifies" .-> C5

    A4 == "Auto-generates & Sends Docs" ==> Sys2

    %% Apply Styles
    class C1,C2,C3,C4,C5 contractor;
    class P1,P2,P3 company;
    class Sys1,Sys2,Sys3,Sys4 system;
    class A1,A2,A3,A4 premium;
```

### Key Legend
*   **Purple Node**: Contractor actions.
*   **Blue Node**: Passive Company actions (interacting with documents sent to them).
*   **Gold Node**: Premium operations. Flow B represents the specific premium use-case of a company upgrading to Pro to actively manage a fleet of contractors using Onboarding Bundles.
*   **Dashed Outline (Center)**: The INVOQ infrastructure securely managing the handoffs between parties.
