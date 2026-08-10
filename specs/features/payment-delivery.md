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
  - Delivery: Ukrposhta (post office; 1–2 days; free from 1300 ₴ — details at checkout)
  - Payment: bank transfer to FOP details (corporate or buyer request)
- CTA to catalog.

### Out of scope

- Changing checkout carriers (Ukrposhta is **informational** on this page only; checkout methods remain NP / pickup / city per `checkout.md`).
- Automatic free-shipping calculation at 1300 ₴.
- Online payment gateway.
- CMS / admin-editable copy (v1 = Transloco JSON).

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
- [x] Page documents NP, Ukrposhta (incl. free-from-1300 note), and cashless FOP payment.
- [x] Does not alter checkout API or place-order delivery methods.
