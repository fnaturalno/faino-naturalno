# Skill: run-review

Runs the full review pipeline on the current feature: plan-verifier → code-reviewer → security-reviewer.

## Usage

```
/run-review <feature-name>
```

Example: `/run-review catalog`

## What This Skill Does

Runs three agents in sequence and produces a consolidated report.

## Instructions

When invoked with a feature name:

1. **Step 1 — Completeness (plan-verifier)**
   - Load `specs/features/<feature-name>.md` as the plan
   - Run plan-verifier logic: check every acceptance criterion against the codebase
   - If result is INCOMPLETE, STOP and report gaps. Do not proceed to step 2.

2. **Step 2 — Code Quality (code-reviewer)**
   - Review all files modified for this feature
   - Apply the code-reviewer checklist
   - Collect all issues with severity

3. **Step 3 — Security (security-reviewer)**
   - Review all files modified for this feature
   - Apply the security-reviewer checklist
   - Collect all vulnerabilities

4. **Consolidated Report**

```
# Review Report — <Feature Name>

## Completeness (plan-verifier)
[COMPLETE / INCOMPLETE]
- Gaps: ...

## Code Quality (code-reviewer)
[APPROVED / APPROVED WITH SUGGESTIONS / REQUIRES CHANGES]
- MUST FIX: ...
- SHOULD FIX: ...

## Security (security-reviewer)
[SECURE / MINOR ISSUES / VULNERABILITIES FOUND]
- CRITICAL: ...
- HIGH: ...

## Verdict
[READY TO MERGE / NEEDS WORK]
Blockers: ...
```

5. If verdict is NEEDS WORK — list exact items to fix before re-running `/run-review`.
