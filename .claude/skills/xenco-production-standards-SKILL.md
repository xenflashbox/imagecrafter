---
name: xenco-production-standards
description: Core development standards for all Xenco Labs projects. This skill should be used when generating code, creating plans, or validating implementations to ensure compliance with production-ready standards including no mock data, services layer architecture, proper error handling, schema validation, and Honda-level simplicity.
---


**Version:** 2.0
**Purpose:** Core development standards for all Xenco Labs projects
**Scope:** Every agent, every project, every session

---

## 🎯 CORE PHILOSOPHY

**Honda-Level Development: Simple, Reliable, Maintainable**

```yaml
Default Project Profile:
  User Scale: 0-1000 monthly users
  Team Size: Solo entrepreneur/developer  
  Budget: Bootstrap/startup
  Approach: Ship fast, optimize later
  Priority: Reliability over features
```

**Golden Rules:**
1. **Correctness Over Speed** - Fix root causes, not symptoms
2. **No Workarounds** - Address core problems directly
3. **Zero Mock Data** - Real implementations or proper error states
4. **Fail Explicitly** - Never silently swallow errors
5. **Schema-First** - Always validate before database operations
6. **MCP Protocol Only** - Never HTTP requests to MCP servers

---

## 🚫 FORBIDDEN PATTERNS (Auto-Reject)

### Mock Data Detection Patterns

**Instant Rejection - These patterns trigger immediate task failure:**

```bash
# DETECTION COMMANDS (use these to validate code):

# Pattern 1: Hardcoded test arrays
grep -E '\["test1", "test2"|MOCK_|mock_data|\[1,2,3\]' file.py && REJECT

# Pattern 2: Lorem ipsum text
grep -i "lorem ipsum" file.* && REJECT

# Pattern 3: Test email patterns
grep -E 'test@test\.com|user@example\.com|demo@.*\.com' file.* && REJECT

# Pattern 4: Sequential placeholder IDs
grep -E 'id.*:\s*[1-5]\s*[,}]' file.* && REJECT

# Pattern 5: TODO with data
grep -E 'TODO.*data|FIXME.*replace' file.* && REJECT
```

**Common Mock Data Violations:**
```javascript
// ❌ FORBIDDEN - Instant rejection
const users = ["test1", "test2", "test3"];
const email = "test@example.com";
const posts = [{id: 1}, {id: 2}, {id: 3}];
const placeholder = "Lorem ipsum dolor sit amet";

// ✅ REQUIRED - Real data or proper states
const users = await fetchUsers(); // Real API
if (!users) {
  return <ErrorState message="Failed to load users" />;
}
```

### Silent Failure Detection Patterns

**Instant Rejection - Error handling must be explicit:**

```bash
# DETECTION COMMANDS:

# Pattern 1: Empty catch blocks
grep -E 'catch\s*\([^)]*\)\s*\{\s*\}' file.js && REJECT

# Pattern 2: Swallowed errors
grep -E '\.catch\(\s*\(\)\s*=>\s*(null|undefined|\{\})\s*\)' file.js && REJECT

# Pattern 3: No error logging
grep -A5 'catch.*{' file.js | grep -v 'console\|log\|throw' && REJECT
```

**Silent Failure Violations:**
```javascript
// ❌ FORBIDDEN
try {
  await riskyOperation();
} catch {} // Silent failure

// ❌ FORBIDDEN  
fetchData().catch(() => null); // Swallowing error

// ✅ REQUIRED
try {
  await riskyOperation();
} catch (error) {
  console.error('Operation failed:', error);
  throw new Error(`Failed to complete: ${error.message}`);
}
```

### Workaround Detection Patterns

**Stop All Progress - Fix root cause:**

```bash
# DETECTION COMMANDS:

# Pattern 1: Workaround comments
grep -E 'TODO.*fix|FIXME|HACK|workaround|temporary' file.* && BLOCK

# Pattern 2: SetTimeout for race conditions
grep -E 'setTimeout.*\d+' file.js | grep -v 'debounce\|throttle' && INVESTIGATE

# Pattern 3: Retry without root cause fix
grep -E 'for.*retry|while.*attempt' file.* && INVESTIGATE
```

**Workaround Violations:**
```javascript
// ❌ FORBIDDEN - Workarounds
// TODO: Fix this properly later
// HACK: Temporary solution until we refactor

setTimeout(() => {
  // Working around race condition
  checkStatus();
}, 1000);

// ✅ REQUIRED - Proper solutions
// Use proper synchronization
await waitForReady();
checkStatus();
```

### Phantom Validation Detection

**Challenge Requirements - Only validate what exists:**

