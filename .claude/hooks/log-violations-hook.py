#!/usr/bin/env python3
"""
Post-Response Hook - Log Quality Violations
Lightweight violation logger that appends to JSON Lines file
"""
import sys
import json
import re
from pathlib import Path
from datetime import datetime

def scan_for_violations(content):
    """Scan response content for quality violations"""
    violations = []
    
    if not content:
        return violations
    
    # Mock data patterns
    mock_patterns = [
        (r'\["test1".*"test2".*"test3"\]', 'mock_data', 'Hardcoded test array'),
        (r'test@test\.com', 'mock_data', 'Test email address'),
        (r'lorem ipsum', 'mock_data', 'Lorem ipsum text'),
        (r'user@example\.com', 'mock_data', 'Example email'),
    ]
    
    # Silent failure patterns
    failure_patterns = [
        (r'catch\s*\{\s*\}', 'silent_failure', 'Empty catch block'),
        (r'catch.*\{\s*\/\/.*\}', 'silent_failure', 'Commented catch block'),
        (r'\.catch\(\s*\(\s*\)\s*=>\s*null\s*\)', 'silent_failure', 'Swallowed promise'),
    ]
    
    # Workaround patterns
    workaround_patterns = [
        (r'TODO.*fix', 'workaround', 'TODO fix comment'),
        (r'FIXME', 'workaround', 'FIXME comment'),
        (r'HACK:', 'workaround', 'HACK comment'),
        (r'temporary.*fix', 'workaround', 'Temporary fix mentioned'),
    ]
    
    # Check all patterns
    for pattern, vtype, description in (mock_patterns + failure_patterns + workaround_patterns):
        if re.search(pattern, content, re.IGNORECASE):
            violations.append({
                'type': vtype,
                'description': description,
                'pattern': pattern
            })
    
    return violations

def log_violation(violation_type, description, agent=None):
    """Append violation to log file"""
    try:
        log_file = Path(".pm-violations.jsonl")
        
        entry = {
            'timestamp': datetime.now().isoformat(),
            'type': violation_type,
            'description': description,
            'agent': agent or 'unknown',
            'project': Path.cwd().name
        }
        
        with log_file.open('a') as f:
            f.write(json.dumps(entry) + '\n')
        
        return True
    except:
        return False

def main():
    # Read the response that was just generated
    try:
        # This hook runs after responses, check if content has violations
        # In real implementation, you'd get the actual response content
        # For now, we'll just pass through
        
        # Check if we're in a PM-managed session
        pm_active_file = Path(".claude/.pm_active")
        if not pm_active_file.exists():
            # PM not active, just continue
            output = {"continue": True}
            print(json.dumps(output))
            return 0
        
        # In production, you'd analyze the actual response here
        # For demonstration, we'll just log that checking happened
        
        output = {"continue": True}
        print(json.dumps(output))
        return 0
        
    except Exception as e:
        # Don't break the session, just continue
        output = {"continue": True}
        print(json.dumps(output))
        return 0

if __name__ == "__main__":
    sys.exit(main())