---
name: dotnet-best-practices
description: "Modern ASP.NET Core 10 / C# best practices and anti-pattern catalog. Use when writing, reviewing, or refactoring controllers, services, DTOs, EF Core, and async code. Covers layered architecture, async patterns, validation, error handling, and API design."
---

# ASP.NET Core 10 / C# Best Practices & Anti-Patterns

Modern .NET conventions (2025-26). For code examples, see [examples.md](examples.md).

## Severity Levels

- **CRITICAL** — Will cause bugs, deadlocks, or security issues
- **HIGH** — Will cause performance issues or architectural rot
- **MEDIUM** — Will hurt maintainability or developer experience

---

## Controller Design (CRITICAL)

- Controllers are routing + HTTP only — zero business logic
- NEVER put data access, validation logic, or calculations in a controller
- Controllers call services and return results — nothing more
- Keep controller methods under 10 lines

## DTOs — Never Expose Domain Models (CRITICAL)

- NEVER return EF Core entity classes directly from API endpoints
- Always map to DTOs in the service layer before returning
- Use `record` types for immutable DTOs
- Request DTOs: validate with FluentValidation
- Response DTOs: include only what the client needs

## Async / Await (CRITICAL)

- NEVER call `.Result` or `.Wait()` on a Task — causes deadlocks in ASP.NET
- NEVER use `async void` — use `async Task` always
- ALL I/O operations (DB, HTTP) must be `async`
- Pass `CancellationToken` through every public async method
- Prefer `await` over `Task.WhenAll` unless parallelism is intentional

## Service Layer (HIGH)

- One service class per domain entity: `ProductService`, `OrderService`
- Services return domain objects or DTOs — never `IActionResult`
- Services throw typed exceptions (`NotFoundException`, `ValidationException`) — controllers catch and map to HTTP
- Services are registered as `Scoped` (per request) unless stateless → `Transient`

## Validation (HIGH)

- Use FluentValidation for all request DTOs
- Register validators automatically with `AddValidatorsFromAssemblyContaining<T>()`
- Return 400 Bad Request with field-level errors on validation failure
- NEVER rely on frontend validation alone — always validate on the server

## Error Handling (HIGH)

- Use global exception middleware — NEVER try/catch in controllers
- Map exceptions to HTTP codes centrally:
  - `NotFoundException` → 404
  - `ValidationException` → 400
  - `UnauthorizedException` → 401
  - Unhandled → 500 (with logged details, safe message to client)
- NEVER return stack traces to the client in production

## EF Core (HIGH)

- Use `AsNoTracking()` for all read-only queries — significant performance gain
- NEVER load an entity to delete it — use `ExecuteDeleteAsync()`
- NEVER update entities in a loop — use `ExecuteUpdateAsync()` for bulk updates
- Always paginate — NEVER load a full table with `.ToListAsync()` without filters/limits
- Use `.Select()` to project to DTOs in the query — don't load full entities then map

## Dependency Injection (MEDIUM)

- Prefer constructor injection for required dependencies
- Use `IOptions<T>` for configuration binding — not `IConfiguration` directly
- Register services in extension methods, not directly in `Program.cs`
- Avoid service locator pattern (`IServiceProvider.GetService<T>()` in application code)

## API Design (HIGH)

- Use consistent response envelope: `{ success, data, error }`
- Use proper HTTP status codes — not always 200
- Use `[ProducesResponseType]` attributes for Swagger documentation
- Version your API from day one: `/api/v1/`
- Use `ProblemDetails` for error responses (RFC 7807)

## Records & Immutability (MEDIUM)

- Use `record` types for DTOs — they're immutable and have built-in equality
- Use `init` properties for request models that should not change after construction
- Use `required` keyword for mandatory DTO properties

## Logging (MEDIUM)

- Use structured logging: `_logger.LogInformation("Order {OrderId} created", order.Id)`
- NEVER log sensitive data (passwords, tokens, PII)
- Log at appropriate levels: Debug (dev only), Info (business events), Warning (recoverable), Error (needs attention)
- Use Serilog with enrichers for request context

## Configuration (MEDIUM)

- All secrets via environment variables or Secret Manager — NEVER hardcode
- Use `IOptions<T>` with strongly-typed config classes
- Validate options at startup with `ValidateDataAnnotations()` and `ValidateOnStart()`
