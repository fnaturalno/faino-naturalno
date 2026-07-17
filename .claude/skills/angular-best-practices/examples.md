# Angular 22 Best Practices — Code Examples

Good/bad patterns for each rule in [SKILL.md](SKILL.md).

---

## Signals: Derive, Don't Store

```ts
// BAD: Storing derived state in a signal
readonly items = signal<CartItem[]>([]);
readonly total = signal(0);
effect(() => {
  this.total.set(this.items().reduce((sum, i) => sum + i.price * i.qty, 0));
});

// GOOD: computed() — lazy, memoized, automatic
readonly items = signal<CartItem[]>([]);
readonly total = computed(() =>
  this.items().reduce((sum, i) => sum + i.price * i.qty, 0)
);
```

---

## Signals vs BehaviorSubject

```ts
// BAD: BehaviorSubject for local state
readonly cartCount$ = new BehaviorSubject(0);
addItem() { this.cartCount$.next(this.cartCount$.value + 1); }

// GOOD: signal
readonly cartCount = signal(0);
addItem() { this.cartCount.update(n => n + 1); }
```

---

## takeUntilDestroyed — Memory Leaks

```ts
// BAD: Subscription without cleanup
ngOnInit() {
  this.router.events.subscribe(event => { ... });
}

// GOOD: takeUntilDestroyed
private destroyRef = inject(DestroyRef);
ngOnInit() {
  this.router.events
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(event => { ... });
}
```

---

## inject() over Constructor Injection

```ts
// BAD: Constructor injection (verbose, harder to refactor)
constructor(
  private productService: ProductService,
  private router: Router,
) {}

// GOOD: inject()
private productService = inject(ProductService);
private router = inject(Router);
```

---

## Smart / Dumb Split

```ts
// BAD: Mixed fetching and rendering
@Component({ template: `<product-card *ngFor="let p of products" [product]="p" />` })
export class CatalogComponent {
  products: Product[] = [];
  constructor(private api: ProductService) {
    api.getAll().subscribe(p => this.products = p);
  }
}

// GOOD: Smart container with signal
@Component({
  template: `
    @if (products().length) {
      @for (p of products(); track p.id) {
        <product-card [product]="p" />
      }
    } @else {
      <empty-state />
    }
  `
})
export class CatalogComponent {
  private productService = inject(ProductService);
  products = toSignal(this.productService.getAll(), { initialValue: [] });
}
```

---

## Lazy Loading Routes

```ts
// BAD: Eagerly loaded routes
import { CatalogComponent } from './pages/catalog/catalog.component';
{ path: 'catalog', component: CatalogComponent }

// GOOD: Lazy loaded
{ path: 'catalog', loadComponent: () =>
    import('./pages/catalog/catalog.component').then(m => m.CatalogComponent) }
```

---

## New Control Flow

```html
<!-- BAD: old directives -->
<div *ngIf="product; else loading">{{ product.name }}</div>
<ng-template #loading><spinner /></ng-template>
<li *ngFor="let item of items; trackBy: trackById">{{ item.name }}</li>

<!-- GOOD: built-in control flow -->
@if (product()) {
  <h1>{{ product()!.name }}</h1>
} @else {
  <spinner />
}

@for (item of items(); track item.id) {
  <li>{{ item.name }}</li>
}
```

---

## HTTP with Typed Client

```ts
// BAD: Untyped, error ignored
getProducts() {
  return this.http.get('/api/products');
}

// GOOD: Typed, error handled
getProducts(): Observable<Product[]> {
  return this.http.get<ApiResponse<Product[]>>('/api/products').pipe(
    map(res => res.data),
    catchError(err => {
      console.error('Failed to load products', err);
      return of([]);
    })
  );
}
```

---

## @defer for Performance

```html
<!-- BAD: Heavy component always loaded -->
<admin-charts [data]="stats" />

<!-- GOOD: Deferred until visible -->
@defer (on viewport) {
  <admin-charts [data]="stats()" />
} @placeholder {
  <div class="h-64 bg-gray-100 animate-pulse rounded" />
} @loading {
  <spinner />
}
```

---

## Accessible Icon Button

```html
<!-- BAD: No label -->
<button (click)="removeItem(item.id)">
  <trash-icon />
</button>

<!-- GOOD: aria-label -->
<button (click)="removeItem(item.id)" [attr.aria-label]="'Видалити ' + item.name">
  <trash-icon />
</button>
```
