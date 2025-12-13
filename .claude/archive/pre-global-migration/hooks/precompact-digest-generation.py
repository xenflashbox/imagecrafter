#!/usr/bin/env python3
"""
PreCompact Hook - External-Ready Version
Uploads full session content to API, receives AI-generated digest, saves locally

VERSION: 2.1.0
LAST MODIFIED: 2025-10-11
CHANGELOG:
  v2.0.0 (2025-10-11):
    - Enhanced session ID dependency documentation
    - Now requires .current_session_id file (managed by update-session-id.py)
    - Integrated with automated session tracking system
  v1.0.0 (Original):
    - External API-based digest generation
    - Reads session JSONL files
    - Uploads to DevMaestro AI service
    - Saves digests to local memory_backups
"""
import sys
import json
import requests
from pathlib import Path
from datetime import datetime

import os
MEMORY_SERVICE_URL = os.getenv("DM_MEMORY_URL", "https://dm-memory.devmaestro.io")

def get_api_key():
    """Get user's API key from secrets"""
    # Try ASSIST_API_KEY first (new standard)
    assist_key = Path(".claude/secrets/ASSIST_API_KEY")
    if assist_key.exists():
        return assist_key.read_text().strip()

    # Fallback to DEBUG_API_KEY
    debug_key = Path(".claude/secrets/DEBUG_API_KEY")
    if debug_key.exists():
        return debug_key.read_text().strip()

    # Fallback to env var
    import os
    return os.getenv("ASSIST_API_KEY") or os.getenv("DEBUG_API_KEY", "sk-local-apps-server14-memory-2025")

def get_session_file():
    """Find current session JSONL file"""
    cwd = Path.cwd()
    # Claude Code uses leading dash: /home/foo/bar -> -home-foo-bar
    project_slug = str(cwd).replace('/', '-')

    global_sessions = Path.home() / ".claude" / "projects" / project_slug

    if not global_sessions.exists():
        return None

    session_files = list(global_sessions.glob("*.jsonl"))
    if not session_files:
        return None

    # Most recent
    session_files.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return session_files[0]

def load_session_messages(session_file):
    """Load all messages from session JSONL file"""
    messages = []
    try:
        with session_file.open('r') as f:
            for line in f:
                try:
                    msg = json.loads(line)
                    messages.append(msg)
                except:
                    continue
        return messages
    except Exception as e:
        return []

def upload_and_get_digest(session_file, session_id, api_key):
    """
    Use planning_assist to generate a digest from session summary
    (The /hook/session-completed endpoint requires local file access which doesn't work cross-server)

    Returns: (success: bool, digest_content: str, error: str)
    """
    try:
        # Load session messages
        messages = load_session_messages(session_file)
        if not messages:
            return False, None, "No messages in session"

        # Get project name
        project = Path.cwd().name

        # Extract summary information
        user_count = len([m for m in messages if m.get('role') == 'user'])
        assistant_count = len([m for m in messages if m.get('role') == 'assistant'])

        # Get first few exchanges as context
        context_preview = []
        for msg in messages[:10]:
            role = msg.get('role', 'unknown')
            content = msg.get('content', '')
            if isinstance(content, str) and content.strip():
                preview = content[:300].replace('\n', ' ')
                context_preview.append(f"{role.upper()}: {preview}")

        # Call planning_assist to generate a proper digest
        payload = {
            "context": f"""Generate a comprehensive session digest for this Claude Code session.

**Session ID**: {session_id}
**Project**: {project}
**Total Messages**: {len(messages)} ({user_count} user, {assistant_count} assistant)

**Session Preview** (first exchanges):
{chr(10).join(context_preview[:5])}

Create a structured digest that captures:
- Main topics and tasks discussed
- Key accomplishments and changes made
- Tools and technologies used
- Important decisions or discoveries
- Next steps or open items

Format as a clear, scannable markdown document.""",
            "title": f"Session Digest - {session_id[:8]}",
            "tags": "session-digest, memory, context",
            "model": "gpt-4o-mini"
        }

        headers = {
            "X-Api-Key": api_key,
            "Content-Type": "application/json"
        }

        print(f"📤 Generating AI digest for {len(messages)} messages...", file=sys.stderr)

        response = requests.post(
            f"{MEMORY_SERVICE_URL}/planning/assist",
            json=payload,
            headers=headers,
            timeout=120
        )

        if response.status_code == 200:
            result = response.json()
            if result.get('ok'):
                digest_content = result.get('analysis', '')
                if digest_content:
                    print(f"✅ Generated AI digest ({len(digest_content)} chars)", file=sys.stderr)
                    return True, digest_content, None
                else:
                    return False, None, "API returned empty analysis"
            else:
                return False, None, f"API error: {result.get('error', 'Unknown error')}"
        else:
            return False, None, f"API error: {response.status_code} - {response.text}"

    except Exception as e:
        return False, None, str(e)

