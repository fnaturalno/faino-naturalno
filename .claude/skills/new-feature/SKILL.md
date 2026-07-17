# Skill: new-feature

Scaffold a new feature for Файно натурально. Creates the spec template and directory structure.

## Usage

```
/new-feature <feature-name>
```

Example: `/new-feature catalog`

## What This Skill Does

1. Creates `specs/features/<feature-name>.md` with a spec template
2. Creates backend directory: `backend/FaynoShop.API/Controllers/`, `Services/`, `DTOs/` placeholders
3. Creates frontend directory: `frontend/src/app/pages/<feature-name>/`
4. Reminds you to run `requirements-planner` to fill in the spec

## Instructions

When invoked with a feature name:

1. Create `specs/features/<feature-name>.md` with this template:

```markdown
# Feature: <Feature Name>

**Status:** Draft
**Priority:** -
**Agent:** requirements-planner → backend + database + frontend → tester → /run-review

---

## Summary

[One sentence description]

## Scope

Full-stack: Backend API + Frontend UI + Database migration

## References

- Design: [Claude Design link or description]

---

## 1. Data & API

### Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/... | ... |

### Request / Response

[To be filled by requirements-planner]

---

## 2. UI

[To be filled by requirements-planner]

---

## 3. States

- Loading:
- Empty:
- Error:
- Success:

---

## Acceptance Criteria

- [ ] ...
```

2. Print a summary of what was created.
3. Tell the user: "Тепер запусти `requirements-planner` щоб заповнити spec через діалог, або заповни `specs/features/<feature-name>.md` вручну."
