#!/usr/bin/env python3
"""
DevMaestro Auto-Update System
------------------------------
Automatically checks for and installs updates from the DevMaestro server.

VERSION: 2.1.3
CREATED: 2025-10-11
UPDATED: 2025-10-11
CHANGELOG:
  v2.1.3 (2025-10-11):
    - SIMPLIFIED: Always download ENTIRE package (1MB, 2 seconds)
    - REMOVED: Granular file-level versioning (overengineered)
    - System version bump = full reinstall of all files
    - Honda philosophy: Simple, reliable, maintainable
    - No complex version comparison logic
    - Bulletproof: What's on server is what you get
  v2.1.2 (2025-10-11):
    - Added cleanup_old_agents() to remove outdated DevMaestro agents
    - Preserves user custom agents (non-DevMaestro)
    - Automatic cleanup on --install (prevents accumulation of old files)
  v2.1.0 (2025-10-11):
    - Added --global-dir parameter for global/local installation
    - Support for ~/.claude/ global directory
    - Separates shared components from project-specific ones
  v2.0.0 (2025-10-11):
    - Initial creation of auto-update system
    - Checks server for latest version
    - Downloads and installs updated files
"""
import sys
import json
import httpx
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import hashlib
import shutil
from datetime import datetime
import os

# =============================================================================
# CONFIGURATION
# =============================================================================

API_BASE_URL = os.getenv("DM_MEMORY_URL", "https://dm-memory.devmaestro.io")
VERSION_ENDPOINT = f"{API_BASE_URL}/api/client/version"
DOWNLOAD_BASE_URL = f"{API_BASE_URL}/api/client/download"

TIMEOUT = 30.0  # seconds

# Global installation directory (can be overridden)
INSTALL_DIR = Path(".claude")  # Default, will be set by argument

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_current_version() -> Optional[str]:
    """Get current local version from VERSION_MANIFEST.json"""
    try:
        manifest_file = INSTALL_DIR / "VERSION_MANIFEST.json"
        if manifest_file.exists():
            with manifest_file.open('r') as f:
                manifest = json.load(f)
                return manifest.get("system_version")
        return None
    except Exception:
        return None


def check_for_updates() -> Tuple[bool, Dict]:
    """
    Check if updates are available from server.
    
    Returns:
        (updates_available: bool, info: dict)
    """
    try:
        current_version = get_current_version() or "0.0.0"
        
        response = httpx.get(
            f"{API_BASE_URL}/api/client/version/compare",
            params={"client_version": current_version},
            timeout=TIMEOUT
        )
        response.raise_for_status()
        
        data = response.json()
        return (not data.get("up_to_date", False), data)
        
    except Exception as e:
        return (False, {"error": str(e)})


def download_manifest() -> Optional[Dict]:
    """Download the latest version manifest from server"""
    try:
        response = httpx.get(VERSION_ENDPOINT, timeout=TIMEOUT)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error downloading manifest: {e}", file=sys.stderr)
        return None


def download_file(file_type: str, filename: str, destination: Path) -> bool:
    """
    Download a single file from server.
    
    Args:
        file_type: Type of file (hooks, commands, config, docs, agents)
        filename: Name of file to download
        destination: Local path to save file
        
    Returns:
        Success status
    """
    try:
        url = f"{DOWNLOAD_BASE_URL}/{file_type}/{filename}"
        response = httpx.get(url, timeout=TIMEOUT)
        response.raise_for_status()
        
        # Ensure parent directory exists
        destination.parent.mkdir(parents=True, exist_ok=True)
        
        # Write file
        destination.write_bytes(response.content)
        
        # Make executable if Python script
        if filename.endswith('.py'):
            destination.chmod(0o755)
        
        return True
        
    except Exception as e:
        print(f"Error downloading {filename}: {e}", file=sys.stderr)
        return False


def backup_file(file_path: Path) -> Optional[Path]:
    """
    Create a backup of existing file.
    
    Returns:
        Path to backup file or None if backup failed
    """
    try:
        if not file_path.exists():
            return None
            
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = file_path.parent / f"{file_path.name}.backup-{timestamp}"
        shutil.copy2(file_path, backup_path)
        return backup_path
        
    except Exception as e:
        print(f"Error backing up {file_path}: {e}", file=sys.stderr)
        return None


