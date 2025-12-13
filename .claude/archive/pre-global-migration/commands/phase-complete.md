# /phase-complete - Phase Completion Validation

Validates phase completion and obtains sign-off from agentOS-validation-orchestrator before proceeding to next phase.

## Usage

```
/phase-complete [phase-number]
```

## What It Does

1. Collects all validation outputs from current directory
2. Compiles evidence package per validation protocol
3. Submits to agentOS-validation-orchestrator for review
4. Returns approval/rejection with specific feedback
5. Gates next phase progression until approved

## Instructions for Claude

When `/phase-complete` is invoked:

### Step 1: Collect Evidence

```javascript
// Scan for validation outputs
const validationDir = "./validation";
const outputs = [];

// Get all validation script results
for (const script of fs.readdirSync(validationDir)) {
  if (script.startsWith("validate_task_")) {
    const output = execSync(`bash ${validationDir}/${script}`);
    outputs.push({
      script: script,
      output: output.toString(),
      exitCode: output.status
    });
  }
}
```

### Step 2: Compile Evidence Package

```markdown
## Phase [X] Validation Evidence Package

### Summary
- Total Tasks: [count]
- All Passed: [yes/no]
- Date: [timestamp]
- Phase: [phase-number]

### Test Outputs
[Include full output from each validation script]

### Build Verification
[Run and include npm build output or relevant build command]

### Script Modifications
[Document any changes to validation scripts with git diff]

### Code Changes Summary
[List key files modified and their purpose]
```

### Step 3: Submit to Validator

```javascript
// Call agentOS-validation-orchestrator agent
task({
  subagent_type: "agentOS-validation-orchestrator",
  prompt: `Review Phase ${phaseNumber} validation evidence for sign-off:
  
  ${evidencePackage}
  
  Verify:
  1. All tests genuinely passed (no bypasses or fake passes)
  2. Script modifications are legitimate bug fixes, not requirement weakening
  3. Build succeeds without errors
  4. No missing functionality from original plan
  5. No mock data patterns detected
  6. All acceptance criteria met
  
  Respond with APPROVED or REJECTED with specific issues that need correction.`
})
```

### Step 4: Gate Next Phase

```javascript
if (response.includes("APPROVED")) {
  console.log("✅ Phase " + phaseNumber + " approved - may proceed to next phase");
  return { approved: true, phase: phaseNumber };
} else {
  console.log("❌ Phase " + phaseNumber + " rejected - fix issues before proceeding");
  console.log("Issues found:");
  console.log(response);
  return { approved: false, phase: phaseNumber, issues: response };
}
```

## Integration with PM

The PM must call this command before proceeding to next phase:

```javascript
// In PM workflow
if (phaseComplete) {
  console.log("Phase " + phaseNumber + " complete. Requesting validation sign-off...");
  const signoff = await runCommand("/phase-complete", phaseNumber);
  
  if (!signoff.approved) {
    console.log("❌ Cannot proceed without approval. Addressing issues:");
    console.log(signoff.issues);
    // Return to fixing issues
    return "fix_phase";
  } else {
    console.log("✅ Phase " + phaseNumber + " approved. Proceeding to Phase " + (phaseNumber + 1));
    return "next_phase";
  }
}
```

## Example Invocation

```
/phase-complete 1
```

Output:
```
🔍 PHASE 1 VALIDATION REVIEW
════════════════════════════════

Collecting evidence...
✅ Found 3 validation scripts
✅ All tests passed
✅ Build successful
✅ No script modifications detected

Submitting to validator...

════════════════════════════════
✅ APPROVED - Phase 1 Complete
════════════════════════════════

Validator Notes:
- All acceptance criteria met
- Tests are genuine and comprehensive
- Code quality meets standards
- Ready to proceed to Phase 2

You may now continue to the next phase.
```

## Rejection Example

```
/phase-complete 2
```

Output:
```
🔍 PHASE 2 VALIDATION REVIEW
════════════════════════════════

Collecting evidence...
✅ Found 5 validation scripts
⚠️  1 test failed
✅ Build successful
⚠️  Script modifications detected

Submitting to validator...

════════════════════════════════
❌ REJECTED - Phase 2 Not Ready
════════════════════════════════

Issues Found:
1. validate_task_2_3.sh - Test was weakened to pass
   Original: "must handle 1000 concurrent users"
   Modified: "must handle 10 concurrent users"
   
2. API endpoint /users/create returns 500 errors
   Test was bypassed instead of fixing root cause

Required Actions:
1. Restore original test requirements
2. Fix API endpoint to handle proper load
3. Re-run all Phase 2 validation scripts
4. Re-submit with /phase-complete 2

Cannot proceed to Phase 3 until these issues are resolved.
```

## Validation Criteria

The validator checks for:

### ✅ Genuine Test Passes
- No commented-out assertions
- No reduced requirements
- No mock data fallbacks
- No "skip" flags added

### ✅ Script Integrity
- No requirement weakening
- Only legitimate bug fixes
- Original acceptance criteria maintained
- No "exit 0" bypasses

### ✅ Build Success
- Clean compilation
- No errors or warnings (unless justified)
- All dependencies resolved
- Production-ready state

### ✅ Completeness
- All planned features implemented
- No placeholder code
- All edge cases handled
- Documentation updated

## Related Commands

- `/pm` - Project Manager that calls this at phase boundaries
- `/validate` - For manual validation of specific tasks
- `/agent-os` - For reviewing and enhancing validation requirements

## Notes

- This command is **mandatory** at phase boundaries
- The PM will automatically invoke it when configured
- Approval is required to proceed to next phase
- Rejection feedback is specific and actionable
- Can be run multiple times until approved
- Creates audit trail for project governance

---
version: 2.1.0
updated: 2025-10-11
devmaestro: true
changelog: |
  v2.1.0 - Initial release of phase boundary validation command
  Integrates with agentOS-validation-orchestrator for sign-off workflow

