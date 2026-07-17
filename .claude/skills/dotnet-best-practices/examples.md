# ASP.NET Core 10 Best Practices — Code Examples

Good/bad patterns for each rule in [SKILL.md](SKILL.md).

---

## Controller — No Business Logic

```csharp
// BAD: Business logic in controller
[HttpPost]
public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest req)
{
    var cart = await _db.Carts.Include(c => c.Items).FirstAsync(c => c.SessionId == req.SessionId);
    var total = cart.Items.Sum(i => i.Product.Price * i.Quantity);
    var order = new Order { TotalAmount = total, ... };
    _db.Orders.Add(order);
    await _db.SaveChangesAsync();
    return Ok(order);
}

// GOOD: Controller delegates to service
[HttpPost]
[ProducesResponseType(typeof(ApiResponse<OrderDto>), 201)]
public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest req, CancellationToken ct)
{
    var order = await _orderService.CreateOrderAsync(req, ct);
    return CreatedAtAction(nameof(GetOrder), new { id = order.Id }, ApiResponse.Ok(order));
}
```

---

## Never Expose Domain Models

```csharp
// BAD: Returns EF entity directly
public async Task<Product> GetProductAsync(int id)
    => await _db.Products.FindAsync(id);

// GOOD: Projects to DTO in query
public async Task<ProductDto> GetProductAsync(string slug, CancellationToken ct)
    => await _db.Products
        .Where(p => p.Slug == slug && p.IsActive)
        .Select(p => new ProductDto(p.Id, p.Name, p.Price, p.ImageUrl))
        .FirstOrDefaultAsync(ct)
    ?? throw new NotFoundException($"Product '{slug}' not found");
```

---

## Async — Never .Result or .Wait()

```csharp
// BAD: Deadlock waiting to happen
public ProductDto GetProduct(int id)
{
    return _productService.GetProductAsync(id).Result; // DEADLOCK risk
}

// GOOD: Async all the way
public async Task<ProductDto> GetProductAsync(int id, CancellationToken ct)
{
    return await _productService.GetProductAsync(id, ct);
}
```

---

## CancellationToken Threading

```csharp
// BAD: No cancellation support
public async Task<List<ProductDto>> GetProductsAsync()
    => await _db.Products.Select(p => ...).ToListAsync();

// GOOD: Cancellation passed through
public async Task<List<ProductDto>> GetProductsAsync(CancellationToken ct)
    => await _db.Products
        .Where(p => p.IsActive)
        .Select(p => new ProductDto(p.Id, p.Name, p.Price))
        .ToListAsync(ct);
```

---

## EF Core: AsNoTracking

```csharp
// BAD: Tracking entities for read-only use
var products = await _db.Products.ToListAsync();

// GOOD: AsNoTracking for reads
var products = await _db.Products
    .AsNoTracking()
    .Where(p => p.IsActive)
    .Select(p => new ProductDto(p.Id, p.Name, p.Price))
    .ToListAsync(ct);
```

---

## EF Core: Bulk Operations

```csharp
// BAD: Loading entity to delete
var product = await _db.Products.FindAsync(id);
_db.Products.Remove(product);
await _db.SaveChangesAsync();

// GOOD: ExecuteDeleteAsync — no entity load
await _db.Products
    .Where(p => p.Id == id)
    .ExecuteDeleteAsync(ct);

// BAD: Loop updates
foreach (var item in items)
{
    item.StockQuantity -= 1;
}
await _db.SaveChangesAsync();

// GOOD: ExecuteUpdateAsync
await _db.Products
    .Where(p => orderItemIds.Contains(p.Id))
    .ExecuteUpdateAsync(s => s.SetProperty(p => p.StockQuantity, p => p.StockQuantity - 1), ct);
```

---

## Global Exception Middleware

```csharp
// BAD: Try/catch in every controller
[HttpGet("{id}")]
public async Task<IActionResult> GetProduct(int id)
{
    try {
        var product = await _productService.GetAsync(id);
        return Ok(product);
    }
    catch (NotFoundException ex) { return NotFound(ex.Message); }
    catch (Exception ex) { return StatusCode(500, ex.Message); } // leaks stack trace!
}

// GOOD: Clean controller + global middleware handles exceptions
[HttpGet("{slug}")]
public async Task<IActionResult> GetProduct(string slug, CancellationToken ct)
{
    var product = await _productService.GetBySlugAsync(slug, ct);
    return Ok(ApiResponse.Ok(product));
}

// In ExceptionMiddleware.cs:
// NotFoundException → 404 ProblemDetails
// ValidationException → 400 with field errors
// Exception → 500 with safe message, full details logged
```

---

## FluentValidation

```csharp
// BAD: Manual validation in service
if (string.IsNullOrEmpty(request.Email))
    throw new Exception("Email is required");
if (request.Email.Length > 200)
    throw new Exception("Email too long");

// GOOD: FluentValidation
public class CreateOrderRequestValidator : AbstractValidator<CreateOrderRequest>
{
    public CreateOrderRequestValidator()
    {
        RuleFor(x => x.RecipientName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Phone).NotEmpty().Matches(@"^\+?\d{10,15}$");
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.DeliveryAddress).NotEmpty().MaximumLength(500);
    }
}
```

---

## Records for DTOs

```csharp
// BAD: Mutable class DTO
public class ProductDto
{
    public int Id { get; set; }
    public string Name { get; set; }
    public decimal Price { get; set; }
}

// GOOD: Immutable record DTO
public record ProductDto(int Id, string Name, decimal Price, string? ImageUrl);

// GOOD: Request record with required init
public record CreateOrderRequest
{
    public required string RecipientName { get; init; }
    public required string Phone { get; init; }
    public required string Email { get; init; }
    public required string DeliveryAddress { get; init; }
    public string? Comment { get; init; }
}
```

---

## Structured Logging

```csharp
// BAD: String concatenation logging
_logger.LogInformation("Order created for " + email + " total: " + total);

// GOOD: Structured logging
_logger.LogInformation("Order {OrderId} created for {Email}, total {Total:C}",
    order.Id, order.Email, order.TotalAmount);
```
