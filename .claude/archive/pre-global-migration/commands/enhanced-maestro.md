# Enhanced Maestro - Universal Post-Processing Wrapper

Run any of the 5 maestro orchestrators with automatic executive summary generation.

## The 5 Maestro Family

1. **AgentOS** - Architecture, planning, risk assessment (includes migration planning)
2. **Dev** - Implementation, code review, deployment (includes rollback procedures)
3. **Content** - Content generation, SEO optimization
4. **Cluster** - Microservice operations, Docker Swarm deployment
5. **Debug** - Critical incident triage and recovery

## Usage

```
/enhanced-maestro [orchestrator-name] [your task/request]
```

## Examples

```bash
# AgentOS review
/enhanced-maestro agentOS Review my DevMaestro Memory plan

# Dev code review
/enhanced-maestro dev Review the authentication system in src/auth/

# Content generation
/enhanced-maestro content Write article about "best project management tools"

# Migration planning (use agentOS)
/enhanced-maestro agentOS Plan PostgreSQL migration from Heroku to Supabase

# Cluster operations
/enhanced-maestro cluster Deploy new API v2.0 to production

# Incident triage
/enhanced-maestro debug Production API down - 500 errors, users can't login
```

## Supported Orchestrators

| Name | Slash Command | Focus Area |
|------|---------------|------------|
| `agentOS` | agentOS-maestro-orchestrator | Planning, architecture, migrations (strategic) |
| `dev` | dev-maestro-orchestrator | Implementation, deployments, rollbacks (tactical) |
| `content` | content-maestro-orchestrator | Writing, SEO, content generation |
| `cluster` | cluster-maestro-orchestrator | Docker Swarm, microservices, operations |
| `debug` | debug-maestro-orchestrator | Incident triage, emergency recovery |

## What This Does

This universal wrapper:
1. Routes your request to the appropriate maestro orchestrator
2. Receives the full detailed output
3. Auto-generates 4 summary formats:
   - **Executive Summary** (1 page) - Quick assessment
   - **Critical Actions** (Top 3-5) - Must-do items
   - **TL;DR Guide** (2-3 pages) - Implementation steps
   - **Quick Reference** (1 page) - Commands, checklists
4. Presents all formats in priority order

## Instructions for Claude

### Step 1: Parse User Input

Extract:
- **Orchestrator**: First argument after command (agentOS/dev/content/cluster/debug)
- **Task**: Remaining text

Map to subagent_type:
```javascript
const orchestratorMap = {
  'agentOS': 'agentOS-maestro-orchestrator',
  'dev': 'dev-maestro-orchestrator',
  'content': 'content-maestro-orchestrator',
  'cluster': 'cluster-maestro-orchestrator',
  'debug': 'debug-maestro-orchestrator'
};
```

**Note**: Migration capabilities are now handled by agentOS (planning/risk) + dev (deployment/rollback).

### Step 2: Run Orchestrator

Use Task tool with mapped subagent_type:

```
[User's task description]

[Orchestrator-specific focus areas based on type]
```

### Step 3: Generate Universal Summary Formats

#### Format 1: Executive Summary (All Orchestrators)

```markdown
# [Orchestrator Name] - Executive Summary

**Assessment Score**: [Rating/10]
**Risk/Quality Level**: [Critical/High/Medium/Low/Excellent]
**Recommendation**: [Specific action - Deploy/Hold/Fix/Approve/Revise]

## Key Findings: [Number]
1. **[Finding/Issue 1]** - [One-line description]
2. **[Finding/Issue 2]** - [One-line description]
3. **[Finding/Issue 3]** - [One-line description]

## Main Recommendations:
- [Top recommendation 1]
- [Top recommendation 2]
- [Top recommendation 3]

## Impact/Value:
- [Quantified benefit - time saved, issues prevented, quality improvement]

## Next Steps:
1. [First action to take]
2. [Second action]
3. [Third action]
```

#### Format 2: Critical Actions Checklist

```markdown
# ⚡ CRITICAL ACTIONS

## P0 - Must Do Now
- [ ] **[Action 1 Title]**
  - **Why**: [Impact if not done]
  - **How**: [Specific steps or code]
  - **Time**: [Estimate]
  - **Owner**: [Who should do this]

## P1 - High Priority (Within 24-48h)
- [ ] **[Action 2 Title]**
  - **Why**: [Impact]
  - **How**: [Steps]
  - **Time**: [Estimate]

[Total time for all P0+P1: X hours]
```

#### Format 3: TL;DR Implementation Guide

