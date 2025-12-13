# /dev-maestro - Development Orchestrator Command

This command activates the dev-maestro-orchestrator agent for coordinated development work using DevMaestro MCP tools and Xenco Production Standards enforcement.

## Usage

```
/dev-maestro [task description]
```

Or with detailed requirements:

```
/dev-maestro
Task: [description]
Agents: [specific agents to use]
Standards: [Xenco Production Standards enforced]
MCP Tools: [specify if certain tools needed]
```

## What It Does

1. **Activates Dev Orchestrator**: Deploys dev-maestro-orchestrator agent
2. **Analyzes Task**: Uses `mcp__dm-mini__planning_assist` for task breakdown
3. **Assigns Sub-Agents**: Deploys appropriate specialized agents
4. **Coordinates Work**: Manages collaboration between agents
5. **Uses MCP Tools**: Leverages AI-assisted decision making
6. **Enforces Standards**: Validates against Xenco Production Standards
7. **Reports Progress**: Maintains session continuity and progress updates

## When To Use

**Use /dev-maestro when:**
- You need coordinated multi-agent development
- Task requires specialized expertise across domains
- You want intelligent orchestration with MCP tool assistance
- Standards enforcement is critical
- You need session continuity and memory

**Don't use /dev-maestro when:**
- Task is simple single-file edit (use standard agent)
- You need autonomous multi-phase execution (use /pm)
- You want manual control of each step

## The Activation Message

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎭 DEV MAESTRO ORCHESTRATOR - ACTIVATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Agent: dev-maestro-orchestrator
Session: DEV-MAESTRO-2025-001
Standards: Xenco Production Standards
MCP Tools: Available (dm-mini server)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Analyzing task requirements...
Using planning_assist to break down work...
```

## Development Workflow

### 1. Task Analysis
```
Using mcp__dm-mini__planning_assist...

Task: Implement user authentication system
Complexity: Medium-High
Domains: Database, API, Security, Frontend

Breaking down into sub-tasks...
✅ Sub-tasks identified: 8
✅ Agent assignments planned
✅ Dependencies mapped
```

### 2. Agent Deployment
```
Deploying specialized agents...

Sub-Agent Team:
├─ database-architect (Schema design)
│  └─ Using database_assist MCP tool
├─ api-specialist (Endpoint creation)
│  └─ Using architect_assist MCP tool
├─ security-engineer (Auth logic)
│  └─ Using validateAgainst MCP tool
└─ ui-specialist (Login components)
   └─ Using ui_assist MCP tool

Team assembled. Beginning coordinated work...
```

### 3. Coordinated Execution
```
[MAESTRO-SESSION: DEV-MAESTRO-2025-001]

Progress Updates:
├─ database-architect: Schema created ✅
├─ api-specialist: Endpoints defined ⏳
├─ security-engineer: Awaiting schema ⏸️
└─ ui-specialist: Components ready ✅

Using remember to store progress...
Coordination checkpoints active...
```

### 4. Standards Enforcement
```
Enforcing Xenco Production Standards...

Checking database-architect output:
✅ No mock data
✅ Services layer architecture
✅ Error handling present
✅ Schema validation complete

Using validateAgainst to verify compliance...
```

### 5. Integration & Validation
```
Coordinating integration...

Integration Points:
├─ Database → API: ✅ Connected
├─ API → Security: ✅ Auth middleware integrated
└─ Security → UI: ✅ Token handling implemented

Running integration tests...
Using validateAgainst for regression checks...

✅ All integration points validated
```

## MCP Tool Integration

The dev-maestro-orchestrator uses MCP tools strategically:

### Planning Phase
**`mcp__dm-mini__planning_assist`**
```
# Breaks down complex tasks
# Identifies optimal sub-agent assignments
# Maps dependencies
# Estimates complexity

Input: Task description, requirements
Output: Structured plan with agent assignments
```

### Domain-Specific Assistance
**`mcp__dm-mini__architect_assist`**
```
# System design decisions
# Technology choices
# Architectural patterns

