# Debug Maestro (Triage) - Enhanced Critical Failure Recovery

Run debug-maestro-orchestrator for critical incident triage, root cause analysis, and systematic recovery with automatic executive summary.

## Usage

```
/debug-maestro-enhanced [describe the critical failure or incident]
```

## What This Does

1. Invokes `debug-maestro-orchestrator` for comprehensive triage analysis
2. Generates multi-format outputs:
   - **Executive Summary** (1 page) - Incident severity + immediate actions
   - **Triage Priority List** (P0/P1/P2) - Fix order for fastest recovery
   - **TL;DR Recovery Guide** (2-3 pages) - Root cause + fix steps
   - **Quick Reference** (1 page) - Emergency commands, rollback, escalation
   - **Full Incident Report** - Complete analysis and post-mortem

## Instructions for Claude

### Step 1: Run Debug Maestro Triage

Use Task tool with `subagent_type: "debug-maestro-orchestrator"`:

```
Please perform critical incident triage and root cause analysis:

[User's incident description - e.g., "Production API down - 500 errors" or "Database locked up - users can't login" or "Redis out of memory - cache failures"]

Critical Context:
- What broke: [Service/feature]
- When it broke: [Timestamp or "just now"]
- User impact: [How many users affected]
- Error messages: [Stack traces, logs]
- Recent changes: [Deployments, config changes]

Triage Requirements:
- Prioritize issues by severity (P0 = production down, P1 = degraded, P2 = minor)
- Identify root cause(s)
- Provide immediate fix for P0 issues
- Give systematic recovery plan
- Include rollback options if applicable
```

### Step 2: Generate Executive Summary

```markdown
# Incident Triage - Executive Summary

**Incident Severity**: [P0 - Critical / P1 - High / P2 - Medium]
**System Status**: [Down / Degraded / Partially Available]
**User Impact**: [X users affected / Y% traffic impacted]
**Root Cause Identified**: [Yes/No - investigating]
**ETA to Resolution**: [X minutes/hours]

## Immediate Actions Taken:
1. ✅ [Action 1 - e.g., Rollback deployment]
2. ✅ [Action 2 - e.g., Scaled Redis memory]
3. ⏳ [Action 3 - e.g., Investigating database locks]

## Critical Issues Found: [Number]

### P0 - Production Down (Fix NOW)
1. **[Issue Title]** - [One-line description]
   - Impact: Production completely offline
   - ETA: [X minutes to fix]

### P1 - Degraded Performance (Fix Within 1 Hour)
2. **[Issue Title]** - [One-line description]
   - Impact: [Description of degradation]
   - ETA: [X minutes to fix]

### P2 - Minor Issues (Fix After Recovery)
3. **[Issue Title]** - [One-line description]
   - Impact: [Description]

## Root Cause Analysis:
**Primary Cause**: [What actually broke]
**Contributing Factors**: [What made it worse]
**Why Detection Was Delayed**: [If applicable]

## Recovery Status:
- [X] P0 issues resolved
- [ ] P1 issues in progress
- [ ] P2 issues deferred

## Next Steps:
1. [Immediate next action]
2. [Follow-up action]
3. [Post-mortem scheduling]

## Incident Timeline:
- **[Time]**: Incident began
- **[Time]**: First alert fired
- **[Time]**: Team notified
- **[Time]**: Root cause identified
- **[Time]**: Fix deployed
- **[Time]**: Service restored (ETA)
```

### Step 3: Triage Priority Checklist

```markdown
# 🚨 TRIAGE PRIORITY LIST (Fix in This Order)

## P0 - CRITICAL (Production Down - Drop Everything)

### Issue #1: [Most Critical Issue]
**Status**: 🔴 **BLOCKING PRODUCTION**

**Symptoms**:
- API returning 500 errors
- Database connection pool exhausted
- Users cannot login

**Root Cause**:
[Exact cause - e.g., "Database migration script left table locked"]

**Immediate Fix** (DO THIS NOW - 5 minutes):
```bash
# STEP 1: Release database lock
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction';"

# STEP 2: Verify lock released
psql $DATABASE_URL -c "SELECT * FROM pg_locks WHERE granted = false;"

# STEP 3: Restart API containers
docker service update --force opendeepsearch_api
```

**Verification** (Confirm fix worked):
```bash
# Test API endpoint
curl https://api.xencolabs.com/health
# Expected: HTTP 200

