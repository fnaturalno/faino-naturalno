# Skill: db-migrate

Creates an EF Core migration for the current schema changes and updates specs/db.md.

## Usage

```
/db-migrate <MigrationName>
```

Example: `/db-migrate AddProductTable`

## What This Skill Does

1. Reads current models in `backend/FaynoShop.API/Models/`
2. Reads `specs/db.md` to understand existing schema
3. Creates the EF Core migration
4. Updates `specs/db.md` with new tables/columns/indexes

## Instructions

When invoked with a migration name:

1. Read all model files to understand what changed
2. Run the migration command:
   ```bash
   cd backend && dotnet ef migrations add <MigrationName> --project FaynoShop.API
   ```
3. Read the generated migration file and verify it looks correct
4. Update `specs/db.md`:
   - Add new tables with columns and types
   - Document new indexes with reason
   - Mark removed columns/tables
5. Print summary: tables created/modified, indexes added