def update_component(file_type: str, filename: str, component_info: Dict) -> bool:
    """
    Update a single component file.
    
    Args:
        file_type: Type of file (hooks, commands, config, docs, agents)
        filename: Name of file
        component_info: Component metadata from manifest
        
    Returns:
        Success status
    """
    # Determine destination path
    if file_type == "hooks":
        destination = INSTALL_DIR / "hooks" / filename
    elif file_type == "commands":
        destination = INSTALL_DIR / "commands" / filename
    elif file_type == "agents":
        destination = INSTALL_DIR / "agents" / filename
    elif file_type == "config":
        if filename == "VERSION_MANIFEST.json":
            destination = INSTALL_DIR / filename
        else:
            destination = INSTALL_DIR / filename
    elif file_type == "docs":
        destination = INSTALL_DIR / filename
    else:
        print(f"Unknown file type: {file_type}", file=sys.stderr)
        return False
    
    # Backup existing file if it exists
    if destination.exists():
        backup_path = backup_file(destination)
        if backup_path:
            print(f"  Backed up existing: {backup_path.name}", file=sys.stderr)
    
    # Download new file
    if download_file(file_type, filename, destination):
        print(f"  ✓ Updated: {filename}", file=sys.stderr)
        return True
    else:
        print(f"  ✗ Failed: {filename}", file=sys.stderr)
        return False


def is_devmaestro_agent(agent_path: Path) -> bool:
    """
    Check if an agent file is a DevMaestro agent.
    
    Args:
        agent_path: Path to agent file
        
    Returns:
        True if it's a DevMaestro agent, False otherwise
    """
    try:
        with agent_path.open('r') as f:
            # Read first 100 lines to check for DevMaestro markers
            lines = []
            for i, line in enumerate(f):
                if i >= 100:
                    break
                lines.append(line)
            content = ''.join(lines).lower()
            return 'devmaestro' in content
    except Exception:
        return False


def cleanup_old_agents(manifest: Dict, dry_run: bool = False) -> Tuple[int, int]:
    """
    Remove old DevMaestro agents that are no longer in the official distribution.
    Preserves user custom agents (non-DevMaestro).
    
    Args:
        manifest: Server manifest with official agent list
        dry_run: If True, only report what would be deleted
        
    Returns:
        (deleted_count, preserved_count)
    """
    agents_dir = INSTALL_DIR / "agents"
    
    if not agents_dir.exists():
        return (0, 0)
    
    # Get official agent list from manifest
    official_agents = set(manifest["components"].get("agents", {}).keys())
    
    # Get all local agents
    local_agents = [f.name for f in agents_dir.glob('*.md')]
    
    deleted_count = 0
    preserved_count = 0
    to_delete = []
    
    for agent in local_agents:
        if agent in official_agents:
            # Official agent, keep it
            preserved_count += 1
        else:
            # Not in official list, check if it's a DevMaestro agent
            agent_path = agents_dir / agent
            if is_devmaestro_agent(agent_path):
                # Old DevMaestro agent, mark for deletion
                to_delete.append(agent)
            else:
                # User custom agent, preserve it
                preserved_count += 1
                if not dry_run:
                    print(f"  ℹ️  Preserving custom agent: {agent}", file=sys.stderr)
    
    if to_delete:
        print(f"\n🧹 Cleaning up {len(to_delete)} old DevMaestro agents:", file=sys.stderr)
        for agent in sorted(to_delete):
            if dry_run:
                print(f"  Would delete: {agent}", file=sys.stderr)
            else:
                try:
                    (agents_dir / agent).unlink()
                    deleted_count += 1
                    print(f"  ✓ Deleted: {agent}", file=sys.stderr)
                except Exception as e:
                    print(f"  ✗ Failed to delete {agent}: {e}", file=sys.stderr)
    
    return (deleted_count, preserved_count)


# Removed compare_file_versions() - no longer needed!
# System version bump = full package reinstall (simple & reliable)