```bash
# DETECTION PATTERN:
# If validation references field not in schema → CHALLENGE

# Step 1: Get schema
SCHEMA=$(cat schema.prisma)

# Step 2: Extract validations
VALIDATIONS=$(grep -E 'if.*!.*\.' code.ts)

# Step 3: Check each validation field exists in schema
# If not found → Phantom validation → REMOVE
```

**Phantom Validation Example:**
```typescript
// Schema says: users table has (id, email, name)

// ❌ FORBIDDEN - Validating non-existent field
if (!user.projectId) {
  throw new Error("Project ID required");
}
// projectId doesn't exist in schema!

// ✅ CORRECT - Only validate what exists
if (!user.email) {
  throw new Error("Email required");
}
```

---

## 🛡️ SCHEMA-FIRST DEVELOPMENT

**MANDATORY: Validate schema before ANY database operation**

### Pre-Operation Validation Sequence

```bash
# REQUIRED BEFORE EVERY DATABASE OPERATION:

# 1. Fetch current schema
psql -U user -d database -c "
  SELECT column_name, data_type, is_nullable 
  FROM information_schema.columns 
  WHERE table_name = 'target_table';
" > schema_validation.txt

# 2. Validate all referenced columns exist
grep -f referenced_columns.txt schema_validation.txt || {
  echo "❌ Column not found in schema";
  exit 1;
}

# 3. Log validation success
echo "✅ Schema validated - proceeding with query"
```

### Schema Validation Protocol

**Every database interaction must follow this sequence:**

1. **Fetch Schema** - Get current table structure from database
2. **Validate References** - Confirm all columns/tables exist
3. **Check Data Types** - Ensure types match schema
4. **Verify Constraints** - Validate foreign keys, nullability
5. **Log Results** - Document validation outcome
6. **Execute Query** - Only after validation passes

```sql
-- ❌ WRONG: Assuming schema
INSERT INTO users (email, name, project_id) VALUES (...);
-- What if project_id column doesn't exist?

-- ✅ RIGHT: After schema validation
-- Step 1: Fetched schema - confirmed email, name columns exist
-- Step 2: Validated project_id does NOT exist in schema
-- Step 3: Adjusted query to match actual schema
INSERT INTO users (email, name) VALUES (...);
```

### Hallucination Prevention

**Common AI mistakes to actively prevent:**

```yaml
NEVER ASSUME:
  - Table names (fetch schema first)
  - Column names (validate against schema)
  - Data types (check information_schema)
  - Relationships (verify foreign keys)
  - Indexes (query pg_indexes)
  
ALWAYS VERIFY:
  - Database schema (SELECT * FROM information_schema...)
  - API endpoints (test with curl/fetch)
  - Package versions (check package.json/requirements.txt)
  - File paths (test -f /path/to/file)
  - Configuration keys (grep for key in configs)
```

---

## 🔌 MCP PROTOCOL ENFORCEMENT

**CRITICAL: MCP servers use MCP protocol, NOT HTTP**

### Correct MCP Usage

```javascript
// ✅ CORRECT - MCP Protocol
mcp__memory__remember("key", "value")
mcp__supabase__execute_sql("SELECT * FROM users")
mcp__taskmaster__create_task({title: "Task", status: "open"})

// ❌ WRONG - HTTP Requests (NEVER DO THIS)
curl -X POST http://10.8.8.12:9098/remember
fetch('http://localhost:8093/tasks')
axios.post('http://mcp-server/endpoint')
```

### MCP Memory Server Boundaries

**Memory Server is ONLY for Claude's session context:**

✅ **Correct Usage:**
- Claude stores session progress
- Remembers architectural decisions
- Tracks completed tasks between conversations

❌ **Forbidden Usage:**
- NO MCP imports in `app/`, `components/`, `pages/`
- NO user behavior tracking via MCP
- NO frontend calls to MCP endpoints
- NO MCP-based caching in user-facing code

### Detection Pattern

```bash
# Scan for illegal MCP usage in frontend
grep -r "mcp__\|@modelcontextprotocol" app/ components/ pages/ && {
  echo "❌ VIOLATION: MCP client in frontend code";
  exit 1;
}
```

---

## 🏗️ XENCO TECH STACK STANDARDS

### Approved Stack Components

**Frontend:**
- Next.js (App Router, latest stable)
- React with TypeScript (strict mode)
- Tailwind CSS (utility-first styling)
- Radix UI (accessible components)
- React Hook Form (form management)
- Zod (validation schemas)

**Backend:**
- Next.js Route Handlers (API routes)
- Neon PostgreSQL (serverless Postgres)
- Connection pooling (mandatory)
- Clerk (authentication)

**Infrastructure:**
- Docker Swarm (8-node cluster)
- Traefik (reverse proxy + SSL)
- Zero-downtime deployments (rolling updates)
- Health checks (all services)

