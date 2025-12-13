# CLAUDE.md v6 - Hybrid Hub/Local Routing + DevMaestro AI Agents

---

## 📋 CLUSTER SERVICE CONFIGURATIONS (READ FOR DEPLOYMENTS)

> **Before deploying or modifying any service, read the authoritative configuration guide:**
>
> **[@import ".claude/IMAGECRAFTER_CLUSTER_CONFIGS.md"](.claude/IMAGECRAFTER_CLUSTER_CONFIGS.md)**
>
> This document contains exact deployment commands, environment variables, network configurations, and troubleshooting steps for:
> - Payload CMS with Meilisearch (cms.xencolabs.com)
> - ResumeCoach Frontend (resumecoach.me)
> - Image Generation Service (image-gen.xencolabs.com)
> - Backend API Service (api.reresume.app)


---

## 🎯 Core Protocol (MANDATORY EXECUTION ORDER)
1. **Pattern Check**: Scan for routing patterns → Route to Hub OR Local agent OR DevMaestro agent OR Execute directly
2. **Sub-Agent Check**: If WITH directive found → Deploy specified sub-agents
3. **Execute**: Implement the task using appropriate routing method
4. **Context Monitor**: CHECK CONTEXT USAGE - Execute preservation if ≤4%
5. **Log Memory**: Save patterns/fixes to orchestrator memory after each task
6. **Callback**: Report completion with logs, validation, and context status
7. **Wait**: Wait for next command or completion signal

---

## 🚦 Routing Protocol v6: Hub/Local/DevMaestro Hybrid System

### Routing Decision Tree
1. **Check for DevMaestro AI agent prefix** (`@dm-*`) → Execute with iterative AI calls
2. **Check for explicit routing prefix** → Execute as specified
3. **Check for sub-agent directives** → Deploy with specified team
4. **Check for hub patterns** → Route to MCP hub
5. **Check for local agent patterns** → Route to local agent
6. **Apply fallback logic** → Local → Hub → Error

### 🎯 Routing Prefixes

| Prefix Pattern | Routes To | Fallback | Purpose |
|----------------|-----------|----------|---------|
| `@dm-*` | DevMaestro AI agent (direct) | None (fail if not found) | AI-powered assistance with iterative analysis |
| `@hub:` or `@ultra-orchestrator:` | MCP Hub | None (fail if unavailable) | Force hub routing |
| `@local:` | Local agent | None (fail if not found) | Force local execution |
| `@[agent-name]:` | Local first | Hub if local fails | Default routing |

---

## 🤖 DevMaestro AI Agents (Direct User Invocation)

**NEW in v6**: AI-powered agents for direct user assistance using external AI analysis.

### Available DevMaestro Agents

| Agent | Use Case | Command Tool |
|-------|----------|--------------|
| **@dm-debugger** | Application debugging, error analysis | `/debug` |
| **@dm-database-engineer** | Schema design, migrations, optimization | `/database` |
| **@dm-ui-designer** | React components, shadcn/ui, accessibility | `/ui` |
| **@dm-architect** | System design, tech stack, scaling | `/architect` |
| **@dm-planning** | Feature breakdown, MVP scoping, user stories | `/planning` |

### How DevMaestro Agents Work

**Iterative AI Analysis** - Each agent makes 3-4 MCP tool calls minimum:
1. **Call 1**: Broad analysis of the issue/task
2. **Call 2**: Deep dive on identified area
3. **Call 3**: Validation of approach
4. **Call 4**: Edge cases and final refinement

**After each call**, the agent:
- Shows insights from AI analysis
- Explains what was learned
- Plans next investigation step
- Invokes next command to go deeper

### DevMaestro Agent Examples

