# /phase-complete - Phase Boundary Validation Command

This command performs comprehensive validation and requires user approval before allowing the project-manager-maestro to proceed to the next implementation phase.

## Usage

```
/phase-complete [phase-name]
```

## What It Does

1. **Stops Execution**: Pauses the project-manager-maestro workflow
2. **Runs Validation**: Uses `mcp__dm-mini__validateAgainst` to verify phase completion
3. **Checks Standards**: Ensures Xenco Production Standards compliance
4. **Generates Report**: Comprehensive phase summary with all deliverables
5. **Requires Approval**: Waits for explicit user sign-off before proceeding

## When To Use

**Automatically Triggered By:**
- project-manager-maestro at phase boundaries
- Major milestone completions
- Before deploying to production
- After significant architectural changes

**Manually Invoked When:**
- You want to verify phase completion yourself
- You need a checkpoint before continuing
- You want to review deliverables before next phase

## The Activation Message

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏸️  PHASE BOUNDARY VALIDATION - ACTIVATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Agent: agentOS-validation-orchestrator
Phase: [phase-name]
MCP Tools: validateAgainst, recall, remember
Standards: Xenco Production Standards

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Running phase validation checks...
```

## Phase Validation Process

### 1. Deliverables Check
```
Verifying phase deliverables...
Using recall to check planned vs actual deliverables...

Phase: Database Schema Migration
Planned Deliverables:
✅ User schema created
✅ Auth schema created  
✅ Migration scripts generated
✅ Rollback scripts generated

All deliverables present.
```

### 2. Standards Compliance
```
Checking Xenco Production Standards...
Using validateAgainst MCP tool...

✅ No mock data found
✅ Services layer architecture verified
✅ Error handling implemented
✅ Schema validation present
✅ No direct database calls

Standards compliance: PASS
```

### 3. Test Verification
```
Running test suite...

Unit Tests: ✅ 12/12 passing
Integration Tests: ✅ 5/5 passing
Migration Tests: ✅ 3/3 passing

Test coverage: 96%
All tests passing.
```

### 4. Regression Check
```
Using validateAgainst to check for regressions...

Checking against previous phase baselines...
✅ No regressions detected
✅ Performance within acceptable range
✅ No breaking changes to existing features

Regression check: PASS
```

### 5. Dependency Verification
```
Checking next phase dependencies...

Next Phase: API Implementation
Required from this phase:
✅ Database schemas available
✅ Migration scripts tested
✅ Connection pooling configured

Dependencies met: READY
```

## Phase Validation Report

**Success Report:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ PHASE VALIDATION PASSED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase: Database Schema Migration
Completed: 2025-11-03 11:45 AM
Duration: 45 minutes

Deliverables: ✅ 4/4 Complete
- User schema
- Auth schema
- Migration scripts
- Rollback scripts

Standards Compliance: ✅ PASS
- Xenco Production Standards verified
- No violations found

Tests: ✅ 20/20 Passing
- Unit: 12/12
- Integration: 5/5
- Migration: 3/3
- Coverage: 96%

Regressions: ✅ NONE
- All existing features working
- Performance maintained

Dependencies: ✅ MET
- Next phase can proceed
- All requirements satisfied

MCP Tools Used:
- validateAgainst: 5 calls
- recall: 2 calls
- remember: 1 call

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  USER APPROVAL REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next Phase: API Implementation
Estimated Duration: 55 minutes
Dependencies: All met

The project-manager-maestro is waiting for your approval
to proceed to the next phase.

Type "proceed" to continue or "stop" to halt execution.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Failure Report:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ PHASE VALIDATION FAILED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase: Database Schema Migration
Attempted: 2025-11-03 11:45 AM

Deliverables: ❌ 3/4 Incomplete
- User schema ✅
- Auth schema ✅
- Migration scripts ✅
- Rollback scripts ❌ MISSING

Standards Compliance: ❌ FAIL
Issues:
1. Mock data found in seed scripts
2. Missing error handling in migrations

Tests: ❌ FAILING
- Unit: 12/12 ✅
- Integration: 4/5 ❌
- Migration: 2/3 ❌
- Failing: auth_migration_test, rollback_test

Regressions: ⚠️  DETECTED
- User authentication broken
- Session management affected

Dependencies: ❌ NOT MET
Next phase blocked by:
- Missing rollback scripts
- Auth regression needs fix

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 PHASE BLOCKED - FIXES REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The project-manager-maestro CANNOT proceed until:

Required Fixes:
1. Generate rollback scripts
2. Remove mock data from seed scripts
3. Fix auth regression
4. Add error handling to migrations
5. Fix failing tests

Recommended Actions:
1. Use debug_assist MCP tool to analyze failures
2. Deploy database-architect for rollback scripts
3. Deploy code-debugger for regression fix
4. Re-run /phase-complete after fixes

The project-manager-maestro will begin fixes automatically.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## User Response Options

After validation report, you can respond:

**To Approve and Continue:**
```
proceed
```
or
```
approved - proceed to API implementation
```

**To Request Changes:**
```
stop - need to review migration scripts first
```
or
```
wait - I want to test the schema manually
```

**To Abort:**
```
stop
```

## Memory Integration

Phase completion is stored in MCP memory:

```
Using remember to store phase completion...

