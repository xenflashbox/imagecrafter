# DevMaestro Agent Directory

<!-- VERSION: 2.1.0 -->
<!-- LAST MODIFIED: 2025-10-11 -->

## Overview

DevMaestro includes 85+ specialized agents organized into categories. Agents are automatically available when installed in the `.claude/agents/` directory (local) or `~/.claude/agents/` directory (global).

---

## Master Orchestrators (6 agents)

These are the primary coordinators that route tasks to specialist agents.

### AgentOS Planner
**File:** `agentos-planner.md`  
**Purpose:** High-level task planning and decomposition  
**When to use:** Complex multi-step tasks requiring strategic planning

### AgentOS Validation Orchestrator ⭐ NEW
**File:** `agentos-validation-orchestrator.md`  
**Purpose:** Create task-specific validation gates  
**When to use:** Database operations, API changes, security audits, performance optimization

**Example:**
```
PM: "Add email column to users table"
  ↓
Validation Orchestrator creates schema validation gate:
  - Verify table exists
  - Check column doesn't exist
  - Validate data type
  - Recommend indexes
  - Ensure reversible migration
```

### Project Manager ⭐ UPDATED
**File:** `project-manager.md`  
**Purpose:** Overall project coordination and task orchestration  
**When to use:** Multi-task projects, progress tracking, validation enforcement

**New Features (v2.1.0):**
- Automatic validation routing
- Task-specific validation gates
- Integration with Validation Orchestrator
- Enhanced progress tracking

### Dev Maestro
**File:** `dev-maestro-enhanced.md`  
**Purpose:** Development implementation and coding tasks  
**When to use:** Writing code, implementing features, bug fixes

### Cluster Maestro
**File:** `cluster-maestro-enhanced.md`  
**Purpose:** Infrastructure setup and system architecture  
**When to use:** Docker, deployment, infrastructure configuration

### Debug Maestro
**File:** `debug-maestro-enhanced.md`  
**Purpose:** Troubleshooting and error diagnosis  
**When to use:** Debugging, error analysis, system triage

---

## Content Specialists (10 agents)

### Content Strategy Agent
**File:** `content-strategy-agent.md`  
**Purpose:** Content planning and strategy development

### Niche Research Agent
**File:** `niche-research-agent.md`  
**Purpose:** Market and niche analysis

### Content Cluster Agent
**File:** `content-cluster-agent.md`  
**Purpose:** Content organization and clustering

### SEO Optimization Agent
**File:** `seo-optimization-agent.md`  
**Purpose:** SEO analysis and optimization

### Content Writer Agent
**File:** `content-writer-agent.md`  
**Purpose:** Article writing and content creation

### Content Editor Agent
**File:** `content-editor-agent.md`  
**Purpose:** Content review and editing

### Taxonomy Optimization Agent
**File:** `taxonomy-optimization-agent.md`  
**Purpose:** Category and tag optimization

### Keyword Research Agent
**File:** `keyword-research-agent.md`  
**Purpose:** Keyword analysis and research

### Content Quality Agent
**File:** `content-quality-agent.md`  
**Purpose:** Content quality assurance

### Content Maestro
**File:** `content-maestro-enhanced.md`  
**Purpose:** Overall content system coordination

---

## Database Specialists (8 agents)

### Database Schema Validator ⭐ CRITICAL
**File:** `database-schema-validator.md`  
**Purpose:** Validate database schemas before operations  
**When to use:** ALWAYS before any database operation

**Validation Checks:**
- Table existence
- Column names and types
- Constraints and relationships
- Index recommendations
- Migration reversibility

### Schema Design Agent
**File:** `schema-design-agent.md`  
**Purpose:** Database schema design

### Migration Agent
**File:** `migration-agent.md`  
**Purpose:** Database migration planning and execution

### Query Optimization Agent
**File:** `query-optimization-agent.md`  
**Purpose:** SQL query optimization

### Data Integrity Agent
**File:** `data-integrity-agent.md`  
**Purpose:** Data validation and integrity checks

### Database Performance Agent
**File:** `database-performance-agent.md`  
**Purpose:** Database performance tuning

### Database Security Agent
**File:** `database-security-agent.md`  
**Purpose:** Database security audits

### Database Backup Agent
**File:** `database-backup-agent.md`  
**Purpose:** Backup strategy and execution

---

## API Specialists (7 agents)

### API Design Agent
**File:** `api-design-agent.md`  
**Purpose:** REST/GraphQL API design

### API Validator
**File:** `api-validator.md`  
**Purpose:** API contract validation

### API Security Agent
**File:** `api-security-agent.md`  
**Purpose:** API security audits

### API Documentation Agent
**File:** `api-documentation-agent.md`  
**Purpose:** OpenAPI/Swagger documentation

### API Testing Agent
**File:** `api-testing-agent.md`  
**Purpose:** API endpoint testing

### API Performance Agent
**File:** `api-performance-agent.md`  
**Purpose:** API performance optimization

### API Integration Agent
**File:** `api-integration-agent.md`  
**Purpose:** Third-party API integration

---

