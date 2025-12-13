#!/usr/bin/env python3
import json, sys, os
# Minimal valid JSON for PostToolUse schema
# If you want to suppress output or inject systemMessage later, extend here.
out = {
  "continue": True
}
sys.stdout.write(json.dumps(out))
sys.exit(0)