### Mandatory Patterns

**Database Access:**
```typescript
// ❌ FORBIDDEN - Direct connection
import { Client } from 'pg';
const client = new Client(connectionString);

// ✅ REQUIRED - Connection pooling
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);

const result = await sql`SELECT * FROM users WHERE id = ${userId}`;
```

**API Error Handling:**
```typescript
// ❌ FORBIDDEN - Generic errors
return NextResponse.json({ error: "Something went wrong" }, { status: 500 });

// ✅ REQUIRED - Structured errors
return NextResponse.json({
  error: "Failed to create user",
  code: "USER_CREATION_FAILED",
  details: { field: "email", issue: "already exists" },
  requestId: generateRequestId()
}, { status: 400 });
```

**Docker Service Configuration:**
```yaml
# ✅ REQUIRED for all services
services:
  api:
    image: registry.xencolabs.com/api:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 30s
        failure_action: rollback
      rollback_config:
        parallelism: 1
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

---

## 🚨 VALIDATION ENFORCEMENT

### Validation Script Template

Every task must include an executable validation script:

```bash
#!/bin/bash
# validate_task_[ID].sh
set -e

echo "=== Validating Task: [Description] ==="

# Test 1: Mock Data Check
echo "Test 1: Mock data detection..."
if grep -rE 'test@test\.com|lorem ipsum|\[1,2,3\]' src/; then
  echo "❌ FAIL: Mock data detected"
  exit 1
fi
echo "✅ PASS: No mock data"

# Test 2: Error Handling Check
echo "Test 2: Error handling verification..."
if grep -rE 'catch\s*\{\s*\}' src/; then
  echo "❌ FAIL: Silent failures detected"
  exit 1
fi
echo "✅ PASS: Proper error handling"

# Test 3: Schema Validation
echo "Test 3: Schema validation..."
# Fetch schema and validate all referenced columns exist
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'users';" | \
  grep -q 'email' || { echo "❌ FAIL: Schema mismatch"; exit 1; }
echo "✅ PASS: Schema validated"

# Test 4: Functional Test
echo "Test 4: Functionality test..."
curl -f http://localhost:3000/api/health || {
  echo "❌ FAIL: Service not responding";
  exit 1;
}
echo "✅ PASS: Service healthy"

echo ""
echo "✅ ALL TESTS PASSED"
exit 0
```

### Binary Decision Framework

```yaml
Task Completion Workflow:
  Agent Claims Complete:
    ↓
  Run Validation Script:
    ├─ Exit 0 → Mark Complete ✅
    └─ Exit 1 → REJECTED ❌
        ├─ Log specific failure
        ├─ Return to agent with gaps
        └─ Block dependent tasks
```

---

## 🎯 COMPLEXITY CONTROL

### Honda vs Ferrari Decision Framework

**Before implementing ANY feature, ask:**

```yaml
Complexity Checklist:
  □ Is this in the PRD/requirements?
  □ Would a simple WordPress blog need this?
  □ Am I building for problems that don't exist yet?
  □ Is this a Honda or Ferrari feature?
  □ Can I use an existing tool instead of building custom?
  
  IF ANY UNCERTAIN → ASK USER FIRST
```

### Forbidden Enterprise Features

**❌ Do NOT implement unless explicitly requested:**

- Custom user behavior tracking systems
- Session recording/replay
- Advanced analytics beyond Google Analytics
- User journey mapping
- A/B testing frameworks
- Personalization engines
- Recommendation systems
- Custom caching solutions (use CDN defaults)
- Microservices architecture
- Event sourcing
- Advanced state management (Redux/Zustand)
- Real-time collaboration
- Advanced queuing systems

### Approved Simple Solutions

**✅ Use these instead:**

- Browser cache (automatic)
- CDN cache (Vercel default)
- Google Analytics (basic)
- React built-in state
- URL parameters for routing state
- React Hook Form
- localStorage for user preferences ONLY

---

## 📋 CODE QUALITY STANDARDS

### File Structure (Next.js)

```
src/
├── app/                  # App router pages
│   ├── api/             # Route handlers
│   └── (routes)/        # Page routes
├── components/           # Reusable UI components
├── lib/                  # Utility functions, API clients
├── types/                # TypeScript definitions
├── hooks/                # Custom React hooks
└── styles/               # Global styles
```

### Naming Conventions

```typescript
// Files
UserProfile.tsx           // Components (PascalCase)
apiClient.ts             // Utilities (camelCase)

