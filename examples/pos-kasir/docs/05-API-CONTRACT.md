# 05 - API Contract

> Base URL: /api/v1 | Version: v1 | Endpoint: 15 | Digenerate: 2026-10-15T07:14:40.969Z

## 1. Unified JSON Envelope
```json
{ "success": true, "code": "OK", "message": "string", "data": {}, "meta": { "request_id": "req_...", "timestamp": "2026-10-15T07:14:40.969Z" }, "errors": [] }
```

## 2. Katalog Endpoint (API-XX)
| API ID | Method & Path | Dipakai FE | Dilayani BE | FR | Errors |
|---|---|---|---|---|---|
| API-01 | POST /api/v1/auth/login | FE-01 | BE-01 | FR-01 | 400, 401, 422, 423 |
| API-02 | POST /api/v1/shifts/open | FE-02 | BE-02 | FR-02 | 401, 409, 422 |
| API-03 | POST /api/v1/shifts/close | FE-02 | BE-02 | FR-02 | 401, 409, 422 |
| API-04 | GET /api/v1/products | FE-03 | BE-03 | FR-03 | 401 |
| API-05 | POST /api/v1/products | FE-04 | BE-03 | FR-03 | 401, 409, 422 |
| API-06 | PATCH /api/v1/products/{id} | FE-04 | BE-03 | FR-03 | 401, 404, 409, 422 |
| API-07 | GET /api/v1/stock-movements | FE-07 | BE-04 | FR-04 | 401 |
| API-08 | POST /api/v1/stock-movements | FE-04 | BE-04 | FR-04 | 401, 422 |
| API-09 | POST /api/v1/sales | FE-05 | BE-05 | FR-05 | 401, 409, 422 |
| API-10 | POST /api/v1/sales/{id}/payments | FE-06 | BE-06 | FR-06 | 401, 404, 409, 422 |
| API-11 | POST /api/v1/sync/batch | FE-08 | BE-07 | FR-07 | 207, 401, 422 |
| API-12 | GET /api/v1/sync/status | FE-08 | BE-07 | FR-07 | 401 |
| API-13 | GET /api/v1/reports/sales | FE-09 | BE-08 | FR-08 | 401 |
| API-14 | GET /api/v1/users | FE-10 | BE-09 | FR-09 | 401 |
| API-15 | POST /api/v1/users | FE-10 | BE-09 | FR-09 | 401, 409, 422 |

## 3. Detail Query Params & Response
### API-01 - POST /auth/login
- Query params: -
- Auth roles: public
- Response:
```json
{"data":{"access_token":"string","refresh_token":"string","role":"string"},"meta":{}}
```

### API-02 - POST /shifts/open
- Query params: -
- Auth roles: Kasir
- Response:
```json
{"data":{"shift_id":"uuid","status":"OPEN"},"meta":{}}
```

### API-03 - POST /shifts/close
- Query params: -
- Auth roles: Kasir
- Response:
```json
{"data":{"shift_id":"uuid","status":"CLOSED","difference":"bigint"},"meta":{}}
```

### API-04 - GET /products
- Query params: name, page
- Auth roles: Admin, Kasir
- Response:
```json
{"data":[],"meta":{"page":1,"limit":20,"total":0}}
```

### API-05 - POST /products
- Query params: -
- Auth roles: Admin
- Response:
```json
{"data":{"product_id":"uuid"},"meta":{}}
```

### API-06 - PATCH /products/{id}
- Query params: -
- Auth roles: Admin
- Response:
```json
{"data":{"product_id":"uuid"},"meta":{}}
```

### API-07 - GET /stock-movements
- Query params: product_id, page
- Auth roles: Admin, Kasir
- Response:
```json
{"data":[],"meta":{"page":1,"limit":20,"total":0}}
```

### API-08 - POST /stock-movements
- Query params: -
- Auth roles: Admin, Kasir
- Response:
```json
{"data":{"movement_id":"uuid","stock_qty":"int"},"meta":{}}
```

### API-09 - POST /sales
- Query params: -
- Auth roles: Kasir
- Response:
```json
{"data":{"sale_id":"uuid","number":"string","total":"bigint","status":"string"},"meta":{}}
```

### API-10 - POST /sales/{id}/payments
- Query params: -
- Auth roles: Kasir
- Response:
```json
{"data":{"payment_id":"uuid","change_due":"bigint","status":"PAID"},"meta":{}}
```

### API-11 - POST /sync/batch
- Query params: -
- Auth roles: Kasir, Admin
- Response:
```json
{"data":{"results":[],"applied":"int","conflicts":"int"},"meta":{}}
```

### API-12 - GET /sync/status
- Query params: -
- Auth roles: Kasir, Admin
- Response:
```json
{"data":{"pending":"int","last_sync_at":"timestamp"},"meta":{"page":1,"limit":20,"total":0}}
```

### API-13 - GET /reports/sales
- Query params: created_at, page
- Auth roles: Admin, Owner
- Response:
```json
{"data":[],"meta":{"page":1,"limit":20,"total":0,"total_amount":0}}
```

### API-14 - GET /users
- Query params: name, page
- Auth roles: Admin
- Response:
```json
{"data":[],"meta":{"page":1,"limit":20,"total":0}}
```

### API-15 - POST /users
- Query params: -
- Auth roles: Admin
- Response:
```json
{"data":{"user_id":"uuid"},"meta":{}}
```
