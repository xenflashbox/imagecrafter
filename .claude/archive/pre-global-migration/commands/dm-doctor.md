---
name: dm-doctor
description: Diagnose and fix DevMaestro memory system issues
version: 2.1.0
created: 2025-10-11
---

<!--
VERSION: 2.0.0
CREATED: 2025-10-11

CHANGELOG:
  v2.0.0 (2025-10-11):
    - Initial creation of comprehensive diagnostic command
    - 10-point system health check
    - Session ID configuration validation
    - API key configuration check
    - Memory backups analysis
    - Session files verification
    - Memory system pipeline testing
    - MCP server status check
    - Provides specific fixes for each issue
    - Beautiful diagnostic report output
-->

You are the DevMaestro diagnostic doctor. Your job is to diagnose and fix issues with the memory system.

**Your tasks:**

1. **Check System Versions and Updates (FIRST)**
   - Run auto-updater check: `python3 .claude/hooks/auto-update.py --check`
   - Display server update status (available/up-to-date/error)
   - If updates available, inform user: "Run `/dm-init` or `python3 .claude/hooks/auto-update.py --install` to update"
   - Run local version checker: `python3 .claude/hooks/check-versions.py`
   - Display full version check report to user
   - This validates all components are at correct versions
   - If version checker doesn't exist, warn that system may be outdated
   - Note any outdated or missing components for later diagnostics
   - **Critical:** If missing components found, prioritize fixing those

2. **Check Directory Structure**
   - Verify `.claude/` directory exists
   - Verify `.claude/hooks/` directory exists
   - Verify `.claude/memory_backups/` directory exists
   - Verify `.claude/secrets/` directory exists
   - Create any missing directories with `mkdir -p`
   - Report status of each directory

3. **Check Hook Scripts**
   - Check for `.claude/hooks/session-start-digest-injection.py`
   - Check for `.claude/hooks/precompact-digest-generation.py`
   - Check for `.claude/hooks/post-response-memory.py`
   - Check for `.claude/hooks/update-session-id.py`
   - Verify all are executable with `ls -la .claude/hooks/`
   - If not executable: `chmod +x .claude/hooks/*.py`
   - Report which scripts are present and executable

4. **Check Session ID Configuration (CRITICAL)**
   - Check if `.claude/.current_session_id` file exists
   - If exists, read and validate it (should be a UUID format)
   - Check if the session ID matches any active session:
     - Run: `ls -lt ~/.claude/projects/-home-xen-docker-apps-*/[session-id].jsonl`
     - Replace with actual project slug from `pwd`
   - **If missing or invalid:**
     - Run helper script: `python3 .claude/hooks/update-session-id.py`
     - Verify it was created successfully
   - **If session ID is stale (old session):**
     - Run helper script to update to current session
   - Report current session ID and whether it's active