# Check error rate
docker service logs --tail 100 opendeepsearch_api | grep -i error
# Expected: No errors
```

**Rollback Option** (If fix doesn't work):
```bash
# Revert to previous deployment
docker service update --rollback opendeepsearch_api
```

**Time to Fix**: 5 minutes
**Owner**: On-call engineer
**Escalate If**: Not resolved in 10 minutes

---
version: 2.1.0
updated: 2025-10-11

### Issue #2: [Second Critical Issue]
**Status**: 🔴 **CRITICAL**

[Same structure as Issue #1]

---
version: 2.1.0
updated: 2025-10-11

## P1 - HIGH PRIORITY (Degraded Performance - Fix Within 1 Hour)

### Issue #3: [High Priority Issue]
**Status**: 🟡 **DEGRADED**

**Symptoms**:
- Response times 5x slower than normal
- Some API calls timing out
- Intermittent errors

**Root Cause**:
[Cause - e.g., "Redis cache full, eviction policy causing thrashing"]

**Fix** (30 minutes):
```bash
# STEP 1: Increase Redis memory limit
docker service update --limit-memory 4G redis_redis

# STEP 2: Clear least-used keys
redis-cli -h localhost -p 6379 --scan --pattern "cache:*" | head -1000 | xargs redis-cli DEL

# STEP 3: Monitor memory usage
watch -n 5 'docker exec $(docker ps -q -f name=redis) redis-cli INFO memory | grep used_memory_human'
```

**Verification**:
```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://api.xencolabs.com/api/users
# Expected: < 200ms

# Check Redis memory
docker exec $(docker ps -q -f name=redis) redis-cli INFO memory | grep maxmemory_policy
# Expected: allkeys-lru
```

**Time to Fix**: 30 minutes
**Owner**: Infrastructure team

---
version: 2.1.0
updated: 2025-10-11

## P2 - MEDIUM (Fix After Production Restored)

### Issue #4: [Medium Priority Issue]
**Status**: 🟢 **MINOR**

**Symptoms**: [Non-critical issues]
**Impact**: [Limited user impact]
**Fix**: [Deferred to post-incident]

---
version: 2.1.0
updated: 2025-10-11

## Recovery Sequence

**Order of Operations** (DO NOT SKIP STEPS):

1. ⏸️  **PAUSE**: Assess situation (2 minutes)
   - [ ] Read all alerts
   - [ ] Check monitoring dashboards
   - [ ] Notify team

2. 🔴 **P0 FIXES**: Production down (10-15 minutes max)
   - [ ] Fix Issue #1: [Title]
   - [ ] Fix Issue #2: [Title]
   - [ ] Verify production restored

3. 🟡 **P1 FIXES**: Degraded performance (30-60 minutes)
   - [ ] Fix Issue #3: [Title]
   - [ ] Monitor for stability

4. 🟢 **P2 FIXES**: Minor issues (deferred)
   - [ ] Schedule fixes for next sprint
   - [ ] Document in backlog

5. 📊 **POST-MORTEM**: After recovery (24h later)
   - [ ] Write incident report
   - [ ] Identify prevention measures
   - [ ] Update runbooks

**Total Time to Full Recovery**: [X] minutes (P0) + [Y] minutes (P1) = [Z] minutes
```

### Step 4: TL;DR Recovery Guide

```markdown
# Recovery Implementation Guide

## Incident Overview

**What Happened**: [Brief description of the failure]
**Primary Cause**: [Root cause in one sentence]
**Secondary Causes**: [Contributing factors]
**Impact**: [User-facing consequences]

## Root Cause Analysis

### Investigation Process

**Step 1: Symptom Analysis**
```bash
# Check service health
docker service ls | grep -E "0/[0-9]+"

# Check recent deployments
docker service ps opendeepsearch_api | head -20

# Check error logs
docker service logs --since 30m opendeepsearch_api | grep -i error | head -50
```

**Findings**:
- [What you found in logs]
- [What monitoring showed]
- [What changed recently]

**Step 2: Hypothesis Testing**
```bash
# Test hypothesis: Database connection issue
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Test hypothesis: Memory leak
docker stats --no-stream | grep api

# Test hypothesis: Dependency failure
curl http://redis:6379/ping
curl http://postgres:5432
```

**Confirmed Root Cause**: [Exact cause with evidence]

### The Fix (Step-by-Step)

#### Phase 1: Immediate Stabilization (5 minutes)

**Goal**: Stop the bleeding, restore basic functionality

**Commands**:
```bash
# 1. Identify failing component
docker service ps opendeepsearch_api --filter "desired-state=running" --format "{{.Node}}: {{.CurrentState}}"

