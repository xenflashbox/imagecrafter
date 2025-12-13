<!--
Version: 2.1.0
Updated: 2025-10-11
-->

# /pm-test - Test Project Manager Quality Enforcement

Tests that the Project Manager correctly catches and rejects quality violations.

## Usage

```
/pm-test
```

## What It Does

Runs a series of test cases with intentionally bad code to verify PM catches:
- Mock data patterns
- Silent failures  
- Workarounds and hacks
- Phantom validations

## Instructions for Claude

When `/pm-test` is invoked:

### Step 1: Run Test Suite

Test each violation type:

```javascript
// Test Case 1: Mock Data
const testMockData = {
  code: `
    const users = ["test1", "test2", "test3"];
    const emails = ["test@test.com", "user@example.com"];
    return users;
  `,
  expectedResult: "REJECT - Mock data detected"
};

// Test Case 2: Silent Failure  
const testSilentFailure = {
  code: `
    try {
      await dangerousOperation();
    } catch {
      // Silent fail
    }
  `,
  expectedResult: "REJECT - Silent failure detected"
};

// Test Case 3: Workaround
const testWorkaround = {
  code: `
    // TODO: Fix this hack later
    // HACK: Temporary workaround
    setTimeout(() => {
      retryOperation();  
    }, 5000); // Race condition fix
  `,
  expectedResult: "REJECT - Workaround detected"
};

// Test Case 4: Phantom Validation
const testPhantomValidation = {
  code: `
    if (!data.projectId) {
      throw new Error("Project ID required");
    }
    // Note: projectId was never in the spec
  `,
  expectedResult: "REJECT - Phantom validation"
};
```

### Step 2: Simulate PM Validation

For each test case, simulate what PM should do:

```markdown
## Test Results

### Test 1: Mock Data Detection
**Input:** [Show test code]
**Expected:** REJECT - Mock data
**Actual:** [Run validation]
**Result:** [✅ PASS if caught, ❌ FAIL if missed]

### Test 2: Silent Failure Detection  
**Input:** [Show test code]
**Expected:** REJECT - Silent failure
**Actual:** [Run validation]
**Result:** [✅ PASS if caught, ❌ FAIL if missed]

### Test 3: Workaround Detection
**Input:** [Show test code]
**Expected:** REJECT - Workaround
**Actual:** [Run validation]
**Result:** [✅ PASS if caught, ❌ FAIL if missed]

### Test 4: Phantom Validation Detection
**Input:** [Show test code]
**Expected:** REJECT - Phantom validation  
**Actual:** [Run validation]
**Result:** [✅ PASS if caught, ❌ FAIL if missed]

## Overall Score
[X]/4 tests passed

## PM Quality Enforcement Status
[✅ WORKING - All violations caught]
OR
[⚠️ NEEDS TUNING - Some violations missed]
```

### Step 3: Test Real PM (Optional)

If user wants to test the actual PM:

```
Would you like to run these through the actual PM?

/pm Test deployment with intentionally bad code:
[Insert one of the test cases]

Watch if PM correctly rejects it.
```

## Example Output

```
# PM Quality Test Results

## Test 1: Mock Data Detection
**Input:** `const users = ["test1", "test2", "test3"];`
**Expected:** REJECT - Mock data
**Actual:** REJECTED - Hardcoded test array detected
**Result:** ✅ PASS

## Test 2: Silent Failure Detection
**Input:** `try { risky(); } catch {}`
**Expected:** REJECT - Silent failure
**Actual:** REJECTED - Empty catch block
**Result:** ✅ PASS

## Test 3: Workaround Detection
**Input:** `// HACK: Temporary fix`
**Expected:** REJECT - Workaround
**Actual:** REJECTED - Hack detected
**Result:** ✅ PASS

## Test 4: Phantom Validation
**Input:** `if (!data.projectId) throw...`
**Expected:** REJECT - Phantom validation
**Actual:** REJECTED - projectId not in spec
**Result:** ✅ PASS

## Overall Score
4/4 tests passed

## PM Quality Enforcement Status
✅ WORKING - All violations caught

The Project Manager is correctly enforcing quality standards!
```

## Notes

- Quick way to verify PM enforcement is working
- Can be run periodically to ensure standards maintained
- Helps identify gaps in detection patterns