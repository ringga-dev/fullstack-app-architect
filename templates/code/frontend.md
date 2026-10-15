# FE Template — MVI / MVVM State Contract

Aturan: State **immutable**, Intent **sealed/enum**, Effect untuk sekali-jalan (navigasi/snackbar).
Wajib 5 UI state pada layar list: `loading, data, empty, error, pagination/filter`.

## Kotlin / Compose Multiplatform (MVI)
```kotlin
// features/order/presentation/contract/OrderContract.kt
data class OrderUiState(
    val isLoading: Boolean = false,
    val items: List<Order> = emptyList(),   // Order = domain model (BUKAN DTO/Entity)
    val error: String? = null,
    val page: Int = 1,
)
sealed interface OrderIntent {
    data object Load : OrderIntent
    data class ChangePage(val page: Int) : OrderIntent
    data class Retry(val message: String) : OrderIntent
}
sealed interface OrderEffect { data class ShowSnackbar(val text: String) : OrderEffect }

// features/order/presentation/viewmodel/OrderViewModel.kt
class OrderViewModel(private val loadOrders: LoadOrdersUseCase) : ViewModel() {
    private val _state = MutableStateFlow(OrderUiState()); val state = _state.asStateFlow()
    private val _effect = Channel<OrderEffect>(); val effect = _effect.receiveAsFlow()
    fun onIntent(i: OrderIntent) = when (i) {
        OrderIntent.Load -> load() // panggil usecase -> Result -> update _state
        is OrderIntent.ChangePage -> _state.update { it.copy(page = i.page) }
        is OrderIntent.Retry -> { _effect.trySend(OrderEffect.ShowSnackbar(i.message)); load() }
    }
    private fun load() { /* Result.Ok -> data ; Result.Err -> error */ }
}
```

## React / Next.js (MVVM-ish with a store)
```ts
// features/order/presentation/useOrders.ts
export type OrderUiState = { loading: boolean; items: Order[]; error?: string; page: number };
export const useOrders = () => {
  const [s, set] = useState<OrderUiState>({ loading: false, items: [], page: 1 });
  const load = async () => { set({ ...s, loading: true }); const r = await loadOrders();  // Result
    r.ok ? set({ loading: false, items: r.value, page: s.page }) : set({ ...s, loading: false, error: r.error.message }); };
  return { state: s, intent: { load } };
};
```

## Flutter (BLoC / Cubit)
```dart
// features/order/presentation/order_cubit.dart
sealed class OrderState { const OrderState(); }
class OrderLoading extends OrderState { const OrderLoading(); }
class OrderData extends OrderState { final List<Order> items; final int page; const OrderData(this.items, this.page); }
class OrderError extends OrderState { final String message; const OrderError(this.message); }

class OrderCubit extends Cubit<OrderState> {
  OrderCubit(this._loadOrders) : super(const OrderLoading());
  final LoadOrdersUseCase _loadOrders;
  Future<void> load() async {
    emit(const OrderLoading());
    final r = await _loadOrders();                      // Result<Order>
    r.when(ok: (items) => emit(OrderData(items, 1)), err: (e) => emit(OrderError(e.message)));
  }
}
```
