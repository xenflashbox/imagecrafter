<!--
Version: 2.1.0
Updated: 2025-10-11
-->

# Cluster Maestro - Enhanced Microservice Operations with Executive Summary

Run cluster-maestro-orchestrator workflows for Docker Swarm/Kubernetes operations with automatic executive summary and incident response.

## Usage

```
/cluster-maestro-enhanced [describe cluster operation or issue]
```

## What This Does

1. Invokes `cluster-maestro-orchestrator` for microservice/cluster operations
2. Generates multi-format outputs:
   - **Executive Summary** (1 page) - Cluster health + deployment readiness
   - **Critical Actions List** (Top 3-5) - Must-do before deployment
   - **TL;DR Operations Guide** (2-3 pages) - Deployment steps + rollback
   - **Quick Reference** (1 page) - Commands, health checks, incident response
   - **Full Operations Plan** - Complete detailed runbook

## Instructions for Claude

### Step 1: Run Cluster Maestro Analysis

Use Task tool with `subagent_type: "cluster-maestro-orchestrator"`:

```
Please analyze this cluster operation or issue:

[User's cluster task - e.g., "Deploy new service to Docker Swarm" or "Debug Redis connection issues" or "Scale BlogCraft API"]

Focus Areas:
- Service health and dependencies
- Resource allocation (CPU, memory, network)
- High availability and redundancy
- Rolling update strategy
- Monitoring and alerting
- Incident response procedures

Provide specific commands and configuration with safety checks.
```

### Step 2: Generate Executive Summary

```markdown
# Cluster Operations - Executive Summary

**Cluster Health**: [Healthy/Degraded/Critical]
**Deployment Risk**: [Low/Medium/High]
**Recommended Action**: [Deploy/Hold/Rollback/Scale]

## Current Cluster State:
- **Nodes**: [X] healthy, [Y] unhealthy
- **Services**: [Z] running, [W] failed
- **Resource Usage**: CPU [X]%, Memory [Y]%, Storage [Z]%
- **Network**: [Healthy/Degraded]

## Critical Issues Found: [Number]
1. **[Issue]** - [e.g., Redis out of memory]
2. **[Issue]** - [e.g., Traefik certificate expired]
3. **[Issue]** - [e.g., Node xenco3 disk 95% full]

## Deployment Readiness:
✅ **Ready to Deploy**:
- Health checks passing
- Resource capacity available
- Rollback tested

❌ **Blockers**:
- [Issue 1 that blocks deployment]
- [Issue 2 that blocks deployment]

## Impact Assessment:
- **Downtime**: [Expected downtime or zero-downtime]
- **Affected Services**: [List of services]
- **User Impact**: [Description]
- **Rollback Time**: [Minutes to rollback if needed]

## Next Steps:
1. [Fix Redis memory issue]
2. [Test deployment in staging]
3. [Execute deployment with health monitoring]
```

### Step 3: Critical Actions Checklist

```markdown
# ⚙️ CRITICAL ACTIONS (Before Deployment)

## P0 - Blocking Issues (Must Resolve Now)
- [ ] **Redis Memory Critical**
  - **Current**: 95% memory usage, eviction policy: noeviction
  - **Impact**: Redis will crash on next write
  - **Fix**:
    ```bash
    # Increase memory limit
    docker service update --limit-memory 2G redis_redis

    # Or flush least-used data
    redis-cli -h localhost -p 6379 FLUSHDB
    ```
  - **Verification**:
    ```bash
    docker exec $(docker ps -q -f name=redis) redis-cli INFO memory | grep used_memory_human
    ```
  - **Owner**: SRE Team
  - **Deadline**: Before deployment

- [ ] **Traefik Certificate Expired**
  - **Current**: Certificate for *.xencolabs.com expired 2 days ago
  - **Impact**: All HTTPS traffic returning 525 SSL error
  - **Fix**:
    ```bash
    # Force certificate renewal
    docker exec $(docker ps -q -f name=traefik) rm /letsencrypt/acme.json
    docker service update --force traefik_traefik
    ```
  - **Verification**:
    ```bash
    curl -I https://api.xencolabs.com
    # Should return: HTTP/2 200
    ```
  - **Owner**: Infrastructure Team
  - **Deadline**: ASAP (production down)

## P1 - High Priority (Fix Within 24h)
- [ ] **Node xenco3 Disk Full**
  - **Current**: /var/lib/docker at 95% usage
  - **Impact**: Cannot pull new images or create containers
  - **Fix**:
    ```bash
    # Clean up old images
    ssh xenco3 'docker system prune -af --volumes'

    # If still full, expand volume or migrate services
    ```
  - **Verification**:
    ```bash
    ssh xenco3 'df -h /var/lib/docker'
    ```
  - **Owner**: Infrastructure Team

[Total time to fix all: X hours]
```

