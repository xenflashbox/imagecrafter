# /agent-os - Planning & Specification Orchestrator Command

This command activates the agentOS-maestro-orchestrator agent for comprehensive planning, specification generation, and requirements analysis using DevMaestro MCP tools.

## Usage

```
/agent-os [project or feature request]
```

Or with detailed requirements:

```
/agent-os
Request: [description]
Constraints: [technical/business constraints]
Context: [relevant background]
Standards: [Xenco Production Standards]
```

## What It Does

1. **Activates Planning Agent**: Deploys agentOS-maestro-orchestrator
2. **Requirements Analysis**: Uses `mcp__dm-mini__planning_assist` for comprehensive breakdown
3. **Architecture Design**: Uses `mcp__dm-mini__architect_assist` for technical specifications
4. **Database Planning**: Uses `mcp__dm-mini__database_assist` for data architecture
5. **UI/UX Planning**: Uses `mcp__dm-mini__ui_assist` for interface specifications
6. **Implementation Plan**: Creates detailed, executable plan for /pm or /dev-maestro
7. **Standards Integration**: Ensures Xenco Production Standards from the start

## When To Use

**Use /agent-os when:**
- Starting a new project or major feature
- Need comprehensive requirements analysis
- Want detailed technical specifications
- Planning complex multi-phase implementation
- Need architecture decisions before coding
- Preparing plan for /pm autonomous execution
- Clarifying ambiguous requirements

**Don't use /agent-os when:**
- You already have a detailed plan (use /pm directly)
- Task is simple and straightforward (use /dev-maestro)
- Just need to execute existing specs

## The Activation Message

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 AGENT OS MAESTRO - ACTIVATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Agent: agentOS-maestro-orchestrator
Session: AGENTOS-PLAN-2025-001
Mode: Planning & Specification
Standards: Xenco Production Standards
MCP Tools: Available (dm-mini server)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Analyzing requirements...
Using planning_assist to structure approach...
```

## Planning Workflow

### 1. Requirements Discovery
```
Using mcp__dm-mini__planning_assist for requirements analysis...

Request: Build user authentication system for MCP Forge
Type: Core Feature Implementation
Complexity: Medium

Requirements Discovery:
✅ Functional requirements identified: 15
✅ Non-functional requirements: 8
✅ Constraints documented: 5
✅ Success criteria defined: 6

Using recall to check similar past implementations...
Found: 2 similar authentication systems built previously
Applying lessons learned...
```

### 2. Architecture Planning
```
Using mcp__dm-mini__architect_assist for technical design...

System Architecture:
├─ Authentication Layer
│  ├─ JWT token management
│  ├─ Session handling
│  └─ Role-based access control (RBAC)
├─ API Layer
│  ├─ Login endpoint
│  ├─ Logout endpoint
│  ├─ Token refresh endpoint
│  └─ Password reset flow
├─ Database Layer
│  └─ User management schema
└─ Frontend Layer
   ├─ Login components
   ├─ Protected routes
   └─ Session management

Technology Decisions:
✅ Clerk for authentication (handles complexity)
✅ JWT for stateless sessions
✅ Neon PostgreSQL for user data
✅ Next.js middleware for route protection

Rationale documented with architect_assist guidance.
```

### 3. Database Design
```
Using mcp__dm-mini__database_assist for data architecture...

Schema Design:
┌─────────────────────────────────────┐
│ users                               │
├─────────────────────────────────────┤
│ id: uuid (PK)                       │
│ clerk_id: string (unique)           │
│ email: string (unique)              │
│ role: enum (user|admin|enterprise)  │
│ created_at: timestamp               │
│ updated_at: timestamp               │
└─────────────────────────────────────┘
     ↓ 1:N
┌─────────────────────────────────────┐
│ user_sessions                       │
├─────────────────────────────────────┤
│ id: uuid (PK)                       │
│ user_id: uuid (FK)                  │
│ token_hash: string                  │
│ expires_at: timestamp               │
│ created_at: timestamp               │
└─────────────────────────────────────┘

Indexes:
✅ users.clerk_id (unique index)
✅ users.email (unique index)
✅ user_sessions.user_id (index)
✅ user_sessions.expires_at (index for cleanup)

