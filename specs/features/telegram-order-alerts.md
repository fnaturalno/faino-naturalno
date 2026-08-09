# Feature: Telegram alerts for new orders

**Status:** Implemented  
**Priority:** Ops / admin  
**Scope:** Backend only

---

## Summary

After a successful `POST /api/orders`, the API sends a one-way Telegram HTML message to the configured admin chat with order number, recipient, phone, delivery, lines, and total. Failures never fail the place-order response.

## Config

Section `Telegram` in `appsettings.json` (empty by default):

- `BotToken` — via `Telegram__BotToken`
- `AdminChatId` — via `Telegram__AdminChatId`

Empty token or chat id → warning log, no send.

## Behavior

- No webhook; only `sendMessage`.
- Fire-and-forget after DB commit via `IServiceScopeFactory` (typed `HttpClient` not tied to the request scope).
- Product names from `NameUk` at place time.

## References

- Checkout: `specs/features/checkout.md`
- Implementation: `backend/FaynoShop.API/Services/Telegram/`
