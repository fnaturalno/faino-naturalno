# PostgreSQL + EF Core 10 Best Practices — Code Examples

Good/bad patterns for each rule in [SKILL.md](SKILL.md).

---

## N+1 Queries

```csharp
// BAD: N+1 — 1 query for orders, then 1 query per order for items
var orders = await _db.Orders.ToListAsync();
foreach (var order in orders)
{
    var items = order.Items; // lazy load — fires N queries!
}

// GOOD: Single query with Include
var orders = await _db.Orders
    .Include(o => o.Items)
        .ThenInclude(i => i.Product)
    .AsNoTracking()
    .ToListAsync(ct);

// BETTER: Project to DTO in the query — load only needed fields
var orders = await _db.Orders
    .Select(o => new OrderDto(
        o.Id,
        o.OrderNumber,
        o.Status,
        o.Items.Select(i => new OrderItemDto(i.Product.Name, i.Quantity, i.UnitPrice)).ToList()
    ))
    .ToListAsync(ct);
```

---

## Pagination

```csharp
// BAD: Loading entire table
var products = await _db.Products.ToListAsync();

// BAD: Offset pagination (slow on deep pages)
var products = await _db.Products
    .Skip((page - 1) * pageSize)
    .Take(pageSize)
    .ToListAsync(ct);

// GOOD: Offset pagination with explicit limits (fine for small datasets)
var products = await _db.Products
    .AsNoTracking()
    .Where(p => p.IsActive)
    .OrderBy(p => p.Id)
    .Skip((page - 1) * pageSize)
    .Take(Math.Min(pageSize, 100)) // cap max page size
    .Select(p => new ProductCardDto(p.Id, p.Name, p.Price, p.ImageUrl))
    .ToListAsync(ct);

// GOOD: Keyset pagination (fast even with millions of rows)
var products = await _db.Products
    .AsNoTracking()
    .Where(p => p.IsActive && p.Id > lastId)
    .OrderBy(p => p.Id)
    .Take(pageSize)
    .Select(p => new ProductCardDto(p.Id, p.Name, p.Price, p.ImageUrl))
    .ToListAsync(ct);
```

---

## Select Projection

```csharp
// BAD: Loading full entity with all columns
var products = await _db.Products
    .Include(p => p.Category)
    .AsNoTracking()
    .ToListAsync(ct);
// Then mapping in memory — all columns transferred from DB

// GOOD: Project in the query — only needed columns
var products = await _db.Products
    .AsNoTracking()
    .Where(p => p.IsActive)
    .Select(p => new ProductCardDto(
        p.Id,
        p.Name,
        p.Slug,
        p.Price,
        p.OldPrice,
        p.ImageUrl,
        p.Category.Name
    ))
    .ToListAsync(ct);
```

---

## Indexes in EF Core

```csharp
// BAD: No indexes on FK or filtered columns
protected override void OnModelCreating(ModelBuilder builder)
{
    builder.Entity<Product>()
        .HasOne(p => p.Category)
        .WithMany(c => c.Products)
        .HasForeignKey(p => p.CategoryId);
    // CategoryId has no index!
}

// GOOD: Index FK + common filter columns
protected override void OnModelCreating(ModelBuilder builder)
{
    builder.Entity<Product>(entity =>
    {
        entity.HasIndex(p => p.Slug).IsUnique();           // slug lookups
        entity.HasIndex(p => p.CategoryId);                // FK — filter by category
        entity.HasIndex(p => p.IsActive);                  // filter active products
        entity.HasIndex(p => new { p.CategoryId, p.IsActive }); // composite for catalog query
    });
}
```

---

## Transactions for Multi-Step Writes

```csharp
// BAD: Two SaveChangesAsync without transaction — partial failure possible
await _db.SaveChangesAsync(); // saves order
await _db.SaveChangesAsync(); // saves stock update — if this fails, order exists but stock wasn't reduced

// GOOD: Single transaction
await using var transaction = await _db.Database.BeginTransactionAsync(ct);
try
{
    _db.Orders.Add(order);
    await _db.SaveChangesAsync(ct);

    await _db.Products
        .Where(p => itemIds.Contains(p.Id))
        .ExecuteUpdateAsync(s =>
            s.SetProperty(p => p.StockQuantity, p => p.StockQuantity - 1), ct);

    await transaction.CommitAsync(ct);
}
catch
{
    await transaction.RollbackAsync(ct);
    throw;
}
```

---

## AsNoTracking

```csharp
// BAD: Tracking entities for read-only API endpoint
var category = await _db.Categories
    .Include(c => c.Products)
    .FirstAsync(c => c.Slug == slug);

// GOOD: AsNoTracking — no change tracking overhead
var category = await _db.Categories
    .AsNoTracking()
    .Where(c => c.Slug == slug)
    .Select(c => new CategoryDetailDto(
        c.Id, c.Name, c.Description,
        c.Products.Where(p => p.IsActive).Count()
    ))
    .FirstOrDefaultAsync(ct)
    ?? throw new NotFoundException($"Category '{slug}' not found");
```

---

## Soft Deletes

```csharp
// In AppDbContext.cs
protected override void OnModelCreating(ModelBuilder builder)
{
    // Global filter — IsDeleted products never appear in normal queries
    builder.Entity<Product>().HasQueryFilter(p => !p.IsDeleted);
}

// Service — soft delete
public async Task DeleteProductAsync(int id, CancellationToken ct)
{
    await _db.Products
        .Where(p => p.Id == id)
        .ExecuteUpdateAsync(s =>
            s.SetProperty(p => p.IsDeleted, true)
             .SetProperty(p => p.UpdatedAt, DateTime.UtcNow), ct);
}

// Admin service — bypass filter to see deleted
public async Task<List<ProductDto>> GetAllIncludingDeletedAsync(CancellationToken ct)
{
    return await _db.Products
        .IgnoreQueryFilters()  // bypass soft delete filter
        .AsNoTracking()
        .Select(p => new ProductDto(...))
        .ToListAsync(ct);
}
```

---

## Money — Never Float

```csharp
// BAD: Float for money — rounding errors accumulate
public float Price { get; set; }

// GOOD: decimal for money
public decimal Price { get; set; }
// EF Core maps to numeric(10,2) in PostgreSQL
builder.Entity<Product>()
    .Property(p => p.Price)
    .HasColumnType("numeric(10,2)");
```

---

## Full-Text Search (PostgreSQL)

```csharp
// BAD: LIKE with leading wildcard — cannot use index, full table scan
var products = await _db.Products
    .Where(p => EF.Functions.Like(p.Name, $"%{term}%"))
    .ToListAsync(ct);

// GOOD: PostgreSQL full-text search via EF.Functions
var products = await _db.Products
    .AsNoTracking()
    .Where(p => EF.Functions.ToTsVector("ukrainian", p.Name + " " + p.Description)
        .Matches(EF.Functions.ToTsQuery("ukrainian", term)))
    .Select(p => new ProductCardDto(p.Id, p.Name, p.Price, p.ImageUrl))
    .ToListAsync(ct);
```
