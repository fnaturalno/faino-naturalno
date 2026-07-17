---
name: angular-best-practices
description: "Modern Angular 22 best practices and anti-pattern catalog. Use when writing, reviewing, or refactoring Angular components, services, signals, and routing. Covers component design, signals state, change detection, HTTP, lazy loading, and accessibility."
---

# Angular 22 Best Practices & Anti-Patterns

Modern Angular conventions (2025-26). Covers what to do and what to avoid. For code examples, see [examples.md](examples.md).

## Severity Levels

- **CRITICAL** — Will cause bugs, memory leaks, or broken reactivity
- **HIGH** — Will cause performance issues or scaling problems
- **MEDIUM** — Will hurt maintainability or developer experience

---

## Standalone Components (CRITICAL)

- ALWAYS use standalone components — no NgModules
- NEVER create a new NgModule — use `imports` array in component decorator instead
- Import only what the component directly uses — no shared "mega-modules"
- Lazy-load all page-level routes via `loadComponent`

## Signals & State (CRITICAL)

Angular 22 is signal-first. Treat RxJS as an I/O layer only.

- Use `signal()` for local mutable state
- Use `computed()` for derived state — NEVER store derived values in a separate signal
- Use `effect()` only for side effects that synchronize with external systems (DOM, localStorage)
- NEVER use `BehaviorSubject` for local component state — use `signal()` instead
- NEVER chain signals through multiple `effect()` calls — that's a derived state anti-pattern
- Use `toSignal()` to convert Observables to signals at the boundary

## Memory Leaks (CRITICAL)

- ALWAYS use `takeUntilDestroyed()` (or `takeUntilDestroyed(this.destroyRef)`) on all subscriptions
- NEVER manually call `.unsubscribe()` without a destroy hook — it will leak
- NEVER subscribe in `ngOnInit` without cleanup
- Use `async` pipe in templates when the Observable lifecycle matches the component lifecycle

## Dependency Injection (HIGH)

- Use `inject()` function over constructor injection — cleaner and works in standalone functions
- NEVER inject services in templates via `public` properties — use signals or computed values
- Use `providedIn: 'root'` for singletons, provide locally for scoped services

## Smart / Dumb Components (HIGH)

- Smart (container) components: inject services, hold state, handle events
- Dumb (presentational) components: accept inputs, emit outputs, no service injection
- Max 200 lines per component — split if larger
- Max 5 `@Input()` properties — more suggests the component does too much

## Derive, Don't Store (CRITICAL)

The #1 Angular signal anti-pattern.

- NEVER store derived values in a `signal()` — use `computed()` instead
- NEVER update a signal inside `effect()` to sync derived state — use `computed()`
- `computed()` is lazy and memoized — prefer it over manual tracking

## Change Detection (HIGH)

- Use `OnPush` change detection on all presentational components
- With signals, change detection is automatic — trust it, don't call `markForCheck()` manually
- NEVER use `detectChanges()` except in very specific cases (e.g., after third-party DOM updates)
- Avoid reading signals in `ngDoCheck` — it runs on every check cycle

## HTTP & Data Fetching (HIGH)

- ALL HTTP calls in services, never in component bodies
- Use typed `HttpClient`: `http.get<ProductDto[]>('/api/products')`
- Handle errors in services via `catchError` — don't let raw errors surface to templates
- Use `toSignal(this.productService.getProducts(), { initialValue: [] })` for signal integration
- Cancel in-flight requests with `takeUntilDestroyed()` or `httpResource` (Angular 22+)

## Routing (HIGH)

- Lazy-load ALL page routes with `loadComponent`
- Use `resolve` guards for data that the page requires on load
- Use `canActivate` signals-based guards for auth protection
- NEVER load admin routes eagerly — always lazy

## Template Control Flow (MEDIUM)

- Use new built-in control flow: `@if`, `@for`, `@switch` — NOT `*ngIf`, `*ngFor`, `*ngSwitch`
- Always provide `track` expression in `@for` — use stable unique ID, never index for mutable lists
- Replace nested ternaries in templates with `@if / @else`

## Forms (HIGH)

- Use Reactive Forms — NOT Template-Driven for anything non-trivial
- Use `FormBuilder.nonNullable` to avoid null types
- Validate on both frontend (Validators) and backend (always)
- NEVER disable the submit button to prevent invalid submission — show inline errors instead

## Performance (MEDIUM)

- Use `@defer` blocks for below-the-fold content (Angular 17+)
- Use `@placeholder` and `@loading` inside `@defer` for good UX
- Prefer `image` NgOptimizedImage directive for all `<img>` tags
- Avoid large bundles — check with `ng build --stats-json`

## Accessibility (HIGH)

- Add `aria-label` to icon-only buttons
- Use `aria-live="polite"` for dynamic content (search results, cart updates)
- Trap focus inside modals with CDK `FocusTrap`
- All form fields must have associated `<label>` elements

## Code Organization (MEDIUM)

- Feature-based folder structure: `pages/catalog/`, `pages/product/`, etc.
- Shared UI in `components/` — only generic, reusable pieces
- Services in `services/` per domain: `product.service.ts`, `cart.service.ts`
- Models/interfaces in `models/` matching backend DTOs exactly
