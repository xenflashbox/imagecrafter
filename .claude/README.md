# DevMaestro MCP - Official Golden Files

**Version**: Latest (October 2025)
**Purpose**: Official, production-ready configuration files for DevMaestro MCP installation

---

## 📁 Directory Structure

```
dm-mcp-latest/
├── commands/               # Slash commands
│   ├── dm-init.md         # Installation & verification tool
│   └── dm-doctor.md       # Health diagnostics & repair tool
├── hooks/                 # Claude Code hooks
│   ├── precompact-digest-generation.py
│   ├── session-start-digest-injection.py
│   └── post-response-memory.py
├── secrets/               # API keys and credentials
│   └── DEBUG_API_KEY      # dm-memory API key
├── memory_backups/        # Empty directory (gets populated)
├── settings.json.template # Template settings file
├── README.md             # This file
└── install.sh            # Quick installation script
```

---

## ✅ What's Included

### 1. **Latest Command Files**
- **dm-init.md**: Full installation validator with:
  - Node.js prerequisite check
  - settings.local.json priority handling
  - MCP CLI verification (`claude mcp list`)
  - Automatic path fixing
- **dm-doctor.md**: Complete health diagnostics with:
  - Node.js check
  - settings.local.json detection
  - MCP CLI-based status check
  - Auto-fix for common issues
- **dm-plan.md**: Planning agent (uses MCP, not curl API)
- **dm-debug.md**: Debug agent (uses MCP, not curl API)
- **dm-architect.md**: Architecture agent (uses MCP, not curl API)
- **dm-database.md**: Database design agent (uses MCP, not curl API)
- **dm-ui.md**: UI design agent (uses MCP, not curl API)

### 2. **Clean Hook Scripts**
- All executable (`chmod +x`)
- Python3 compatible
- Latest versions with bug fixes

### 3. **Template Settings**
- Uses `{{PROJECT_PATH}}` placeholders
- No hardcoded paths
- No permission errors on other servers
- dm-init replaces placeholders automatically

### 4. **Secrets**
- `DEBUG_API_KEY`: dm-memory authentication key
- Proper permissions (600)

---

## 🚀 Quick Installation

### Option A: Automated Script
```bash
# From any project directory:
/home/xen/docker/appdata/blogcraft-mcp/dm-mcp-latest/install.sh

# Or copy it first:
cp /home/xen/docker/appdata/blogcraft-mcp/dm-mcp-latest/install.sh ~/dm-install.sh
chmod +x ~/dm-install.sh
~/dm-install.sh
```

### Option B: Manual Installation
```bash
# 1. Copy files to .claude directory
cp -r /home/xen/docker/appdata/blogcraft-mcp/dm-mcp-latest/commands ~/.claude/
cp -r /home/xen/docker/appdata/blogcraft-mcp/dm-mcp-latest/hooks ~/.claude/
cp -r /home/xen/docker/appdata/blogcraft-mcp/dm-mcp-latest/secrets ~/.claude/
mkdir -p ~/.claude/memory_backups

# 2. Make hooks executable
chmod +x ~/.claude/hooks/*.py

# 3. Create settings.json from template
PROJECT_PATH=$(pwd)
sed "s|{{PROJECT_PATH}}|$PROJECT_PATH|g" \
  /home/xen/docker/appdata/blogcraft-mcp/dm-mcp-latest/settings.json.template \
  > ~/.claude/settings.json

# 4. Run dm-init to complete setup
/dm-init
```

---

## 📋 Prerequisites

### 1. Node.js Required
```bash
# Check if installed:
node --version
npm --version
npx --version

# If missing, install:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Claude Code Installed
```bash
# Verify:
which claude
# Should output: /home/xen/.local/bin/claude (or similar)
```

---

## 🔧 How dm-init Works

After copying files, run `/dm-init` which will:

1. **Check Node.js** - Ensures Node.js is installed
2. **Check settings.local.json** - Handles priority if it exists
3. **Fix relative paths** - Converts all paths to absolute
4. **Verify MCP server** - Uses `claude mcp list` (NOT .mcp.json)
5. **Install/update MCP** - Via `claude mcp add` CLI command
6. **Create directories** - Sets up memory_backups, etc.
7. **Test connection** - Verifies MCP tools work

---

## 🐛 Troubleshooting

### Issue: "Cannot access .claude-memory directory"
**Cause**: Old settings.json with incorrect permissions copied from another server

**Fix**:
```bash
# Use the template (no hardcoded paths):
PROJECT_PATH=$(pwd)
sed "s|{{PROJECT_PATH}}|$PROJECT_PATH|g" \
  /home/xen/docker/appdata/blogcraft-mcp/dm-mcp-latest/settings.json.template \
  > ~/.claude/settings.json

# Or run dm-init (it fixes paths automatically):
/dm-init
```

### Issue: "MCP server not connecting"
**Fix**:
```bash
# Check Node.js first:
node --version  # Must be installed

