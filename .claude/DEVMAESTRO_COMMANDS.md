# DevMaestro Commands

<!-- VERSION: 2.1.0 -->
<!-- LAST MODIFIED: 2025-10-11 -->

## Core Commands

### /dm-init
**Initialize and verify DevMaestro installation**

Checks and fixes:
- Directory structure (`.claude/`, `hooks/`, `memory_backups/`, `secrets/`)
- Hook scripts (session-start, precompact, post-response)
- Session ID configuration
- API key configuration
- settings.json hook paths
- CLAUDE.md integration
- MCP server installation (dm-mini)

**Usage:** Just type `/dm-init` and the system will guide you through setup.

**When to use:**
- First-time installation
- After moving project to new location
- After updating DevMaestro version
- When hooks stop working

---

### /dm-doctor
**Diagnose and fix memory system issues**

Performs comprehensive health check:
- System version validation
- Component version checking
- Directory structure
- Hook scripts and executability
- Session ID status (current/stale/missing)
- API key configuration
- settings.json paths
- Memory backups analysis
- Session files verification
- Memory system pipeline test
- MCP server status
- CLAUDE.md integration

**Usage:** Type `/dm-doctor` anytime you suspect issues.

**When to use:**
- Memory digests not generating
- Hooks not running
- After switching projects
- Before reporting bugs
- Periodic health checks

---

### /pm
**Project Manager - Task orchestration and validation**

The Project Manager coordinates all development tasks and enforces validation gates.

**Features:**
- Task-specific validation gates
- Automated sub-task creation
- Progress tracking
- Quality assurance checkpoints
- Integration with validation system

**Usage Examples:**
- `/pm Create user authentication system`
- `/pm Review current progress`
- `/pm Validate database schema changes`

**Validation Integration:**
The PM automatically routes tasks through the AgentOS Validation Orchestrator for:
- Schema validation (database operations)
- API validation (endpoint changes)
- Security validation (auth/permissions)
- Performance validation (optimization tasks)

---

### /validate
**Run task-specific validation gates**

Directly invoke the validation system for specific checks.

**Usage:**
- `/validate schema for users table`
- `/validate api endpoints`
- `/validate security permissions`

**Validation Types:**
- **Schema Validation:** Verifies database structure before operations
- **API Validation:** Checks endpoint contracts and responses
- **Security Validation:** Audits authentication and authorization
- **Performance Validation:** Validates optimization changes
- **Integration Validation:** Tests cross-system interactions

---

## MCP Integration

### dm-mini MCP Server

DevMaestro uses the `dm-mini` MCP server for memory operations.

**Installation:**
```bash
claude mcp add dm-mini \
  -e DM_MEMORY_URL=https://dm-memory.devmaestro.io \
  -e DEBUG_API_KEY=sk-local-apps-server14-memory-2025 \
  -e MEMORY_STORE_PATH=/absolute/path/.claude/memory_backups \
  -- npx --registry=https://mcpreg.xencolabs.com @xeniac/dm-mini-mcp
```

**Available Tools:**
- `mcp__dm-mini__remember` - Store information in project memory
- `mcp__dm-mini__recall` - Retrieve stored information
- `mcp__dm-mini__ingest_nl` - Process natural language for orchestration
- `mcp__dm-mini__autopilot_callback` - Submit task completion callbacks
- `mcp__dm-mini__validateAgainst` - Validate changes against memory constraints
- `mcp__dm-mini__discoverSchema` - Auto-discover and save schemas

**Check Status:**
```bash
claude mcp list
```

Should show: `✓ dm-mini` (connected)

---

## Hook System

DevMaestro uses Claude Code hooks for automatic memory management.

### PreCompact Hook
**Trigger:** Before session compaction  
**Script:** `.claude/hooks/precompact-digest-generation.py`  
**Purpose:** Generate AI digest of session and save to memory backups

**Requirements:**
- Session ID file (`.claude/.current_session_id`)
- API key (`.claude/secrets/DEBUG_API_KEY`)
- Session JSONL file exists
- Memory backups directory writable

