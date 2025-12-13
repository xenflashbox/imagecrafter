---
name: orchestrate
description: Trigger multi-agent orchestration with automatic agent spawning and validation
---

# /orchestrate - Multi-Agent Orchestration Command

Triggers the orchestrator agent to handle complex multi-component tasks.

## Usage
```
/orchestrate [requirement]
```

## Example
```
/orchestrate Set up a real-time chat application with database, API, WebSocket, and authentication
```

## What It Does
1. Analyzes requirement
2. Creates execution plan
3. Spawns specialized agents
4. Runs validators
5. Aggregates results
6. Reports status

## Agents Available
- database-agent
- services-layer-agent
- api-agent
- websocket-agent
- auth-agent

## Validation
All components are validated before integration.
No mock implementations allowed.

## Alternative Usage
You can also simply say: "Use the orchestrator to..." instead of using the slash command.

