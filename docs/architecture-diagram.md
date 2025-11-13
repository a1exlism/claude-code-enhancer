# Architecture Diagrams

This document provides visual representations of the Core Framework architecture using Mermaid diagrams.

## Table of Contents

- [Overall Architecture](#overall-architecture)
- [Component Interaction](#component-interaction)
- [Hook Execution Flow](#hook-execution-flow)
- [Configuration Loading Flow](#configuration-loading-flow)
- [Event Flow](#event-flow)

---

## Overall Architecture

High-level overview of the Core Framework components and their relationships.

```mermaid
graph TB
    subgraph "Core Framework v0.1.0"
        CM[ConfigManager]
        EB[EventBus]
        HS[HookSystem]
    end

    subgraph "Configuration Sources"
        ENV[Environment Variables]
        PC[Project Config<br/>.claude-enhancer.json]
        UC[User Config<br/>~/.claude-enhancer/config.json]
        DC[Default Config]
    end

    subgraph "Hook Handlers"
        PTU[PreToolUse Hooks]
        POTU[PostToolUse Hooks]
        SS[SessionStart Hooks]
        SE[SessionEnd Hooks]
        STOP[Stop Hooks]
        NOTIF[Notification Hooks]
        PC_HOOK[PreCompact Hooks]
    end

    subgraph "Services"
        LOG[Logger]
        NOTIFIER[Notifier]
        LLM[LLM Client]
        SANITIZER[Sanitizer]
    end

    subgraph "External Systems"
        TELEGRAM[Telegram API]
        DISCORD[Discord API]
        EMAIL[Email SMTP]
    end

    %% Configuration Flow
    ENV --> CM
    PC --> CM
    UC --> CM
    DC --> CM

    %% Core Component Connections
    CM -.provides config.-> HS
    EB -.provides events.-> HS
    CM -.provides config.-> EB

    %% Hook Registration
    PTU --> HS
    POTU --> HS
    SS --> HS
    SE --> HS
    STOP --> HS
    NOTIF --> HS
    PC_HOOK --> HS

    %% Service Integration
    HS -.uses.-> LOG
    HS -.triggers.-> EB
    LOG --> NOTIFIER
    NOTIFIER --> LLM
    NOTIFIER --> SANITIZER

    %% External Communication
    NOTIFIER --> TELEGRAM
    NOTIFIER --> DISCORD
    NOTIFIER --> EMAIL

    style CM fill:#e1f5ff
    style EB fill:#fff4e1
    style HS fill:#e8f5e9
```

---

## Component Interaction

Detailed view of how the three core components interact with each other.

```mermaid
sequenceDiagram
    participant App as Application
    participant CM as ConfigManager
    participant EB as EventBus
    participant HS as HookSystem
    participant Hook as Hook Handler

    %% Initialization Phase
    rect rgb(230, 240, 255)
        Note over App,Hook: Initialization Phase
        App->>CM: load()
        CM->>CM: Load config files
        CM->>CM: Validate with Zod
        CM-->>App: Config loaded

        App->>EB: getEventBus()
        EB-->>App: EventBus instance

        App->>HS: getHookSystem()
        HS->>CM: Get hook configs
        HS->>EB: Get event bus
        HS-->>App: HookSystem instance
    end

    %% Hook Registration Phase
    rect rgb(240, 255, 240)
        Note over App,Hook: Hook Registration Phase
        App->>HS: register(hookDef)
        HS->>CM: isHookEnabled(name)?
        CM-->>HS: true/false
        alt Hook Enabled
            HS->>HS: Add to registry
            HS->>HS: Sort by priority
            HS-->>App: Registered
        else Hook Disabled
            HS-->>App: Skipped
        end
    end

    %% Hook Execution Phase
    rect rgb(255, 240, 240)
        Note over App,Hook: Hook Execution Phase
        App->>HS: trigger(event)
        HS->>HS: Filter by matcher
        HS->>HS: Sort by priority

        loop For each hook
            HS->>Hook: execute(context)
            Hook->>CM: getValue(path)
            CM-->>Hook: config value
            Hook->>EB: emit(event)
            EB->>EB: Notify listeners
            Hook-->>HS: result
        end

        HS->>EB: emit(hook:EventName)
        HS-->>App: results[]
    end
```

---

## Hook Execution Flow

Detailed flow of hook execution from trigger to completion.

```mermaid
flowchart TD
    Start([Trigger Hook Event]) --> CheckReg{Hooks<br/>Registered?}

    CheckReg -->|No| NoHooks[Return Empty Array]
    CheckReg -->|Yes| FilterMatcher[Filter by Matcher Pattern]

    FilterMatcher --> CheckMatched{Any Hooks<br/>Matched?}
    CheckMatched -->|No| NoMatched[Return Empty Array]
    CheckMatched -->|Yes| SortPriority[Sort by Priority<br/>Higher First]

    SortPriority --> LoopStart{More Hooks?}

    LoopStart -->|Yes| PrepareContext[Prepare Hook Context]
    PrepareContext --> InjectServices[Inject Services<br/>EventBus, ConfigManager, Logger]

    InjectServices --> ExecuteHook[Execute Hook Handler]
    ExecuteHook --> SetTimeout{Timeout<br/>Exceeded?}

    SetTimeout -->|Yes| TimeoutError[Return Timeout Error]
    SetTimeout -->|No| HookLogic[Hook Logic Execution]

    HookLogic --> HookResult{Success?}

    HookResult -->|Yes| CollectSuccess[Collect Success Result]
    HookResult -->|No| CheckCritical{Priority<br/>>= 100?}

    CheckCritical -->|Yes| StopExecution[Stop Execution<br/>Critical Failure]
    CheckCritical -->|No| CollectError[Collect Error Result]

    CollectSuccess --> LoopStart
    CollectError --> LoopStart
    TimeoutError --> LoopStart

    LoopStart -->|No| EmitEvent[Emit hook:EventName Event]
    EmitEvent --> ReturnResults[Return Results Array]

    StopExecution --> EmitEvent
    NoHooks --> End([End])
    NoMatched --> End
    ReturnResults --> End

    style Start fill:#e1f5ff
    style End fill:#e1f5ff
    style ExecuteHook fill:#fff4e1
    style HookLogic fill:#e8f5e9
    style StopExecution fill:#ffebee
    style TimeoutError fill:#ffebee
```

---

## Configuration Loading Flow

How configuration is loaded and merged from multiple sources.

```mermaid
flowchart TD
    Start([Start Config Loading]) --> InitDefault[Initialize with<br/>Default Config]

    InitDefault --> CheckUser{User Config<br/>Exists?}

    CheckUser -->|Yes| LoadUser[Load User Config<br/>~/.claude-enhancer/config.json]
    CheckUser -->|No| CheckProject

    LoadUser --> ParseUser[Parse JSON]
    ParseUser --> ResolveUserEnv[Resolve ${VAR} Placeholders]
    ResolveUserEnv --> MergeUser[Deep Merge with Default]

    MergeUser --> CheckProject{Project Config<br/>Exists?}
    CheckProject -->|Yes| LoadProject[Load Project Config<br/>./.claude-enhancer.json]
    CheckProject -->|No| ApplyEnvOverrides

    LoadProject --> ParseProject[Parse JSON]
    ParseProject --> ResolveProjectEnv[Resolve ${VAR} Placeholders]
    ResolveProjectEnv --> MergeProject[Deep Merge<br/>Higher Priority]

    MergeProject --> ApplyEnvOverrides[Apply Environment<br/>Variable Overrides<br/>CLAUDE_ENHANCER_*]

    ApplyEnvOverrides --> ValidateZod[Validate with<br/>Zod Schema]

    ValidateZod --> ValidationResult{Valid?}

    ValidationResult -->|Yes| StoreConfig[Store Final Config]
    ValidationResult -->|No| FormatErrors[Format Validation Errors]

    FormatErrors --> ThrowError[Throw Configuration Error]
    ThrowError --> End([End with Error])

    StoreConfig --> LogSuccess[Log Success]
    LogSuccess --> ReturnConfig[Return Config Object]
    ReturnConfig --> Success([End Successfully])

    style Start fill:#e1f5ff
    style Success fill:#e8f5e9
    style End fill:#ffebee
    style ValidateZod fill:#fff4e1
    style ThrowError fill:#ffebee
```

---

## Event Flow

How events flow through the EventBus system.

```mermaid
sequenceDiagram
    participant P as Publisher
    participant EB as EventBus
    participant L1 as Regular Listener
    participant L2 as Once Listener
    participant L3 as Wildcard Listener (*)

    %% Registration Phase
    rect rgb(240, 255, 240)
        Note over P,L3: Registration Phase
        L1->>EB: on('my-event', listener1)
        EB->>EB: Add to listeners map

        L2->>EB: once('my-event', listener2)
        EB->>EB: Add to onceListeners map

        L3->>EB: on('*', listener3)
        EB->>EB: Add to wildcard listeners
    end

    %% First Event Emission
    rect rgb(255, 240, 240)
        Note over P,L3: First Event Emission
        P->>EB: emit({type: 'my-event', ...})

        EB->>EB: Find listeners for 'my-event'
        EB->>EB: Find wildcard listeners

        par Execute Regular Listeners
            EB->>L1: listener1(event)
            L1-->>EB: void/Promise
        and Execute Once Listeners
            EB->>L2: listener2(event)
            L2-->>EB: void/Promise
            EB->>EB: Remove listener2 from map
        and Execute Wildcard Listeners
            EB->>L3: listener3(event)
            L3-->>EB: void/Promise
        end

        EB-->>P: true (had listeners)
    end

    %% Second Event Emission
    rect rgb(230, 240, 255)
        Note over P,L3: Second Event Emission
        P->>EB: emit({type: 'my-event', ...})

        EB->>EB: Find listeners for 'my-event'

        par Execute Regular Listeners
            EB->>L1: listener1(event)
            L1-->>EB: void/Promise
        and Execute Wildcard Listeners
            EB->>L3: listener3(event)
            L3-->>EB: void/Promise
        end

        Note over EB,L2: listener2 not called<br/>(already removed)

        EB-->>P: true (had listeners)
    end

    %% Error Handling
    rect rgb(255, 245, 240)
        Note over P,L3: Error Handling
        P->>EB: emit({type: 'error-event', ...})

        EB->>L1: listener1(event)
        L1-->>L1: throws Error
        Note over EB,L1: Error caught and logged<br/>Execution continues

        EB->>L3: listener3(event)
        L3-->>EB: void/Promise

        EB-->>P: true (had listeners)
    end
```

---

## Complete Workflow Example

End-to-end workflow showing all components working together.

```mermaid
flowchart TB
    subgraph "1. Initialization"
        A1[Application Start] --> A2[Load Configuration]
        A2 --> A3[Initialize EventBus]
        A3 --> A4[Initialize HookSystem]
    end

    subgraph "2. Setup"
        B1[Register Event Listeners] --> B2[Register Hooks]
        B2 --> B3[Configure Services]
    end

    subgraph "3. Runtime - PreToolUse"
        C1[User Action:<br/>Write File] --> C2[Trigger PreToolUse Event]
        C2 --> C3[Security Check Hook<br/>Priority: 100]
        C3 --> C4{Safe?}
        C4 -->|No| C5[Block Operation]
        C4 -->|Yes| C6[Permission Check Hook<br/>Priority: 90]
        C6 --> C7{Allowed?}
        C7 -->|No| C5
        C7 -->|Yes| C8[Param Validation Hook<br/>Priority: 80]
        C8 --> C9[Execute Tool]
    end

    subgraph "4. Runtime - PostToolUse"
        D1[Tool Execution Complete] --> D2[Trigger PostToolUse Event]
        D2 --> D3[Quality Check Hook<br/>Priority: 50]
        D3 --> D4[Run Linters]
        D4 --> D5{Pass?}
        D5 -->|No| D6[Emit quality-failed Event]
        D5 -->|Yes| D7[Emit quality-passed Event]
        D6 --> D8[Send Notification]
        D7 --> D9[Performance Tracking Hook<br/>Priority: 10]
    end

    subgraph "5. Event Handling"
        E1[EventBus Receives Events] --> E2[Notify All Listeners]
        E2 --> E3[Logger Listener]
        E2 --> E4[Metrics Listener]
        E2 --> E5[Notification Listener]
    end

    subgraph "6. External Integration"
        F1[Notification Service] --> F2{Channel?}
        F2 -->|Telegram| F3[Send to Telegram]
        F2 -->|Discord| F4[Send to Discord]
        F2 -->|Email| F5[Send Email]
    end

    A4 --> B1
    B3 --> C1
    C9 --> D1
    D9 --> E1
    E5 --> F1

    style C5 fill:#ffebee
    style D6 fill:#ffebee
    style C9 fill:#e8f5e9
    style D7 fill:#e8f5e9
```

---

## Data Flow Diagram

How data flows through the system from configuration to execution.

```mermaid
graph LR
    subgraph "Input"
        I1[Config Files]
        I2[Environment Variables]
        I3[User Actions]
    end

    subgraph "Core Framework"
        C1[ConfigManager]
        C2[EventBus]
        C3[HookSystem]
    end

    subgraph "Processing"
        P1[Hook Handlers]
        P2[Event Listeners]
        P3[Services]
    end

    subgraph "Output"
        O1[Tool Execution]
        O2[Notifications]
        O3[Logs]
        O4[Metrics]
    end

    I1 --> C1
    I2 --> C1
    I3 --> C3

    C1 -.config.-> C3
    C1 -.config.-> P1
    C2 -.events.-> P2
    C3 -.triggers.-> P1

    P1 --> C2
    P1 --> O1
    P2 --> P3
    P3 --> O2
    P3 --> O3
    P3 --> O4

    style C1 fill:#e1f5ff
    style C2 fill:#fff4e1
    style C3 fill:#e8f5e9
```

---

## Related Documentation

- [Getting Started Guide](./guides/getting-started.md)
- [API Reference](./api/README.md)
- [Architecture Design](../analysis/architecture-design-2025-01-12.md)