Migration Strategy:
1. Create users table with constraints
2. Create user_sessions table with FK
3. Add indexes
4. Seed admin user (no mock data, real setup)

Database design meets Xenco Production Standards.
```

### 4. UI/UX Planning
```
Using mcp__dm-mini__ui_assist for interface specifications...

Component Specifications:

LoginForm Component:
├─ Email input (validation: email format)
├─ Password input (validation: min 8 chars)
├─ Remember me checkbox
├─ Submit button (loading states)
├─ Error display (accessible)
└─ Forgot password link

Protected Routes:
├─ Dashboard (requires: authenticated)
├─ Admin Panel (requires: admin role)
├─ Settings (requires: authenticated)
└─ Profile (requires: authenticated)

User Flows:
1. Login Flow: Email → Password → Dashboard
2. Logout Flow: Click logout → Clear session → Redirect
3. Token Refresh: Auto-refresh before expiry
4. Password Reset: Email → Token → New password

Accessibility:
✅ ARIA labels on all inputs
✅ Keyboard navigation support
✅ Screen reader friendly
✅ Error messages announced

UI design meets accessibility standards.
```

### 5. Implementation Planning
```
Using planning_assist to create execution plan...

Implementation Phases:

Phase 1: Database Setup (1 hour)
├─ Task 1.1: Create database schema
│  └─ Agent: database-architect
│  └─ MCP Tool: database_assist
│  └─ Validation: Schema created, tests passing
├─ Task 1.2: Create migration scripts
│  └─ Agent: database-architect
│  └─ Validation: Migrations executable
└─ Task 1.3: Seed admin user
   └─ Agent: database-architect
   └─ Validation: Admin login works

Phase 2: API Implementation (1.5 hours)
├─ Task 2.1: Implement auth middleware
│  └─ Agent: api-specialist
│  └─ MCP Tool: architect_assist
│  └─ Validation: Protected routes work
├─ Task 2.2: Create auth endpoints
│  └─ Agent: api-specialist
│  └─ Validation: API tests passing
└─ Task 2.3: Implement RBAC
   └─ Agent: security-engineer
   └─ Validation: Role checks working

Phase 3: Frontend Integration (1 hour)
├─ Task 3.1: Build login components
│  └─ Agent: ui-specialist
│  └─ MCP Tool: ui_assist
│  └─ Validation: Components render correctly
├─ Task 3.2: Implement protected routes
│  └─ Agent: frontend-developer
│  └─ Validation: Auth redirects working
└─ Task 3.3: Add error handling
   └─ Agent: frontend-developer
   └─ Validation: Errors displayed properly

Phase 4: Testing & Validation (30 min)
├─ Task 4.1: Integration tests
│  └─ Agent: validator
│  └─ MCP Tool: validateAgainst
│  └─ Validation: All flows tested
├─ Task 4.2: Security audit
│  └─ Agent: security-engineer
│  └─ Validation: No vulnerabilities
└─ Task 4.3: Standards check
   └─ Agent: validator
   └─ Validation: Xenco Production Standards met

Total Estimated Time: 4 hours
Phase Boundaries: Between each phase (user approval required)
Parallel Execution: Possible in Phase 3 (UI components)

Using remember to store this plan for execution phase...
```

### 6. Standards Compliance Planning
```
Integrating Xenco Production Standards from the start...

Implementation Requirements:

✅ No Mock Data:
- Real Clerk integration (no fake auth)
- Real database connections (no mock users)
- Production-ready from start

✅ Services Layer Architecture:
- auth.service.ts handles all auth logic
- db.service.ts handles all database operations
- No direct DB calls from routes

✅ Error Handling:
- Try-catch blocks in all services
- Proper error messages for users
- Logging for debugging

✅ Schema Validation:
- Zod schemas for all inputs
- Validate at API boundary
- Type-safe throughout

✅ Zero Workarounds:
- Proper JWT implementation (no shortcuts)
- Secure password handling
- Real session management

Standards baked into plan from the start.
```

## MCP Tool Integration

The agentOS-maestro-orchestrator uses MCP tools strategically:

### Planning & Analysis
**`mcp__dm-mini__planning_assist`**
```
# Primary tool for comprehensive planning
# Breaks down complex requirements
# Structures implementation phases
# Estimates complexity and time

