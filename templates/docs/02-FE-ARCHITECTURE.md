<!--
TEMPLATE: docs/02-FE-ARCHITECTURE.md  (Agen #2)
INSTRUKSI: Setiap layar = satu baris FE-XX. WAJIB mencantumkan FR-XX yang dipenuhi.
WAJIB punya 5 UI state standar: loading, data, empty, error, + (pagination/filter bila ada list).
-->
# 02 — FE Architecture

## 1. Tech Stack & Pattern
- UI: {{...}} | Pattern: {{...}} | DI: {{...}} | Network: {{...}} | Nav: {{...}} | LocalDB: {{...}}

## 2. Struktur Folder (Concrete Tree)
```text
{{...}}
```

## 3. Kontrak State (template)
```kotlin
// Ganti sesuai bahasa/framework. Wajib: Immutable State + sealed Intent + 1x Effect.
data class {{Feature}}UiState(val isLoading: Boolean = false, val data: {{Model}}? = null, val error: String? = null)
sealed interface {{Feature}}Intent { data object Load : {{Feature}}Intent }
sealed interface {{Feature}}Effect { data class ShowError(val message: String) : {{Feature}}Effect }
```

## 4. Pemetaan Layar (FE-XX)
| FE ID | Layar | Memenuhi FR | Layout Mobile | Layout Tablet/Desktop | UI States | Endpoint (API-XX) |
|---|---|---|---|---|---|---|
| FE-01 | {{...}} | FR-01 | {{...}} | {{...}} | loading,data,empty,error | API-01 |

> Setiap FR `MUST` HARUS muncul minimal sekali di kolom "Memenuhi FR".

## STATE OUTPUT
```json
{
  "fe_state": {
    "tech_stack": "{{...}}",
    "architecture_pattern": "{{...}}",
    "platforms": ["{{...}}"],
    "screens": [
      { "id": "FE-01", "name": "{{...}}", "satisfies_fr": ["FR-01"], "ui_states": ["loading","data","empty","error"], "consumes_api": ["API-01"], "critical_business_logic": false, "uses_orm_in_ui": false, "has_domain_layer": true }
    ]
  }
}
```
