# BE Template — Rust (Axum + SQLx)

## 1) Domain (murni — tanpa Axum/sqlx/serde)
```rust
// src/order/domain/mod.rs
pub struct Order { pub id: String, pub total_amount: i64, pub status: OrderStatus }
pub enum OrderStatus { Pending, Paid, Cancelled }

#[async_trait::async_trait]
pub trait OrderRepository: Send + Sync {
    async fn find_by_id(&self, id: &str) -> Result<Option<Order>, DomainError>;
    async fn save(&self, order: Order) -> Result<Order, DomainError>;
}

#[derive(Debug)]
pub struct DomainError { pub code: &'static str, pub message: String }
pub type AppResult<T> = Result<T, DomainError>;
```

## 2) UseCase (1 aksi + batas transaksi)
```rust
// src/order/usecase/create_order.rs
pub struct CreateOrder { repo: Arc<dyn OrderRepository>, uow: Arc<dyn UnitOfWork> }

impl CreateOrder {
    pub async fn execute(&self, price: i64, qty: i32) -> AppResult<Order> {
        if qty <= 0 {
            return Err(DomainError { code: "ERR_INVALID_QTY", message: "Jumlah tidak valid".into() });
        }
        self.uow.transaction(|| async {
            self.repo.save(Order {
                id: new_id(), total_amount: price * qty as i64, status: OrderStatus::Pending,
            }).await
        }).await
    }
}
```

## 3) Data (SQLx + mapper)
```rust
// src/order/data/order_repo.rs
pub struct PgOrderRepo { pool: PgPool }

#[derive(sqlx::FromRow)]
struct OrderRow { id: Uuid, total_amount: i64, status: String }
impl From<OrderRow> for Order { // mapper eksplisit
    fn from(r: OrderRow) -> Self { Order { id: r.id.to_string(), total_amount: r.total_amount, status: OrderStatus::from(r.status.as_str()) } }
}

#[async_trait::async_trait]
impl OrderRepository for PgOrderRepo {
    async fn save(&self, o: Order) -> AppResult<Order> {
        let row: OrderRow = sqlx::query_as("INSERT INTO orders (id, total_amount, status) VALUES ($1,$2,$3) RETURNING id, total_amount, status")
            .bind(Uuid::parse_str(&o.id).unwrap()).bind(o.total_amount).bind(o.status.as_str())
            .fetch_one(&self.pool).await.map_err(map_sqlx)?;
        Ok(row.into())
    }
    async fn find_by_id(&self, id: &str) -> AppResult<Option<Order>> { /* query_as ... */ Ok(None) }
}
```

## 4) Delivery (handler tipis + envelope)
```rust
// src/order/delivery.rs
async fn create_order(State(c): State<AppState>, Json(body): Json<CreateOrderReq>) -> impl IntoResponse {
    match c.create_order.execute(body.price, body.quantity).await {
        Ok(o)  => (StatusCode::CREATED, Json(Envelope::ok(o))),
        Err(e) => (status_of(&e), Json(Envelope::<()>::fail(e))),
    }
}
```
