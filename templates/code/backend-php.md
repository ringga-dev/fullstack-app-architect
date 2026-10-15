# BE Template — PHP (Laravel / Symfony)

## 1) Domain (murni — tanpa Eloquent/HTTP)
```php
<?php
// app/Domain/Order/Order.php
final class Order {
    public function __construct(
        public readonly string $id,
        public readonly int $totalAmount,
        public readonly OrderStatus $status,
    ) {}
}

interface OrderRepository {
    public function findById(string $id): ?Order;
    public function save(Order $order): Order;
}

final class DomainError extends \RuntimeException {
    public function __construct(public readonly string $code, string $message) { parent::__construct($message); }
}
```

## 2) UseCase
```php
<?php
// app/Application/CreateOrderUseCase.php
final class CreateOrderUseCase {
    public function __construct(private OrderRepository $repo, private UnitOfWork $uow) {}

    public function execute(int $price, int $quantity): Order {
        if ($quantity <= 0) throw new DomainError('ERR_INVALID_QTY', 'Jumlah tidak valid');
        return $this->uow->transaction(fn () => $this->repo->save(new Order(
            id: (string) \Ramsey\Uuid\Uuid::uuid7(),
            totalAmount: $price * $quantity,
            status: OrderStatus::PENDING,
        )));
    }
}
```

## 3) Data (Eloquent + mapper)
```php
<?php
// app/Infrastructure/Persistence/EloquentOrderRepository.php
final class EloquentOrderRepository implements OrderRepository {
    public function save(Order $o): Order {
        $row = OrderModel::create([
            'id' => $o->id, 'total_amount' => $o->totalAmount, 'status' => $o->status->value,
        ]);
        return self::toDomain($row);                 // mapper eksplisit
    }
    public function findById(string $id): ?Order {
        $row = OrderModel::find($id); return $row ? self::toDomain($row) : null;
    }
    private static function toDomain(OrderModel $r): Order {
        return new Order($r->id, (int) $r->total_amount, OrderStatus::from($r->status));
    }
}
```

## 4) Delivery (controller tipis + Resource envelope)
```php
<?php
// app/Http/Controllers/OrderController.php
final class OrderController {
    public function __construct(private CreateOrderUseCase $createOrder) {}

    public function store(CreateOrderRequest $request) {
        try {
            $order = $this->createOrder->execute(...$request->safe()->only(['price', 'quantity']));
            return response()->json(Envelope::ok(OrderResource::make($order)), 201);
        } catch (DomainError $e) {
            return response()->json(Envelope::fail($e), http_status($e)); // 422/409/...
        }
    }
}
```