# Then run doctor:
/dm-doctor
```

### Issue: settings.local.json overriding changes
**Cause**: Both settings.json and settings.local.json exist

**Fix**: dm-init and dm-doctor now handle this automatically:
- Detects settings.local.json
- Updates that file (it overrides .json)
- Backs up settings.json

---

## 📝 Key Updates in Latest Version

### ✅ Node.js Prerequisite Check
- Both dm-init and dm-doctor check for Node.js first
- Clear installation instructions if missing
- Prevents "MCP won't connect" issues

### ✅ settings.local.json Priority
- Detects .local file automatically
- Updates .local instead of .json if it exists
- Backs up .json to .json.backup-[timestamp]
- Prevents configuration conflicts

### ✅ MCP CLI Verification
- Uses `claude mcp list` to check status (NOT .mcp.json)
- Parses ✓ Connected / ✗ Failed / Missing states
- Only reinstalls if needed
- Validates environment variables

### ✅ Clean Template Settings
- No hardcoded paths
- Uses {{PROJECT_PATH}} placeholders
- No permission directives that fail on other servers
- dm-init replaces placeholders with actual paths

---

## 🔒 Security Notes

### Secrets Management
- `DEBUG_API_KEY` has 600 permissions (owner read/write only)
- Never commit secrets to git
- Each server should have its own secrets directory

### File Permissions
- Hooks: 755 (executable by owner, readable by all)
- Secrets: 600 (owner read/write only)
- Settings: 644 (readable by all, writable by owner)

---

## 📊 Version History

### October 2025 (Current)
- Added Node.js prerequisite check
- Added settings.local.json priority handling
- Fixed MCP CLI verification (uses `claude mcp list`)
- Created template settings with placeholders
- Removed hardcoded paths and permissions
- **Command Files**: Using dm-* prefixed versions (MCP-based, not curl API)
  - Old versions (planning.md, debug.md, etc.) use curl - deprecated
  - New versions (dm-plan.md, dm-debug.md, etc.) use MCP tools - current

### Previous Versions
- See git history for older configs
- Not recommended for new installations

---

## 🎯 Use Cases

### 1. Fresh Server Setup
```bash
# New server, no Claude installed yet
# Install Node.js first, then Claude, then:
/home/xen/docker/appdata/blogcraft-mcp/dm-mcp-latest/install.sh
```

### 2. Updating Existing Installation
```bash
# Backup current config:
cp -r ~/.claude ~/.claude.backup-$(date +%Y%m%d)

# Install latest:
/home/xen/docker/appdata/blogcraft-mcp/dm-mcp-latest/install.sh
```

### 3. Testing in New Project
```bash
cd /path/to/new/project
/home/xen/docker/appdata/blogcraft-mcp/dm-mcp-latest/install.sh
```

---

## 🏗️ Building the Installer Tool

When we create the `dm-cli` installer tool, these are the golden files it should deploy.

**Installer should**:
1. Check Node.js (prerequisite)
2. Copy files from this directory
3. Replace {{PROJECT_PATH}} placeholders
4. Run dm-init for final setup
5. Test MCP connection

**Reference implementation**: `install.sh` in this directory

---

## 📞 Support

### If Installation Fails
1. Run `/dm-doctor` for diagnostics
2. Check `/dm-doctor` output for specific errors
3. Common fixes:
   - Install Node.js if missing
   - Run `claude mcp list` to verify MCP status
   - Check settings.local.json doesn't override settings.json

### If MCP Tools Don't Work
```bash
# Verify installation:
claude mcp list
# Should show: dm-mini: ✓ Connected

# Check configuration:
claude mcp get dm-mini
# Should show correct env vars

# If broken, reinstall:
claude mcp remove dm-mini
/dm-init
```

---

## ✨ What Makes This "Golden"

1. **Latest Updates**: All recent bug fixes and improvements
2. **Clean Install**: No hardcoded paths or server-specific configs
3. **Template-Based**: Placeholders get replaced during install
4. **Well-Tested**: Used on servers 12, 14, and 108 successfully
5. **Future-Proof**: Basis for the official dm-cli installer tool
6. **Documented**: Complete README and installation instructions

---

## 🚦 Quick Checklist

Before installation:
- [ ] Node.js installed (`node --version`)
- [ ] Claude Code installed (`which claude`)
- [ ] In project directory where you want DevMaestro

After installation (should all be ✅):
- [ ] `/dm-init` runs successfully
- [ ] `claude mcp list` shows dm-mini: ✓ Connected
- [ ] MCP tools work (`/dm-debug "test"`)
- [ ] Hooks run (check `.claude/memory_backups/` for files)

---

## 📁 File Manifest

| File | Purpose | Permissions |
|------|---------|-------------|
| `commands/dm-init.md` | Installation & verification | 644 |
| `commands/dm-doctor.md` | Health diagnostics | 644 |
| `commands/dm-plan.md` | Planning agent (MCP) | 644 |
| `commands/dm-debug.md` | Debug agent (MCP) | 644 |
| `commands/dm-architect.md` | Architecture agent (MCP) | 644 |
| `commands/dm-database.md` | Database agent (MCP) | 644 |
| `commands/dm-ui.md` | UI design agent (MCP) | 644 |
| `hooks/precompact-digest-generation.py` | Pre-compact hook | 755 |
| `hooks/session-start-digest-injection.py` | Session start hook | 755 |
| `hooks/post-response-memory.py` | Post-tool hook | 755 |
| `secrets/DEBUG_API_KEY` | dm-memory API key | 600 |
| `settings.json.template` | Settings template | 644 |
| `memory_backups/` | Empty directory | 755 |
| `README.md` | This documentation | 644 |
| `install.sh` | Quick installer | 755 |

---

**Last Updated**: October 5, 2025
**Maintained By**: DevMaestro Team
**Location**: `/home/xen/docker/appdata/blogcraft-mcp/dm-mcp-latest/`