## Frontend Specialists (9 agents)

### React Component Agent
**File:** `react-component-agent.md`  
**Purpose:** React component development

### UI/UX Design Agent
**File:** `ui-ux-design-agent.md`  
**Purpose:** User interface design

### Styling Agent
**File:** `styling-agent.md`  
**Purpose:** CSS/Tailwind styling

### State Management Agent
**File:** `state-management-agent.md`  
**Purpose:** React state and hooks

### Form Validation Agent
**File:** `form-validation-agent.md`  
**Purpose:** Form logic and validation

### Accessibility Agent
**File:** `accessibility-agent.md`  
**Purpose:** WCAG compliance and a11y

### Performance Agent
**File:** `performance-agent.md`  
**Purpose:** Frontend performance optimization

### Animation Agent
**File:** `animation-agent.md`  
**Purpose:** CSS/JS animations

### Responsive Design Agent
**File:** `responsive-design-agent.md`  
**Purpose:** Mobile responsiveness

---

## Backend Specialists (8 agents)

### Authentication Agent
**File:** `authentication-agent.md`  
**Purpose:** Auth systems (JWT, sessions, OAuth)

### Authorization Agent
**File:** `authorization-agent.md`  
**Purpose:** Permissions and RBAC

### Caching Agent
**File:** `caching-agent.md`  
**Purpose:** Redis, in-memory caching

### Queue Agent
**File:** `queue-agent.md`  
**Purpose:** Job queues and background tasks

### Email Agent
**File:** `email-agent.md`  
**Purpose:** Email templates and sending

### File Upload Agent
**File:** `file-upload-agent.md`  
**Purpose:** File handling and storage

### Webhook Agent
**File:** `webhook-agent.md`  
**Purpose:** Webhook integration

### Logging Agent
**File:** `logging-agent.md`  
**Purpose:** Application logging

---

## Infrastructure Specialists (7 agents)

### Docker Agent
**File:** `docker-agent.md`  
**Purpose:** Docker containerization

### Deployment Agent
**File:** `deployment-agent.md`  
**Purpose:** CI/CD and deployment

### Monitoring Agent
**File:** `monitoring-agent.md`  
**Purpose:** Application monitoring

### Security Agent
**File:** `security-agent.md`  
**Purpose:** Security audits and hardening

### Environment Agent
**File:** `environment-agent.md`  
**Purpose:** Environment configuration

### Network Agent
**File:** `network-agent.md`  
**Purpose:** Networking and DNS

### Backup Agent
**File:** `backup-agent.md`  
**Purpose:** System backup strategy

---

## Testing Specialists (6 agents)

### Unit Test Agent
**File:** `unit-test-agent.md`  
**Purpose:** Unit test creation

### Integration Test Agent
**File:** `integration-test-agent.md`  
**Purpose:** Integration test suites

### E2E Test Agent
**File:** `e2e-test-agent.md`  
**Purpose:** End-to-end testing

### Test Coverage Agent
**File:** `test-coverage-agent.md`  
**Purpose:** Coverage analysis

### Mock Data Agent
**File:** `mock-data-agent.md`  
**Purpose:** Test data generation

### Test Automation Agent
**File:** `test-automation-agent.md`  
**Purpose:** CI/CD test automation

---

## Documentation Specialists (5 agents)

### Technical Writer Agent
**File:** `technical-writer-agent.md`  
**Purpose:** Technical documentation

### Code Documentation Agent
**File:** `code-documentation-agent.md`  
**Purpose:** Inline code comments

### API Documentation Agent
**File:** `api-documentation-agent.md`  
**Purpose:** API docs (OpenAPI)

### User Guide Agent
**File:** `user-guide-agent.md`  
**Purpose:** End-user documentation

### Architecture Documentation Agent
**File:** `architecture-documentation-agent.md`  
**Purpose:** System architecture docs

---

## Quality Assurance Specialists (6 agents)

### Code Review Agent
**File:** `code-review-agent.md`  
**Purpose:** Code quality review

### Linting Agent
**File:** `linting-agent.md`  
**Purpose:** Code style enforcement

### Type Safety Agent
**File:** `type-safety-agent.md`  
**Purpose:** TypeScript type checking

### Performance Audit Agent
**File:** `performance-audit-agent.md`  
**Purpose:** Performance audits

### Security Audit Agent
**File:** `security-audit-agent.md`  
**Purpose:** Security vulnerability scanning

### Dependency Audit Agent
**File:** `dependency-audit-agent.md`  
**Purpose:** Dependency security checks

---

## Utility Specialists (8 agents)

### Data Migration Agent
**File:** `data-migration-agent.md`  
**Purpose:** Data migration tasks

### Refactoring Agent
**File:** `refactoring-agent.md`  
**Purpose:** Code refactoring

### Error Handling Agent
**File:** `error-handling-agent.md`  
**Purpose:** Error handling strategy

### Validation Agent
**File:** `validation-agent.md`  
**Purpose:** Input validation

### Internationalization Agent
**File:** `internationalization-agent.md`  
**Purpose:** i18n implementation