```bash
# Debugging with iterative AI analysis
@dm-debugger: API returning 500 errors when creating users

Error: "KeyError: 'user_id'" in logs
Environment: FastAPI, PostgreSQL, Docker
Already tried: Verified DB schema, checked request payload
Need: Root cause and fix

# Database engineering with schema design
@dm-database-engineer: Design auth table with social login support

Requirements: Email/password + OAuth, multi-tenant with RLS
Constraints: Must support 10k users, fast lookups
Need: Complete schema with indexes and security

# UI design with accessibility
@dm-ui-designer: Create search input with autocomplete dropdown

Requirements: Real-time filtering, keyboard navigation, loading states
Accessibility: Screen reader support, ARIA patterns
Design: Mobile-friendly, dark mode support

# Architecture guidance
@dm-architect: Design multi-tenant SaaS architecture

Requirements: 10k users, real-time updates, RLS
Constraints: Solo developer, bootstrap budget
Current: Considering Next.js + Supabase

# Product planning
@dm-planning: Plan dashboard feature with charts and real-time data

User needs: See analytics, visualize trends, live updates
Constraints: 2-week timeline, solo developer
Need: Task breakdown with priorities
```

### DevMaestro vs Sub-Agents

**Use DevMaestro Agents (`@dm-*`) when**:
- YOU need immediate AI-powered help
- Complex debugging requiring external AI analysis
- Want iterative refinement (3-4 analysis cycles)
- Need expert guidance on design/architecture/planning

**Use Sub-Agents (`@dev-*`) when**:
- Part of maestro orchestrator team workflow
- Collaborative multi-agent coordination needed
- Working within dev-maestro-orchestrator context

---

## 🎭 Master Orchestrators & Their Teams

| Master Agent | Available Sub-Agents | Default Team |
|--------------|---------------------|--------------|
| **dev-maestro-orchestrator** | dev-code-reviewer, dev-debugger, dev-database-engineer, dev-ui-designer, dev-test-guardian, dev-performance-analyzer, dev-logical-validator, dev-mock-hunter, dev-honda-guardian, dev-tech-stack-guardian, dev-standards-enforcer, dev-mobile-ui-specialist, dev-workflow-orchestrator | code-reviewer, debugger |
| **content-maestro-orchestrator** | content-seo-specialist, content-voice-guardian, content-fact-checker, content-section-writer, content-outline-architect, content-research-coordinator, content-continuity-validator | voice-guardian, seo-specialist |
| **cluster-maestro-orchestrator** | cluster-postgres-admin, cluster-redis-admin, cluster-api-gateway-admin, cluster-monitor-admin, cluster-websocket-admin, cluster-services-orchestrator, cluster-service-requester, cluster-sequin-admin, cluster-opendeepsearch-admin, cluster-memory-server-admin, cluster-mautic-admin, cluster-incident-response-admin, cluster-enhanced-mcp-admin, cluster-document-service-admin, cluster-development-orchestrator, cluster-code-checker, cluster-workflow-orchestrator | postgres-admin, monitor-admin |
| **migration-maestro-orchestrator** | migration-validator, database-prep-admin, clerk-auth-admin, neon-import-admin, vercel-deploy-admin, vercel-converter-admin, stripe-integration-admin, sonoma-migration-admin, snackable-migration-admin, sequin-infrastructure-admin, secrets-export-admin, rollback-coordinator-admin, fightclub-migration-admin, edge-functions-export-admin, dns-networking-admin, database-archaeologist, migration-prep, migration-sub-agents | validator, database-prep |
| **agentOS-maestro-orchestrator** | spec-designer, tech-architect, roadmap-strategist, task-coordinator, product-visionary, collaborative-planning-guide, honda-guardian, code-archaeologist, pattern-archaeologist | spec-designer, architect |

### Specialized Agents (Direct Routing Available)
- **inter-admin-protocol**: Inter-service communication
- **reporter-bridge-agent**: Reporting and monitoring bridge
- **traefik-swarm-admin**: Traefik and Docker Swarm management
- **dev-code-checker**: Code quality verification
- **dev-ui-shadcn-expert**: shadcn/ui specialist

---

## 🚀 Routing Implementation