Usage: First tool called for any planning task
Input: User requirements, project context
Output: Structured implementation plan with phases, tasks, agents
```

### Architecture Decisions
**`mcp__dm-mini__architect_assist`**
```
# System design and technology choices
# Architectural patterns
# Integration strategies
# Security considerations

Usage: For all architectural decisions
Input: Requirements, constraints, goals
Output: Technical specifications with rationale
```

### Data Architecture
**`mcp__dm-mini__database_assist`**
```
# Schema design
# Relationship modeling
# Index strategies
# Migration planning

Usage: Database-related planning
Input: Data requirements, relationships
Output: Complete schema design with migrations
```

### Interface Planning
**`mcp__dm-mini__ui_assist`**
```
# Component specifications
# User flow design
# Accessibility planning
# UX considerations

Usage: Frontend planning and UI specifications
Input: User requirements, workflows
Output: Component specs, flows, accessibility guidelines
```

### Memory Management
**`mcp__dm-mini__remember` / `recall`**
```
# Store completed plans
# Retrieve past successful patterns
# Access project context
# Maintain planning history

Usage: Throughout planning process
- recall: Check past similar projects
- remember: Store plan for execution
```

## Planning Output Formats

### Comprehensive Plan Document
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 IMPLEMENTATION PLAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: User Authentication System for MCP Forge
Created: 2025-11-03
Agent: agentOS-maestro-orchestrator
Session: AGENTOS-PLAN-2025-001

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXECUTIVE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Objective: Implement secure, scalable authentication system
Approach: Clerk integration with role-based access control
Duration: 4 hours (4 phases)
Complexity: Medium
Standards: Xenco Production Standards enforced

Key Decisions (via architect_assist):
• Clerk for auth (reduces complexity, production-ready)
• JWT for stateless sessions (scalable)
• Neon PostgreSQL for user data (existing infrastructure)
• Next.js middleware for route protection (framework native)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 1: DATABASE SETUP (1 hour)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Detailed tasks, agents, validations...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 2: API IMPLEMENTATION (1.5 hours)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Detailed tasks, agents, validations...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 3: FRONTEND INTEGRATION (1 hour)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Detailed tasks, agents, validations...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 4: TESTING & VALIDATION (30 min)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Detailed tasks, agents, validations...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TECHNICAL SPECIFICATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Architecture diagrams, database schema, API specs...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STANDARDS COMPLIANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Xenco Production Standards Integration:
✅ No mock data - Real Clerk integration
✅ Services layer - auth.service.ts, db.service.ts
✅ Error handling - Try-catch blocks throughout
✅ Schema validation - Zod schemas at API boundary
✅ Zero workarounds - Proper implementations only

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXECUTION READINESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Plan Status: ✅ Ready for Execution
MCP Tools Used in Planning:
- planning_assist: Comprehensive breakdown
- architect_assist: Technical decisions
- database_assist: Schema design
- ui_assist: Component specifications
- remember: Plan stored for execution

Plan stored in memory as: "auth-system-plan-2025-001"

Ready to execute with:
/pm
Plan: auth-system-plan-2025-001 (stored in memory)
Execute with parallel deployment and strict validation.

Or manually execute phase-by-phase with /dev-maestro.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Quick Reference Summary
```
PLAN SUMMARY: User Authentication System

Phases: 4
Tasks: 12
Duration: 4 hours
Complexity: Medium

Phase Breakdown:
1. Database Setup (1h) - 3 tasks
2. API Implementation (1.5h) - 3 tasks
3. Frontend Integration (1h) - 3 tasks
4. Testing & Validation (0.5h) - 3 tasks

Key Technologies:
• Clerk (authentication)
• JWT (sessions)
• Neon PostgreSQL (data)
• Next.js (framework)

Agents Needed:
• database-architect (3 tasks)
• api-specialist (2 tasks)
• security-engineer (2 tasks)
• ui-specialist (1 task)
• frontend-developer (2 tasks)
• validator (2 tasks)

Execution:
Ready for /pm autonomous execution
Plan ID: auth-system-plan-2025-001
```

## Integration with Execution Commands

### Handoff to /pm
```
Plan created and stored in memory.