### SessionStart Hook
**Trigger:** At session start  
**Script:** `.claude/hooks/session-start-digest-injection.py`  
**Purpose:** Load latest digest and inject into context

**Features:**
- Auto-updates session ID
- Loads most recent digest
- Provides session continuity

### PostToolUse Hook
**Trigger:** After tool execution  
**Script:** `.claude/hooks/post-response-memory.py`  
**Purpose:** Pass-through for memory operations (minimal)

---

## Validation System

### AgentOS Validation Orchestrator

The validation system creates task-specific validation gates.

**How it works:**
1. PM detects task requiring validation
2. Routes to AgentOS Validation Orchestrator
3. Orchestrator creates custom validation prompt
4. Validation agent executes checks
5. Results returned to PM for decision

**Validation Patterns:**
- **Schema-First:** Always validate DB schema before operations
- **Contract Validation:** Verify API contracts before changes
- **Security Gates:** Audit permissions before deployment
- **Performance Baselines:** Ensure optimizations don't regress

**Example Flow:**
```
User: "Add email column to users table"
  ↓
PM detects: Database operation
  ↓
Routes to: AgentOS Validation Orchestrator
  ↓
Orchestrator creates: Schema validation gate
  ↓
Validation checks:
  - Users table exists?
  - Email column doesn't exist?
  - Data type appropriate?
  - Indexes needed?
  - Migration reversible?
  ↓
Results: ✓ Safe to proceed / ⚠️ Issues found
  ↓
PM: Proceeds with task / Requests fixes
```

---

## Auto-Update System

DevMaestro can automatically update to the latest version from the server.

**Check for updates:**
```bash
python3 .claude/hooks/auto-update.py --check
```

**Install updates:**
```bash
python3 .claude/hooks/auto-update.py --install
```

**Check component versions:**
```bash
python3 .claude/hooks/check-versions.py
```

**Server endpoint:** `https://dm-memory.devmaestro.io/client`

Updates are pulled from the central server and installed automatically while preserving local configuration.

---

## Configuration Files

### VERSION_MANIFEST.json
Lists all components and their required versions.

**Location:** `.claude/VERSION_MANIFEST.json`

### settings.json
Hook configuration with absolute paths.

**Location:** `.claude/settings.json` (or `settings.local.json`)

**Priority:** `settings.local.json` overrides `settings.json` if present.

### .current_session_id
Tracks the current active session for memory operations.

**Location:** `.claude/.current_session_id`  
**Auto-updated:** Yes (by SessionStart hook)

### .devmaestro-config.json
Feature flags and DevMaestro configuration.

**Location:** `.claude/.devmaestro-config.json`

**Options:**
```json
{
  "version": "2.1.0",
  "claude_md_integration": {
    "enabled": true,
    "auto_repair": true,
    "backup_on_change": true,
    "preserve_user_content": true
  },
  "modules": {
    "commands": true,
    "agents": true,
    "validation": true
  }
}
```

---

## Troubleshooting

| Issue | Command | Expected Result |
|-------|---------|-----------------|
| Commands not working | `/dm-doctor` | Diagnoses issue |
| Memory digests not saving | Check `.claude/.current_session_id` | Should contain UUID |
| Hooks not running | Check `settings.json` paths | Must be absolute paths |
| MCP not connected | `claude mcp list` | Should show ✓ dm-mini |
| Outdated components | `python3 .claude/hooks/check-versions.py` | Shows version status |
| CLAUDE.md corrupted | `python3 .claude/hooks/check-claude-md.py` | Auto-repairs with backup |

---

## Support

**Documentation:** `.claude/` directory  
**Version Check:** `python3 .claude/hooks/check-versions.py`  
**Health Check:** `/dm-doctor`  
**Server Status:** https://dm-memory.devmaestro.io/health

DevMaestro v2.1.0 - Global/Local Architecture & Validation System
