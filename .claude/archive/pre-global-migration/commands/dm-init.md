---
name: dm-init
description: Initialize and verify DevMaestro installation
version: 2.1.5
last_modified: 2025-10-11
devmaestro: true
---

<!--
VERSION: 2.1.5
LAST MODIFIED: 2025-10-11

CHANGELOG:
  v2.1.5 (2025-10-11):
    - CRITICAL FIX: Auto-migrate old local installations to global architecture
    - Detects local .claude/hooks/, commands/, agents/ directories
    - Archives old local files to .claude/archive/pre-global-migration/
    - Keeps project-specific files (secrets, memory_backups, session ID)
    - Ensures clean global/local separation (Honda principle)
    - Fixes path resolution to use ~/.claude/ for shared components
  v2.0.0 (2025-10-11):
    - Added Step 4: Session ID Configuration verification
    - Added Step 5: API Key Configuration verification
    - Calls update-session-id.py helper during installation
    - Enhanced output format with Session ID and API Key status
    - Ensures memory system is fully operational from installation
  v1.0.0 (Original):
    - Basic directory and hook verification
    - settings.json path validation
    - MCP server installation via CLI
    - Basic test and reporting
-->

You are the DevMaestro installation validator. Your job is to verify and fix the DM-Mini MCP installation.

**CRITICAL REFERENCE DOCUMENT:**
Read `servers/dm-mini-mcp/CORRECT_INSTALLATION_CONFIG.md` first - this is the source of truth for correct configuration.

**Your tasks:**

1. **Check for Updates from Server (PREREQUISITE)**
   - Try global first: `python3 ~/.claude/hooks/auto-update.py --check`
   - If global doesn't exist, try local: `python3 .claude/hooks/auto-update.py --check`
   - This checks if newer version is available on dm-memory.devmaestro.io
   - If updates available, ask user: "Updates available. Install now? (y/n)"
   - If user says yes (or --auto-update flag), run with global path: `python3 ~/.claude/hooks/auto-update.py --install --global-dir ~/.claude`
   - Then run version checker from global: `python3 ~/.claude/hooks/check-versions.py`
   - Display version check results to user
   - **This is informational only** - continue with installation regardless

2. **Migrate Old Local Installation (CRITICAL - Global/Local Architecture)**
   - **Check if migration is needed:**
     ```bash
     if [ -d ".claude/hooks" ] && [ -d "$HOME/.claude/hooks" ]; then
       echo "⚠️  OLD LOCAL INSTALLATION DETECTED"
       echo "Migrating to global architecture (Honda: Simple > Complex)..."
       
       # Create archive directory
       mkdir -p .claude/archive/pre-global-migration
       
       # Archive old local files (don't delete, archive for safety)
       echo "📦 Archiving old local files..."
       [ -d ".claude/hooks" ] && mv .claude/hooks .claude/archive/pre-global-migration/ 2>/dev/null
       [ -d ".claude/commands" ] && mv .claude/commands .claude/archive/pre-global-migration/ 2>/dev/null
       [ -d ".claude/agents" ] && mv .claude/agents .claude/archive/pre-global-migration/ 2>/dev/null
       [ -d ".claude/docs" ] && mv .claude/docs .claude/archive/pre-global-migration/ 2>/dev/null
       
       echo "✅ Migration complete!"
       echo "   • Old files archived to: .claude/archive/pre-global-migration/"
       echo "   • Project-specific files kept: secrets/, memory_backups/, .current_session_id"
       echo "   • Now using global files: ~/.claude/"
       echo ""
     fi
     ```
   - **What gets archived:** hooks/, commands/, agents/, docs/ (shared components)
   - **What stays local:** secrets/, memory_backups/, .current_session_id (project-specific)
   - **Why:** Global/local architecture prevents duplication, ensures consistency
   - **Safety:** Old files archived, not deleted, can be reviewed/restored if needed

