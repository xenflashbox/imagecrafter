# /validate - Manual Validation Command

This command triggers the agentOS-validation-orchestrator to run comprehensive validation checks using the DevMaestro MCP validateAgainst tool and Xenco Production Standards skill.

## Usage

```
/validate [component or feature name]
```

Or for full system validation:

```
/validate all
```

## What It Does

1. **Activates Validation Agent**: Deploys agentOS-validation-orchestrator
2. **Runs MCP Validation**: Uses `mcp__dm-mini__validateAgainst` for automated checks
3. **Standards Check**: Verifies compliance with Xenco Production Standards
4. **Generates Report**: Comprehensive validation results with pass/fail status

## When To Use

**Use /validate when:**
- You want to manually verify a component before proceeding
- You suspect regressions after changes
- You need confirmation before deployment
- You want to check standards compliance
- A phase is complete and needs verification

**Don't use /validate when:**
- Validation is already part of the workflow (PM does this automatically)
- You're in the middle of development (wait until complete)

## The Activation Message

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 VALIDATION ORCHESTRATOR - ACTIVATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Agent: agentOS-validation-orchestrator
Target: [component name]
MCP Tool: validateAgainst
Standards: Xenco Production Standards

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Running validation checks...
```

## Validation Process

### 1. Code Analysis
```
Using validateAgainst MCP tool...
- Checking for mock data
- Verifying services layer architecture
- Validating error handling
- Checking schema definitions
```

### 2. Standards Compliance
```
Checking Xenco Production Standards...
✅ No mock data found
✅ Services layer implemented
✅ Error handling present
✅ Schemas validated
```

### 3. Test Execution
```
Running test suite...
✅ Unit tests: 15/15 passing
✅ Integration tests: 8/8 passing
✅ E2E tests: 3/3 passing
```

## Validation Report

**Success Report:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ VALIDATION PASSED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Component: User Authentication API
Validated: 2025-11-03 10:30 AM

Standards Compliance: ✅ PASS
- No mock data detected
- Services layer architecture verified
- Proper error handling implemented
- Schema validation present

MCP validateAgainst Results: ✅ PASS
- No regressions detected
- All requirements met
- Performance within limits

Test Results: ✅ PASS
- All tests passing (26/26)
- Code coverage: 94%
- No critical issues

Status: READY FOR DEPLOYMENT
```

**Failure Report:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ VALIDATION FAILED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Component: User Authentication API
Validated: 2025-11-03 10:30 AM

Standards Compliance: ❌ FAIL
Issues Found:
1. Mock data detected in auth.service.ts line 45
2. Direct database call bypassing services layer
3. Missing error handling on login endpoint

MCP validateAgainst Results: ❌ FAIL
Regressions Detected:
1. Password validation weakened
2. Session timeout removed

Test Results: ❌ FAIL
- 3 tests failing (23/26)
- Critical: Session management broken

Status: BLOCKED - FIXES REQUIRED

Recommended Actions:
1. Use debug_assist MCP tool to analyze auth.service.ts
2. Deploy code-debugger agent for fixes
3. Re-run /validate after corrections
```

## Integration with Project Manager

When the project-manager-maestro is running, it uses /validate automatically at key checkpoints. You can still run it manually if needed.

**Automatic Validation Trigger Points:**
- After each task completion
- At phase boundaries (via /phase-complete)
- Before deployment
- After bug fixes

## MCP Tool Usage

This command primarily uses:

**`mcp__dm-mini__validateAgainst`**
- Validates code against requirements
- Checks for regressions
- Compares current vs expected behavior
- Provides detailed pass/fail analysis

**Integration with other MCP tools:**
- Uses `recall` to check past validation results
- Uses `remember` to store validation outcomes
- May trigger `debug_assist` if validation fails

## Example Invocations

### Validate Specific Component
```
/validate user-authentication
```

### Validate Before Deployment
```
/validate all
Preparing for production deployment. Run full validation suite.
```

### Validate After Bug Fix
```
/validate api/auth
Fixed session timeout bug. Verify fix and check for regressions.
```

### Validate with Standards Focus
```
/validate database-layer
Focus on Xenco Production Standards compliance.
```

## Exit Conditions

Validation completes when:
1. ✅ All tests executed
2. ✅ Standards compliance checked
3. ✅ MCP validateAgainst completed
4. ✅ Report generated
5. ✅ Pass/fail status determined

## Notes

- Validation is non-destructive (read-only checks)
- Can be run multiple times safely
- Results are stored in MCP memory for reference
- Always enforces Xenco Production Standards
- Used automatically by project-manager-maestro
- Can trigger debug-maestro if issues found

## Related Commands

- `/pm` - Includes automatic validation
- `/phase-complete` - Includes validation as part of phase sign-off
- `/dev-maestro` - Can trigger validation as needed

---
version: 2.0.0
updated: 2025-11-03
devmaestro: true
changelog: |
  v2.0.0 - Corrected MCP tool references (validateAgainst, recall, remember, debug_assist)
  v1.1.0 - Added Xenco Production Standards enforcement
  v1.0.0 - Initial validation command

**Remember**: Validation uses the validateAgainst MCP tool for comprehensive automated checks. Always run validation before considering a component complete.