### Step 4: TL;DR Operations Guide

```markdown
# Operations Guide - [Service/Issue Name]

## What We're Doing
**Objective:** [Deploy new service / Fix issue / Scale infrastructure]
**Affected Services:** [List]
**Expected Duration:** [X minutes/hours]
**Downtime:** [Zero-downtime / X minutes planned]

## Pre-Deployment Checks

### Health Verification
```bash
# Check all nodes
docker node ls

# Check service health
docker service ls

# Check resource usage
docker stats --no-stream

# Verify Traefik routing
curl -I https://api.xencolabs.com/health
```

**Expected Output:**
- All nodes: READY
- All services: X/X replicas
- CPU < 70%, Memory < 80%
- Health endpoint: HTTP 200

### Deployment Prerequisites
- [ ] Backup created
  ```bash
  ./scripts/backup-cluster-state.sh
  ```
- [ ] Staging deployment successful
- [ ] Rollback procedure tested
- [ ] Team on standby

## Deployment Steps

### Step 1: Deploy New Configuration
```bash
# Update service with new image
docker service update \
  --image registry.xencolabs.com/api:v2.0 \
  --update-parallelism 1 \
  --update-delay 30s \
  --update-failure-action rollback \
  opendeepsearch_api

# Monitor rollout
watch -n 2 'docker service ps opendeepsearch_api'
```

**Success Criteria:**
- All replicas updated: X/X
- Health checks passing
- No error logs

### Step 2: Verify Deployment
```bash
# Check service logs
docker service logs --tail 50 opendeepsearch_api

# Test API endpoint
curl https://api.xencolabs.com/api/health

# Check metrics
curl https://prometheus.xencolabs.com/api/v1/query?query=up{job="api"}
```

**Success Criteria:**
- No errors in logs
- Health endpoint returns 200
- Prometheus metrics show all instances UP

### Step 3: Monitor for Issues (First Hour)
```bash
# Watch error rate
docker service logs -f opendeepsearch_api | grep -i error

# Monitor resource usage
docker stats opendeepsearch_api

# Check Grafana dashboard
open https://grafana.xencolabs.com/d/cluster-overview
```

**Alert Thresholds:**
- Error rate: > 1%
- Response time: > 500ms
- Memory usage: > 90%

## Rollback Procedure (If Anything Goes Wrong)

### Automatic Rollback (Already Configured)
```bash
# Service will auto-rollback on health check failure
# Verify rollback happened:
docker service ps opendeepsearch_api | grep "Shutdown.*Failed"
```

### Manual Rollback
```bash
# STEP 1: Immediately rollback
docker service rollback opendeepsearch_api

# STEP 2: Verify old version running
docker service inspect opendeepsearch_api --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}'

# STEP 3: Test old version
curl https://api.xencolabs.com/api/health

# STEP 4: Notify team
slack-notify "#incidents" "API rollback executed - investigating issue"
```

**Rollback Time:** < 2 minutes

## Post-Deployment Verification

### Smoke Tests
```bash
# Run automated test suite
./scripts/smoke-test.sh production

# Manual spot checks
curl https://api.xencolabs.com/api/health
curl https://api.xencolabs.com/api/status
```

### Performance Comparison
```bash
# Compare to baseline
./scripts/performance-compare.sh \
  --before baseline-metrics.json \
  --after current-metrics.json
```

**Success Criteria:**
- All smoke tests pass
- Performance within 5% of baseline
- No customer complaints

## Troubleshooting Common Issues

### Issue: Service Stuck in "Pending"
```bash
# Check node resources
docker node ls
docker stats --no-stream

