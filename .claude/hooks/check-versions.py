#!/usr/bin/env python3
"""
Version Checker for DevMaestro Memory System
Validates that all components are at the correct version

VERSION: 2.1.0
CREATED: 2025-10-11
CHANGELOG:
  v2.0.0 (2025-10-11):
    - Initial creation of version checking system
    - Reads VERSION_MANIFEST.json for expected versions
    - Scans all hook scripts and command files for version headers
    - Validates version consistency across system
    - Reports missing or outdated components
    - Provides upgrade recommendations
"""
import sys
import json
import re
from pathlib import Path
from typing import Dict, List, Tuple

def load_manifest() -> Dict:
    """Load the version manifest file"""
    try:
        manifest_file = Path(".claude/VERSION_MANIFEST.json")
        if not manifest_file.exists():
            return None
        with manifest_file.open('r') as f:
            return json.load(f)
    except Exception as e:
        return None

def extract_version_from_file(file_path: Path) -> str:
    """Extract version string from file header"""
    try:
        content = file_path.read_text()
        
        # Look for VERSION: 2.1.0
        match = re.search(r'VERSION:\s*(\d+\.\d+\.\d+)', content)
        if match:
            return match.group(1)
        
        # Look for version: X.X.X in YAML frontmatter
        match = re.search(r'version:\s*(\d+\.\d+\.\d+)', content)
        if match:
            return match.group(1)
            
        return None
    except Exception as e:
        return None

def check_component_versions(manifest: Dict) -> Tuple[List[Dict], List[Dict], List[Dict]]:
    """
    Check all components against manifest
    Returns: (correct, outdated, missing)
    """
    correct = []
    outdated = []
    missing = []
    
    # Check hooks
    for filename, info in manifest['components']['hooks'].items():
        file_path = Path(f".claude/hooks/{filename}")
        expected_version = info['version']
        
        if not file_path.exists():
            missing.append({
                'type': 'hook',
                'file': filename,
                'expected': expected_version,
                'status': 'missing'
            })
        else:
            actual_version = extract_version_from_file(file_path)
            if actual_version == expected_version:
                correct.append({
                    'type': 'hook',
                    'file': filename,
                    'version': actual_version,
                    'status': 'correct'
                })
            else:
                outdated.append({
                    'type': 'hook',
                    'file': filename,
                    'expected': expected_version,
                    'actual': actual_version or 'unknown',
                    'status': 'outdated'
                })
    
    # Check commands
    for filename, info in manifest['components']['commands'].items():
        file_path = Path(f".claude/commands/{filename}")
        expected_version = info['version']
        
        if not file_path.exists():
            missing.append({
                'type': 'command',
                'file': filename,
                'expected': expected_version,
                'status': 'missing'
            })
        else:
            actual_version = extract_version_from_file(file_path)
            if actual_version == expected_version:
                correct.append({
                    'type': 'command',
                    'file': filename,
                    'version': actual_version,
                    'status': 'correct'
                })
            else:
                outdated.append({
                    'type': 'command',
                    'file': filename,
                    'expected': expected_version,
                    'actual': actual_version or 'unknown',
                    'status': 'outdated'
                })
    
    # Check config files exist (no version in these files)
    for filename, info in manifest['components']['config'].items():
        file_path = Path(f".claude/{filename}")
        if not file_path.exists():
            missing.append({
                'type': 'config',
                'file': filename,
                'expected': info['version'],
                'status': 'missing'
            })
        else:
            correct.append({
                'type': 'config',
                'file': filename,
                'version': info['version'],
                'status': 'present'
            })
    
    # Check secrets
    for filename, info in manifest['components']['secrets'].items():
        file_path = Path(f".claude/secrets/{filename}")
        if not file_path.exists():
            missing.append({
                'type': 'secret',
                'file': filename,
                'expected': info['version'],
                'status': 'missing'
            })
        else:
            correct.append({
                'type': 'secret',
                'file': filename,
                'version': info['version'],
                'status': 'present'
            })
    
    return correct, outdated, missing

def format_report(manifest: Dict, correct: List, outdated: List, missing: List) -> str:
    """Format a beautiful version check report"""
    
    system_version = manifest['system_version']
    release_name = manifest['release_name']
    
    report = f"""
╔════════════════════════════════════════════════════════════════╗
║         DevMaestro Memory System - Version Check              ║
╚════════════════════════════════════════════════════════════════╝

System Version: {system_version} - "{release_name}"
Release Date: {manifest['release_date']}

═══════════════════════════════════════════════════════════════

"""
    
    # Correct components
    if correct:
        report += "✅ CORRECT VERSIONS:\n\n"
        for item in correct:
            version_str = item.get('version', 'present')
            report += f"  ✓ {item['type']:8} {item['file']:40} v{version_str}\n"
        report += "\n"
    
    # Outdated components
    if outdated:
        report += "⚠️  OUTDATED COMPONENTS:\n\n"
        for item in outdated:
            report += f"  ! {item['type']:8} {item['file']:40}\n"
            report += f"    Expected: v{item['expected']}  |  Found: v{item['actual']}\n"
        report += "\n"
    
    # Missing components
    if missing:
        report += "❌ MISSING COMPONENTS:\n\n"
        for item in missing:
            report += f"  ✗ {item['type']:8} {item['file']:40} (v{item['expected']})\n"
        report += "\n"
    
    # Summary
    report += "═══════════════════════════════════════════════════════════════\n\n"
    
    total = len(correct) + len(outdated) + len(missing)
    report += f"Summary: {len(correct)}/{total} components at correct version\n\n"
    
    # Status
    if not outdated and not missing:
        report += "🎯 OVERALL STATUS: ✅ ALL COMPONENTS UP TO DATE\n\n"
        report += "Your DevMaestro memory system is fully updated!\n"
    elif outdated and not missing:
        report += "🎯 OVERALL STATUS: ⚠️  UPDATES NEEDED\n\n"
        report += "Some components are outdated. Recommended actions:\n"
        report += "  1. Run: /dm-init to update system\n"
        report += "  2. Check .claude/hooks/ for outdated scripts\n"
        report += "  3. Update commands in .claude/commands/\n"
    elif missing:
        report += "🎯 OVERALL STATUS: ❌ CRITICAL - MISSING COMPONENTS\n\n"
        report += "Required components are missing. Recommended actions:\n"
        report += "  1. Run: /dm-init to install missing components\n"
        report += "  2. Check installation documentation\n"
        report += "  3. Verify system was installed correctly\n"
    
    report += "\n"
    report += "═══════════════════════════════════════════════════════════════\n"
    
    return report

def main():
    """Main version check function"""
    
    # Load manifest
    manifest = load_manifest()
    
    if not manifest:
        output = {
            "continue": True,
            "systemMessage": """⚠️ Version Manifest Not Found

Could not load .claude/VERSION_MANIFEST.json

This file is required for version checking.
Your system may be from an older version that didn't include version control."""
        }
        print(json.dumps(output))
        return 1
    
    # Check all components
    correct, outdated, missing = check_component_versions(manifest)
    
    # Format report
    report = format_report(manifest, correct, outdated, missing)
    
    # Output as system message
    output = {
        "continue": True,
        "systemMessage": report
    }
    print(json.dumps(output))
    
    # Return exit code based on status
    if missing:
        return 2  # Critical - missing components
    elif outdated:
        return 1  # Warning - outdated components
    else:
        return 0  # Success - all good

if __name__ == "__main__":
    sys.exit(main())