```markdown
# Quick Implementation Guide

## What This Is About
[2-3 sentence summary]

## Key Points
[5-7 bullet points of main takeaways]

## Implementation Steps

### Step 1: [Phase Name]
**Objective:** [What you're accomplishing]

**Actions:**
- [ ] [Action with command/code if applicable]
  ```[language]
  [Code or command]
  ```

**Success Criteria:**
- [How to verify it worked]

[Repeat for 3-5 main steps]

## Code/Configuration Examples
[3-5 most important code snippets, copy-paste ready]

## Verification Checklist
- [ ] [How to test/verify]
- [ ] [How to confirm quality]
- [ ] [How to validate success]
```

#### Format 4: Quick Reference Card

```markdown
# Quick Reference

## Key Commands/Patterns
```[language/bash]
# [Command/Pattern 1]
[Code]

# [Command/Pattern 2]
[Code]
```

## Important Metrics/Thresholds
- [Metric 1]: [Target value]
- [Metric 2]: [Target value]

## Gotchas/Common Mistakes
- ❌ **Don't**: [Anti-pattern]
- ✅ **Do**: [Correct approach]

## Emergency Procedures
[If applicable - rollback, incident response, etc.]

## Resources
- [Link to docs]
- [Link to examples]
```

### Step 4: Orchestrator-Specific Customization

Adjust format details based on orchestrator type:

**AgentOS:**
- Focus on architecture, security, production readiness
- Include risk assessment and deployment phases
- For migrations: Go/No-Go criteria, phased rollout plan
- Quantify time/cost savings

**Dev:**
- Focus on code quality, patterns, testing
- Include before/after code examples
- For deployments: Rollback procedures, zero-downtime strategies
- Highlight security vulnerabilities

**Content:**
- Focus on SEO, readability, engagement
- Include keyword density and Flesch scores
- Show before/after writing examples

**Cluster:**
- Focus on health, deployment, incident response
- Include service dependencies and resource limits
- Provide escalation procedures

**Debug:**
- Focus on P0/P1/P2 triage prioritization
- Immediate fix commands (< 5 min for P0)
- Rollback decision trees
- Root cause vs. symptom identification

### Step 5: Present All Formats

```markdown
# [Orchestrator Name] Enhanced Output

## 📋 Executive Summary (Start Here - 2 min read)
[Executive summary]

---
version: 2.1.0
updated: 2025-10-11

## ⚡ Critical Actions (Priority Checklist)
[Critical actions]

---
version: 2.1.0
updated: 2025-10-11

## 📖 TL;DR Implementation Guide (10 min read)
[TL;DR guide]

---
version: 2.1.0
updated: 2025-10-11

## 🎯 Quick Reference Card (Keep Handy)
[Quick reference]

---
version: 2.1.0
updated: 2025-10-11

## 📚 Full Detailed Output
[Full orchestrator output - can link to file or include inline]

---
version: 2.1.0
updated: 2025-10-11

**Pro Tip**:
- New to this topic? Start with Executive Summary → TL;DR Guide
- Ready to implement? Jump to Critical Actions → Quick Reference
- Need deep context? Read full detailed output
```

## Special Cases

### If Orchestrator Not Recognized

If user provides invalid orchestrator name:

```markdown
❌ Unknown orchestrator: "[name]"

**Available orchestrators:**
- `agentOS` - Planning, architecture, migrations (strategic)
- `dev` - Implementation, deployments, rollbacks (tactical)
- `content` - Writing and SEO
- `cluster` - Microservice operations
- `debug` - Incident triage and recovery

**Usage:** `/enhanced-maestro [orchestrator] [your task]`

**Example:** `/enhanced-maestro dev Review my authentication code`
```

### If Task Not Provided

```markdown
❌ No task specified

**Usage:** `/enhanced-maestro [orchestrator] [your task description]`

**Example:** `/enhanced-maestro agentOS Review my memory system architecture plan`
```

## Implementation Estimate

Adding this post-processing:
- **Time added**: 2-3 minutes (after orchestrator completes)
- **Value**: Saves user 10-15 minutes of reading/distilling
- **Trade-off**: Worth it for outputs > 5k words

## Testing

To test this command:
```
/enhanced-maestro agentOS Review the file DEVMAESTRO_MEMORY_V2_ENHANCED_PLAN.md and provide a second-opinion assessment
```

Expected behavior:
1. Routes to agentOS-maestro-orchestrator
2. Gets full review (could be 10k+ words)
3. Generates all 4 summary formats
4. Presents in priority order with navigation tips

## Benefits

✅ **No orchestrator changes needed** - Pure post-processing wrapper
✅ **Works with ALL maestros** - Universal pattern
✅ **User choice** - Can read summary OR full output
✅ **Time savings** - 80% of value in 20% of reading
✅ **Action-oriented** - Checklist format drives execution
