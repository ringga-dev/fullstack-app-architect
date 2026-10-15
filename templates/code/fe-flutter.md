# FE Template — Flutter (Riverpod + go_router + Drift)

Stack: Flutter · Riverpod (state/DI) · go_router (navigasi) · Drift (SQLite lokal) · Dio (HTTP).
UI memakai **Domain Entity**, bukan model Drift/DTO mentah.

## 1) Domain entity + repository (murni)
```dart
// lib/features/cart/domain/cart_line.dart
class CartLine {
  final String productId; final String name; final int price; final int qty;
  const CartLine({required this.productId, required this.name, required this.price, required this.qty});
  int get lineTotal => price * qty;
}

// lib/features/cart/domain/cart_repository.dart
abstract interface class CartRepository {
  Future<Result<CartLine>> addLine(String productId, int qty);
  Stream<List<CartLine>> watchCart();
}
```

## 2) Result type + failure
```dart
// lib/core/result.dart
sealed class Result<T> { const Result(); }
class Ok<T> extends Result<T> { final T value; const Ok(this.value); }
class Err<T> extends Result<T> { final Failure failure; const Err(this.failure); }
class Failure { final String code; final String message; const Failure(this.code, this.message); }
```

## 3) Data (Drift lokal + Dio remote + mapper)
```dart
// lib/features/cart/data/cart_repository_impl.dart
class CartRepositoryImpl implements CartRepository {
  final AppDb _db; final Dio _dio;
  CartRepositoryImpl(this._db, this._dio);

  @override
  Future<Result<CartLine>> addLine(String productId, int qty) async {
    if (qty <= 0) return const Err(Failure("ERR_INVALID_QTY", "Jumlah tidak valid"));
    await _db.into(_db.cartTable).insert(CartCompanion.insert(productId: productId, qty: qty, syncStatus: "PENDING"));
    final line = CartLine(productId: productId, name: "", price: 0, qty: qty); // ideal: ambil dari katalog
    return Ok(line);
  }

  @override
  Stream<List<CartLine>> watchCart() =>
      _db.select(_db.cartTable).watch().map((rows) => rows.map(toDomain).toList()); // mapper eksplisit
}
CartLine toDomain(CartRow r) => CartLine(productId: r.productId, name: r.name, price: r.price, qty: r.qty);
```

## 4) State (Riverpod Notifier) + DI
```dart
// lib/features/cart/presentation/cart_controller.dart
class CartState { final bool loading; final List<CartLine> lines; final String? error;
  const CartState({this.loading = false, this.lines = const [], this.error}); }

class CartController extends AutoDisposeNotifier<CartState> {
  @override CartState build() { ref.watch(cartRepositoryProvider).watchCart().listen((l) => state = state.copyWith(lines: l)); return const CartState(); }
  Future<void> add(String pid, int qty) async {
    state = state.copyWith(loading: true);
    final r = await ref.read(cartRepositoryProvider).addLine(pid, qty);
    state = switch (r) { Ok(value: final _) => state.copyWith(loading: false), Err(failure: final f) => state.copyWith(loading: false, error: f.message) };
  }
}
final cartControllerProvider = AutoDisposeNotifierProvider<CartController, CartState>(CartController.new);
```

## 5) Routing (go_router) + layar 5 state
```dart
final router = GoRouter(routes: [
  GoRoute(path: "/", builder: (c, s) => const CartScreen()),
  GoRoute(path: "/pay", builder: (c, s) => const PayScreen()),
]);

class CartScreen extends ConsumerWidget {
  @override Widget build(BuildContext context, WidgetRef ref) {
    final st = ref.watch(cartControllerProvider);
    if (st.loading) return const Center(child: CircularProgressIndicator());
    if (st.error != null) return ErrorView(message: st.error!);
    if (st.lines.isEmpty) return const EmptyView(label: "Keranjang kosong");
    return CartList(lines: st.lines);
  }
}
```
Layar list wajib: `loading | error | empty | data | pagination/filter`.
