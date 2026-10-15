# BE Template — Go (Fiber/Gin + sqlc/GORM)

## 1) Domain (murni)
```go
// internal/order/domain/order.go
package domain

type Status string
const ( StatusPending Status = "PENDING"; StatusPaid Status = "PAID" )
type Order struct { ID string; TotalAmount int64; Status Status }

type Repository interface {
    FindByID(ctx context.Context, id string) (*Order, error)
    Save(ctx context.Context, o *Order) (*Order, error)
}

// core/result.go
type DomainError struct { Code, Message string }
func (e *DomainError) Error() string { return e.Message }
```

## 2) UseCase
```go
// internal/order/usecase/create_order.go
type CreateOrder struct { repo domain.Repository; uow UoW }
func (uc *CreateOrder) Execute(ctx context.Context, price int64, qty int) (*domain.Order, error) {
    if qty <= 0 { return nil, &domain.DomainError{Code: "ERR_INVALID_QTY", Message: "Jumlah tidak valid"} }
    var out *domain.Order
    err := uc.uow.Do(ctx, func(ctx context.Context) error {
        var e error
        out, e = uc.repo.Save(ctx, &domain.Order{ID: newID(), TotalAmount: price * int64(qty), Status: domain.StatusPending})
        return e
    })
    return out, err
}
```

## 3) Data (sqlc query + mapper)
```go
// internal/order/data/order_repo.go
func (r *repo) Save(ctx context.Context, o *domain.Order) (*domain.Order, error) {
    row, err := r.q.InsertOrder(ctx, db.InsertOrderParams{ID: o.ID, TotalAmount: o.TotalAmount, Status: string(o.Status)})
    if err != nil { return nil, err }
    return toDomain(row), nil // mapper eksplisit
}
func toDomain(r db.Order) *domain.Order { return &domain.Order{ID: r.ID, TotalAmount: r.TotalAmount, Status: domain.Status(r.Status)} }
```

## 4) Delivery (handler tipis)
```go
// internal/order/delivery/http.go
func (h *Handler) Create(c *fiber.Ctx) error {
    var body CreateOrderRequest
    if err := c.BodyParser(&body); err != nil { return envelopeFail(c, 400, "ERR_INVALID_BODY", err.Error()) }
    out, err := h.createOrder.Execute(c.Context(), body.Price, body.Quantity)
    if err != nil { return envelopeFail(c, errStatus(err), errCode(err), err.Error()) }
    return envelopeOK(c, 201, toResponse(out))
}
```
