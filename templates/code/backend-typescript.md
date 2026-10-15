# BE Template — TypeScript (NestJS/Fastify + Prisma/Drizzle)

## 1) Domain (100% murni)
```ts
// modules/order/domain/order.ts
export type OrderStatus = "PENDING" | "PAID" | "CANCELLED";
export interface Order { id: string; totalAmount: number; status: OrderStatus }

// core/result.ts
export type Result<T, E = DomainError> =
  | { ok: true; value: T }
  | { ok: false; error: E };
export interface DomainError { code: string; message: string }
```

## 2) Port + UseCase
```ts
// modules/order/domain/order.repository.ts
export interface OrderRepository {
  findById(id: string): Promise<Order | null>;
  save(order: Order): Promise<Order>;
}

// modules/order/usecase/create-order.usecase.ts
export class CreateOrderUseCase {
  constructor(private readonly repo: OrderRepository, private readonly uow: UnitOfWork) {}
  async execute(cmd: { price: number; quantity: number }): Promise<Result<Order>> {
    if (cmd.quantity <= 0) return { ok: false, error: { code: "ERR_INVALID_QTY", message: "Jumlah tidak valid" } };
    return this.uow.transaction(async () => ({ ok: true, value: await this.repo.save({ id: crypto.randomUUID(), totalAmount: cmd.price * cmd.quantity, status: "PENDING" }) }));
  }
}
```

## 3) Data (Prisma + Mapper)
```ts
// modules/order/data/order.mapper.ts
export const toDomain = (e: { id: string; totalAmount: number; status: string }): Order => ({ id: e.id, totalAmount: e.totalAmount, status: e.status as OrderStatus });

// modules/order/data/prisma-order.repository.ts
export class PrismaOrderRepository implements OrderRepository {
  constructor(private readonly db: PrismaClient) {}
  async findById(id: string) { const e = await this.db.order.findUnique({ where: { id } }); return e ? toDomain(e) : null; }
  async save(o: Order) { return toDomain(await this.db.order.create({ data: { id: o.id, totalAmount: o.totalAmount, status: o.status } })); }
}
```

## 4) Delivery (controller tipis)
```ts
// modules/order/delivery/order.controller.ts
@Controller("api/v1/orders")
export class OrderController {
  constructor(private readonly createOrder: CreateOrderUseCase) {}
  @Post()
  async create(@Body() body: CreateOrderDto) {
    const r = await this.createOrder.execute(body);
    return r.ok ? envelopeOk(r.value) : envelopeFail(r.error); // global interceptor memetakan HTTP
  }
}
```