# 2. Force restart if needed
docker service update --force opendeepsearch_api

# 3. Scale up for redundancy
docker service scale opendeepsearch_api=6
```

**Success Criteria**:
- [ ] At least 50% of replicas healthy
- [ ] Health endpoint returning 200
- [ ] Error rate < 10%

#### Phase 2: Root Cause Resolution (15 minutes)

**Goal**: Fix the underlying problem

**For Database Lock Issue**:
```bash
# Kill blocking queries
psql $DATABASE_URL <<EOF
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction'
AND state_change < current_timestamp - interval '5 minutes';
EOF

# Verify locks cleared
psql $DATABASE_URL -c "SELECT * FROM pg_locks WHERE NOT granted;"

# Prevent future locks (add timeout)
psql $DATABASE_URL -c "ALTER DATABASE neondb SET idle_in_transaction_session_timeout = '5min';"
```

**For Redis Memory Issue**:
```bash
# Increase memory limit
docker service update --limit-memory 4G redis_redis

# Set eviction policy
docker exec $(docker ps -q -f name=redis) redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Clear old data
docker exec $(docker ps -q -f name=redis) redis-cli FLUSHDB
```

**For API Memory Leak**:
```bash
# Restart with rolling update
docker service update \
  --update-parallelism 1 \
  --update-delay 30s \
  --force \
  opendeepsearch_api

# Monitor memory during rollout
watch -n 5 'docker stats --no-stream | grep api'
```

**Success Criteria**:
- [ ] Root cause eliminated (verified by tests)
- [ ] No new errors in logs
- [ ] System stable for 10 minutes

#### Phase 3: Validation (10 minutes)

**Goal**: Confirm full recovery

**Smoke Tests**:
```bash
# Test critical endpoints
curl -w "\nStatus: %{http_code}\nTime: %{time_total}s\n" \
  https://api.xencolabs.com/api/health

curl -w "\nStatus: %{http_code}\nTime: %{time_total}s\n" \
  https://api.xencolabs.com/api/users

curl -w "\nStatus: %{http_code}\nTime: %{time_total}s\n" \
  https://api.xencolabs.com/api/projects
```

**Performance Comparison**:
```bash
# Run load test (compare to baseline)
ab -n 1000 -c 10 https://api.xencolabs.com/api/health

# Expected:
# - 100% success rate
# - p95 latency < 200ms
# - No errors
```

**Monitoring Check**:
```bash
# Verify all services green
docker service ls

# Check Prometheus metrics
curl http://prometheus:9090/api/v1/query?query=up{job="api"}

# Check Grafana dashboard
open https://grafana.xencolabs.com/d/cluster-overview
```

**Success Criteria**:
- [ ] All smoke tests passing
- [ ] Performance within 10% of baseline
- [ ] All monitoring green
- [ ] No customer complaints for 30 minutes

#### Phase 4: Post-Incident Actions (After Recovery)

**Goal**: Prevent recurrence

**Immediate Actions**:
- [ ] Update runbook with this incident
- [ ] Add monitoring for this failure mode
- [ ] Create alert for early detection

**Follow-Up Tasks** (Next 24h):
- [ ] Write incident report
- [ ] Schedule post-mortem meeting
- [ ] Identify preventive measures
- [ ] Update deployment checklist

## Rollback Procedures

### When to Rollback

**Rollback if**:
- Fix attempt fails after 2 tries
- Situation gets worse after fix
- Recovery time exceeds incident time
- Data integrity at risk

**DON'T rollback if**:
- Partial improvement seen
- Root cause identified and fixable
- Rollback would cause data loss

### Emergency Rollback

**STEP 1: Stop Current Deployment**
```bash
# Pause all service updates
docker service update --rollback opendeepsearch_api
```

**STEP 2: Revert to Last Known Good**
```bash
# Check deployment history
docker service ps opendeepsearch_api | head -10

# Rollback to specific version
docker service update \
  --image registry.xencolabs.com/api:v1.9.5 \
  --update-parallelism 1 \
  --update-delay 10s \
  opendeepsearch_api
```

**STEP 3: Verify Rollback**
```bash
# Check service version
docker service inspect opendeepsearch_api --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}'

# Test health
curl https://api.xencolabs.com/health
```

**STEP 4: Communicate**
```bash
# Notify team
slack-notify "#incidents" "ROLLBACK executed - service restored to v1.9.5"

