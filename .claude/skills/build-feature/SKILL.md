# Skill: build-feature

Orchestrates full-stack implementation of a feature in parallel, then runs review.

## Usage

```
/build-feature <feature-name>
```

Example: `/build-feature catalog`

## What This Skill Does

Reads `specs/features/<feature-name>.md` and executes the full pipeline:

1. **Phase 1 — Database** (sequential, must complete first):
   - Spawn `database` agent to create EF Core migration and seed data

2. **Phase 2 — Implementation** (parallel, both run simultaneously):
   - Spawn `backend` agent to implement API endpoints, services, DTOs
   - Spawn `frontend` agent to implement Angular pages, components, services

3. **Phase 3 — Review** (sequential, after implementation):
   - Spawn `plan-verifier` agent to check implementation matches spec
   - Spawn `code-reviewer` agent to check code quality
   - Spawn `security-reviewer` agent to check security

## Instructions

When invoked with a feature name:

1. Confirm `specs/features/<feature-name>.md` exists. If not, stop and tell the user to run `/new-feature <name>` first.

2. Read `specs/features/<feature-name>.md` to understand scope.

3. **Phase 1 — Database:**
   Use the Task tool to spawn the `database` agent:
   > "Read specs/features/<feature-name>.md and specs/db.md. Create EF Core migration for all models required by this feature. If SeedDemoData is referenced, implement SeedData.cs per specs/db.md. Run: cd backend && dotnet ef migrations add <FeatureName>Schema"

   Wait for Phase 1 to complete before proceeding.

4. **Phase 2 — Parallel implementation:**
   Use the Task tool to spawn BOTH agents simultaneously (do not wait for one before starting the other):

   Backend agent prompt:
   > "Read specs/features/<feature-name>.md. Implement all API endpoints, services, and DTOs listed in the spec. Follow specs/api.md conventions and dotnet-best-practices skill."

   Frontend agent prompt:
   > "Read specs/features/<feature-name>.md. Implement the Angular UI: pages, components, and services. Follow specs/frontend.md conventions and angular-best-practices skill. API base URL: http://localhost:5000."

   Wait for both to complete.

5. **Phase 3 — Review:**
   Spawn the following agents sequentially:
   - `plan-verifier`: check implementation completeness vs spec
   - `code-reviewer`: check code quality
   - `security-reviewer`: check security

6. Print a final summary:
   - ✅ Migration created
   - ✅ Backend implemented
   - ✅ Frontend implemented
   - Review findings (critical issues only)
   - Next step: `docker compose up -d && dotnet run` + `ng serve`
