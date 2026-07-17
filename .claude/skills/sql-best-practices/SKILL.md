---
name: sql-best-practices
description: "PostgreSQL 16 + EF Core 10 best practices and anti-pattern catalog. Use when writing, reviewing, or optimizing database queries, migrations, indexes, and schema design. Covers N+1, pagination, indexing, transactions, and query performance."
---

# PostgreSQL + EF Core 10 Best Practices & Anti-Patterns

Modern database conventions (2025-26). For code examples, see [examples.md](examples.md).

## Severity Levels

- **CRITICAL** — Will cause correctness bugs or bring the DB to its knees under load
- **HIGH** — Will cause performance degradation as data grows
- **MEDIUM** — Will hurt maintainability or ops

---

## N+1 Queries (CRITICAL)

The #1 database anti-pattern. Look for it in every review.

- NEVER load a collection then access navigation properties in a loop
- ALWAYS use `.Include()` or explicit `.Select()` joins for related data
- Use EF Core logging (`EnableSensitiveDataLogging` in dev) to count queries per request
- One request should make at most 2-3 DB calls — investigate anything higher

## Pagination (CRITICAL)

- NEVER call `.ToListAsync()` on a table without `.Take()` limit
- ALL list endpoints must accept `page` and `pageSize` parameters
- Use keyset pagination (`WHERE id > lastId`) for large datasets — offset pagination degrades with deep pages
- Return total count only when needed — it requires a separate `COUNT(*)` query

## Select Projection (HIGH)

- NEVER `.Include()` full entities if you only need a few fields — use `.Select()` to project to DTOs in the query
- Loading unnecessary columns wastes memory and bandwidth
- `.Select()` in EF Core translates to `SELECT col1, col2` — use it always for read endpoints

## Indexing (CRITICAL)

Rules for every table:

- Index ALL foreign key columns (EF Core does NOT do this automatically for PostgreSQL)
- Index all columns used in `WHERE`, `ORDER BY`, or `JOIN` conditions in frequent queries
- Use partial indexes for filtered queries (e.g., `WHERE is_active = true`)
- Use composite indexes when queries filter on multiple columns together
- Document every index in `specs/db.md` with the query it supports

## Migrations (HIGH)

- NEVER modify existing migrations — always create a new one
- NEVER run `dotnet ef database update` automatically in production — use explicit migration scripts
- Test every migration against a copy of production data before applying
- Make migrations idempotent where possible
- Never include seed data in migrations — use a separate seeder

## Transactions (HIGH)

- Wrap multi-step writes in a transaction — EF Core's `SaveChangesAsync` is one transaction, but multiple `SaveChangesAsync` calls are not
- Use `IDbContextTransaction` for operations that span multiple `SaveChangesAsync`
- Keep transactions short — long transactions cause lock contention

## Read vs Write Queries (HIGH)

- Use `AsNoTracking()` for ALL read-only queries — EF Core skips change tracking overhead
- Use `AsNoTrackingWithIdentityResolution()` when you need related entities without duplicates
- Only tracked entities for write operations (create, update, delete)

## Avoid Lazy Loading (HIGH)

- NEVER enable EF Core lazy loading in production — it causes hidden N+1 queries
- Always load related data explicitly with `.Include()` or `.Select()`
- If you see `virtual` navigation properties + `UseLazyLoadingProxies()` — remove it

## Schema Design (MEDIUM)

- Use snake_case column names (configure via EF Core naming convention)
- Use `timestamptz` (timestamp with timezone) for all datetime columns
- Use `numeric(10,2)` for money — never `float` or `double` (rounding errors)
- Add `NOT NULL` constraints wherever nullable is not intentional
- Use database-level `DEFAULT` values for `created_at`, `updated_at`

## Soft Deletes (MEDIUM)

- For products and orders, prefer soft deletes (`is_deleted` flag) over hard deletes
- Add a global query filter in EF Core: `.HasQueryFilter(p => !p.IsDeleted)`
- Admin views can bypass the filter with `.IgnoreQueryFilters()`

## Connection & Performance (MEDIUM)

- Use Npgsql connection pooling — default pool size is fine for most apps
- Use `EXPLAIN ANALYZE` to investigate slow queries in PostgreSQL
- Avoid `LIKE '%term%'` for search — use PostgreSQL full-text search (`tsvector`) for large catalogs
- Add `pg_stat_statements` extension in production to track slow queries