# Update status page
update-status-page "Incident resolved - rolled back to stable version"
```

## Prevention Measures

### Immediate (Deploy This Week)
- [ ] Add database connection pool monitoring
- [ ] Increase Redis memory alerts threshold to 80%
- [ ] Add transaction timeout to prevent locks
- [ ] Enable circuit breakers for external APIs

### Short-term (Next Sprint)
- [ ] Implement gradual rollouts (canary deployments)
- [ ] Add automated rollback on health check failure
- [ ] Create synthetic monitoring for critical paths
- [ ] Add chaos engineering tests

### Long-term (Next Quarter)
- [ ] Implement full observability stack
- [ ] Add anomaly detection to metrics
- [ ] Create disaster recovery runbooks
- [ ] Schedule quarterly incident response drills
```

### Step 5: Quick Reference

```markdown
# Debug Triage Quick Reference

## Incident Severity Levels

| Level | Definition | Response Time | Examples |
|-------|-----------|---------------|----------|
| **P0** | Production down, data at risk | Immediate | API offline, database locked, data corruption |
| **P1** | Degraded performance, user impact | < 1 hour | Slow queries, intermittent errors, cache failures |
| **P2** | Minor issues, limited impact | < 24 hours | UI bugs, non-critical errors, logging issues |

## Emergency Commands

### Service Health
```bash
# Check all services
docker service ls

# View service logs (last 100 lines)
docker service logs --tail 100 -f SERVICE_NAME

# Inspect service state
docker service ps SERVICE_NAME

# Force restart service
docker service update --force SERVICE_NAME
```

### Database Emergency
```bash
# Kill all idle transactions
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction';"

# Check for locks
psql $DATABASE_URL -c "SELECT * FROM pg_locks WHERE NOT granted;"

# Check active connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Emergency: Kill all connections except yours
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid <> pg_backend_pid();"
```

### Redis Emergency
```bash
# Check memory usage
docker exec $(docker ps -q -f name=redis) redis-cli INFO memory

# Clear all cache (DANGEROUS - use only if critical)
docker exec $(docker ps -q -f name=redis) redis-cli FLUSHALL

# Check connected clients
docker exec $(docker ps -q -f name=redis) redis-cli CLIENT LIST

# Emergency restart
docker service update --force redis_redis
```

### Rollback Deployment
```bash
# Rollback last deployment
docker service rollback SERVICE_NAME

