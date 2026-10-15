# FE Template — Compose Multiplatform (MVI + Koin + Ktor + SQLDelight)

Stack: CMP (Android/iOS/Desktop/Web) · MVI · Koin · Ktor Client · Voyager/Decompose · SQLDelight.
Aturan: UI memakai **Domain Model** (bukan DTO/Entity), tidak ada logika bisnis krusial di UI.

## 1) Kontrak MVI (immutable state + intent + effect)
```kotlin
// feature/pos/presentation/PosContract.kt
data class PosUiState(
    val isLoading: Boolean = false,
    val items: List<CartLine> = emptyList(),   // CartLine = domain model
    val total: Long = 0,
    val error: String? = null,
)
sealed interface PosIntent {
    data class AddItem(val productId: String, val qty: Int) : PosIntent
    data class RemoveItem(val productId: String) : PosIntent
    data object Checkout : PosIntent
}
sealed interface PosEffect { data class ShowSnackbar(val text: String) : PosEffect }
```

## 2) ViewModel (UDF: intent -> usecase -> state/effect)
```kotlin
// feature/pos/presentation/PosViewModel.kt
class PosViewModel(
    private val addItem: AddItemUseCase,
    private val checkout: CheckoutUseCase,
) : ViewModel() {
    private val _state = MutableStateFlow(PosUiState()); val state = _state.asStateFlow()
    private val _effect = Channel<PosEffect>(); val effect = _effect.receiveAsFlow()

    fun onIntent(i: PosIntent) = when (i) {
        is PosIntent.AddItem -> run(i.productId, i.qty)
        is PosIntent.RemoveItem -> _state.update { s -> s.copy(items = s.items.filterNot { it.productId == i.productId }) }
        PosIntent.Checkout -> checkoutNow()
    }
    private fun run(pid: String, qty: Int) = viewModelScope.launch {
        _state.update { it.copy(isLoading = true) }
        when (val r = addItem(pid, qty)) {              // Result<CartLine, Failure>
            is Result.Ok  -> _state.update { it.copy(isLoading = false, items = it.items + r.value) }
            is Result.Err -> _effect.send(PosEffect.ShowSnackbar(r.error.message))
        }
    }
    private fun checkoutNow() { /* panggil usecase -> Result -> effect */ }
}
```

## 3) UseCase + Repository (domain)
```kotlin
// feature/pos/domain/AddItemUseCase.kt   (MURNI: tanpa Ktor/SQLDelight)
class AddItemUseCase(private val repo: CartRepository) {
    suspend operator fun invoke(productId: String, qty: Int): Result<CartLine> =
        if (qty <= 0) Result.Err(Failure("ERR_INVALID_QTY"))
        else repo.addLine(productId, qty)
}
interface CartRepository { suspend fun addLine(productId: String, qty: Int): Result<CartLine> }
```

## 4) Data (SQLDelight lokal + Ktor remote + mapper)
```kotlin
// feature/pos/data/CartRepositoryImpl.kt
class CartRepositoryImpl(
    private val db: AppDatabase,          // SQLDelight (sumber lokal, offline-first)
    private val api: PosApi,              // Ktor client
) : CartRepository {
    override suspend fun addLine(productId: String, qty: Int): Result<CartLine> =
        runCatching { db.cartQueries.insert(productId, qty.toLong(), "PENDING") }
            .fold({ Result.Ok(it.toDomain()) }, { Result.Err(Failure("ERR_DB", it.message)) })

    suspend fun sync() = api.pushBatch(db.syncQueries.pending().executeAsList().map { it.toDto() }) // Mapper eksplisit
}
```

## 5) DI (Koin) + Navigation
```kotlin
// di/AppModule.kt
val appModule = module {
    single { AppDatabase(driverFactory()) }
    single<CartRepository> { CartRepositoryImpl(get(), get()) }
    factory { AddItemUseCase(get()) }
    viewModel { PosViewModel(get(), get()) }
}
// Voyager: ScreenModelStore di-suntik dari Koin; setiap layar punya Screen + ScreenModel.
```

## 6) UI (layar list wajib 5 state)
```kotlin
@Composable fun PosScreen(vm: PosViewModel = koinViewModel()) {
    val s by vm.state.collectAsState()
    when {
        s.isLoading -> Loading()
        s.error != null -> ErrorView(s.error!!)
        s.items.isEmpty() -> EmptyView("Keranjang kosong")
        else -> CartList(s.items, total = s.total)
    }
}
```
