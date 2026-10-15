# FE Template — React (Redux Toolkit + TanStack Query + Zod)

Stack: React 19 + Vite/Next · Redux Toolkit (client state) · TanStack Query (server state) ·
Zod (validasi) · React Router · TypeScript strict. UI memakai **Domain Model**, bukan DTO.

## 1) Result + envelope types
```ts
// src/core/result.ts
export type Ok<T> = { ok: true; value: T };
export type Err = { ok: false; error: { code: string; message: string } };
export type Result<T> = Ok<T> | Err;

// src/core/api-client.ts  (semua response = Unified Envelope)
export type Envelope<T> = { success: boolean; code: string; message?: string; data: T; meta?: any; errors?: any[] };
export async function api<T>(path: string, init?: RequestInit): Promise<Result<T>> {
  const res = await fetch(`/api/v1${path}`, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = (await res.json()) as Envelope<T>;
  return body.success ? { ok: true, value: body.data } : { ok: false, error: { code: body.code, message: body.message ?? "Error" } };
}
```
> Mutasi wajib menyertakan header `X-Idempotency-Key: crypto.randomUUID()`.

## 2) Domain model + mapper (dari DTO)
```ts
// src/features/cart/domain/cart.ts
export interface CartLine { productId: string; name: string; price: number; qty: number; lineTotal: number }

// src/features/cart/data/cart.mapper.ts   (DTO -> Domain)
export const toCartLine = (d: CartLineDto): CartLine => ({
  productId: d.product_id, name: d.name, price: d.price, qty: d.quantity, lineTotal: d.price * d.quantity,
});
```

## 3) Redux slice (client state saja)
```ts
// src/features/cart/state/cartSlice.ts
interface CartState { lines: CartLine[] }
const slice = createSlice({
  name: "cart",
  initialState: { lines: [] } as CartState,
  reducers: {
    addLine(s, a: PayloadAction<CartLine>) { s.lines.push(a.payload); },
    removeLine(s, a: PayloadAction<string>) { s.lines = s.lines.filter((l) => l.productId !== a.payload); },
    clear(s) { s.lines = []; },
  },
});
export const { addLine, removeLine, clear } = slice.actions;
export default slice.reducer;
```

## 4) Server state (TanStack Query) + validasi Zod
```ts
// src/features/cart/data/useCheckout.ts
const CheckoutSchema = z.object({ clientReferenceId: z.string().uuid(), items: z.array(z.object({ productId: z.string().uuid(), qty: z.number().int().positive() })) });
export function useCheckout() {
  return useMutation({
    mutationFn: async (input: z.infer<typeof CheckoutSchema>) => {
      const parsed = CheckoutSchema.parse(input);           // validasi sebelum kirim
      return api<{ saleId: string; total: number }>("/sales", {
        method: "POST",
        headers: { "X-Idempotency-Key": parsed.clientReferenceId },
        body: JSON.stringify({ client_reference_id: parsed.clientReferenceId, items: parsed.items }),
      });
    },
  });
}
```

## 5) Component (5 UI state untuk layar list)
```tsx
export function CartScreen() {
  const { lines } = useSelector((s: RootState) => s.cart);
  const checkout = useCheckout();
  if (checkout.isPending) return <Spinner />;
  if (checkout.isError) return <ErrorView message={String(checkout.error)} />;
  if (lines.length === 0) return <EmptyView label="Keranjang kosong" />;
  return <CartList lines={lines} onCheckout={() => checkout.mutate(buildInput(lines))} />;
}
```
Layar list (dari `useQuery`) wajib menangani `isLoading | isError | data kosong | data | pagination/filter`.
