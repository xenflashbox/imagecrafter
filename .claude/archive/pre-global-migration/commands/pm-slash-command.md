# /pm - Strict Project Manager Command

This command activates the Strict Project Manager agent to autonomously execute implementation plans using DevMaestro orchestration with parallel deployment and mandatory validation.

## Usage

```
/pm [plan document or implementation request]
```

Or with explicit plan:

```
/pm
Plan: [paste plan here]
Execute with parallel deployment and strict validation.
```

## What It Does

1. **Activates Project Manager Mode**: Claude Code agent becomes the strict enforcement agent
2. **Analyzes Plan**: Ensures sub-agent assignments and validation tests are defined
3. **Executes Autonomously**: Runs in autopilot mode until complete
4. **Deploys in Parallel**: Up to 3 concurrent sub-agents for efficiency
5. **Enforces Validation**: No task proceeds without passing tests
6. **Resolves Blockers**: Automatically handles issues or escalates

## Process Flow

### Step 1: Plan Analysis
- Reviews provided plan/request
- If incomplete, routes to Agent OS Maestro for enhancement
- Ensures all tasks have:
  - Sub-agent assignments
  - Validation criteria
  - Dependency mapping

### Step 2: Parallel Execution
- Identifies independent tasks
- Deploys up to 3 sub-agents concurrently
- Monitors progress
- Queues dependent tasks

### Step 3: Validation & Enforcement
- Validates each completed task
- Reprompts agents that stop early
- Resolves blockers via Debug Tool or DevMaestro
- Re-executes failed tasks until validated

### Step 4: Completion
- Verifies all phases complete
- Confirms 100% validation rate
- Reports implementation success

## Instructions for Claude Code Agent

When `/pm` is invoked:

### Activation Response
```
🚨 STRICT PROJECT MANAGER ACTIVATED
────────────────────────────────
Mode: Autopilot Enforcement
Authority: Full Implementation Control
Deployment: Parallel Execution Enabled
Validation: Mandatory on All Tasks

Analyzing plan for completeness...
```

### Primary Execution Loop

1. **Use Task tool** with `subagent_type: "project-manager"` if plan needs sub-agent assignment:
```javascript
task({
  subagent_type: "agent-os-maestro",
  prompt: "Enhance this plan with specific sub-agent assignments, validation tests, and dependency mapping: [plan]"
})
```

2. **Deploy DevMaestro Orchestrator** for implementation:
```javascript
task({
  subagent_type: "dev-maestro-orchestrator",
  prompt: "Execute this implementation plan with the assigned sub-agents: [enhanced plan]"
})
```

3. **Monitor & Enforce**:
- Track task completion
- Validate results
- Reprompt incomplete agents
- Resolve blockers
- Continue until 100% complete

### Parallel Deployment Logic
```
IF tasks A, B, C are independent:
  Deploy all three simultaneously
  
WHILE tasks running:
  Monitor progress
  As each completes:
    - Run validation
    - If passed: Mark complete, deploy next
    - If failed: Debug and retry
    
Continue until all phases complete
```

### Enforcement Protocols

**Sub-Agent Stops Early:**
```javascript
if (task.status === "incomplete") {
  reprompt = "Continue from: " + task.last_output;
  task.continue(reprompt);
}
```

**Validation Failure:**
```javascript
if (!validation.passed) {
  debug_result = debug_tool.analyze(validation.error);
  if (debug_result.fixable) {
    apply_fix(debug_result.solution);
  } else {
    escalate_to_devmaestro();
  }
  retry_task();
}
```

**Blocker Detection:**
```javascript
if (task.blocked) {
  blocker = identify_blocker(task);
  if (blocker.type === "dependency") {
    prioritize(blocker.required_task);
  } else {
    resolve_via_devmaestro(blocker);
  }
}
```

## Example Invocations

### Simple Plan Execution
```
/pm Execute the 8-phase Dev Maestro enhancement plan with parallel deployment where possible.
```

### With Specific Plan Document
```
/pm 
Plan: DEVMAESTRO_ENHANCEMENT_PLAN.md
Deploy with maximum parallelization and strict validation.
```

### Feature Implementation
```
/pm Implement the user authentication feature from the specs folder. Ensure all tests pass before proceeding to the next component.
```

## Key Features

### Autopilot Mode
- No stopping for confirmations
- Continuous execution through all phases
- Automatic decision-making based on validation

### Parallel Efficiency
- Up to 3x faster execution
- Intelligent dependency management
- Resource-aware deployment

### Quality Enforcement
- 100% validation requirement
- No workarounds allowed
- Complete audit trail
- **Zero mock data tolerance** - Rejects any mock patterns
- **Root cause enforcement** - No temporary fixes
- **Fail loud protocol** - No silent failures
- **Phantom validation prevention** - Only real requirements

### Blocker Resolution
- Automatic debugging attempts
- Smart escalation to DevMaestro
- Persistent retry until success
- Honest blocking - Stops and asks for help rather than fake progress

## Progress Reporting

The Project Manager provides automatic status updates:

```
PROJECT STATUS: Phase 3 of 8
─────────────────────────
Active Tasks: [auth-api, database-schema, ui-components]
Completed: 12/28 tasks
Validated: 12/12 tasks
Blocked: None
ETA: 45 minutes
```

## Success Metrics

- **Completion Rate**: 100% (no partial implementations)
- **Validation Rate**: 100% (all tasks tested)
- **Parallel Utilization**: 60-80% of tasks run concurrently
- **Blocker Resolution**: 95% resolved automatically

## Notes

- Project Manager operates with full autonomy
- Does not require user intervention during execution
- Suitable for complex multi-phase implementations
- Maintains detailed logs for audit purposes
- Can handle plans of any size or complexity

## Related Commands

- `/agent-os` - For planning and specification
- `/dev-maestro` - For standard orchestration
- `/debug` - For manual debugging
- `/validate` - For manual validation

---
version: 2.1.0
updated: 2025-10-11

**Remember**: Once activated, the Project Manager will not stop until the implementation is complete and validated. Ensure your plan is ready before invocation.