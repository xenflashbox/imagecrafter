#!/usr/bin/env python3
"""
Auto-update Session ID Helper
Detects the current active session and updates .current_session_id file
Called automatically at SessionStart or manually by dm-init/dm-doctor

VERSION: 2.1.0
CREATED: 2025-10-11
CHANGELOG:
  v2.0.0 (2025-10-11):
    - Initial creation of automatic session ID management system
    - Auto-detects current active session from Claude's project directory
    - Updates .current_session_id file automatically
    - Handles first-run initialization
    - Provides status messages via JSON output
    - Integrates with SessionStart hook for automatic updates
"""
import sys
import json
from pathlib import Path
from datetime import datetime

def get_current_session_id():
    """Find the most recently active session JSONL file and extract its ID"""
    try:
        cwd = Path.cwd()
        # Claude Code uses leading dash: /home/foo/bar -> -home-foo-bar
        project_slug = str(cwd).replace('/', '-')
        
        global_sessions = Path.home() / ".claude" / "projects" / project_slug
        
        if not global_sessions.exists():
            return None, f"Session directory not found: {global_sessions}"
        
        # Find all session JSONL files
        session_files = list(global_sessions.glob("*.jsonl"))
        if not session_files:
            return None, "No session files found"
        
        # Sort by modification time (most recent first)
        session_files.sort(key=lambda p: p.stat().st_mtime, reverse=True)
        
        # Most recent session file
        latest_session = session_files[0]
        
        # Extract session ID from filename (UUID format)
        session_id = latest_session.stem  # filename without .jsonl extension
        
        return session_id, None
        
    except Exception as e:
        return None, f"Error detecting session: {str(e)}"

def update_session_id_file(session_id):
    """Write session ID to .current_session_id file"""
    try:
        session_id_file = Path(".claude/.current_session_id")
        session_id_file.parent.mkdir(parents=True, exist_ok=True)
        session_id_file.write_text(session_id)
        return True, None
    except Exception as e:
        return False, f"Error writing session ID file: {str(e)}"

def get_stored_session_id():
    """Read the currently stored session ID"""
    try:
        session_id_file = Path(".claude/.current_session_id")
        if not session_id_file.exists():
            return None
        return session_id_file.read_text().strip()
    except:
        return None

def main():
    """Main function - can be called from hooks or commands"""
    
    # Detect current session
    current_session_id, error = get_current_session_id()
    
    if error:
        message = f"""⚠️ Session ID Detection Failed

{error}

Memory system may not work correctly.
Run /dm-doctor to diagnose the issue."""
        output = {"continue": True, "systemMessage": message}
        print(json.dumps(output))
        return 1
    
    if not current_session_id:
        message = """⚠️ No Active Session Found

Could not detect current session ID.
Memory system may not work correctly."""
        output = {"continue": True, "systemMessage": message}
        print(json.dumps(output))
        return 1
    
    # Check if session ID has changed
    stored_session_id = get_stored_session_id()
    
    if stored_session_id == current_session_id:
        # Session ID is already current, silent success
        output = {"continue": True}
        print(json.dumps(output))
        return 0
    
    # Update session ID file
    success, error = update_session_id_file(current_session_id)
    
    if not success:
        message = f"""⚠️ Session ID Update Failed

{error}

Memory system may not work correctly."""
        output = {"continue": True, "systemMessage": message}
        print(json.dumps(output))
        return 1
    
    # Success - session ID updated
    if stored_session_id:
        message = f"""🔄 Session ID Updated

Old: {stored_session_id[:8]}...
New: {current_session_id[:8]}...

Memory system will track this new session."""
    else:
        message = f"""✅ Session ID Initialized

Session: {current_session_id[:8]}...

Memory system is now tracking your session."""
    
    output = {"continue": True, "systemMessage": message}
    print(json.dumps(output))
    return 0

if __name__ == "__main__":
    sys.exit(main())

