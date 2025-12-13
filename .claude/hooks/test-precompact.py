#!/usr/bin/env python3
import json
import sys
from datetime import datetime

def main():
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    message = f"""🧪 PreCompact Hook Test

This is a test of the PreCompact hook system.

Timestamp: {timestamp}
Working Directory: {sys.path[0]}

If you see this message, the PreCompact hook is being called automatically by Claude Code."""

    output = {
        "continue": True,
        "systemMessage": message
    }
    
    print(json.dumps(output))
    return 0

if __name__ == "__main__":
    sys.exit(main())
