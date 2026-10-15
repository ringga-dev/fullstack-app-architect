# BE Template — Python (FastAPI + SQLAlchemy 2.0)

## 1) Domain (murni — tanpa FastAPI/SQLAlchemy/pydantic)
```python
# app/order/domain/models.py
from dataclasses import dataclass
from enum import Enum

class OrderStatus(str, Enum):
    PENDING = "PENDING"; PAID = "PAID"; CANCELLED = "CANCELLED"

@dataclass
class Order:
    id: str
    total_amount: int
    status: OrderStatus

class DomainError(Exception):
    def __init__(self, code: str, message: str):
        self.code = code; self.message = message

# app/order/domain/ports.py
from typing import Protocol, Optional
class OrderRepository(Protocol):
    async def find_by_id(self, id: str) -> Optional[Order]: ...
    async def save(self, order: Order) -> Order: ...
```

## 2) UseCase
```python
# app/order/usecase/create_order.py
class CreateOrderUseCase:
    def __init__(self, repo: OrderRepository, uow: "UnitOfWork"):
        self._repo, self._uow = repo, uow

    async def execute(self, price: int, quantity: int) -> Order:
        if quantity <= 0:
            raise DomainError("ERR_INVALID_QTY", "Jumlah tidak valid")
        async with self._uow:            # batas transaksi
            return await self._repo.save(Order(id=new_id(), total_amount=price * quantity,
                                               status=OrderStatus.PENDING))
```

## 3) Data (SQLAlchemy + mapper)
```python
# app/order/data/orm.py
class OrderRow(Base):
    __tablename__ = "orders"
    id = mapped_column(Uuid, primary_key=True)
    total_amount = mapped_column(BigInteger, nullable=False)
    status = mapped_column(String(16), nullable=False)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at = mapped_column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = mapped_column(DateTime(timezone=True), nullable=True)
    version = mapped_column(Integer, default=1, nullable=False)

def to_domain(row: OrderRow) -> Order:            # mapper eksplisit
    return Order(str(row.id), row.total_amount, OrderStatus(row.status))

# app/order/data/repository.py
class SqlAlchemyOrderRepository(OrderRepository):
    def __init__(self, session: AsyncSession): self._s = session
    async def save(self, order: Order) -> Order:
        row = OrderRow(id=UUID(order.id), total_amount=order.total_amount, status=order.status.value)
        self._s.add(row); await self._s.flush()
        return to_domain(row)
    async def find_by_id(self, id: str) -> Optional[Order]: ...
```

## 4) Delivery (router tipis + envelope)
```python
# app/order/delivery/router.py
router = APIRouter(prefix="/api/v1/orders", tags=["orders"])

@router.post("", status_code=201)
async def create_order(body: CreateOrderRequest, uc: CreateOrderUseCase = Depends(get_uc)):
    try:
        order = await uc.execute(body.price, body.quantity)
        return envelope_ok(OrderResponse.from_domain(order))
    except DomainError as e:
        return envelope_fail(e)   # exception handler memetakan HTTP
```
