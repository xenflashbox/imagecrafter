---
name: agent-status
description: Check status of all active agents in current orchestration session
---

# /agent-status - Check Agent Status

Shows real-time status of all agents in the current session.

## Usage
```
/agent-status
```

## Output Example
```
Session: abc-123-def
Status: executing

Active Agents:
✓ database-agent (complete, validated)
⏳ api-agent (running)
⏸️ websocket-agent (waiting for api-agent)

Queue: 2 agents waiting
Errors: 0
```

## Implementation
Reads from Redis keys (port 6380):
- `orchestrator:active`
- `agent:{id}:status`
- `validation:{component}:status`

## Manual Check
You can also check manually:
```bash
redis-cli -p 6380 KEYS "agent:*"
redis-cli -p 6380 GET agent:database:status
redis-cli -p 6380 GET validation:database:status
```

