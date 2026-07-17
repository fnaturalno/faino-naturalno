# Файно натурально — Orchestrator Instructions

## Проєкт

Інтернет-магазин натуральних продуктів: спеції, приправи, чаї.

**Стек:** ASP.NET Core 10 (backend) · Angular 22 (frontend) · PostgreSQL + EF Core 10 · Docker

**Репозиторій:** monorepo — `/backend` (API) та `/frontend` (Angular app)

---

## Процес розробки

### Підхід
- **Spec Driven Development** — спочатку spec, потім код
- **Feature Driven** — одна фіча за раз, вертикальний зріз (API + UI + тести)
- **Multi-Agent** — кожен агент має чіткий scope, не перетинається з іншими

### Pipeline кожної фічі
```
Claude Design (макет)
  → /new-feature (scaffold + spec-шаблон)
    → requirements-planner (spec.md через діалог)
      → backend agent (API)
      → database agent (міграції)
      → frontend agent (UI)
        → tester agent (тести)
          → /run-review (plan-verifier + code-reviewer + security-reviewer)
```

### Правила
1. **Не пиши код без spec.** Якщо spec не існує — спочатку requirements-planner.
2. **Один агент — одна відповідальність.** Backend не торкається Angular, frontend не торкається міграцій.
3. **plan-verifier перед code-reviewer.** Спочатку перевіряємо completeness, потім якість.
4. **Фіча = deployable unit.** Кожна фіча має бути робочою незалежно від наступних.

---

## Структура проєкту

```
fayno-shop/
├── CLAUDE.md                  ← ти тут
├── SPEC.md                    ← загальний опис продукту
├── docker-compose.yml         ← PostgreSQL + pgAdmin
├── specs/
│   ├── models.md              ← моделі даних
│   ├── api.md                 ← API контракти
│   ├── frontend.md            ← архітектура frontend
│   ├── db.md                  ← схема БД, індекси
│   └── features/              ← spec кожної фічі (генерує requirements-planner)
│       ├── catalog.md
│       ├── product-page.md
│       ├── cart.md
│       ├── checkout.md
│       ├── auth.md
│       └── admin.md
├── .claude/
│   ├── agents/                ← 8 агентів
│   └── skills/                ← 3 custom skills
├── backend/                   ← ASP.NET Core 10
└── frontend/                  ← Angular 22
```

---

## Агенти

| Агент | Коли викликати |
|-------|---------------|
| `requirements-planner` | Перед кожною фічею — генерує specs/features/*.md |
| `backend` | Реалізація API, моделі, сервіси |
| `database` | EF Core міграції, seed data, індекси |
| `frontend` | Angular компоненти, routing, signals |
| `tester` | Unit тести (xUnit) та E2E (Playwright) |
| `plan-verifier` | Після build — перевіряє spec vs код |
| `code-reviewer` | Якість коду, SOLID, конвенції |
| `security-reviewer` | OWASP, auth, SQL injection, XSS |
| `devops` | Docker, CI/CD, деплой |

## Skills

| Skill | Команда |
|-------|---------|
| Scaffold нової фічі | `/new-feature` |
| Запустити всі review | `/run-review` |
| EF Core міграція | `/db-migrate` |

---

## Конвенції

### Backend (C#)
- Namespace: `FaynoShop.API`
- Controllers у `/Controllers`, Services у `/Services`, DTOs у `/DTOs`
- Всі endpoints повертають `ApiResponse<T>` wrapper
- Async/await скрізь, cancellation tokens у всіх публічних методах
- Валідація через FluentValidation

### Frontend (Angular 22)
- Standalone components скрізь, ніяких NgModules
- State через signals, ніякого NgRx
- HTTP через `HttpClient` з typed responses
- Іменування: `feature-name.component.ts`, `feature-name.service.ts`
- Стилі: Tailwind CSS utility classes

### Git
- Гілки: `feature/назва-фічі`, `fix/опис-фіксу`
- Commit: `feat(catalog): add product filtering`
- PR потребує проходження /run-review