def perform_update(manifest: Dict, selective: Optional[List[str]] = None) -> Tuple[int, int]:
    """
    Perform full reinstall of ALL components (simple & reliable).
    
    Strategy: Download entire 1MB package - fast, bulletproof, no version confusion.
    
    Args:
        manifest: Server manifest with component versions
        selective: Optional list of specific components to update
        
    Returns:
        (success_count, total_count)
    """
    success_count = 0
    total_count = 0
    
    print("📦 Installing FULL PACKAGE (~1MB)...", file=sys.stderr)
    print("Strategy: Download everything - simple, fast, bulletproof!\n", file=sys.stderr)
    
    # Update hooks
    print("Updating hooks...", file=sys.stderr)
    for filename, info in manifest["components"]["hooks"].items():
        if selective and filename not in selective:
            continue
        total_count += 1
        if update_component("hooks", filename, info):
            success_count += 1
    
    # Update commands
    print("\nUpdating commands...", file=sys.stderr)
    for filename, info in manifest["components"]["commands"].items():
        if selective and filename not in selective:
            continue
        total_count += 1
        if update_component("commands", filename, info):
            success_count += 1
    
    # Update agents
    print("\nUpdating agents...", file=sys.stderr)
    for filename, info in manifest["components"].get("agents", {}).items():
        if selective and filename not in selective:
            continue
        total_count += 1
        if update_component("agents", filename, info):
            success_count += 1
    
    # Update docs
    print("\nUpdating docs...", file=sys.stderr)
    for filename, info in manifest["components"].get("docs", {}).items():
        if selective and filename not in selective:
            continue
        total_count += 1
        if update_component("docs", filename, info):
            success_count += 1
    
    # Always update manifest itself
    if not selective or "VERSION_MANIFEST.json" in selective:
        total_count += 1
        manifest_path = INSTALL_DIR / "VERSION_MANIFEST.json"
        try:
            with manifest_path.open('w') as f:
                json.dump(manifest, f, indent=2)
            print(f"\n  ✓ Updated: VERSION_MANIFEST.json", file=sys.stderr)
            success_count += 1
        except Exception as e:
            print(f"\n  ✗ Failed: VERSION_MANIFEST.json ({e})", file=sys.stderr)
    
    # Cleanup old agents after update
    print("\n🧹 Cleaning up old agents...", file=sys.stderr)
    deleted, preserved = cleanup_old_agents(manifest)
    if deleted > 0:
        print(f"✅ Cleanup complete: removed {deleted} old agents, preserved {preserved} agents", file=sys.stderr)
    
    return (success_count, total_count)


# =============================================================================
# MAIN FUNCTIONS
# =============================================================================

def silent_check() -> Tuple[bool, Dict]:
    """
    Silently check for updates (for session start hook).
    SIMPLE: Just compare system versions - no complex file comparisons!
    
    Returns:
        (updates_available: bool, info: dict)
    """
    try:
        current_version = get_current_version() or "0.0.0"
        
        # Quick server check with short timeout
        response = httpx.get(
            VERSION_ENDPOINT,
            timeout=5.0  # Short timeout for session start
        )
        response.raise_for_status()
        
        server_manifest = response.json()
        server_version = server_manifest.get("system_version", "0.0.0")
        
        # Simple: If versions differ, update available
        if server_version != current_version:
            return (True, {
                "server_version": server_version,
                "current_version": current_version,
                "release_name": server_manifest.get("release_name", "")
            })
        
        return (False, {"server_version": server_version})
        
    except Exception:
        # Fail silently on session start
        return (False, {"error": "silent"})


def check_only() -> int:
    """
    Check for updates without installing.
    
    Returns:
        Exit code (0 = up to date, 1 = updates available, 2 = error)
    """
    print("Checking for updates...", file=sys.stderr)
    
    current_version = get_current_version() or "unknown"
    print(f"Current version: {current_version}", file=sys.stderr)
    
    updates_available, info = check_for_updates()
    
    if "error" in info:
        print(f"\n❌ Error checking for updates: {info['error']}", file=sys.stderr)
        return 2
    
    if not updates_available:
        print(f"\n✅ Up to date! (v{info['server_version']})", file=sys.stderr)
        return 0
    
    print(f"\n🔄 Update available: v{info['server_version']}", file=sys.stderr)
    print(f"Release: {info.get('release_name', 'N/A')}", file=sys.stderr)
    
    if info.get('changelog'):
        print("\nChanges:", file=sys.stderr)
        for change in info['changelog'][:5]:  # Show first 5 changes
            print(f"  • {change}", file=sys.stderr)
    
    return 1