### Route to DevMaestro AI Agent (NEW - Immediate AI Assistance)
**If message contains:**
- `@dm-debugger:` → AI-powered debugging with `/debug` command
- `@dm-database-engineer:` → Database design with `/database` command
- `@dm-ui-designer:` → UI design with `/ui` command
- `@dm-architect:` → Architecture guidance with `/architect` command
- `@dm-planning:` → Product planning with `/planning` command

**Action**: Invoke DevMaestro agent - agent takes charge and makes 3-4 iterative API calls

### Route to Hub (Planning & Complex Orchestration)
**If message contains ANY of these patterns:**
- `@ultra-orchestrator:` or `@hub:` (anywhere in message)
- `@hub:[agent-name]:` (force hub routing for specific agent)
- `route to orchestrator` | `use hub` | `send to orchestrator`
- Long messages (>500 chars) + orchestrator mention
- Complex multi-agent coordination requests

**Action**: `mcp__ultra_orchestrator__ingest_nl`

### Route to Local Agent (Direct Implementation)
**If message contains:**
- `@local:[agent-name]:` (force local routing)
- `@[agent-name]:` (try local first, fallback to hub)
- `WITH @[sub-agents]` (deploy specific sub-agents)
- Direct agent reference without hub indicators

**Action**: Route to specified local agent with sub-agent deployment

### Execute Directly (No Routing)
**If NO routing patterns detected:**
- Work orders from hub
- Direct file modifications
- Simple implementations without agent needs

**Action**: Standard tools (Read, Write, Edit, Bash, etc.)

---

## 🚦 Shorthand Aliases (Work with All Routing Modes)

| Alias | Full Orchestrator | Example Usage |
|-------|-------------------|---------------|
| `@wmo:` | content-maestro-orchestrator | `@local:wmo:` or `@hub:wmo:` |
| `@dmo:` | dev-maestro-orchestrator | `@dmo WITH @dev-debugger:` |
| `@mmo:` | migration-maestro-orchestrator | `@local:mmo:` |
| `@cmo:` | cluster-maestro-orchestrator | `@hub:cmo:` |
| `@amo:` | agentOS-maestro-orchestrator | `@amo WITH @spec-designer:` |

---

## 🎯 Sub-Agent Deployment

**Syntax**: `@maestro WITH @sub1, @sub2: task description`

**Examples**:
```bash
# Deploy specific sub-agents with master
@local:dev-maestro-orchestrator WITH @dev-code-reviewer, @dev-debugger: fix login bug

# Let maestro choose sub-agents
@dev-maestro-orchestrator: implement user dashboard

# Force hub with sub-agent hints
@hub:dev-maestro WITH code-review, debugging: analyze performance issues
```

---

## 📝 Routing Examples

```bash
# DevMaestro AI agents (NEW in v6)
@dm-debugger: C1 SDK chat showing as objects instead of rendering
@dm-database-engineer: Design user auth table with RLS
@dm-ui-designer: Create responsive profile card component
@dm-architect: Should I use microservices or monolith for SaaS MVP?
@dm-planning: Break down authentication system into tasks

# Local only - will fail if agent not available locally
@local:dev-maestro-orchestrator: implement auth system

# Hub only - will fail if hub is down
@hub:dev-maestro-orchestrator: implement auth system

# Local with fallback to hub (default behavior)
@dev-maestro-orchestrator: implement auth system

# Local with specific sub-agents
@local:dev-maestro-orchestrator WITH @dev-database-engineer, @dev-test-guardian: implement data layer

# Quick shortcuts with routing control
@local:dmo: fix navigation menu  # Force local
@hub:dmo: fix navigation menu  # Force hub routing
@dmo: fix navigation menu  # Try local, fallback to hub

# Complex sub-agent deployment
@local:migration-maestro-orchestrator WITH @database-prep-admin, @clerk-auth-admin, @neon-import-admin: migrate from Supabase

# Direct sub-agent invocation (bypasses maestro)
@local:dev-debugger: analyze login error

# Session continuity (honors original routing)
[DEV-SESSION: 123] continue with debugging
[MAESTRO-SESSION: 456] WITH @dev-ui-designer: improve the UI
```