Used by: api-specialist, integration-engineer
```

**`mcp__dm-mini__database_assist`**
```
# Schema design
# Query optimization
# Migration strategies

Used by: database-architect
```

**`mcp__dm-mini__ui_assist`**
```
# Component structure
# User flows
# Accessibility

Used by: ui-specialist, frontend-developer
```

### Development Support
**`mcp__dm-mini__debug_assist`**
```
# Error analysis when issues arise
# Debugging strategies
# Fix recommendations

Used by: Any agent encountering errors
Escalates to: debug-maestro if complex
```

**`mcp__dm-mini__validateAgainst`**
```
# Validates all sub-agent outputs
# Checks for regressions
# Ensures requirements met

Used by: dev-maestro-orchestrator (coordinator)
```

### Memory Management
**`mcp__dm-mini__remember`**
```
# Stores session state
# Records decisions
# Maintains context

Usage: Throughout coordination process
```

**`mcp__dm-mini__recall`**
```
# Retrieves past decisions
# Finds similar problems
# Accesses project context

Usage: When context needed
```

## Sub-Agent Coordination

The orchestrator manages sub-agent collaboration:

### Collaboration Patterns

**Sequential:**
```
database-architect (complete)
  ↓
api-specialist (uses schema)
  ↓
security-engineer (uses API)
  ↓
ui-specialist (uses auth)
```

**Parallel:**
```
database-architect ⟨─┐
api-specialist ⟨───┤ Working
ui-specialist ⟨────┘ Concurrently
```

**Iterative:**
```
Round 1: Initial implementation
  ↓
Using validateAgainst for feedback
  ↓
Round 2: Refinements based on validation
  ↓
Using validateAgainst for final check
  ↓
Complete
```

## Standards Enforcement

**Binary Pass/Fail Validation:**

Before any sub-agent output is accepted:
```
Using validateAgainst + Xenco Production Standards...

Checking api-specialist output:
✅ Services layer present
✅ No mock data
✅ Error handling implemented
✅ Schema validation present
✅ No direct DB calls

Status: PASS - Accepted

Checking ui-specialist output:
❌ Mock fallback detected
❌ Error handling missing

Status: FAIL - Rejected

Deploying code-debugger to fix issues...
Re-validating after fixes...
```

**No partial acceptance.** Code must pass ALL standards checks.

## Session Continuity

The orchestrator maintains full session context:

```
[MAESTRO-SESSION: DEV-MAESTRO-2025-001]

Session State:
- Task: User Authentication System
- Started: 2025-11-03 10:00 AM
- Active Agents: 4
- Completed Sub-tasks: 5/8
- Blockers: None
- Standards Compliance: 100%

Stored in memory via remember():
- remember("dev-session-001", { task, agents, progress })
- remember("auth-decisions", { jwt_strategy, session_duration })
- remember("standards-checks", { passed: [...], failed: [...] })

Context available for recall by any sub-agent.
```

## Escalation Protocol

When the orchestrator encounters issues:

**Level 1: MCP Tools**
```
Issue: Database schema conflict
Action: Use debug_assist for analysis
Result: Solution found, continue
```

**Level 2: Specialized Sub-Agent**
```
Issue: Complex architectural decision
Action: Deploy database-architect with architect_assist
Result: Design approved, continue
```

**Level 3: Debug Maestro**
```
Issue: Systemic integration problem
Action: Escalate to debug-maestro agent
Result: Root cause identified, fix coordinated
```

## Progress Reporting

The orchestrator provides regular updates:

```
[MAESTRO-SESSION: DEV-MAESTRO-2025-001]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 PROGRESS UPDATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Task: User Authentication System
Duration: 1 hour 15 minutes
Progress: 62% complete (5/8 sub-tasks)

Recent Completions:
✅ Database schema designed (database-architect)
✅ API endpoints created (api-specialist)
✅ Auth middleware implemented (security-engineer)
✅ Login UI components (ui-specialist)
✅ Integration tests (validator)

In Progress:
⏳ Session management (security-engineer)
⏳ Password reset flow (api-specialist)
⏳ UI error handling (ui-specialist)

