<!--
Version: 2.1.0
Updated: 2025-10-11
-->

# /validate - Task Validation Command

Simple validation helper for the Project Manager to verify task completion.

## Usage

```
/validate [task or code to validate]
```

## What It Does

Performs quality checks on code or task outputs:
- Detects mock data patterns
- Checks for silent failures
- Identifies workarounds
- Verifies error handling
- Confirms no phantom validations

## Instructions for Claude

When `/validate` is invoked:

### Step 1: Quick Quality Scan

Run these checks on the provided code/task:

```bash
# Check for mock data patterns
grep -E "test@test\.com|lorem ipsum|\[1,2,3\]|TODO.*fix|FIXME|HACK" <<< "[code]" && echo "❌ Mock/workaround patterns found" || echo "✅ No mock data"

# Check for silent failures
grep -E "catch\s*\{\s*\}|catch.*\{\s*\}" <<< "[code]" && echo "❌ Silent failures detected" || echo "✅ Error handling present"

# Check for phantom validations (fields that don't exist)
# This requires context about what fields ARE valid
```

### Step 2: Report Results

```markdown
# Validation Report

## Code Quality Check
- Mock Data: [PASS/FAIL - details if failed]
- Error Handling: [PASS/FAIL - details if failed]
- Workarounds: [PASS/FAIL - details if failed]

## Specific Issues Found
[List any violations with line numbers if possible]

## Verdict
[✅ VALIDATED - Ready for deployment]
OR
[❌ REJECTED - Fix issues before proceeding]

## Required Fixes
[If rejected, list specific fixes needed]
```

### Step 3: Log Violations (if any)

If violations found, append to `.pm-violations.jsonl`:
```json
{"timestamp":"[ISO]","type":"[mock_data|silent_failure|workaround]","file":"[filename]","agent":"[if known]"}
```

## Example

```
/validate 
const users = ["test1", "test2", "test3"];
try {
  processUsers(users);
} catch {}
```

Response:
```
# Validation Report

## Code Quality Check
- Mock Data: ❌ FAIL - Hardcoded test array detected
- Error Handling: ❌ FAIL - Empty catch block
- Workarounds: ✅ PASS

## Specific Issues Found
1. Line 1: Mock data array ["test1", "test2", "test3"]
2. Line 4: Silent failure - empty catch block

## Verdict
❌ REJECTED - Fix issues before proceeding

## Required Fixes
1. Replace mock array with real data source
2. Add proper error handling in catch block
```

## Notes

- Quick validation for PM to use during task verification
- Can be called manually or by PM during enforcement
- Logs help track problematic patterns over time