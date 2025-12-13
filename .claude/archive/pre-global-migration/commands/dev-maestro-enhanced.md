<!--
Version: 2.1.0
Updated: 2025-10-11
-->

# Dev Maestro - Enhanced Code Review with Executive Summary

Run dev-maestro-orchestrator code reviews with automatic executive summary generation.

## Usage

```
/dev-maestro-enhanced [describe the code review or development task]
```

## What This Does

1. Invokes `dev-maestro-orchestrator` for comprehensive code analysis
2. Generates multi-format outputs:
   - **Executive Summary** (1 page) - Quick assessment
   - **Critical Fixes List** (Top 3-5) - Must-fix before deployment
   - **TL;DR Guide** (2-3 pages) - Code examples + implementation steps
   - **Quick Reference** (1 page) - Commands, patterns, gotchas
   - **Full Report** - Complete detailed analysis

## Instructions for Claude

### Step 1: Run Dev Maestro Review

Use Task tool with `subagent_type: "dev-maestro-orchestrator"`:

```
Please perform a comprehensive code review and development analysis:

[User's code/task description]

Focus Areas:
- Code quality and standards compliance
- Security vulnerabilities
- Performance bottlenecks
- Architecture patterns
- Test coverage
- Documentation gaps
- For migrations/deployments: Include rollback procedures, zero-downtime strategies, and deployment validation
- For major changes: Include gradual rollout plans and monitoring requirements

Provide actionable recommendations with code examples.
```

### Step 2: Generate Executive Summary

```markdown
# Dev Maestro Review - Executive Summary

**Code Quality Score**: [X/10]
**Security Risk**: [Critical/High/Medium/Low]
**Deployment Ready**: [Yes/No - with conditions]

## Critical Issues Found: [Number]
1. **[Issue]** - [One-line description]
2. **[Issue]** - [One-line description]
3. **[Issue]** - [One-line description]

## Code Improvements Needed:
- [Top recommendation 1]
- [Top recommendation 2]
- [Top recommendation 3]

## Test Coverage:
- Current: [X]%
- Target: [Y]%
- Gaps: [Areas missing tests]

## Next Steps:
1. [Fix critical security issues]
2. [Refactor X for performance]
3. [Add tests for Y]
```

### Step 3: Critical Fixes Checklist

```markdown
# 🔧 CRITICAL FIXES (Do Before Merge)

## P0 - Blocking Issues (Must Fix Now)
- [ ] **[Issue Title]**
  ```[language]
  // Current (broken):
  [bad code]

  // Fixed:
  [good code]
  ```
  Impact: [What breaks]
  Time: [Estimate]

## P1 - High Priority (Fix Within 24h)
- [ ] **[Issue Title]**
  [Same format]

[Total time to fix all: X hours]
```

### Step 4: TL;DR Implementation Guide

```markdown
# Implementation Guide

## What Was Reviewed
[Brief description]

## Code Patterns to Fix

### Pattern 1: [Anti-pattern Name]
**Problem:**
```[language]
[Bad code example]
```

**Solution:**
```[language]
[Good code example]
```

**Why:** [Explanation]

[Repeat for top 5 patterns]

## Testing Checklist
- [ ] Unit tests for [X]
- [ ] Integration tests for [Y]
- [ ] E2E tests for [Z]

## Deployment Steps
1. [Step 1 - e.g., Run tests in CI]
2. [Step 2 - e.g., Deploy to staging]
3. [Step 3 - e.g., Validate in staging]
4. [Step 4 - e.g., Deploy to production with rolling update]
5. [Step 5 - e.g., Monitor for 1 hour]

## Rollback Procedure (If Deployment Fails)
```bash
# STEP 1: Immediately rollback
[rollback command - e.g., docker service rollback api_service]

# STEP 2: Verify rollback success
[verification command - e.g., curl https://api.app.com/health]

# STEP 3: Notify team
[notification command - e.g., slack-notify "#incidents" "Deployment rolled back"]
```

**Rollback Time**: [X minutes]
**Data Safety**: [Yes - no data loss / No - requires manual intervention]
```

### Step 5: Quick Reference

```markdown
# Quick Reference - [Project]

## Common Patterns (Use These)
```[language]
// Pattern: [Name]
[Code snippet]
```

## Anti-Patterns (Avoid These)
```[language]
// ❌ Don't do this:
[Bad code]

// ✅ Do this instead:
[Good code]
```

## Useful Commands
```bash
# Run tests
[command]

# Build
[command]

# Lint
[command]
```

## Performance Targets
- API Response: < 200ms
- Bundle Size: < 500KB
- Test Coverage: > 80%
```

### Step 6: Present All Formats

Deliver in priority order:
1. Executive Summary
2. Critical Fixes Checklist
3. TL;DR Implementation Guide
4. Quick Reference Card
5. Full detailed report (link to file or inline)

## Example

```
User: /dev-maestro-enhanced Review the authentication system in src/auth/

[Runs dev-maestro-orchestrator]
[Generates all summary formats]
[Presents multi-format output]
```

## Notes

- Works for any development task (code review, refactoring, new features)
- Preserves full detailed analysis while adding quick-scan options
- Code examples are copy-paste ready
- Checklists track completion progress
