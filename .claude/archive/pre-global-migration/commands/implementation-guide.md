<!--
Version: 2.1.0
Updated: 2025-10-11
-->

# Project Manager Quality Enforcement - Implementation Guide

## Overview

This guide shows how to implement the quality enforcement system with minimal complexity. Total addition: ~300 lines of code across 6 files.

## Files to Add

### 1. Core Commands (Already Created)
- `project-manager.md` → `/cloud_agents/` folder
- `pm.md` → `/.claude/commands/` folder

### 2. Quality Commands (New)
- `validate.md` → `/.claude/commands/` folder
- `pm-test.md` → `/.claude/commands/` folder  
- `pm-review.md` → `/.claude/commands/` folder

### 3. Hook Script (Optional - Phase 2)
- `log-violations.py` → `/.claude/hooks/` folder

## Implementation Steps

### Phase 1: Core PM with Validation (Immediate)

1. **Install PM Agent & Command**
   ```bash
   # Copy agent manifest
   cp project-manager.md ~/cloud_agents/
   
   # Copy PM command
   cp pm.md ~/.claude/commands/
   
   # Copy validation command
   cp validate.md ~/.claude/commands/
   ```

2. **Test Basic PM**
   ```bash
   # Test PM recognizes bad code
   /pm Deploy this code:
   const users = ["test1", "test2", "test3"];
   
   # Should REJECT for mock data
   ```

### Phase 2: Add Testing & Review (Week 1)

1. **Install Test Commands**
   ```bash
   cp pm-test.md ~/.claude/commands/
   cp pm-review.md ~/.claude/commands/
   ```

2. **Run Quality Test**
   ```bash
   /pm-test
   # Should show 4/4 tests passing
   ```

### Phase 3: Add Violation Logging (Week 2 - Optional)

1. **Install Hook Script**
   ```bash
   cp log-violations.py ~/.claude/hooks/
   chmod +x ~/.claude/hooks/log-violations.py
   ```

2. **Update settings.json** (Only the PostToolUse section)
   ```json
   "PostToolUse": [
     // ... existing hooks ...
     {
       "matcher": "(Task|task|pm|PM)",
       "hooks": [{
         "type": "command",
         "command": "python3 [absolute-path]/.claude/hooks/log-violations.py",
         "timeout": 5
       }]
     }
   ]
   ```

3. **Monitor Violations**
   ```bash
   # After a week, review patterns
   /pm-review
   ```

## How It Works

### Quality Enforcement Flow

```
User: /pm [implementation plan]
         ↓
PM analyzes plan
         ↓
PM deploys sub-agent
         ↓
Sub-agent returns code
         ↓
PM validates code ← /validate (internal call)
         ↓
If violations found:
  - REJECT task
  - Log violation (optional)
  - Require fix
         ↓
If clean:
  - Accept task
  - Continue to next
```

### Violation Detection (Built into PM)

The PM automatically scans for:

```javascript
// Mock Data
["test1", "test2", "test3"]
test@test.com
lorem ipsum

// Silent Failures
catch {}
catch () => null

// Workarounds
TODO: fix later
HACK: temporary
FIXME: 

// Phantom Validations
if (!data.fieldThatDoesntExist)
```

## Testing Your Setup

### Quick Test (5 minutes)

1. **Test PM Catches Mock Data**
   ```
   /pm Test task:
   Create users array with 3 test users
   
   [Agent creates: ["test1", "test2", "test3"]]
   
   PM should REJECT this
   ```

2. **Test PM Catches Silent Failures**
   ```
   /pm Test task:
   Add error handling to API call
   
   [Agent creates: try { api() } catch {}]
   
   PM should REJECT this
   ```

### Full Test Suite (10 minutes)

```bash
/pm-test
```

Should show all 4 test categories passing.

## Monitoring & Improvement

### Week 1: Baseline
- Run with core PM + validation
- Note any violations that slip through
- No logging yet, just observe

### Week 2: Add Logging (Optional)
- If you see value, add violation logging
- Run `/pm-review` weekly
- Identify problem agents

### Month 1: Refine Patterns
- Review `/pm-review` output
- Add new patterns to PM manifest if needed
- Retrain problematic agents

## Troubleshooting

### PM Not Catching Violations

1. Check PM is using updated manifest:
   ```bash
   grep "QUALITY ENFORCEMENT" ~/cloud_agents/project-manager.md
   ```

2. Test validation directly:
   ```bash
   /validate [suspect code]
   ```

### Violations Not Logging

This is optional - you don't need logging for PM to work. If you want it:

1. Check hook is executable:
   ```bash
   ls -la ~/.claude/hooks/log-violations.py
   ```

2. Check log file permissions:
   ```bash
   touch .pm-violations.jsonl
   chmod 666 .pm-violations.jsonl
   ```

## Success Metrics

You'll know it's working when:

- ✅ Mock data never makes it to production
- ✅ All errors are properly handled
- ✅ No workarounds in code
- ✅ Agents stop when truly blocked (not fake progress)
- ✅ Code quality improves week over week

## Keep It Simple

Remember the goal: **Better code quality without complexity**

- Start with Phase 1 only
- Add features only if they prove valuable
- Total code addition: < 300 lines
- No databases, no web services, no complex infrastructure

The PM with built-in quality enforcement will catch 80% of issues. That's good enough to start!