# /cluster-maestro - System-Wide Orchestration Command

This command activates the cluster-maestro-orchestrator agent for system-wide orchestration, infrastructure management, and cross-service coordination using DevMaestro MCP tools.

## Usage

```
/cluster-maestro [system-level task]
```

Or with detailed scope:

```
/cluster-maestro
Task: [description]
Scope: [services/infrastructure involved]
Impact: [expected system changes]
Standards: [Xenco Production Standards enforced]
```

## What It Does

1. **Activates Cluster Orchestrator**: Deploys cluster-maestro-orchestrator agent
2. **System Analysis**: Uses `mcp__dm-mini__architect_assist` for system-wide design
3. **Infrastructure Coordination**: Manages Docker Swarm, databases, services
4. **Cross-Service Orchestration**: Coordinates changes across multiple applications
5. **Uses MCP Tools**: Leverages AI-assisted decision making for complex systems
6. **Enforces Standards**: Validates against Xenco Production Standards across all services
7. **Maintains Uptime**: Zero-downtime deployment strategies

## When To Use

**Use /cluster-maestro when:**
- Task affects multiple services or infrastructure
- Docker Swarm configuration changes needed
- Cross-application coordination required
- Database migrations affect multiple services
- System-wide architectural changes
- Infrastructure scaling or optimization
- Network/routing configuration changes

**Don't use /cluster-maestro when:**
- Task is contained to single application (use /dev-maestro)
- Simple code changes not affecting infrastructure
- Only need planning (use /agent-os)

## The Activation Message

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏗️  CLUSTER MAESTRO ORCHESTRATOR - ACTIVATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Agent: cluster-maestro-orchestrator
Session: CLUSTER-MAESTRO-2025-001
Scope: System-Wide
Standards: Xenco Production Standards
MCP Tools: Available (dm-mini server)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Analyzing system-wide impact...
Using architect_assist to evaluate architecture changes...
```

## System Orchestration Workflow

### 1. System Analysis
```
Using mcp__dm-mini__architect_assist...

Task: Migrate all applications from Supabase to Neon
Scope: System-Wide Infrastructure Change
Affected Services: 8 (MCP Forge, DevMaestro, BlogCraft, etc.)
Impact: Database layer, authentication, API connections

System Analysis:
✅ Dependencies mapped across services
✅ Migration strategy evaluated
✅ Rollback plan prepared
✅ Downtime window: 0 minutes (rolling deployment)
```

### 2. Infrastructure Coordination
```
Coordinating infrastructure changes...

Docker Swarm Configuration:
├─ Update service definitions
├─ Add Neon connection secrets
├─ Configure health checks
└─ Set up rollback triggers

Using recall to check previous infrastructure patterns...
Using architect_assist for optimal configuration...
```

### 3. Service Orchestration
```
[MAESTRO-SESSION: CLUSTER-MAESTRO-2025-001]

Service Deployment Order:
1. mcp-forge (database migrations first)
2. devmaestro (depends on forge)
3. blogcraft (independent)
4. european-wholesale (independent)
... (5 more services)

Deployment Strategy: Rolling update
Health Checks: Enabled
Automatic Rollback: Configured

Using remember to store deployment state...
```

### 4. Cross-Service Validation
```
Using mcp__dm-mini__validateAgainst across services...

Service Health Checks:
├─ MCP Forge: ✅ Database connected, API responding
├─ DevMaestro: ✅ MCP server operational
├─ BlogCraft: ✅ Content accessible
├─ European Wholesale: ✅ Catalog searchable
└─ ... (4 more) ✅

All services validated post-migration.
```

### 5. Standards Enforcement
```
Enforcing Xenco Production Standards across infrastructure...

Checking Docker Swarm configurations:
✅ No mock environment variables
✅ Proper secret management
✅ Health checks configured
✅ Resource limits set
✅ Logging configured

Using validateAgainst for compliance verification...
```

## MCP Tool Integration

The cluster-maestro-orchestrator uses MCP tools for system-wide decisions:

### Architecture Analysis
**`mcp__dm-mini__architect_assist`**
```
# System-wide architectural decisions
# Infrastructure design patterns
# Service mesh configuration
# Scaling strategies

Usage: Primary tool for cluster-level decisions
Input: System requirements, constraints
Output: Architecture recommendations with infrastructure implications
```

### Database Coordination
**`mcp__dm-mini__database_assist`**
```
# Cross-service schema coordination
# Migration strategies for multiple DBs
# Connection pooling optimization
# Replication configuration

Usage: When database changes affect multiple services
```

### Planning & Execution
**`mcp__dm-mini__planning_assist`**
```
# Complex multi-service deployment plans
# Dependency ordering
# Rollback procedures
# Risk mitigation strategies

