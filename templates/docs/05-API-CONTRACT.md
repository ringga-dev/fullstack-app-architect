<!--
TEMPLATE: docs/05-API-CONTRACT.md  (Agen #5)
INSTRUKSI: Setiap endpoint = API-XX. WAJIB mengisi consumed_by_fe (FE-XX) dan served_by_be (BE-XX).
Footer JSON envelope WAJIB identik untuk semua endpoint.
-->
# 05 — API Contract

## 1. Protokol & Global Envelope
- Base URL: {{/api/v1}} | Auth: {{JWT Bearer}}
```json
{ "success": false, "code": "ERR_EXAMPLE", "message": "...", "data": null,
  "meta": { "request_id": "req_...", "timestamp": "2026-01-01T00:00:00Z" },
  "errors": [ { "field": "items[0].quantity", "reason": "..." } ] }
```

## 2. Katalog Endpoint
| API ID | Method & Path | Role | Dipakai (FE) | Dilayani (BE) | Deskripsi |
|---|---|---|---|---|---|
| API-01 | POST /api/v1/{{orders}} | {{Cashier}} | FE-01 | BE-01 | {{...}} |

## 3. Detail per Endpoint
### API-01 — {{METHOD}} {{/path}}
- Headers: `Authorization: Bearer <token>`{{, `X-Idempotency-Key: <uuid>`}}
- Request:
```json
{{...}}
```
- Response 200/201:
```json
{ "success": true, "code": "OK", "data": {{...}}, "meta": {} }
```
- Errors: {{400, 401, 403, 404, 409, 422}}

## STATE OUTPUT
```json
{
  "api_state": {
    "base_url": "/api/v1",
    "version": "v1",
    "envelope": { "success": true, "code": "string", "message": "string", "data": {}, "meta": {}, "errors": [] },
    "endpoints": [
      { "id": "API-01", "method": "POST", "path": "/{{orders}}", "maps_to_fr": ["FR-01"],
        "consumed_by_fe": ["FE-01"], "served_by_be": ["BE-01"], "auth_roles": ["{{...}}"],
        "request_body": {}, "response_envelope": { "data": {}, "meta": {} }, "errors": [400,409,422] }
    ]
  }
}
```