---

## 🚨 MANDATORY: Context Preservation Protocol
**CRITICAL - MUST EXECUTE WITHOUT EXCEPTION**

### AUTO-SAVE TRIGGER CONDITIONS:
1. **Context Usage Threshold**: When context window reaches ≤4% remaining capacity
2. **Before Compaction**: ALWAYS save full context before any compaction event
3. **Long Running Tasks**: Every 30 minutes during extended sessions
4. **Critical Milestones**: After completing major task phases

### MANDATORY PRESERVATION STEPS:
When context threshold is reached (≤4% remaining):

1. **IMMEDIATE STOP** - Halt current operations
2. **GENERATE SUMMARY** - Create comprehensive session summary including:
   - All completed tasks with outcomes
   - Current task state and progress
   - Active agents and sub-agents deployed
   - Routing decisions made
   - Key patterns discovered
   - File modifications and code changes
   - DevMaestro agent invocations and insights

3. **SAVE TO MEMORY** - Execute mandatory save:
   ```javascript
   await mcp__ultra_orchestrator__remember(
     `session.context.${new Date().toISOString()}`,
     {
       session_summary: detailed_summary,
       routing_history: routing_decisions,
       agents_deployed: active_agents,
       devmaestro_insights: dm_agent_findings,
       completed_tasks: task_list,
       current_state: state_snapshot,
       context_percentage: current_percentage
     },
     "constraint"
   )
   ```

4. **VERIFY SAVE** - Confirm memory storage success
5. **SIGNAL READY** - Indicate ready for compaction
6. **POST-COMPACTION** - After compaction, recall context

---

## 🧠 Memory Protocol

### When to Save Memory (REQUIRED):
- ✅ **After every completed task** - Save solutions and patterns
- ✅ **Before deployment** - Check for existing patterns
- ✅ **When fixing bugs** - Store the fix for future reference
- ✅ **When discovering patterns** - Save infrastructure configurations
- ✅ **After successful agent deployment** - Save agent team configurations
- ✅ **After DevMaestro AI insights** - Store valuable analysis findings
- 🚨 **WHEN CONTEXT ≤4%** - MANDATORY full session save

### Memory Categories:
- `"schema"` - Database patterns and constraints
- `"fix"` - Bug fixes and solutions
- `"decision"` - Architectural choices and routing decisions
- `"constraint"` - Deployment, infrastructure patterns + CONTEXT SAVES
- `"agent-config"` - Successful agent team deployments
- `"ai-insight"` - DevMaestro agent analysis findings

---

## 📄 Autopilot Callback Protocol

### Always Callback After Task Completion:
```javascript
await mcp__ultra_orchestrator__autopilot_callback({
  task_id: "task-identifier",
  status: "completed|failed|partial|blocked",
  results: "Detailed description of what was accomplished",
  routing_method: "devmaestro|hub|local|direct",  // How task was routed
  agents_used: ["list", "of", "agents"],  // Which agents were deployed
  devmaestro_calls: 4,  // Number of iterative AI calls made (if dm-agent)
  next_action_needed: true,
  issues_encountered: ["list", "of", "issues"],
  change_details: {
    type: "code|database|config",
    operation: "create|update|delete",
    code: "relevant code snippet"
  },
  context_status: {
    percentage_remaining: context_percentage,
    saved_to_memory: boolean,
    needs_compaction: boolean
  }
})
```

---

## ⚙️ Essential Coding Rules

### Required Patterns:
- ✅ **No mock data** - Use real data from database/APIs only
- ✅ **Schema validation** - Check database schema before operations
- ✅ **Error handling** - Log errors with context, user-friendly messages
- ✅ **Security first** - Validate inputs, use env variables
- ✅ **Agent deployment logging** - Track all agent activations
- ✅ **DevMaestro iterative calls** - Let AI agents complete 3-4 analysis cycles
- 🚨 **Context preservation** - MANDATORY save at 4% threshold