Usage: Breaking down system-wide changes into executable steps
```

### Validation & Monitoring
**`mcp__dm-mini__validateAgainst`**
```
# Cross-service validation
# System-wide regression checks
# Health check verification
# Performance benchmarking

Usage: Ensuring all services meet standards after changes
```

### Debugging
**`mcp__dm-mini__debug_assist`**
```
# System-wide error analysis
# Network/routing issues
# Service communication problems
# Performance bottlenecks

Usage: When issues span multiple services
Escalates to: debug-maestro for complex orchestration failures
```

### Memory Management
**`mcp__dm-mini__remember` / `recall`**
```
# Store infrastructure state
# Record deployment patterns
# Maintain system configuration history
# Track successful migration strategies

Usage: Maintaining institutional knowledge across deployments
```

## Infrastructure Management

### Docker Swarm Operations

**Service Updates:**
```
Rolling update across 8 services...

Stack: xenco-labs
├─ mcp-forge-api: Updating... ✅
├─ mcp-forge-web: Updating... ✅
├─ devmaestro-api: Updating... ✅
├─ devmaestro-web: Updating... ✅
├─ blogcraft: Updating... ✅
├─ ewp-web: Updating... ✅
├─ postgres-neon-proxy: Deploying... ✅
└─ traefik: Reloading config... ✅

Health checks passing for all services.
Zero downtime achieved.
```

**Network Configuration:**
```
Using architect_assist for network topology...

Network Updates:
├─ frontend-network: Add blogcraft service
├─ backend-network: Configure Neon connections
├─ traefik-public: Update routing rules
└─ monitoring-network: Add health check endpoints

Traefik routing automatically updated.
```

### Database Management

**Multi-Service Migrations:**
```
Using database_assist for migration strategy...

Migration Plan:
1. Create Neon databases (8 services)
2. Set up connection pooling per service
3. Run migrations in dependency order:
   ├─ mcp-forge (no dependencies)
   ├─ devmaestro (depends on forge)
   ├─ blogcraft (independent)
   └─ ... (5 more)
4. Update environment configs
5. Rolling service restarts
6. Validate all connections

Estimated total time: 45 minutes
Downtime: 0 minutes (rolling deployment)
```

## Cross-Service Coordination

### Dependency Management
```
Using planning_assist to map dependencies...

Service Dependency Graph:
mcp-forge-db
  ↓
mcp-forge-api
  ↓
devmaestro-api (calls forge API)
  ↓
devmaestro-web

blogcraft-db → blogcraft-api → blogcraft-web
  (independent)

ewp-db → ewp-api → ewp-web
  (independent)

Deployment order determined by dependency graph.
```

### Parallel Execution
```
Deploying independent services in parallel...

Group 1 (Parallel):
├─ mcp-forge (foundation) ⏳
└─ Waiting for completion...

Group 2 (Parallel):
├─ devmaestro (depends on forge) ⏳
├─ blogcraft (independent) ⏳
├─ ewp (independent) ⏳
└─ ... (2 more independent) ⏳

Group 3 (Parallel):
└─ Services depending on Group 2...

Parallel execution reduces total deployment time.
```

## Standards Enforcement

**System-Wide Validation:**
```
Using validateAgainst + Xenco Production Standards...

Infrastructure Checklist:
✅ No hardcoded secrets in docker-compose files
✅ All environment variables from Docker secrets
✅ Health checks configured for all services
✅ Resource limits set appropriately
✅ Logging configured to central system
✅ Backup procedures documented
✅ Rollback procedures tested

Application Checklist (per service):
✅ No mock data in production configs
✅ Services layer architecture (not direct DB)
✅ Error handling with proper logging
✅ Schema validation on all inputs
✅ API rate limiting configured

System-wide compliance: 100%
```

## Rollback Procedures

```
Automatic rollback configured...

Rollback Triggers:
├─ Health check failures (3 consecutive)
├─ Error rate >5% within 5 minutes
├─ Memory/CPU thresholds exceeded
└─ Manual trigger command

Rollback Plan:
1. Stop traffic to failing services
2. Revert to previous Docker image tags
3. Restore previous environment configs
4. Run health checks
5. Gradual traffic restoration

Using remember to store pre-deployment state for rollback.
```

## Progress Reporting

```
[MAESTRO-SESSION: CLUSTER-MAESTRO-2025-001]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 SYSTEM DEPLOYMENT PROGRESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Task: Supabase to Neon Migration
Scope: 8 Services + Infrastructure
Duration: 35 minutes elapsed
Progress: 72% complete

Services Migrated: 5/8
✅ mcp-forge (complete, validated)
✅ devmaestro (complete, validated)
✅ blogcraft (complete, validated)
✅ ewp (complete, validated)
✅ service-5 (complete, validated)
⏳ service-6 (in progress)
⏸️  service-7 (waiting for 6)
⏸️  service-8 (waiting for 6)