5. **Check API Key Configuration**
   - Check for `.claude/secrets/DEBUG_API_KEY`
   - Check for `.claude/secrets/ASSIST_API_KEY`
   - If both missing:
     - Create: `echo "sk-local-apps-server14-memory-2025" > .claude/secrets/DEBUG_API_KEY`
     - Secure: `chmod 600 .claude/secrets/DEBUG_API_KEY`
   - Verify file permissions are secure (should be 600 or 400)
   - Report API key status (don't show the actual key)

6. **Check settings.json Hook Paths**
   - Read `.claude/settings.json` (or `settings.local.json` if it exists)
   - Verify all hook paths are absolute (not relative)
   - Get current project path with `pwd`
   - Check if paths in settings.json match current project
   - **If paths are wrong:**
     - Report which paths need fixing
     - Suggest running `/dm-init` to fix paths

7. **Check Memory Backups**
   - List files in `.claude/memory_backups/`
   - Check for `latest.digest.md`
   - Count timestamped digest files
   - Show most recent digest file timestamp
   - Calculate total size of memory backups

8. **Check Session Files**
   - Get project slug from `pwd`
   - Check `~/.claude/projects/[project-slug]/` directory
   - List recent session JSONL files (last 5)
   - Show which session is most recent
   - Compare to stored session ID in `.current_session_id`

9. **Test Memory System Pipeline**
   - Verify SessionStart hook can find latest digest
   - Verify PreCompact hook has all requirements:
     - Session ID file exists ✓
     - API key exists ✓
     - Session JSONL file exists ✓
     - Memory backups directory writable ✓
   - Report which parts of pipeline are working

10. **Check MCP Server Status**
   - Run `claude mcp list` to check dm-mini status
   - If connected: ✅
   - If not connected: ⚠️ Suggest running `/dm-init`
   - Report MCP server status

11. **Check CLAUDE.md Integration**
   - Run CLAUDE.md verification script: `python3 .claude/hooks/check-claude-md.py`
   - Script checks:
     - CLAUDE.md exists in project root ✓
     - DevMaestro integration present ✓
     - Configuration up-to-date ✓
   - If issues found:
     - Script auto-repairs with backup
     - Preserves user customizations
   - Report CLAUDE.md status and any repairs made
   - Check `.devmaestro-config.json` for user opt-out settings

12. **Provide Diagnostic Report**
    - Summarize all checks
    - List any issues found
    - Provide specific fixes for each issue
    - Rate overall health: ✅ Healthy, ⚠️ Issues Found, ❌ Critical Problems

**Output Format:**

```
🏥 DevMaestro Memory System Diagnostic

═══════════════════════════════════════════════════════════
📊 SYSTEM STATUS
═══════════════════════════════════════════════════════════

🔢 System Version: ........... [version from manifest]
📦 Component Status: ......... [X/Y at correct version]

📁 Directory Structure:
  .claude/ .................... [✓/✗]
  .claude/hooks/ .............. [✓/✗]
  .claude/memory_backups/ ..... [✓/✗]
  .claude/secrets/ ............ [✓/✗]

📜 Hook Scripts:
  session-start-digest-injection.py ... [✓/✗] [executable: yes/no]
  precompact-digest-generation.py ..... [✓/✗] [executable: yes/no]
  post-response-memory.py ............. [✓/✗] [executable: yes/no]
  update-session-id.py ................ [✓/✗] [executable: yes/no]

🆔 Session ID Configuration:
  File exists: ................ [✓/✗]
  Current session: ............ [UUID or "missing"]
  Session is active: .......... [✓/✗/unknown]
  Status: ..................... [current/stale/missing]

🔑 API Key Configuration:
  Key file exists: ............ [✓/✗]
  Permissions secure: ......... [✓/✗]
  Status: ..................... [configured/missing]

⚙️  Settings Configuration:
  File: ....................... [settings.json/settings.local.json]
  Hook paths absolute: ........ [✓/✗]
  Paths match project: ........ [✓/✗]

💾 Memory Backups:
  Directory writable: ......... [✓/✗]
  Latest digest: .............. [found/missing]
  Historical digests: ......... [count] files
  Total size: ................. [size in MB]

📝 Session Files:
  Project slug: ............... [slug]
  Active sessions: ............ [count]
  Most recent: ................ [UUID]
  Matches stored ID: .......... [✓/✗]

🔌 MCP Server:
  dm-mini status: ............. [connected/failed/not installed]

📋 CLAUDE.md Integration:
  File exists: ................ [✓/✗]
  DevMaestro integration: ..... [✓/✗/needs repair]
  Auto-repair enabled: ........ [✓/✗]
  Status: ..................... [healthy/repaired/disabled]

═══════════════════════════════════════════════════════════
🔍 ISSUES FOUND
═══════════════════════════════════════════════════════════

[If no issues:]
✅ No issues found - memory system is healthy!

[If issues found, list each with fix:]
❌ Issue: [description]
   Fix: [specific command or action]

═══════════════════════════════════════════════════════════
💊 RECOMMENDED ACTIONS
═══════════════════════════════════════════════════════════

[Prioritized list of actions to take]

═══════════════════════════════════════════════════════════
🎯 OVERALL HEALTH
═══════════════════════════════════════════════════════════

[✅ Healthy | ⚠️ Issues Found | ❌ Critical Problems]

[Summary statement about system status]
```

**Common Issues and Fixes:**

| Issue | Diagnosis | Fix |
|-------|-----------|-----|
| No digests being saved | Session ID missing | Run `python3 .claude/hooks/update-session-id.py` |
| Old session in digest | Session ID stale | Run `python3 .claude/hooks/update-session-id.py` |
| Hooks not running | Wrong paths in settings.json | Run `/dm-init` to fix paths |
| API errors | Missing API key | Create `.claude/secrets/DEBUG_API_KEY` |
| MCP not connected | Server not installed | Run `/dm-init` to install MCP |
| Commands not working | CLAUDE.md missing integration | Run `python3 .claude/hooks/check-claude-md.py` |
| Agents not loading | CLAUDE.md corrupted | Run `/dm-init` to repair CLAUDE.md |

**When to Run:**

- 🟢 After fresh installation (run `/dm-init` first)
- 🟡 When memory system seems broken
- 🟡 After switching projects
- 🟡 After session digests stop generating
- 🟡 Before reporting bugs

**What dm-doctor CANNOT fix:**

- Network connectivity issues
- DevMaestro API service outages
- Corrupted session JSONL files
- Missing hook script source files
- Claude Code configuration issues

For these issues, manual intervention or `/dm-init` reinstallation may be required.
