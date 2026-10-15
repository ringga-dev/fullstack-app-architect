# BE Template — C# (ASP.NET Core + EF Core)

## 1) Domain (murni — tanpa EF/ASP.NET)
```csharp
// Domain/Order.cs
namespace App.Domain;
public sealed record Order(string Id, long TotalAmount, OrderStatus Status);
public enum OrderStatus { Pending, Paid, Cancelled }

public interface IOrderRepository {
    Task<Order?> FindByIdAsync(string id, CancellationToken ct);
    Task<Order> SaveAsync(Order order, CancellationToken ct);
}
public sealed record DomainError(string Code, string Message);
public readonly record struct Result<T>(bool Ok, T? Value, DomainError? Error) {
    public static Result<T> Success(T v) => new(true, v, null);
    public static Result<T> Fail(DomainError e) => new(false, default, e);
}
```

## 2) UseCase
```csharp
// Application/CreateOrderUseCase.cs
public sealed class CreateOrderUseCase(IOrderRepository repo, IUnitOfWork uow) {
    public Task<Result<Order>> ExecuteAsync(long price, int qty, CancellationToken ct) {
        if (qty <= 0) return Task.FromResult(Result<Order>.Fail(new("ERR_INVALID_QTY", "Jumlah tidak valid")));
        return uow.ExecuteInTransactionAsync(async () =>
            Result<Order>.Success(await repo.SaveAsync(
                new Order(Guid.CreateVersion7().ToString(), price * qty, OrderStatus.Pending), ct)));
    }
}
```

## 3) Data (EF Core + mapper)
```csharp
// Infrastructure/OrderConfiguration.cs + OrderEntity
public sealed class OrderEntity { public Guid Id { get; set; } public long TotalAmount { get; set; } public string Status { get; set; } = "PENDING"; }
internal static class OrderMapper {
    public static Order ToDomain(this OrderEntity e) => new(e.Id.ToString(), e.TotalAmount, Enum.Parse<OrderStatus>(e.Status, true));
}
// Repository impl
public sealed class OrderRepository(AppDbContext db) : IOrderRepository {
    public async Task<Order> SaveAsync(Order o, CancellationToken ct) {
        var e = new OrderEntity { Id = Guid.Parse(o.Id), TotalAmount = o.TotalAmount, Status = o.Status.ToString().ToUpperInvariant() };
        db.Orders.Add(e); await db.SaveChangesAsync(ct);
        return e.ToDomain(); // mapper
    }
    public Task<Order?> FindByIdAsync(string id, CancellationToken ct) => Task.FromResult<Order?>(null);
}
```

## 4) Delivery (Minimal API — ≤ 20 baris)
```csharp
// Program.cs / Endpoints/OrderEndpoints.cs
app.MapPost("/api/v1/orders", async (CreateOrderDto dto, CreateOrderUseCase uc, CancellationToken ct) => {
    var r = await uc.ExecuteAsync(dto.Price, dto.Quantity, ct);
    return r.Ok ? Results.Created($"/orders", Envelope.Ok(r.Value)) : Results.Json(Envelope.Fail(r.Error), statusCode: MapHttp(r.Error!));
});
```
