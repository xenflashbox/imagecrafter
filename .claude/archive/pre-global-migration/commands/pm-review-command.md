<!--
Version: 2.1.0
Updated: 2025-10-11
-->

# /pm-review - Review Quality Violations

Simple review of logged quality violations to identify patterns.

## Usage

```
/pm-review [period: week|month|all]
```

Default: Last week

## What It Does

Analyzes the `.pm-violations.jsonl` log file to show:
- Most common violation types
- Most problematic agents
- Trends over time
- Patterns to add to detection

## Instructions for Claude

When `/pm-review` is invoked:

### Step 1: Read Violations Log

```bash
# Check if log exists
if [ -f .pm-violations.jsonl ]; then
  # Count total violations
  wc -l .pm-violations.jsonl
  
  # Get violation types
  cat .pm-violations.jsonl | jq -r '.type' | sort | uniq -c | sort -rn
  
  # Get problematic agents
  cat .pm-violations.jsonl | jq -r '.agent' | sort | uniq -c | sort -rn
  
  # Recent violations (last 5)
  tail -5 .pm-violations.jsonl
else
  echo "No violations log found"
fi
```

### Step 2: Generate Report

```markdown
# PM Quality Review Report

**Period:** [Last week/month/all time]
**Total Violations:** [Number]

## Violation Breakdown

| Type | Count | Percentage |
|------|-------|------------|
| Mock Data | X | XX% |
| Silent Failures | Y | YY% |
| Workarounds | Z | ZZ% |
| Phantom Validations | W | WW% |

## Most Problematic Agents

1. **[Agent Name]** - X violations
   - Most common: [violation type]
   - Last violation: [date]

2. **[Agent Name]** - Y violations
   - Most common: [violation type]
   - Last violation: [date]

## Trends

[📈 Increasing / 📉 Decreasing / ➡️ Stable]

- Week 1: X violations
- Week 2: Y violations  
- Week 3: Z violations

## Recent Violations (Last 5)

1. [Timestamp] - [Type] - [Agent] - [Details]
2. [Timestamp] - [Type] - [Agent] - [Details]
3. [Timestamp] - [Type] - [Agent] - [Details]
4. [Timestamp] - [Type] - [Agent] - [Details]
5. [Timestamp] - [Type] - [Agent] - [Details]

## New Patterns to Consider

Based on violations, consider adding detection for:
- [Pattern 1 that appeared multiple times]
- [Pattern 2 that slipped through]

## Recommendations

1. **Immediate:** [Action for most common violation]
2. **This Week:** [Training or updates needed]
3. **Next Sprint:** [Systematic improvements]
```

### Step 3: Optional Actions

```markdown
## Actions Available

1. **Clear Log** (start fresh)
   ```bash
   mv .pm-violations.jsonl .pm-violations.jsonl.backup-[date]
   ```

2. **Export for Analysis**
   ```bash
   cat .pm-violations.jsonl | jq '.' > violations-report.json
   ```

3. **Update PM Detection Patterns**
   Based on this review, consider adding to PM manifest:
   - [New pattern 1]
   - [New pattern 2]
```

## Example Output

```
# PM Quality Review Report

**Period:** Last week
**Total Violations:** 23

## Violation Breakdown

| Type | Count | Percentage |
|------|-------|------------|
| Mock Data | 12 | 52% |
| Silent Failures | 6 | 26% |
| Workarounds | 4 | 17% |
| Phantom Validations | 1 | 4% |

## Most Problematic Agents

1. **api-builder** - 8 violations
   - Most common: Mock data
   - Last violation: 2 hours ago

2. **database-assistant** - 5 violations
   - Most common: Silent failures
   - Last violation: Yesterday

## Trends

📉 Decreasing (Good!)

- Week 1: 45 violations
- Week 2: 31 violations
- Week 3: 23 violations

## Recent Violations (Last 5)

1. 2025-01-10T14:32:00Z - mock_data - api-builder - Hardcoded test array
2. 2025-01-10T13:15:00Z - silent_failure - db-agent - Empty catch block
3. 2025-01-10T11:45:00Z - workaround - frontend - TODO: fix later
4. 2025-01-10T09:22:00Z - mock_data - api-builder - test@test.com
5. 2025-01-09T16:55:00Z - phantom_validation - validator - Non-existent field

## New Patterns to Consider

Based on violations, consider adding detection for:
- Lorem ipsum text (appeared 3 times)
- Sequential number arrays [0,1,2,3,4]

## Recommendations

1. **Immediate:** Retrain api-builder agent on real data patterns
2. **This Week:** Add lorem ipsum detection to PM
3. **Next Sprint:** Create shared validation library
```

## Notes

- Simple JSON Lines format for easy grep/analysis
- No database needed - just append to file
- Can be cleared anytime to reset
- Helps identify which agents need retraining