# Check service constraints
docker service inspect opendeepsearch_api | grep -A 10 Placement

# Solution: Free up resources or relax constraints
```

### Issue: Health Checks Failing
```bash
# Check logs
docker service logs --tail 100 opendeepsearch_api

# Check dependencies (Redis, database)
docker service ls | grep -E 'redis|postgres'

# Solution: Fix upstream dependency first
```

### Issue: High Memory Usage
```bash
# Identify memory leak
docker stats --no-stream | sort -k 4 -h

# Restart affected service
docker service update --force opendeepsearch_api

# Solution: Investigate and fix memory leak
```
```

### Step 5: Quick Reference

```markdown
# Cluster Quick Reference

## Essential Commands

### Service Management
```bash
# List all services
docker service ls

# View service details
docker service inspect SERVICE_NAME

# Update service
docker service update --image IMAGE:TAG SERVICE_NAME

# Scale service
docker service scale SERVICE_NAME=5

# Rollback service
docker service rollback SERVICE_NAME

# Force restart
docker service update --force SERVICE_NAME
```

### Health Checks
```bash
# Check cluster health
docker node ls
docker service ls

# Check specific service
docker service ps SERVICE_NAME

# View logs
docker service logs --tail 100 -f SERVICE_NAME

# Resource usage
docker stats --no-stream
```

### Emergency Commands
```bash
# Rollback deployment
docker service rollback SERVICE_NAME

# Drain node for maintenance
docker node update --availability drain NODE_NAME

# Force remove failed tasks
docker service update --force SERVICE_NAME

# Emergency restart of cluster
sudo systemctl restart docker
```

## Service Map

| Service | Depends On | Health Check | Rollback Time |
|---------|-----------|--------------|---------------|
| Traefik | None | :80/ping | < 30s |
| Redis | None | :6379 | < 1m |
| API | Redis, Postgres | /api/health | < 2m |
| Verdaccio | Traefik | :4873/health | < 1m |

## Resource Limits

| Resource | Warning | Critical | Action |
|----------|---------|----------|--------|
| CPU | 70% | 90% | Scale or optimize |
| Memory | 80% | 95% | Increase limit or fix leak |
| Disk | 75% | 90% | Clean up or expand |
| Network | 500Mbps | 900Mbps | Investigate traffic spike |

## Incident Response

### Severity Levels
- **P0 (Critical)**: Production down, data loss risk
  - Response: Immediate, wake up on-call
  - Notify: All stakeholders + management

- **P1 (High)**: Degraded performance, no data loss
  - Response: Within 30 minutes
  - Notify: Engineering team

- **P2 (Medium)**: Minor issues, workaround available
  - Response: Within business hours
  - Notify: Relevant team only

### Escalation Path
1. On-Call Engineer → [Name/Phone]
2. Team Lead → [Name/Phone]
3. Infrastructure Manager → [Name/Phone]

### Communication Channels
- **Incidents**: #incidents (Slack)
- **Status Page**: status.xencolabs.com
- **PagerDuty**: [Link]

## Monitoring Dashboards
- **Cluster Overview**: https://grafana.xencolabs.com/d/cluster
- **Service Metrics**: https://grafana.xencolabs.com/d/services
- **Traefik**: https://traefik.xencolabs.com/dashboard/
- **Prometheus**: https://prometheus.xencolabs.com
```

### Step 6: Present All Formats

Deliver in priority order:
1. Executive Summary (cluster health + deployment readiness)
2. Critical Actions Checklist (blocking issues to fix)
3. TL;DR Operations Guide (deployment steps + rollback)
4. Quick Reference Card (commands, service map, incident response)
5. Full operations plan

## Example

```
User: /cluster-maestro-enhanced Deploy the new DevMaestro API v2.0 to production with zero downtime

[Runs cluster-maestro-orchestrator]
[Generates deployment plan + all summary formats]
[Presents multi-format output with health checks and rollback procedures]
```

## Notes

- Emphasizes zero-downtime deployments and automatic rollback
- All commands are tested in production environment
- Service map shows dependencies for troubleshooting
- Incident response procedures included
- Resource limits with warning/critical thresholds
- Quick escalation path for emergencies
