# BE Template — Kotlin (Ktor + Exposed)

## 1) Domain (100% murni — tanpa Exposed/HTTP/JSON)
```kotlin
// modules/order/domain/model/Order.kt
data class Order(val id: String, val totalAmount: Long, val status: OrderStatus)
enum class OrderStatus { PENDING, PAID, CANCELLED }

// modules/order/domain/OrderRepository.kt  (interface / port)
interface OrderRepository {
    suspend fun findById(id: String): Order?
    suspend fun save(order: Order): Order
}

// core/common/Result.kt
sealed interface Result<out T> {
    data class Ok<T>(val value: T) : Result<T>
    data class Err(val error: DomainError) : Result<Nothing>
}
interface DomainError { val code: String; val message: String }
```

## 2) UseCase (1 kelas = 1 aksi + batas transaksi)
```kotlin
// modules/order/usecase/CreateOrderUseCase.kt
class CreateOrderUseCase(
    private val repo: OrderRepository,
    private val uow: UnitOfWork,          // core/database
    private val clock: Clock,
) {
    suspend operator fun invoke(cmd: CreateOrderCommand): Result<Order> = uow.inTransaction {
        if (cmd.quantity <= 0) return@inTransaction Result.Err(OrderErrors.INVALID_QTY)
        repo.save(Order(id = newId(), totalAmount = cmd.price * cmd.quantity, status = OrderStatus.PENDING))
            .let { Result.Ok(it) }
    }
}
data class CreateOrderCommand(val price: Long, val quantity: Int)
object OrderErrors {
    val INVALID_QTY = object : DomainError { override val code = "ERR_INVALID_QTY"; override val message = "Jumlah tidak valid" }
}
```

## 3) Data (Exposed Entity + Mapper + RepositoryImpl)
```kotlin
// modules/order/data/OrderTable.kt  (ORM — TIDAK keluar dari layer ini)
object OrderTable : UUIDTable("orders") {
    val totalAmount = long("total_amount")
    val status = varchar("status", 16)
    val version = integer("version").default(1)
}
class OrderEntity(id: EntityID<UUID>) : UUIDEntity(id) {
    companion object : UUIDEntityClass<OrderEntity>(OrderTable)
    var totalAmount by OrderTable.totalAmount
    var status by OrderTable.status
}
// Mapper eksplisit
object OrderMapper {
    fun toDomain(e: OrderEntity) = Order(e.id.value.toString(), e.totalAmount, OrderStatus.valueOf(e.status))
}

// modules/order/repository/OrderRepositoryImpl.kt
class OrderRepositoryImpl : OrderRepository {
    override suspend fun findById(id: String): Order? = transaction {
        OrderEntity.findById(UUID.fromString(id))?.let(OrderMapper::toDomain)
    }
    override suspend fun save(order: Order): Order = transaction {
        val e = OrderEntity.new { totalAmount = order.totalAmount; status = order.status.name }
        OrderMapper.toDomain(e)
    }
}
```

## 4) Delivery (Controller ≤ 20 baris, amplop JSON)
```kotlin
// modules/order/delivery/OrderRoutes.kt
fun Route.orderRoutes(create: CreateOrderUseCase) {
    post("/api/v1/orders") {
        val body = call.receive<CreateOrderRequest>()          // DTO
        when (val r = create(CreateOrderCommand(body.price, body.quantity))) {
            is Result.Ok  -> call.respond(Envelope.ok(OrderResponse.from(r.value)))
            is Result.Err -> call.respond(Envelope.fail(r.error)) // global handler memetakan HTTP
        }
    }
}
@Serializable data class CreateOrderRequest(val price: Long, val quantity: Int)
```