def save_digest_locally(digest_content, session_id, project):
    """Save AI-generated digest to local memory_backups directory"""
    try:
        backup_dir = Path(".claude/memory_backups")
        backup_dir.mkdir(parents=True, exist_ok=True)

        # Save as latest (for SessionStart to find)
        latest_file = backup_dir / "latest.digest.md"
        latest_file.write_text(digest_content)

        # Save with timestamp for history
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        timestamped_file = backup_dir / f"{timestamp}-{project}-digest.md"
        timestamped_file.write_text(digest_content)

        print(f"💾 Saved digest to: {timestamped_file}", file=sys.stderr)

        return str(timestamped_file)

    except Exception as e:
        print(f"❌ Failed to save digest: {e}", file=sys.stderr)
        return None

def main():
    # Get session ID
    session_id_file = Path(".claude/.current_session_id")
    if not session_id_file.exists():
        output = {
            "continue": True,
            "systemMessage": "⚠️ No session ID found - digest generation skipped"
        }
        print(json.dumps(output))
        return 0

    session_id = session_id_file.read_text().strip()

    # Get API key
    api_key = get_api_key()
    if not api_key:
        output = {
            "continue": True,
            "systemMessage": "⚠️ No API key found - digest generation skipped\n\nRun /dm-init to configure."
        }
        print(json.dumps(output))
        return 0

    # Get session file
    session_file = get_session_file()
    if not session_file:
        output = {
            "continue": True,
            "systemMessage": "⚠️ Session file not found - digest generation skipped"
        }
        print(json.dumps(output))
        return 0

    # Load messages count
    messages = load_session_messages(session_file)
    message_count = len(messages)

    print(f"\n🔄 Starting external digest generation...", file=sys.stderr)
    print(f"📊 Session: {session_id}", file=sys.stderr)
    print(f"📝 Messages: {message_count}", file=sys.stderr)

    # Upload FULL content and get AI-generated digest back
    success, digest_content, error = upload_and_get_digest(
        session_file, session_id, api_key
    )

    if success:
        # Save AI-generated digest locally
        saved_path = save_digest_locally(
            digest_content, session_id, Path.cwd().name
        )

        if saved_path:
            message = f"""✅ Session digest generated by AI and saved locally

Session ID: {session_id}
Messages: {message_count}
Saved to: {Path(saved_path).name}

Your session was uploaded to DevMaestro AI service and processed with gradient detail:
  • Early messages: Brief summaries
  • Mid-session: Technical details preserved
  • Final messages: Verbatim (last 2-3)

This AI-generated digest will be injected when you start your next session.

💡 External-ready: Works from anywhere, no shared volumes needed!"""
        else:
            message = f"""⚠️ AI digest generated but failed to save locally

Session: {session_id}
Messages: {message_count}

Digest was created by AI but couldn't be saved to disk.
Check .claude/memory_backups/ permissions."""
    else:
        message = f"""❌ Digest generation failed

Session: {session_id}
Error: {error}

The API service could not process your session.
Run /dm-doctor to diagnose the issue."""

    output = {
        "continue": True,
        "systemMessage": message
    }

    print(json.dumps(output))
    return 0

if __name__ == "__main__":
    sys.exit(main())