def install_updates(force: bool = False) -> int:
    """
    Download and install updates.
    
    Args:
        force: Force update even if version check passes
        
    Returns:
        Exit code (0 = success, 1 = no updates, 2 = error)
    """
    if not force:
        updates_available, info = check_for_updates()
        
        if "error" in info:
            print(f"❌ Error checking for updates: {info['error']}", file=sys.stderr)
            return 2
        
        if not updates_available:
            print("✅ Already up to date!", file=sys.stderr)
            return 1
    
    print("\n📥 Downloading latest version manifest...", file=sys.stderr)
    manifest = download_manifest()
    
    if not manifest:
        print("❌ Failed to download manifest", file=sys.stderr)
        return 2
    
    server_version = manifest.get("system_version", "unknown")
    print(f"📦 Installing version: {server_version}", file=sys.stderr)
    print(f"Release: {manifest.get('release_name', 'N/A')}\n", file=sys.stderr)
    
    # Perform update (includes agent cleanup)
    success, total = perform_update(manifest)
    
    # Report results
    print(f"\n{'='*60}", file=sys.stderr)
    print(f"Update complete: {success}/{total} components updated", file=sys.stderr)
    print(f"{'='*60}\n", file=sys.stderr)
    
    if success == total:
        print("✅ All components updated successfully!", file=sys.stderr)
        print(f"\nYour system is now at version {server_version}", file=sys.stderr)
        return 0
    else:
        print(f"⚠️  {total - success} components failed to update", file=sys.stderr)
        print("Run: python3 .claude/hooks/check-versions.py to verify", file=sys.stderr)
        return 2


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="DevMaestro Auto-Update System",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Check for updates (local)
  python3 .claude/hooks/auto-update.py --check
  
  # Install updates (local)
  python3 .claude/hooks/auto-update.py --install
  
  # Install to global directory
  python3 ~/.claude/hooks/auto-update.py --install --global-dir ~/.claude
  
  # Force reinstall current version
  python3 .claude/hooks/auto-update.py --install --force
        """
    )
    
    parser.add_argument(
        "--check",
        action="store_true",
        help="Check for updates without installing"
    )
    
    parser.add_argument(
        "--install",
        action="store_true",
        help="Download and install updates"
    )
    
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force reinstall even if up to date"
    )
    
    parser.add_argument(
        "--silent",
        action="store_true",
        help="Silent check for session start (no output unless updates found)"
    )
    
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output JSON instead of human-readable format"
    )
    
    parser.add_argument(
        "--global-dir",
        type=str,
        default=".claude",
        help="Installation directory (default: .claude, use ~/.claude for global)"
    )
    
    args = parser.parse_args()
    
    # Set global installation directory
    global INSTALL_DIR
    INSTALL_DIR = Path(args.global_dir).expanduser()
    
    # Ensure directory exists
    INSTALL_DIR.mkdir(parents=True, exist_ok=True)
    
    # Determine action
    if args.silent:
        # Silent mode for session start
        updates_available, info = silent_check()
        
        if updates_available and "error" not in info:
            # Print update notification to stdout for Claude to see
            print(f"\n{'='*60}")
            print(f"🔄 DevMaestro Update Available")
            print(f"{'='*60}")
            print(f"Current: {info['current_version']}")
            print(f"New: {info['server_version']}")
            print(f"Release: {info.get('release_name', 'N/A')}")
            print(f"\nFull package reinstall (~1MB, 2 seconds)")
            print(f"\nTo update: /dm-init or run:")
            print(f"  python3 .claude/hooks/auto-update.py --install")
            print(f"{'='*60}\n")
        # Exit 0 regardless (don't block session start)
        sys.exit(0)
    elif args.install:
        exit_code = install_updates(force=args.force)
    elif args.check:
        exit_code = check_only()
    else:
        # Default: check for updates
        exit_code = check_only()
    
    sys.exit(exit_code)


if __name__ == "__main__":
    main()