MCP Tool Usage:
- planning_assist: 2 calls
- architect_assist: 3 calls
- database_assist: 2 calls
- ui_assist: 2 calls
- validateAgainst: 5 calls
- remember: 3 calls

Standards Compliance: 100% (all outputs validated)

Next Checkpoint: 30 minutes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Completion Report

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ DEVELOPMENT COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Task: User Authentication System
Session: DEV-MAESTRO-2025-001
Duration: 2 hours 10 minutes

Sub-Tasks Completed: 8/8
- Database schema ✅
- API endpoints ✅
- Auth middleware ✅
- Security logic ✅
- UI components ✅
- Session management ✅
- Password reset ✅
- Integration tests ✅

Agents Deployed: 4
- database-architect: 2 tasks
- api-specialist: 3 tasks
- security-engineer: 2 tasks
- ui-specialist: 1 task

MCP Tool Efficiency:
- planning_assist: 2 calls (saved 20 min planning)
- architect_assist: 5 calls (improved design quality)
- database_assist: 3 calls (optimized schema)
- ui_assist: 2 calls (enhanced UX)
- debug_assist: 1 call (quick error resolution)
- validateAgainst: 15 calls (100% compliance)
- remember/recall: 6 calls (context maintenance)

Standards Compliance: ✅ 100%
- All outputs validated
- No mock data
- Services layer architecture
- Proper error handling
- Schema validation present

All objectives met. System ready for deployment.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Example Invocations

### Basic Task
```
/dev-maestro
Implement user authentication with JWT tokens.
Use standard web security practices.
```

### With Specific Agents
```
/dev-maestro
Task: Database migration from Supabase to Neon
Agents: database-architect, migration-specialist
MCP Tools: database_assist for schema analysis
Standards: Xenco Production Standards enforced
```

### Complex Coordination
```
/dev-maestro
Task: Refactor payment processing system
Requirements:
- Zero downtime migration
- Stripe integration
- Admin dashboard updates
- Audit logging
Deploy appropriate agents for each domain.
Use architect_assist for migration strategy.
```

## Available Sub-Agents

The orchestrator can deploy:

**Backend:**
- database-architect (+ database_assist)
- api-specialist (+ architect_assist)
- security-engineer (+ validateAgainst)
- integration-engineer (+ architect_assist)

**Frontend:**
- ui-specialist (+ ui_assist)
- frontend-developer (+ ui_assist)
- accessibility-specialist (+ ui_assist)

**Cross-Cutting:**
- code-debugger (+ debug_assist)
- validator (+ validateAgainst)
- performance-optimizer
- documentation-specialist

**Specialized:**
- migration-specialist (+ database_assist)
- payment-integration
- auth-specialist

## Success Metrics

- **Task Completion**: 100% (all sub-tasks completed)
- **Standards Compliance**: 100% (enforced via validateAgainst)
- **Agent Efficiency**: 70-90% (minimal idle time)
- **MCP Tool Usage**: Average 2-3 minutes per decision
- **Session Continuity**: 100% (full context maintained)
- **Coordination Quality**: High (minimal conflicts/rework)

## Notes

- Orchestrator maintains active coordination throughout
- MCP tools used proactively for quality decisions
- Standards enforced at every checkpoint
- Session state maintained in memory
- Can handle tasks of varying complexity
- Escalates to debug-maestro only when needed
- Suitable for single-session development tasks
- For multi-phase autonomous execution, use /pm instead

## Related Commands

- `/pm` - For autonomous multi-phase execution
- `/validate` - For manual validation checks
- `/phase-complete` - Not typically used with /dev-maestro

---
version: 2.0.0
updated: 2025-11-03
devmaestro: true
changelog: |
  v2.0.0 - Corrected MCP tool references (all dm-mini tools properly mapped)
  v1.2.0 - Added comprehensive MCP tool integration
  v1.1.0 - Enhanced standards enforcement
  v1.0.0 - Initial development orchestrator

**Remember**: The dev-maestro-orchestrator maintains active coordination and uses MCP tools for intelligent decision-making. It enforces Xenco Production Standards and ensures quality at every step.
