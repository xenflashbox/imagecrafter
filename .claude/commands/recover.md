---
name: recover
description: Recover from failed orchestration by identifying and retrying failed agents
---

# /recover - Recovery Command

Helps recover from failed orchestration sessions by identifying failed agents and suggesting recovery steps.

## Usage
```
/recover
```

## What It Does
1. Checks Redis for failed agents
2. Identifies error causes
3. Suggests recovery steps
4. Can retry failed agents if safe

## Example Output
```
Recovery Analysis:

Failed Agents:
❌ api-agent - Error: Service layer not found
   Cause: services-layer-agent failed validation
   Solution: Re-run services-layer-agent first

⚠️ websocket-agent - Waiting (depends on api-agent)

Recovery Steps:
1. Fix services-layer validation errors
2. Re-run services-layer-agent
3. Re-validate services-layer
4. Continue with api-agent
```

## Manual Recovery
Check Redis for errors:
```bash
redis-cli -p 6380 GET agent:api:status
redis-cli -p 6380 GET validation:services:status
```