// Code
export function UserProfile() {}          // Components (PascalCase)
export function getUserData() {}          // Functions (camelCase)
const userEmail = "...";                  // Variables (camelCase)
const MAX_RETRY_ATTEMPTS = 3;            // Constants (SCREAMING_SNAKE_CASE)
interface UserData {}                     // Types (PascalCase)
```

### Security Requirements

```yaml
Every API Endpoint Must:
  - Authenticate requests (Clerk auth)
  - Validate inputs (Zod schema)
  - Use environment variables for secrets
  - Return structured errors
  - Log all operations
  - Implement rate limiting (production)
```

---

## 🚀 DEPLOYMENT STANDARDS

### Docker Swarm Deployment Checklist

```yaml
Pre-Deployment Validation:
  □ Health check endpoint exists and tested
  □ Rolling update strategy configured
  □ Rollback config defined
  □ Resource limits set
  □ Environment variables in secrets
  □ Validation script passes
  □ No mock data in build
  □ All tests passing
```

### Zero-Downtime Deployment Pattern

```bash
# Deploy with automatic rollback on failure
docker stack deploy \
  --prune \
  --resolve-image always \
  -c docker-compose.yml \
  <stack-name>

# Monitor deployment
watch -n 2 'docker service ps <service-name>'

# Validation
# Services should show: 0/3 → 1/3 → 2/3 → 3/3 (replicas)
# Old replicas shutdown only after new ones healthy
```

### Rollback Procedure

```bash
# Automatic rollback (if failure_action: rollback)
# Manual rollback command:
docker service rollback <service-name>

# Verify rollback
docker service inspect <service-name> | grep Image

# Test old version
curl https://api.xencolabs.com/health
```

---

## 🎯 AGENT-SPECIFIC APPLICATIONS

### Project Manager Agents

**Use this skill for:**
- Validating task completions
- Running mock data detection
- Checking for silent failures
- Enforcing schema validation
- Running validation scripts
- Rejecting violations immediately

### Development Agents

**Use this skill for:**
- Code generation standards
- API design patterns
- Database access patterns
- Docker configuration
- Error handling implementation
- Avoiding mock data

### Validation Agents

**Use this skill for:**
- Creating validation scripts
- Defining acceptance criteria
- Schema validation procedures
- Binary pass/fail decisions
- Evidence requirements

### Orchestrator Agents

**Use this skill for:**
- Delegating with quality standards
- Coordinating multiple agents
- Ensuring consistent standards across sub-agents
- Escalation criteria

---

## 📊 SUCCESS METRICS

**Project is successful when:**

```yaml
Quality Gates:
  ✅ Zero mock data in production
  ✅ 100% schema validation before DB operations
  ✅ All errors explicitly handled
  ✅ All validation scripts pass
  ✅ Clean, maintainable codebase
  ✅ Fast, reliable performance
  ✅ Appropriate complexity for scale
  ✅ Deployment ready with health checks
  ✅ MCP protocol compliance
```

**Red Flags (Immediate Attention Required):**

```yaml
Violations:
  ❌ Mock data patterns detected
  ❌ Silent error handling (empty catch blocks)
  ❌ Workaround comments (TODO/FIXME/HACK)
  ❌ Unvalidated database operations
  ❌ HTTP requests to MCP servers
  ❌ Hallucinated table/column names
  ❌ Complex features for simple needs
  ❌ Performance issues from over-engineering
```

---

## 🔍 DETECTION & ENFORCEMENT TOOLS

### Quick Validation Commands

```bash
# Run all checks on a codebase
./xenco-validate.sh /path/to/project

# Individual checks
./xenco-validate.sh --mock-data
./xenco-validate.sh --silent-failures  
./xenco-validate.sh --schema-validation
./xenco-validate.sh --mcp-protocol

# Output: Pass/Fail with specific violations
```

### Integration with Agent Workflows

```yaml
Agent Workflow Integration:
  1. Agent completes task
  2. Load Xenco Production Standards skill
  3. Run relevant detection patterns
  4. Execute validation script
  5. Binary decision: PASS or FAIL
  6. If FAIL: Return specific gaps to agent
  7. If PASS: Mark complete, proceed to next task
```

---

## 🎓 REMEMBER

**This skill replaces:**
- Repeated standards in agent manifests
- Manual quality checks
- Forgotten rules from long conversations
- Inconsistent enforcement across agents

**This skill provides:**
- Single source of truth for all standards
- Executable validation patterns
- Persistent rules that don't get forgotten
- Consistent enforcement across all agents
- Binary pass/fail criteria

**When to reference this skill:**
- Before generating any code
- Before any database operation
- When validating task completion
- When creating validation scripts
- When delegating to sub-agents
- When making architectural decisions

---

**Build Honda reliability, not Ferrari complexity.**
**Fix root causes, not symptoms.**
**Validate everything, assume nothing.**