remember("phase-database-migration", {
  status: "complete",
  duration: "45 minutes",
  deliverables: [...],
  tests: "20/20 passing",
  standards: "compliant",
  approval: "user-approved",
  timestamp: "2025-11-03T11:45:00Z"
})

Phase completion stored in project memory.
```

This allows:
- Audit trail of phase completions
- Reference for future phases
- Rollback points if needed
- Historical performance data

## Integration with Project Manager

The project-manager-maestro automatically invokes /phase-complete:

**Trigger Points:**
```
Plan: Multi-phase Implementation
├─ Phase 1: Database [Tasks 1-5]
│  └─ /phase-complete database ← AUTOMATIC
├─ Phase 2: API [Tasks 6-12]
│  └─ /phase-complete api ← AUTOMATIC
└─ Phase 3: Frontend [Tasks 13-20]
   └─ /phase-complete frontend ← AUTOMATIC
```

**Wait State:**
```
Phase 1 Complete
  ↓
/phase-complete invoked
  ↓
⏸️  WAITING FOR USER APPROVAL
  ↓
User types "proceed"
  ↓
Phase 2 begins
```

## MCP Tools Used

**`mcp__dm-mini__validateAgainst`**
- Validates all phase deliverables
- Checks for regressions
- Verifies standards compliance
- Compares actual vs planned outcomes

**`mcp__dm-mini__recall`**
- Retrieves planned deliverables
- Checks past phase completions
- Finds similar phase patterns

**`mcp__dm-mini__remember`**
- Stores phase completion status
- Records approval decisions
- Creates audit trail

**`mcp__dm-mini__debug_assist`** (if validation fails)
- Analyzes test failures
- Identifies regression causes
- Recommends fixes

## Binary Pass/Fail Criteria

Phase validation uses strict pass/fail criteria:

**✅ PASS if ALL true:**
- All deliverables complete
- All tests passing
- Standards compliant
- No regressions
- Dependencies met

**❌ FAIL if ANY true:**
- Missing deliverables
- Failing tests
- Standards violations
- Regressions detected
- Dependencies not met

**No partial passes.** The phase must meet ALL criteria or it fails.

## Example Invocations

### Automatic (by PM)
```
# Project Manager reaches phase boundary
project-manager-maestro: Phase 1 complete. Running validation...
/phase-complete database-migration
```

### Manual Verification
```
/phase-complete api-implementation
I want to verify the API phase is truly complete before frontend work.
```

### Pre-Deployment Check
```
/phase-complete production-prep
Final validation before deploying to production.
```

## Exit Conditions

Phase validation completes when:
1. ✅ All validation checks run
2. ✅ Report generated
3. ✅ User response received (proceed/stop)
4. ✅ Decision stored in memory
5. ✅ Control returned to project-manager-maestro

## Notes

- **BLOCKS** project-manager-maestro until approval received
- Validation is comprehensive (not quick checks)
- Failures trigger automatic fix workflows
- User approval is REQUIRED - no automatic proceeding
- Creates audit trail in MCP memory
- Can be invoked manually at any time
- Always enforces Xenco Production Standards
- Uses multiple MCP tools for thorough validation

## Related Commands

- `/pm` - Automatically invokes /phase-complete at boundaries
- `/validate` - Can be used within a phase for component checks
- `/dev-maestro` - Respects phase boundaries during orchestration

---
version: 2.0.0
updated: 2025-11-03
devmaestro: true
changelog: |
  v2.0.0 - Corrected MCP tool references (validateAgainst, recall, remember, debug_assist)
  v1.1.0 - Added comprehensive validation checks and user approval flow
  v1.0.0 - Initial phase boundary validation

**Remember**: This command creates a mandatory checkpoint. The project-manager-maestro CANNOT proceed without user approval. This ensures quality gates are met and gives you control over the implementation flow.