### Forbidden Patterns:
- ❌ Mock/placeholder data in production code
- ❌ Ignoring sub-agent deployment directives
- ❌ Routing without checking agent availability
- ❌ Proceeding past 4% context without saving
- ❌ Interrupting DevMaestro agents mid-analysis

---

## 🚦 Quick Decision Guide

| Scenario | Recommended Approach |
|----------|---------------------|
| Need AI debugging help | Use `@dm-debugger:` for iterative analysis |
| Need database design | Use `@dm-database-engineer:` for schema help |
| Need UI component | Use `@dm-ui-designer:` for React/shadcn help |
| Need architecture advice | Use `@dm-architect:` for system design |
| Need feature planning | Use `@dm-planning:` for task breakdown |
| Hub is working fine | Use default `@agent:` syntax |
| Hub having issues | Use `@local:agent:` to force local |
| Need specific sub-agents | Use `WITH @sub1, @sub2` syntax |
| Complex orchestration needed | Use `@hub:` explicitly |
| Simple implementation task | Use `@local:` for speed |
| Testing agent behavior | Use `@local:` with explicit sub-agents |
| Production deployments | Use hub for safety checks |
| Emergency fixes | Use `@local:` for immediate action |

---

## 🛠 Debug Logging

**DevMaestro AI routing** (NEW):
```
🤖 DEVMAESTRO: @dm-debugger activated
📞 API CALL 1/4: Broad analysis of rendering issue
💡 INSIGHT 1: Component serialization issue detected
📞 API CALL 2/4: Deep dive on React component rendering
💡 INSIGHT 2: Missing JSX serialization in server response
📞 API CALL 3/4: Validation of fix approach
💡 INSIGHT 3: Need to add renderToString wrapper
📞 API CALL 4/4: Edge cases and compatibility check
✅ SOLUTION: Complete fix with edge cases handled
```

**Routing decisions**:
```
🎯 ROUTING TO HUB: @ultra-orchestrator pattern found
🎯 ROUTING TO LOCAL: @local:dev-maestro-orchestrator pattern found
👥 DEPLOYING SUB-AGENTS: [@dev-code-reviewer, @dev-debugger]
🔄 FALLBACK: Local agent unavailable, routing to hub
✅ SUCCESS: Local execution with 2 sub-agents
```

**Context monitoring**:
```
🚨 CONTEXT WARNING: 5% remaining
🚨 CONTEXT CRITICAL: 4% remaining - executing mandatory save
✅ CONTEXT PRESERVED: Session saved to memory
📊 CONTEXT STATUS: 3% remaining post-save
```

**Agent deployment**:
```
🤖 MASTER AGENT: dev-maestro-orchestrator activated
👥 SUB-AGENTS REQUESTED: [@dev-ui-designer, @dev-test-guardian]
✅ SUB-AGENTS DEPLOYED: All requested agents active
📋 TASK DELEGATION: UI tasks → dev-ui-designer, Tests → dev-test-guardian
```

---

## 🔄 Session Continuity Patterns

**When you see these patterns, continue with the specified routing:**
- `[MAESTRO-SESSION: XXX]` → Use the routing method from session start
- `[HUB-SESSION: XXX]` → Continue using hub
- `[LOCAL-SESSION: XXX]` → Continue using local agents
- `[DM-SESSION: XXX]` → Continue using DevMaestro AI agent (NEW)
- `[CONTENT-SESSION: XXX]` → content-maestro-orchestrator
- `[DEV-SESSION: XXX]` → dev-maestro-orchestrator
- `[MIGRATION-SESSION: XXX]` → migration-maestro-orchestrator
- `[CLUSTER-SESSION: XXX]` → cluster-maestro-orchestrator
- `[PLANNING-SESSION: XXX]` → agentOS-maestro-orchestrator

