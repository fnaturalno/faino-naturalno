# Feature: Оплата і доставка

**Status:** Implemented  
**Priority:** Content / storefront  
**Agent:** frontend (static page + i18n + nav)

---

## Summary

Публічна інформаційна сторінка «Оплата і доставка» / «Payment & delivery» з умовами перевізників і способом оплати. Пункт у головному меню storefront.

## Scope

### In scope

- Route `/:locale/payment-delivery` (`PaymentDeliveryComponent`).
- Navbar (desktop + mobile): пункт між «Новини» і «Контакти»; active highlight.
- i18n keys under `paymentDelivery.*` and `nav.paymentDelivery` (ua / en).
- Content sections:
  - Intro
  - Delivery: Nova Poshta (branch / locker / courier; 1–2 business days; carrier tariffs)
  - Delivery: Ukrposhta (post office; 1–2 days)
  - Shared note below both: free delivery from a configurable UAH amount (details at checkout)
  - Payment: bank transfer to FOP details (corporate or buyer request)
- CTA to catalog.

### Out of scope

- Changing checkout carriers on this page alone (checkout methods are NP / pickup / ukrposhta per `checkout.md`; this page is informational copy).
- Automatic free-shipping calculation at checkout.
- Online payment gateway.
- CMS for the rest of the page copy (the free-from amount for NP and Ukrposhta is admin-editable).

## References

- Frontend routes / nav: `specs/frontend.md`
- Checkout delivery methods: `specs/features/checkout.md`
- Contacts (pickup address / hours): contacts page + `/:locale/contacts`

---

## UI

- Same kraft / marigold atmosphere as About / Contacts (no card dashboard).
- H1 = page title; accent intro; section headings; left-border blocks for NP / Ukrposhta.
- Active nav: same `nav-link-active` pattern as other storefront items.

## Acceptance

- [x] `/ua/payment-delivery` and `/en/payment-delivery` render localized copy.
- [x] Navbar shows «Оплата і доставка» / «Payment & delivery» with active state on that route.
- [x] Page documents NP, Ukrposhta (free-from amount from shop settings), and cashless FOP payment.
- [x] Does not alter checkout API or place-order delivery methods.