### Analytics Agent
**File:** `analytics-agent.md`  
**Purpose:** Analytics integration

### SEO Agent
**File:** `seo-agent.md`  
**Purpose:** SEO implementation

### Configuration Agent
**File:** `configuration-agent.md`  
**Purpose:** App configuration management

---

## WordPress Specialists (5 agents)

### WordPress Development Agent
**File:** `wordpress-development-agent.md`  
**Purpose:** WordPress theme/plugin development

### WordPress Security Agent
**File:** `wordpress-security-agent.md`  
**Purpose:** WordPress security hardening

### WordPress Performance Agent
**File:** `wordpress-performance-agent.md`  
**Purpose:** WordPress optimization

### WordPress Migration Agent
**File:** `wordpress-migration-agent.md`  
**Purpose:** WordPress migrations

### WordPress API Agent
**File:** `wordpress-api-agent.md`  
**Purpose:** WordPress REST API

---

## Agent Usage Examples

### Schema Validation Flow
```
Task: "Add email column to users table"
  ↓
1. Project Manager receives task
2. PM routes to AgentOS Validation Orchestrator
3. Orchestrator invokes Database Schema Validator
4. Validator checks:
   ✓ users table exists
   ✓ email column doesn't exist
   ✓ VARCHAR(255) appropriate
   ✓ Unique index recommended
   ✓ Migration is reversible
5. Results returned to PM
6. PM proceeds with Dev Maestro for implementation
```

### API Validation Flow
```
Task: "Add POST /api/users endpoint"
  ↓
1. Project Manager receives task
2. PM routes to AgentOS Validation Orchestrator
3. Orchestrator invokes API Validator
4. Validator checks:
   ✓ Endpoint doesn't exist
   ✓ Request schema defined
   ✓ Response schema defined
   ✓ Authentication required
   ✓ Rate limiting needed
5. Results returned to PM
6. PM proceeds with Dev Maestro for implementation
```

### Content Creation Flow
```
Task: "Create content cluster for 'home workouts'"
  ↓
1. Project Manager receives task
2. PM routes to Content Maestro
3. Content Maestro orchestrates:
   a. Niche Research Agent (market analysis)
   b. Keyword Research Agent (keywords)
   c. Content Cluster Agent (structure)
   d. Content Writer Agent (articles)
   e. SEO Optimization Agent (optimization)
   f. Content Quality Agent (review)
4. Results compiled and delivered
```

---

## Agent Routing Logic

### Automatic Routing (PM Handles)

**Database Operations:**
- Keywords: `table`, `column`, `schema`, `migration`, `database`
- Routes to: Validation Orchestrator → Database Schema Validator

**API Operations:**
- Keywords: `endpoint`, `api`, `route`, `REST`, `GraphQL`
- Routes to: Validation Orchestrator → API Validator

**Frontend Tasks:**
- Keywords: `component`, `page`, `UI`, `form`, `styling`
- Routes to: Dev Maestro → Frontend Specialists

**Security Tasks:**
- Keywords: `auth`, `security`, `permission`, `encryption`
- Routes to: Security Specialists

**Performance Tasks:**
- Keywords: `optimize`, `performance`, `slow`, `cache`
- Routes to: Performance Specialists

### Manual Routing (Direct Invocation)

You can invoke agents directly:
```
@agent database-schema-validator
"Validate the users table structure"

@agent api-validator
"Check the POST /api/auth/login endpoint"

@agent content-writer-agent
"Write article about React hooks"
```

---

## Agent Discovery

**List all agents:**
```bash
ls ~/.claude/agents/  # Global agents
ls .claude/agents/    # Local agents
```

**Count agents:**
```bash
ls -1 ~/.claude/agents/*.md | wc -l
```

**Search for specific agent:**
```bash
grep -r "schema validation" ~/.claude/agents/
```

---

## Agent Development

### Creating Custom Agents

Custom agents should follow this structure:

```markdown
---
name: my-custom-agent
description: Brief description
version: 1.0.0
category: specialist
---

You are the [Agent Name]. Your role is to [purpose].

**Your expertise:**
- [Skill 1]
- [Skill 2]
- [Skill 3]

**When invoked, you should:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Output format:**
[Expected output format]

**Examples:**
[Usage examples]
```

**Installation:**
1. Create agent file in `.claude/agents/`
2. Add version header
3. Test with direct invocation
4. Add to VERSION_MANIFEST.json

---

## Version Information

**Agent Library Version:** 2.1.0  
**Total Agents:** 85+  
**Last Updated:** 2025-10-11

**New in v2.1.0:**
- AgentOS Validation Orchestrator
- Enhanced Project Manager with validation routing
- Database Schema Validator (critical)
- API Validator
- Task-specific validation gates
- Intelligent agent routing

---

## Support

**View agent documentation:**
```bash
cat ~/.claude/agents/[agent-name].md
```

**Check agent versions:**
```bash
python3 .claude/hooks/check-versions.py
```

**Diagnose agent issues:**
```bash
/dm-doctor
```

DevMaestro v2.1.0 - Complete Agent Library