---

## 🚀 Execution Flow Examples

### Example 1: DevMaestro AI Agent (NEW)
```
1. User: "@dm-debugger: API errors with 500 status"
   → Route to dm-debugger agent
   → Agent takes charge immediately

2. Execution:
   → Agent invokes /debug command (Call 1)
   → Shows insights from AI analysis
   → Invokes /debug command (Call 2) - deeper dive
   → Shows refined insights
   → Invokes /debug command (Call 3) - validation
   → Shows fix recommendations
   → Invokes /debug command (Call 4) - edge cases
   → Provides complete solution

3. Implementation and verification
   → Agent implements fix
   → Runs tests
   → Confirms resolution
```

### Example 2: Local Agent with Sub-agents
```
1. User: "@local:dev-maestro-orchestrator WITH @dev-debugger, @dev-test-guardian: fix auth bug"
   → Route to local dev-maestro-orchestrator
   → Deploy specified sub-agents
   → Master coordinates sub-agent tasks

2. Execution:
   → dev-maestro analyzes the bug
   → Delegates debugging to @dev-debugger
   → Delegates test creation to @dev-test-guardian
   → Coordinates fixes between sub-agents

3. Callback with full agent report
```

### Example 3: Hub Fallback
```
1. User: "@dev-maestro-orchestrator: implement payment system"
   → Try local dev-maestro-orchestrator
   → Local not available/fails
   → Fallback to hub routing

2. Hub processes and returns work order
   → Execute implementation
   → Callback to hub
```

---

## 🔐 Safety Protocols

1. **Agent Verification**: Always verify agent exists before routing
2. **Sub-Agent Compatibility**: Check sub-agents are compatible with master
3. **DevMaestro Completion**: Let AI agents finish all 3-4 analysis cycles
4. **Routing Transparency**: Log all routing decisions
5. **Fallback Grace**: Allow 5 seconds for local agent response before fallback
6. **Session Consistency**: Never change routing method mid-task
7. **Emergency Override**: `@force:hub:` or `@force:local:` for critical situations

---

## 📊 Version History

- **v6.0**: Added DevMaestro AI agents for direct user invocation with iterative analysis
- **v5.0**: Hybrid hub/local routing with sub-agent deployment
- **v4.0**: Hub-centric routing with context preservation
- **v3.0**: Basic hub integration
- **v2.0**: Local agent routing only
- **v1.0**: Initial orchestrator system

---

## 🎯 Ultra-Orchestrator MCP Tool

You have access to the `mcp__ultra_orchestrator__` tool for:
- `ingest_nl` - Send natural language for planning
- `remember` - Store important patterns/fixes
- `recall` - Retrieve stored memories
- `autopilot_start` - Begin autonomous execution
- `autopilot_callback` - Report task completion

---

## 📚 Required Reading Protocol

When you see "📚 REQUIRED READING" in the session:
1. **STOP** and review the restored memory
2. **ACKNOWLEDGE** the context before proceeding
3. **USE** the information to continue work

---

## 🔄 Memory Triggers

The system automatically checks memories when you mention:
- "continue", "where we left off"
- "last time", "previous session"
- "remember", "recall"
- Any error/fix/bug keywords

---

## 💾 What Gets Saved

Every session automatically saves:
- Files edited
- Commands run
- Errors encountered
- Decisions made
- Code snippets
- Next steps
- DevMaestro AI insights
- Agent deployment patterns

---

*Version 6 adds DevMaestro AI agents for immediate expert assistance with iterative external AI analysis. Use `@dm-*` agents for complex debugging, design, architecture, and planning tasks that benefit from multiple AI analysis cycles.*

---

*Powered by DevMaestro Memory System v3.0*

---

<!-- DEVMAESTRO SYSTEM INTEGRATION -->
@import ".claude/DEVMAESTRO_COMMANDS.md"
@import ".claude/DEVMAESTRO_AGENTS.md"