3. **Check Node.js Installation (PREREQUISITE)**
   - Run `node --version` to check if Node.js is installed
   - Run `npm --version` to check if npm is installed
   - Run `npx --version` to check if npx is installed
   - **If ANY are missing:**
     ```
     ⚠️  NODE.JS REQUIRED

     DevMaestro requires Node.js to run the MCP server.

     Please install Node.js 20.x LTS first:

     curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
     sudo apt-get install -y nodejs

     Then run /dm-init again.
     ```
   - Stop initialization if Node.js is not installed
   - Continue only if all three commands return version numbers

4. **Verify Directory Structure (Local Project-Specific Only)**
   - Check `.claude/` directory exists
   - Check `.claude/memory_backups/` directory exists (project-specific)
   - Check `.claude/secrets/` directory exists (project-specific)
   - Create any missing directories with `mkdir -p`
   - **NOTE:** hooks/, commands/, agents/ should NOT exist locally (they're global now)
   - **If they exist:** Run Step 2 migration again or user manually deleted incorrectly

5. **Verify Hook Scripts (From Global Directory)**
   - Check for `~/.claude/hooks/session-start-digest-injection.py`
   - Check for `~/.claude/hooks/precompact-digest-generation.py`
   - Check for `~/.claude/hooks/post-response-memory.py`
   - Check for `~/.claude/hooks/update-session-id.py` (session ID helper)
   - Check for `~/.claude/hooks/auto-update.py` (auto-update system)
   - Verify all scripts are executable with `ls -la ~/.claude/hooks/`
   - If not executable, run `chmod +x ~/.claude/hooks/*.py`
   - **These are GLOBAL files** - shared across all projects

6. **Verify Session ID Configuration (CRITICAL for Memory System)**
   - Check if `.claude/.current_session_id` file exists (project-specific)
   - If it doesn't exist OR you want to refresh it:
     - Run the helper script: `python3 ~/.claude/hooks/update-session-id.py`
     - This will auto-detect the current active session and update the file
   - Verify the file contains a valid UUID after running
   - **This file is LOCAL** - tracks current session for THIS project only
   - **Why this matters:** Without this file, PreCompact hook cannot save session digests
   
7. **Verify API Key Configuration**
   - Check for `.claude/secrets/DEBUG_API_KEY` or `.claude/secrets/ASSIST_API_KEY`
   - If missing, create it with: `echo "sk-local-apps-server14-memory-2025" > .claude/secrets/DEBUG_API_KEY`
   - Set secure permissions: `chmod 600 .claude/secrets/DEBUG_API_KEY`
   - **Why this matters:** Memory service needs API key to generate AI digests

7. **Verify settings.json Configuration (with .local priority)**
   - **CRITICAL:** Check for `.claude/settings.local.json` first
   - **Priority Logic:**
     - If `settings.local.json` exists → it overrides `settings.json`
     - Use `settings.local.json` as the target file
     - Backup `settings.json` to `settings.json.backup-[timestamp]` if it exists
     - Display warning: "⚠️  Found settings.local.json - updating that file (it overrides settings.json)"
   - If NO `settings.local.json` → use `settings.json` normally
   - Get current working directory with `pwd` to get absolute path
   - **CRITICAL:** All hook paths MUST be absolute paths (no relative paths like `./` or `../`)
   - Check each hook command path in the target file:
     - `PreCompact` hook command
     - `SessionStart` hook command
     - `PostToolUse` hook command
   - If any paths are relative, convert to absolute:
     - Example: `./.claude/hooks/script.py` → `/absolute/path/to/project/.claude/hooks/script.py`
   - Update the target file (settings.local.json OR settings.json) using Edit tool

8. **Install/Verify MCP Server via CLI (CRITICAL)**
   - **DO NOT just check .mcp.json** - it doesn't reflect actual installation status
   - **MUST use `claude mcp list` to check** - this is the ONLY accurate check
   - **Check installation status:**
     ```bash
     claude mcp list
     ```
   - **Parse the output**:
     - If `dm-mini` appears with ✓ (checkmark) → Installed and connected ✅
     - If `dm-mini` appears with ✗ (X) → Installed but not connecting ⚠️
     - If `dm-mini` doesn't appear at all → Not installed ❌
   - **Action based on status:**
     - **If ✓ Connected**: Check environment variables with `claude mcp get dm-mini`
       - If env vars are correct → Skip, already working ✅
       - If env vars are wrong → Reinstall (remove then add)
     - **If ✗ Failed or not installed**: Install/reinstall
       1. Remove if exists: `claude mcp remove dm-mini` (safe even if not installed)
       2. Get absolute path: `pwd`
       3. Install: `claude mcp add dm-mini -e DM_MEMORY_URL=https://dm-memory.devmaestro.io -e DEBUG_API_KEY=sk-local-apps-server14-memory-2025 -e MEMORY_STORE_PATH=/absolute/path/.claude/memory_backups -- npx --registry=https://mcpreg.xencolabs.com @xeniac/dm-mini-mcp`
       4. Replace `/absolute/path/` with actual project path from `pwd`
   - **Verify after install**: Run `claude mcp list` again - should show "dm-mini" with ✓
   - **Optional**: Update .mcp.json for documentation, but CLI is what actually matters

9. **Test MCP Installation**
   - Run `claude mcp list` to verify dm-mini shows as connected
   - Try calling `mcp__dm-mini__recall` tool with key `test.init.check`
   - Expected: Tool should execute (even if it returns "not found", that's OK - means MCP is working)
   - If tool doesn't exist after CLI install, restart Claude Code session

10. **Report Results**
   - Show what was checked
   - Show what was fixed
   - Show current configuration summary
   - Confirm installation is ready OR explain what needs manual intervention

**Output Format:**
```
🔧 DevMaestro Installation Validator

🔢 System Version: [version from manifest or "unknown"]
📁 Directory Structure: [status]
📜 Hook Scripts: [status]
🆔 Session ID File: [status]
🔑 API Key Configuration: [status]
⚙️  settings.json: [status]
🔌 MCP Configuration: [status]
🧪 MCP Connection Test: [status]

[If fixes were made:]
Fixed issues:
  - [list of fixes]

[Current configuration:]
  Project: [absolute path]
  Memory: [absolute path to memory_backups]
  Hooks: [summary of hook paths]

[Final status:]
✅ Installation verified and ready!
OR
⚠️ Issues found that need manual intervention: [details]
```

**Error Handling:**
- If you cannot read a file, explain which file and why
- If you cannot fix an issue, explain what the user needs to do manually
- If MCP server is not responding, suggest reinstalling with correct command from CORRECT_INSTALLATION_CONFIG.md

**CRITICAL: Correct .mcp.json Format**

When creating or fixing .mcp.json, use this EXACT format:

```json
{
  "mcpServers": {
    "dm-mini": {
      "command": "npx",
      "args": [
        "--registry=https://mcpreg.xencolabs.com",
        "-y",
        "@xeniac/dm-mini-mcp"
      ],
      "env": {
        "DM_MEMORY_URL": "https://dm-memory.devmaestro.io",
        "DEBUG_API_KEY": "sk-local-apps-server14-memory-2025",
        "MEMORY_STORE_PATH": "/absolute/path/to/project/.claude/memory_backups"
      }
    }
  }
}
```

**Common Mistakes to Avoid:**
- ❌ Using `@devmaestro/dm-mini-mcp` (wrong package name)
- ❌ Missing `--registry=https://mcpreg.xencolabs.com`
- ❌ Using relative path for MEMORY_STORE_PATH
- ❌ Missing any of the 3 environment variables
- ❌ **CRITICAL:** Only editing .mcp.json without using `claude mcp add` CLI command

**WHY CLI COMMANDS ARE REQUIRED:**

As of October 2025, Claude Code does NOT reliably load MCP servers from .mcp.json file alone. The ONLY reliable method is:

1. `claude mcp remove dm-mini` (if exists)
2. `claude mcp add dm-mini [options]` (installs and activates)
3. `claude mcp list` (verify shows "connected")

Editing .mcp.json manually often results in MCP showing "no servers installed" even though the JSON file is correct. This is a Claude Code behavior, not a configuration issue. Always use CLI commands for installation.
