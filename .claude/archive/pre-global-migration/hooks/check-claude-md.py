#!/usr/bin/env python3
"""
CLAUDE.md Verification and Repair Script

VERSION: 2.1.0
LAST MODIFIED: 2025-10-11

CHANGELOG:
  v2.1.0 (2025-10-11):
    - Initial creation for CLAUDE.md management
    - Auto-detection of missing/corrupted integration
    - Backup mechanism with timestamps
    - User customization preservation
    - Respects .devmaestro-config.json settings
    - Protection against `claude init` overwrite

PURPOSE:
  - Verify CLAUDE.md exists and contains DevMaestro integration
  - Auto-repair with backup if integration missing
  - Preserve user customizations during repair
  - Respect user opt-out preferences

USAGE:
  python3 .claude/hooks/check-claude-md.py
"""

import os
import sys
import json
import re
from pathlib import Path
from datetime import datetime

# Paths
PROJECT_ROOT = Path.cwd()
CLAUDE_MD = PROJECT_ROOT / "CLAUDE.md"
CLAUDE_MD_STARTER = PROJECT_ROOT / ".claude" / "CLAUDE.md.starter"
CONFIG_FILE = PROJECT_ROOT / ".claude" / ".devmaestro-config.json"
DISABLED_FILE = PROJECT_ROOT / ".claude" / ".devmaestro-disabled"

# DevMaestro signature to detect integration
DEVMAESTRO_SIGNATURE = "DevMaestro v2.1.0 Integration"
INCLUDE_COMMANDS = "@include .claude/DEVMAESTRO_COMMANDS.md"
INCLUDE_AGENTS = "@include .claude/DEVMAESTRO_AGENTS.md"


def print_status(symbol: str, message: str):
    """Print formatted status message"""
    print(f"{symbol} {message}")


def load_config() -> dict:
    """Load DevMaestro configuration"""
    try:
        if CONFIG_FILE.exists():
            with open(CONFIG_FILE, 'r') as f:
                return json.load(f)
        return {"claude_md_integration": {"enabled": True, "auto_repair": True}}
    except Exception as e:
        print_status("⚠️", f"Error loading config: {e}")
        return {"claude_md_integration": {"enabled": True, "auto_repair": True}}


def is_enabled(config: dict) -> bool:
    """Check if DevMaestro CLAUDE.md integration is enabled"""
    if DISABLED_FILE.exists():
        return False
    
    try:
        return config.get("claude_md_integration", {}).get("enabled", True)
    except:
        return True


def backup_claude_md() -> bool:
    """Backup existing CLAUDE.md with timestamp"""
    if not CLAUDE_MD.exists():
        return True
    
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = PROJECT_ROOT / f"CLAUDE.md.backup-{timestamp}"
        
        with open(CLAUDE_MD, 'r') as f:
            content = f.read()
        
        with open(backup_path, 'w') as f:
            f.write(content)
        
        print_status("💾", f"Backed up to: {backup_path.name}")
        return True
    except Exception as e:
        print_status("❌", f"Backup failed: {e}")
        return False


def extract_user_content(content: str) -> str:
    """Extract user's custom configuration section"""
    try:
        # Look for the custom configuration section
        start_marker = "<!-- ADD YOUR CUSTOM CLAUDE RULES BELOW THIS LINE -->"
        end_marker = "<!-- END CUSTOM CONFIGURATION -->"
        
        if start_marker in content and end_marker in content:
            start_idx = content.find(start_marker)
            end_idx = content.find(end_marker)
            
            if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                return content[start_idx + len(start_marker):end_idx].strip()
        
        # If no markers found, try to extract everything after "Your Custom Configuration"
        custom_section_pattern = r"## Your Custom Configuration.*?(?=##|\Z)"
        match = re.search(custom_section_pattern, content, re.DOTALL)
        if match:
            extracted = match.group(0)
            # Remove the header itself
            extracted = re.sub(r"## Your Custom Configuration.*?\n", "", extracted, count=1)
            return extracted.strip()
        
        return ""
    except Exception as e:
        print_status("⚠️", f"Error extracting user content: {e}")
        return ""