# Rollback to specific version
docker service update --image registry.xencolabs.com/SERVICE:TAG SERVICE_NAME
```

## Escalation Path

### Chain of Command
1. **On-Call Engineer** (You) - [PagerDuty]
   - Initial response
   - P2 incidents

2. **Team Lead** - [Name/Phone/Slack]
   - Escalate if: P1 not resolved in 1 hour
   - Escalate if: P0 needs architectural decision

3. **Infrastructure Manager** - [Name/Phone/Slack]
   - Escalate if: Multiple services affected
   - Escalate if: Data integrity risk
   - Escalate if: Customer communication needed

4. **CTO** - [Name/Phone/Slack]
   - Escalate if: Major outage (> 4 hours)
   - Escalate if: Data loss occurred
   - Escalate if: Security breach

### When to Escalate

**Escalate immediately if**:
- P0 incident not resolved in 30 minutes
- Data loss or corruption detected
- Security breach suspected
- Multiple services failing simultaneously
- Root cause completely unknown

**DON'T escalate if**:
- Making progress toward resolution
- Issue is well-understood and being fixed
- Incident is P2 or lower

## Incident Communication

### Status Updates (Every 15 minutes during P0)

**Format**:
```
[HH:MM] Update #X:
Status: [Investigating / Fix Deployed / Monitoring]
Impact: [X users / Y% traffic]
ETA: [Z minutes]
Actions: [What we're doing]
```

### Channels
- **#incidents** (Slack) - Team coordination
- **#status-updates** (Slack) - Stakeholder updates
- **status.xencolabs.com** - Public status page
- **PagerDuty** - Escalation and on-call

### Post-Incident
- **Incident Report** (Template in Notion)
- **Post-Mortem Meeting** (Within 24h)
- **Action Items** (Tracked in Jira)

## Monitoring Dashboards

| Dashboard | URL | Use For |
|-----------|-----|---------|
| Cluster Overview | https://grafana.xencolabs.com/d/cluster | Overall health |
| Service Metrics | https://grafana.xencolabs.com/d/services | API performance |
| Database Performance | https://grafana.xencolabs.com/d/postgres | DB slow queries |
| Redis Metrics | https://grafana.xencolabs.com/d/redis | Cache hit rates |
| Traefik | https://traefik.xencolabs.com | Routing & SSL |

## Common Failure Modes & Fixes

### 1. Database Connection Pool Exhausted
**Symptoms**: "Too many connections" errors
**Quick Fix**:
```bash
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle';"
```
**Permanent Fix**: Increase pool size in app config

### 2. Redis Out of Memory
**Symptoms**: "OOM" errors, cache misses
**Quick Fix**:
```bash
docker service update --limit-memory 4G redis_redis
```
**Permanent Fix**: Enable eviction policy + monitoring

### 3. API Container Out of Memory
**Symptoms**: Containers restarting, slow responses
**Quick Fix**:
```bash
docker service update --force opendeepsearch_api
```
**Permanent Fix**: Investigate memory leak, increase limits

### 4. Traefik Certificate Expired
**Symptoms**: SSL errors, 525 status codes
**Quick Fix**:
```bash
docker service update --force traefik_traefik
```
**Permanent Fix**: Enable auto-renewal monitoring

### 5. Disk Full on Node
**Symptoms**: Cannot pull images, containers failing
**Quick Fix**:
```bash
ssh xencoX 'docker system prune -af --volumes'
```
**Permanent Fix**: Increase disk size, add monitoring

## Decision Trees

### Should I Rollback?

```
Incident detected
  ├─ Fix deployed, still broken?
  │   ├─ Yes → ROLLBACK NOW
  │   └─ No → Continue monitoring
  │
  ├─ Getting worse after fix?
  │   ├─ Yes → ROLLBACK NOW
  │   └─ No → Continue monitoring
  │
  ├─ Been > 30 min, no progress?
  │   ├─ Yes → Consider rollback
  │   └─ No → Continue fixing
  │
  └─ Data integrity at risk?
      ├─ Yes → ROLLBACK + ESCALATE
      └─ No → Continue monitoring
```

### Should I Escalate?

```
Incident severity
  ├─ P0 (Production down)
  │   ├─ Resolved in < 30 min? → No escalation
  │   └─ Still broken after 30 min? → Escalate to Team Lead
  │
  ├─ P1 (Degraded)
  │   ├─ Resolved in < 1 hour? → No escalation
  │   └─ Still broken after 1 hour? → Escalate to Team Lead
  │
  └─ P2 (Minor)
      └─ Handle during business hours → No escalation
```
```

### Step 6: Present All Formats

Deliver in priority order:
1. Executive Summary (severity + immediate actions + timeline)
2. Triage Priority List (P0/P1/P2 with exact fix commands)
3. TL;DR Recovery Guide (root cause + systematic fix)
4. Quick Reference Card (emergency commands, escalation, decision trees)
5. Full incident report

## Example

```
User: /debug-maestro-enhanced Production API is down - getting 500 errors. Started 10 minutes ago. Error logs show "database connection timeout". We deployed new code 30 minutes ago.

[Runs debug-maestro-orchestrator]
[Performs triage and root cause analysis]
[Generates all summary formats with prioritized fixes]
[Presents multi-format output with immediate actions + rollback procedure]
```

## Key Principles

### Triage Philosophy

1. **Stop the Bleeding First** - P0 fixes before P1 analysis
2. **Fix > Perfection** - Quick fix now, perfect fix later
3. **Communicate Often** - Updates every 15 min during P0
4. **Rollback is OK** - Better to rollback than stay broken
5. **Learn from Failures** - Every incident improves the system

### Recovery Priorities

1. **Restore Service** (Minutes)
   - Get users back online
   - Acceptable: Partial functionality

2. **Fix Root Cause** (Hours)
   - Eliminate underlying problem
   - Acceptable: Temporary workaround first

3. **Prevent Recurrence** (Days)
   - Add monitoring
   - Improve deployment process
   - Update runbooks

### When NOT to Use This Maestro

- Non-critical bugs (use dev-maestro-orchestrator)
- Performance optimization (use dev-maestro-orchestrator)
- Code review (use dev-maestro-orchestrator)
- Planned migrations (use agentOS-maestro-orchestrator)

### When to Use This Maestro

- ✅ Production is down
- ✅ Users cannot access critical features
- ✅ Data corruption or loss risk
- ✅ Security incident
- ✅ Multiple simultaneous failures
- ✅ Unknown root cause requiring investigation

## Notes

- Emphasizes SPEED over perfection in P0 situations
- Provides exact copy-paste commands for fastest recovery
- Includes decision trees for common dilemmas (rollback? escalate?)
- Prioritizes user impact and service restoration
- Documents everything for post-mortem learning
