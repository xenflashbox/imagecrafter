#!/bin/bash

#######################################
# DevMaestro MCP - Quick Installer
# Version: Latest (October 2025)
#######################################

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(pwd)"
CLAUDE_DIR="$HOME/.claude"

echo "🚀 DevMaestro MCP - Quick Installer"
echo "===================================="
echo ""
echo "📍 Installation Location: $PROJECT_DIR"
echo "📂 Source Files: $SCRIPT_DIR"
echo ""

# Step 1: Check Node.js
echo "1️⃣  Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found!"
    echo ""
    echo "DevMaestro requires Node.js 20.x LTS."
    echo ""
    echo "To install Node.js, run:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "  sudo apt-get install -y nodejs"
    echo ""
    echo "Then run this installer again."
    exit 1
fi

NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
echo "   ✅ Node.js: $NODE_VERSION"
echo "   ✅ npm: $NPM_VERSION"
echo ""

# Step 2: Check Claude Code
echo "2️⃣  Checking Claude Code..."
if ! command -v claude &> /dev/null; then
    echo "❌ Claude Code not found!"
    echo ""
    echo "Please install Claude Code first:"
    echo "  curl -fsSL https://docs.claude.com/en/docs/claude-code/install.sh | sh"
    echo ""
    echo "Then run this installer again."
    exit 1
fi

CLAUDE_VERSION=$(claude --version 2>/dev/null || echo "unknown")
echo "   ✅ Claude Code: $CLAUDE_VERSION"
echo ""

# Step 3: Create directories
echo "3️⃣  Creating .claude directories..."
mkdir -p "$CLAUDE_DIR"
mkdir -p "$CLAUDE_DIR/commands"
mkdir -p "$CLAUDE_DIR/hooks"
mkdir -p "$CLAUDE_DIR/secrets"
mkdir -p "$CLAUDE_DIR/memory_backups"
echo "   ✅ Directories created"
echo ""

# Step 4: Copy command files
echo "4️⃣  Installing command files..."
cp "$SCRIPT_DIR/commands/dm-init.md" "$CLAUDE_DIR/commands/"
cp "$SCRIPT_DIR/commands/dm-doctor.md" "$CLAUDE_DIR/commands/"
echo "   ✅ dm-init.md"
echo "   ✅ dm-doctor.md"
echo ""

# Step 5: Copy and setup hooks
echo "5️⃣  Installing hook scripts..."
cp "$SCRIPT_DIR/hooks/"*.py "$CLAUDE_DIR/hooks/"
chmod +x "$CLAUDE_DIR/hooks/"*.py
echo "   ✅ precompact-digest-generation.py"
echo "   ✅ session-start-digest-injection.py"
echo "   ✅ post-response-memory.py"
echo ""

# Step 6: Copy secrets
echo "6️⃣  Installing secrets..."
cp "$SCRIPT_DIR/secrets/DEBUG_API_KEY" "$CLAUDE_DIR/secrets/"
chmod 600 "$CLAUDE_DIR/secrets/DEBUG_API_KEY"
echo "   ✅ DEBUG_API_KEY (permissions: 600)"
echo ""

# Step 7: Create settings.json from template
echo "7️⃣  Creating settings.json..."

# Check for settings.local.json
if [ -f "$CLAUDE_DIR/settings.local.json" ]; then
    echo "   ⚠️  Found settings.local.json (overrides settings.json)"

    # Backup settings.json if it exists
    if [ -f "$CLAUDE_DIR/settings.json" ]; then
        BACKUP_FILE="$CLAUDE_DIR/settings.json.backup-$(date +%Y%m%d-%H%M%S)"
        cp "$CLAUDE_DIR/settings.json" "$BACKUP_FILE"
        echo "   📦 Backed up settings.json to: $BACKUP_FILE"
    fi

    # Update settings.local.json
    sed "s|{{PROJECT_PATH}}|$PROJECT_DIR|g" "$SCRIPT_DIR/settings.json.template" > "$CLAUDE_DIR/settings.local.json"
    echo "   ✅ Updated settings.local.json (this file takes precedence)"
else
    # Normal settings.json creation
    sed "s|{{PROJECT_PATH}}|$PROJECT_DIR|g" "$SCRIPT_DIR/settings.json.template" > "$CLAUDE_DIR/settings.json"
    echo "   ✅ settings.json created"
fi
echo ""

# Step 8: Install MCP server
echo "8️⃣  Installing dm-mini MCP server..."
echo "   Checking current installation..."

# Check if already installed
if claude mcp list 2>/dev/null | grep -q "dm-mini.*✓"; then
    echo "   ℹ️  dm-mini already installed and connected"
    echo "   Verifying configuration..."

    # Check environment variables
    MCP_CONFIG=$(claude mcp get dm-mini 2>/dev/null || echo "")
    if echo "$MCP_CONFIG" | grep -q "dm-memory.devmaestro.io"; then
        echo "   ✅ Configuration verified - no reinstall needed"
    else
        echo "   ⚠️  Configuration incorrect - reinstalling..."
        claude mcp remove dm-mini 2>/dev/null || true

        claude mcp add dm-mini \
          -e DM_MEMORY_URL=https://dm-memory.devmaestro.io \
          -e DEBUG_API_KEY=sk-local-apps-server14-memory-2025 \
          -e MEMORY_STORE_PATH="$PROJECT_DIR/.claude/memory_backups" \
          -- npx --registry=https://mcpreg.xencolabs.com @xeniac/dm-mini-mcp

        echo "   ✅ dm-mini reinstalled with correct config"
    fi
else
    # Not installed or not connected
    echo "   Installing dm-mini MCP server..."

    # Remove if exists (safe even if not there)
    claude mcp remove dm-mini 2>/dev/null || true

    # Install with correct config
    claude mcp add dm-mini \
      -e DM_MEMORY_URL=https://dm-memory.devmaestro.io \
      -e DEBUG_API_KEY=sk-local-apps-server14-memory-2025 \
      -e MEMORY_STORE_PATH="$PROJECT_DIR/.claude/memory_backups" \
      -- npx --registry=https://mcpreg.xencolabs.com @xeniac/dm-mini-mcp

    echo "   ✅ dm-mini installed"
fi
echo ""

# Step 9: Verify installation
echo "9️⃣  Verifying installation..."
sleep 2  # Give MCP a moment to connect

if claude mcp list 2>/dev/null | grep -q "dm-mini.*✓"; then
    echo "   ✅ MCP server connected successfully"
else
    echo "   ⚠️  MCP server installed but not connected"
    echo "   Run /dm-doctor to diagnose"
fi
echo ""

# Step 10: Summary
echo "✨ Installation Complete!"
echo "======================="
echo ""
echo "📋 What was installed:"
echo "   ✅ Command files (dm-init, dm-doctor)"
echo "   ✅ Hook scripts (3 hooks)"
echo "   ✅ Secrets (DEBUG_API_KEY)"
echo "   ✅ Settings (project-specific paths)"
echo "   ✅ MCP server (dm-mini)"
echo ""
echo "🧪 Next Steps:"
echo "   1. Start Claude Code in this project:"
echo "      claude"
echo ""
echo "   2. Run dm-init to verify everything:"
echo "      /dm-init"
echo ""
echo "   3. Test MCP tools:"
echo "      /dm-debug \"Test installation\""
echo "      /dm-planning \"Create a test plan\""
echo ""
echo "📚 Documentation:"
echo "   $SCRIPT_DIR/README.md"
echo ""
echo "🐛 Troubleshooting:"
echo "   Run: /dm-doctor"
echo ""
echo "🎉 DevMaestro is ready to use!"