def has_devmaestro_integration(content: str) -> bool:
    """Check if CLAUDE.md has DevMaestro integration"""
    return (DEVMAESTRO_SIGNATURE in content or 
            INCLUDE_COMMANDS in content or 
            INCLUDE_AGENTS in content)


def create_claude_md(user_content: str = "") -> bool:
    """Create/repair CLAUDE.md from starter template"""
    try:
        if not CLAUDE_MD_STARTER.exists():
            print_status("❌", f"Starter template not found: {CLAUDE_MD_STARTER}")
            return False
        
        with open(CLAUDE_MD_STARTER, 'r') as f:
            template = f.read()
        
        # If we have user content, inject it
        if user_content:
            # Find the custom configuration section
            start_marker = "<!-- ADD YOUR CUSTOM CLAUDE RULES BELOW THIS LINE -->"
            end_marker = "<!-- END CUSTOM CONFIGURATION -->"
            
            if start_marker in template and end_marker in template:
                start_idx = template.find(start_marker) + len(start_marker)
                end_idx = template.find(end_marker)
                
                # Inject user content
                template = (template[:start_idx] + 
                           "\n\n" + user_content + "\n\n" + 
                           template[end_idx:])
        
        with open(CLAUDE_MD, 'w') as f:
            f.write(template)
        
        return True
    except Exception as e:
        print_status("❌", f"Error creating CLAUDE.md: {e}")
        return False


def main():
    """Main verification and repair logic"""
    print("\n" + "="*60)
    print("🔍 CLAUDE.md Verification & Repair")
    print("="*60 + "\n")
    
    # Load configuration
    config = load_config()
    
    # Check if enabled
    if not is_enabled(config):
        print_status("ℹ️", "DevMaestro CLAUDE.md integration is disabled")
        print_status("ℹ️", "To enable: Edit .claude/.devmaestro-config.json")
        return 0
    
    # Check if CLAUDE.md exists
    if not CLAUDE_MD.exists():
        print_status("⚠️", "CLAUDE.md not found")
        print_status("🔧", "Creating CLAUDE.md from starter template...")
        
        if create_claude_md():
            print_status("✅", "CLAUDE.md created successfully")
            print_status("📋", "DevMaestro integration installed")
            return 0
        else:
            print_status("❌", "Failed to create CLAUDE.md")
            return 1
    
    # Read existing CLAUDE.md
    try:
        with open(CLAUDE_MD, 'r') as f:
            content = f.read()
    except Exception as e:
        print_status("❌", f"Error reading CLAUDE.md: {e}")
        return 1
    
    # Check for DevMaestro integration
    if has_devmaestro_integration(content):
        print_status("✅", "CLAUDE.md integration verified")
        print_status("✅", "DevMaestro commands and agents available")
        return 0
    
    # Integration missing - needs repair
    print_status("⚠️", "DevMaestro integration missing from CLAUDE.md")
    print_status("ℹ️", "This may happen after running `claude init`")
    
    # Check if auto-repair is enabled
    auto_repair = config.get("claude_md_integration", {}).get("auto_repair", True)
    
    if not auto_repair:
        print_status("ℹ️", "Auto-repair is disabled in config")
        print_status("📝", "To enable: Edit .claude/.devmaestro-config.json")
        print_status("💡", "Or run: /dm-init to repair manually")
        return 1
    
    print_status("🔧", "Auto-repairing CLAUDE.md...")
    
    # Backup existing file
    if not backup_claude_md():
        print_status("❌", "Cannot proceed without backup")
        return 1
    
    # Extract user content
    print_status("📝", "Preserving user customizations...")
    user_content = extract_user_content(content)
    
    if user_content:
        print_status("✅", f"Preserved {len(user_content)} characters of user content")
    
    # Create new CLAUDE.md with user content
    if create_claude_md(user_content):
        print_status("✅", "CLAUDE.md repaired successfully")
        print_status("📋", "DevMaestro integration restored")
        print_status("💾", "User customizations preserved")
        print_status("📁", "Original backed up with timestamp")
        return 0
    else:
        print_status("❌", "Repair failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