Infrastructure Status:
✅ Neon databases created
✅ Connection pooling configured
✅ Traefik routing updated
✅ Docker Swarm configs deployed
✅ Health checks passing (5/5)

MCP Tool Usage:
- architect_assist: 4 calls (system design)
- database_assist: 8 calls (per service)
- planning_assist: 2 calls (deployment strategy)
- validateAgainst: 15 calls (ongoing validation)
- remember: 6 calls (state tracking)

System Health: 100% (no downtime)
Standards Compliance: 100%

Next Checkpoint: Service 6 completion (10 min)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Completion Report

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ SYSTEM DEPLOYMENT COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Task: Supabase to Neon Migration
Session: CLUSTER-MAESTRO-2025-001
Duration: 52 minutes
Downtime: 0 minutes

Services Migrated: 8/8
Infrastructure Changes: 12 components
Health Status: All services operational

Service Summary:
✅ mcp-forge: Database migrated, API validated
✅ devmaestro: Database migrated, MCP server operational
✅ blogcraft: Database migrated, content accessible
✅ ewp: Database migrated, catalog functional
✅ ... (4 more services validated)

Infrastructure Summary:
✅ Neon databases: 8 created and configured
✅ Connection pooling: Optimized per service
✅ Docker Swarm: All services updated
✅ Traefik routing: Configurations updated
✅ Health checks: All passing
✅ Monitoring: Metrics collection active

MCP Tool Efficiency:
- architect_assist: 5 calls (system architecture)
- database_assist: 10 calls (per-service optimization)
- planning_assist: 3 calls (deployment coordination)
- debug_assist: 0 calls (no errors encountered)
- validateAgainst: 32 calls (comprehensive validation)
- remember/recall: 12 calls (state management)

Standards Compliance: ✅ 100%
- Infrastructure: No hardcoded secrets, proper configs
- Applications: Services layer, no mock data, error handling

Performance Impact: +15% (Neon faster than Supabase)
Cost Impact: -30% (Neon pricing more efficient)

Rollback Procedures: Tested and documented
Monitoring: Active across all services

System ready for production traffic.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Example Invocations

### Infrastructure Migration
```
/cluster-maestro
Migrate all 8 applications from Supabase to Neon.
Zero-downtime requirement.
Use architect_assist for migration strategy.
Use database_assist for per-service optimization.
```

### Docker Swarm Update
```
/cluster-maestro
Update Docker Swarm stack configuration:
- Add new monitoring service
- Update Traefik routing for all apps
- Configure health checks
- Set resource limits appropriately
```

### Cross-Service Feature
```
/cluster-maestro
Task: Implement unified authentication across all apps
Scope: mcp-forge, devmaestro, blogcraft
Requirements:
- Shared Clerk instance
- Single sign-on
- Role-based access control
Use architect_assist for auth architecture.
```

### System Optimization
```
/cluster-maestro
Optimize Docker Swarm for performance:
- Review resource allocation
- Configure connection pooling
- Set up caching layer
- Implement load balancing
Use architect_assist for optimization strategy.
```

## Success Metrics

- **Service Uptime**: 100% (zero-downtime deployments)
- **Standards Compliance**: 100% (infrastructure + applications)
- **Deployment Success**: 100% (all services migrated)
- **Rollback Ready**: 100% (tested procedures)
- **MCP Tool Usage**: Optimal (architect_assist for key decisions)
- **Cross-Service Coordination**: Efficient (dependency-aware)
- **System Health**: 100% (all services operational)

## Notes

- Cluster orchestrator manages system-wide complexity
- MCP tools used for architectural decisions
- Standards enforced across all services and infrastructure
- Zero-downtime deployments prioritized
- Dependency-aware orchestration
- Automatic rollback capabilities
- Suitable for infrastructure and cross-service changes
- For single-application tasks, use /dev-maestro
- For autonomous project execution, use /pm

## Related Commands

- `/dev-maestro` - For single-application development
- `/pm` - For autonomous multi-phase project execution
- `/agent-os` - For planning system-wide changes

---
version: 2.0.0
updated: 2025-11-03
devmaestro: true
changelog: |
  v2.0.0 - Corrected MCP tool references (architect_assist, database_assist, planning_assist, validateAgainst)
  v1.2.0 - Enhanced system-wide orchestration capabilities
  v1.1.0 - Added Docker Swarm management
  v1.0.0 - Initial cluster orchestrator

**Remember**: The cluster-maestro-orchestrator manages system-wide complexity with zero-downtime deployments and comprehensive standards enforcement. It uses MCP tools for architectural decisions and maintains full system health.