To execute autonomously:
/pm
Recall plan: auth-system-plan-2025-001
Execute with parallel deployment.

The project-manager-maestro will:
✅ Retrieve plan from memory (via recall)
✅ Deploy agents as specified
✅ Use MCP tools as recommended
✅ Enforce standards as planned
✅ Validate at phase boundaries
```

### Handoff to /dev-maestro
```
Plan created for manual orchestration.

To execute with coordination:
/dev-maestro
Use plan: auth-system-plan-2025-001
Phase-by-phase execution with team coordination.

The dev-maestro-orchestrator will:
✅ Follow plan structure
✅ Deploy agents as needed
✅ Allow manual control between phases
```

## Clarification & Refinement

If requirements are unclear:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  CLARIFICATION NEEDED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The requirements need clarification before planning:

Questions:
1. Authentication Provider: Should we use Clerk or build custom?
   Context: Clerk reduces complexity but adds dependency
   
2. User Roles: What roles are needed beyond user/admin?
   Context: Affects RBAC implementation complexity
   
3. Session Duration: How long should sessions last?
   Context: Affects UX and security trade-offs

Using architect_assist to evaluate options...

Option A: Clerk + Basic RBAC
- Pros: Faster implementation, proven solution
- Cons: External dependency, monthly cost
- Time: 4 hours

Option B: Custom Auth + Advanced RBAC
- Pros: Full control, no dependencies
- Cons: Security complexity, longer timeline
- Time: 12 hours

Recommendation: Option A (Clerk)
Rationale: Xenco Production Standards favor proven solutions
          over custom implementations for security-critical features.

Please confirm approach before detailed planning.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Example Invocations

### New Feature Planning
```
/agent-os
Feature: Add AI-powered search to MCP Forge marketplace
Requirements:
- Semantic search across server descriptions
- Filter by category, tags, popularity
- Real-time suggestions as user types
- Performance: <200ms response time
```

### Project Kickoff
```
/agent-os
Project: New SaaS application for AI agents marketplace
Tech Stack: Next.js, Neon PostgreSQL, Clerk, Stripe
Target: Launch MVP in 2 weeks
Standards: Xenco Production Standards enforced
```

### Migration Planning
```
/agent-os
Task: Migrate BlogCraft from Supabase to Neon
Constraints:
- Zero downtime requirement
- Preserve all existing data
- No API changes (backwards compatible)
Generate comprehensive migration plan.
```

### Architecture Decision
```
/agent-os
Decision: Choose authentication strategy for new app
Options: Clerk vs. NextAuth vs. Custom
Context: Need enterprise SSO support
Use architect_assist to evaluate options with rationale.
```

## Success Metrics

- **Plan Completeness**: 100% (all phases/tasks defined)
- **Standards Integration**: 100% (Xenco standards from start)
- **Execution Readiness**: 100% (ready for /pm or /dev-maestro)
- **MCP Tool Usage**: Comprehensive (all relevant tools used)
- **Clarity**: High (minimal ambiguity in specs)
- **Time Estimation**: Accurate (±10% of actual)

## Notes

- Planning is the foundation for quality execution
- MCP tools provide AI-assisted decision making
- Standards integrated from the start prevent rework
- Plans stored in memory for easy execution
- Can iterate on plans before execution
- Suitable for any project size
- Clarifies ambiguous requirements
- Creates executable specifications
- Hands off seamlessly to execution commands

## Related Commands

- `/pm` - Execute plans autonomously
- `/dev-maestro` - Execute plans with coordination
- `/validate` - Can validate existing implementations against plan

---
version: 2.0.0
updated: 2025-11-03
devmaestro: true
changelog: |
  v2.0.0 - Corrected MCP tool references (planning_assist, architect_assist, database_assist, ui_assist, remember/recall)
  v1.2.0 - Enhanced planning workflow with comprehensive MCP integration
  v1.1.0 - Added standards integration from planning phase
  v1.0.0 - Initial planning and specification orchestrator

**Remember**: The agentOS-maestro-orchestrator creates the foundation for quality execution. It uses MCP tools for intelligent planning and integrates Xenco Production Standards from the start. Plans are stored in memory for seamless handoff to execution commands.
