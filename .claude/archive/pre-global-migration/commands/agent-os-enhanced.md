# AgentOS Maestro - Enhanced Review with Executive Summary

This command runs the AgentOS Maestro Orchestrator review and automatically generates:
- Executive Summary (1 page)
- Fix Immediately list (top 3-5 critical items)
- TL;DR version (2-3 pages)
- Full detailed report

## Usage

```
/agent-os-enhanced [document or plan to review]
```

## Process

1. **Run 3-Iteration Review**: Use the agentOS-maestro-orchestrator to perform comprehensive review
2. **Post-Process Output**: Generate multiple format options
3. **Deliver Multi-Format Results**: Present all versions for user choice

## Instructions for Claude

When this command is invoked:

### Step 1: Run the AgentOS Maestro Review

Use the Task tool with `subagent_type: "agentOS-maestro-orchestrator"` to perform a 3-iteration review of the provided document/plan.

The prompt should be:
```
Please perform a comprehensive 3-iteration review of this plan/document:

[User's document content]

Review Focus:
- Identify critical issues, security vulnerabilities, and gaps
- Provide specific, actionable recommendations
- Include code examples and implementation guidance
- Calculate quantifiable impact where possible
- For migrations/major changes: Include risk assessment, Go/No-Go criteria, and phased rollout plan
- For architecture changes: Include rollback strategies and validation procedures

Return your complete findings in a structured format.
```

### Step 2: Post-Process the Full Review

After receiving the complete review from the Agent OS Maestro, generate the following outputs:

#### 2a. Executive Summary (1 Page)

Extract and format:
```markdown
# Executive Summary

**Overall Assessment**: [Rating and recommendation]
**Risk Level**: [Critical/High/Medium/Low]
**Deployment Recommendation**: [Go/No-Go with conditions]
**Migration Complexity**: [If applicable - Simple/Moderate/Complex/High-Risk]

## Critical Issues Found: [Number]
[List top 3-5 critical issues with one-line description each]

## Key Recommendations:
[Top 3-5 actionable recommendations]

## Value Delivered:
- Time Saved: [Estimate]
- Issues Prevented: [List]
- Lines of Code Provided: [Count]

## Go/No-Go Criteria (For Migrations/Major Changes):
✅ **Go if**:
- [Condition 1 - e.g., All tests passing in staging]
- [Condition 2 - e.g., Rollback procedure validated]
- [Condition 3 - e.g., Team has capacity for monitoring]

❌ **No-Go if**:
- [Condition 1 - e.g., Critical tests failing]
- [Condition 2 - e.g., Rollback not tested]
- [Condition 3 - e.g., Major holiday/weekend approaching]

## Next Steps:
1. [First action]
2. [Second action]
3. [Third action]
```

#### 2b. Fix Immediately List

Create a prioritized checklist:
```markdown
# 🚨 FIX IMMEDIATELY (Before Any Deployment)

Priority order based on severity and impact:

## P0 - Critical Security/Blocker Issues
- [ ] **Issue 1 Title** - One sentence explanation
  - Impact: [What breaks/security risk]
  - Fix: [Specific action required]
  - Time: [Estimate]

- [ ] **Issue 2 Title** - One sentence explanation
  - Impact: ...
  - Fix: ...
  - Time: ...

## P1 - High Priority (Within 24-48 Hours)
- [ ] **Issue 3 Title** - One sentence explanation
  - Impact: ...
  - Fix: ...
  - Time: ...

[Total estimated time to fix all P0+P1 issues: X hours]
```

#### 2c. TL;DR Version (2-3 Pages)

Condensed actionable guide:
```markdown
# Quick Implementation Guide

## What Was Reviewed
[2-3 sentences]

## Critical Findings
[5-7 bullet points of key issues]

## Recommended Architecture Changes
[Bullet list with brief explanations]

## Code Snippets (Copy-Paste Ready)
[Include 3-5 most critical code examples from full review]

## Deployment Checklist
- [ ] Phase 0: [Critical fixes]
- [ ] Phase 1: [Core reliability]
- [ ] Phase 2: [Monitoring]
- [ ] Phase 3: [Testing]

## Success Metrics
- [Metric 1]: Target value
- [Metric 2]: Target value
- [Metric 3]: Target value
```

#### 2d. Quick Reference Card

One-page cheat sheet:
```markdown
# Quick Reference - [Project Name]

| Component | Status | Action Required |
|-----------|--------|-----------------|
| Security | 🔴 Critical | Rotate credentials |
| Architecture | 🟡 Warning | Add circuit breaker |
| Monitoring | 🟢 Good | Deploy Grafana |

## Key Commands
```bash
# Health check
[command]

# Deploy
[command]

# Rollback
[command]
```

## Alert Thresholds
- CPU: > 80%
- Memory: > 90%
- Error Rate: > 1%

## Emergency Contacts
[If applicable]
```

### Step 3: Present All Formats

Deliver output in this order:

```
# AgentOS Maestro Enhanced Review Complete

## 📋 Executive Summary (Start Here)
[Executive summary content]

---
version: 2.1.0
updated: 2025-10-11

## 🚨 Fix Immediately Checklist
[Fix immediately list]

---
version: 2.1.0
updated: 2025-10-11

## 📖 TL;DR Implementation Guide
[TL;DR content]

---
version: 2.1.0
updated: 2025-10-11

## 🎯 Quick Reference Card
[Quick reference content]

---
version: 2.1.0
updated: 2025-10-11

## 📚 Full Detailed Report (Reference Material)
[Original full review from AgentOS Maestro - link to file or provide inline]

---
version: 2.1.0
updated: 2025-10-11

**How to Use These Outputs:**
1. Read Executive Summary first (2 min)
2. Work through Fix Immediately checklist (priority actions)
3. Use TL;DR as implementation roadmap (contains code)
4. Reference full report for deep dive on specific issues
5. Keep Quick Reference Card handy during deployment
```

## Example

```
User: /agent-os-enhanced DEVMAESTRO_MEMORY_90DAY_DUAL_REDIS_IMPLEMENTATION.md

[Claude runs Task tool with agentOS-maestro-orchestrator]
[Claude receives full 25k word review]
[Claude generates all 4 summary formats]
[Claude presents multi-format output as shown above]
```

## Notes

- This wrapper adds ~2-3 minutes of post-processing time
- The full review quality remains unchanged
- Users get choice: quick scan vs. deep dive
- All formats reference the same underlying analysis
- Can be used with ANY maestro orchestrator (dev, content, migration, cluster, agentOS)
