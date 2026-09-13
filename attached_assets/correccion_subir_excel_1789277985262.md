# Fase 1.1 — Corrección de validaciones en la carga masiva de productores

## Contexto del problema

Al subir el archivo de prueba de 50 productores, el validador arroja **149 errores
bloqueantes y 50 advertencias**. Se hizo un diagnóstico fila por fila contra el
archivo real. El desglose exacto es:

| Causa | Conteo | ¿Es bug? |
|---|---|---|
| Teléfonos con espacios internos (`914 532 6574`) | 100 (50 filas × 2 columnas) | **SÍ.** Las 100 celdas dan exactamente 10 dígitos al limpiarlas. Son válidas, solo mal formateadas. |
| RFC con dígito verificador incorrecto | 49 | **NO.** El archivo de prueba es sintético con homoclaves aleatorias. El algoritmo módulo 11 fue verificado contra RFCs reales (`CFE370814QI0`, `SAT970701NN3`, `LAN7008173R5`, `AME880912I89`) y todos pasan. **No modifiques el algoritmo.** |
| `PRODUCER_IMPORT_DISTRICTS` sin definir | 50 advertencias | **NO.** Es configuración faltante. |

Todo lo demás valida limpio: headers, nombre de hoja, Cultivo, Estado, Zip Code,
Grower #, emails, RepresentanFC ni de Grower #.**SÍ.** Las 100 celdas dan exarlas. Son válidas, solo malformateadas. |
| RFC con dígito verificador incorrecto | 49 | **NO.** El archivo de prueba es sintético con homoclaves aleatorias. El algoritmo módulo 11 fue verificado contra RFCs reales (`CFE370814QI0`, `SAT970701NN2I89`) y todos pasan. **Nomodifiques el algoritmo.** |
| `PRODUCER_IMPORT_DISTRICTS` sin definir | 50 advertencias | **NO.** Es configuración
faltante. |

Todo lo demás valida limpio: ivo, Estado, Zip Code,
Grower #, emails, RepresentanFC ni de Grower #.

## Alcance — SOLO estos cambios

### 1. Normalizar teléfonos —t.ts`

El regex actual `/^\d+$/` rechaza cualquier separador. Nota: `.trim()` ya se aplica
a todas las celdas, así que eernos**, no de borde.

Agregar helper exportado junt

```ts
export function normalizePhon
  return String(value ?? "").replace(/\D/g, "");
}
```

Regla: si la celda no está vaamente 10 dígitos**
(formato nacional MX). No aceptar lada de país ni extensiones.

El mensaje de error debe incl
`"El teléfono debe tener 10 d

**Importante:** el valor normelta en la fila que se
empuja a `rows`, igual que yaben quedar 10 dígitos
sin espacios, no el texto ori

### 2. Desglosar el error de RFC — `lib/services/producer-import.ts`

Hoy las tres capas de validace genérico
("El RFC tiene formato o dígi que hace imposible
depurar desde la UI.

Extraer la lógica a `diagnoseode, message }` o `null`:

| code | Cuándo | Mensaje esperado |
|---|---|---|
| `INVALID_RFC_FORMAT` | No c-9]{3}` | Indicar longitud
recibida y caracteres inválid
| `INVALID_RFC_DATE` | AAMMDD20YY | Citar el AAMMDD recibido
|
| `INVALID_RFC_CHECKSUM` | Faficador incorrecto: se esperaba 2"` |

**`isValidMexicanRfc` debe coagnoseRfc(v) === null`).
Es API pública y `tests/impor29` la usa. Su
comportamiento no cambia: miss `true`/`false`.

**NO agregues whitelist para 1000`.** Un productor
del padrón nunca debe tener RFC genérico; el rechazo actual es correcto y hay un
test que lo verifica.

### 3. Numeración real de fil

`rowNumber = index + 2` asume pero
`sheet.eachRow()` de ExcelJS n el archivo de prueba
las filas 2-51 son contiguas tos por casualidad;
con huecos, "Fila 24" apuntaría a otra fila del Excel y el usuario no encontraría
qué corregir.

Usar `row.number` de ExcelJS SV). Agregar
`rowNumbers: number[]` a `Para `rows`, y sustituir
todos los `index + 2` por `ro

- `lib/services/producer-impommarizeValidation`
- `lib/db/index.ts:946` — `getProducerImportDatabaseIssues`, mismo patrón
- `app/api/admin/producers/import/route.ts` — el filtro `invalidRows.has(index + 2)`

Los tres están acoplados por s otros, se importan
filas equivocadas.

### 4. Filas fantasma

El archivo trae 1007 filas físicas; las 938-1007 son celdas con formato pero sin
contenido. ExcelJS las descartó, pero un espacio suelto en cualquiera de ellas la
convertiría en fila de datos IRED`.

Guardia explícita en ambas rueldas quedan vacías tras
`trim`, omitir la fila y **no

### 5. Advertencia de catálog

Hoy se emite una advertencia idéntica por fila (50 en total). Debe ser **una sola**
a nivel archivo. Además, sacaPRODUCER_IMPORT_DISTRICTS`
fuera del loop de filas — hoy

### 6. Configuración

En `.env.example`, poblar con datos reales:

```bash
PRODUCER_IMPORT_DISTRICTS="Jaa,Michoacan,Altos - Bajio"
```

(`fold()` ya normaliza acentooacán` y `MICHOACAN`
empatan.) Actualizar la nota :275`.

Advertencia: en cuanto la variable tenga valor, un distrito fuera de lista pasa de
advertencia a **error bloqueante**. Déjala documentada pero confirma el catálogo
oficial antes de activarla en

### 7. Tests — `tests/import/

Casos nuevos:
- `normalizePhone("914 532 653) 123-4567"` → 10 dígitos
- La fila importada conserva el teléfono **normalizado**, no el original
- `diagnoseRfc` devuelve los tres códigos por separado:
  `"XXXX"` → FORMAT · `"ABC99391P"` → CHECKSUM (espera `2`)
- Un xlsx con hueco entre fil de fila **real** de Excel
- Una fila totalmente vacía notalRows`

El caso existente `invalid[15llando (6 dígitos ≠ 10).
No lo modifiques.

### 8. Fixture para probar el camino feliz

El archivo de prueba actual n completo: 49 de 50 RFC
son inválidos por construccióomoclaves **recalculadas**
para que cumplan módulo 11, cespacios para ejercitar
la normalización. Resultado encias, 50 filas importadas.

No versiones ese archivo en e

## Invariantes que NO se pueden romper

- `requireAuth(["ADMIN"])` se de import
- Queries parametrizados — noo en SQL
- El upsert por RFC sigue en
- Comportamiento todo-o-nada
- Compatibilidad con Next.js
- No modificar migraciones ya aplicadas
- Sin datos mock en flujos operativos

## Fuera de alcance — NO tocar

- El algoritmo de módulo 11 drrecto)
- Aceptar lada de país o extensiones telefónicas (se rechazan a propósito)
- CVEs de Next.js, credencial, `/reports`
- Cualquier refactor de conveniencia no listado arriba

## Verificación antes de entr

```bash
npm run build
npx tsc --noEmit
node --test tests/import/prod
npm run test:auth && npm run
```

End-to-end en `/admin/producearchivo de 50 registros:

1. **Sin `PRODUCER_IMPORT_DISRFC, cada uno indicando
   el dígito esperado), **0 ea advertencia** de catálogo
2. **Con `PRODUCER_IMPORT_DIS9 errores, **0 advertencias**
3. **Fixture corregido** → 0  "Todo o nada" importa 50filas.
   Verificar en PostgreSQL que los teléfonos quedaron como 10 dígitos sin espacios
4. **"Descargar rechazos"** →correctos y el motivodesglosado
5. **Regresión:** archivo con filas en blanco → los números
   reportados coinciden con l

## Entrega

El repo **no usa ramas alternas**. Se trabaja directo sobre `main` y cada corte se
marca con un tag.

- Punto de partida: el tag `f, que ya marca el cierre
  de la fase. Todos tus commi
- Commits atómicos, uno por b RFC / numeración /
  filas fantasma / advertenciun commit monolítico:
  el punto 3 toca tres archivos acoplados y debe poder revisarse y revertirse solo.
- Al terminar, tag **anotado** (`-a`, no ligero — deja autor, fecha y mensaje para
  la trazabilidad de la audit

```bash
git tag -a fase-1.1-validacioalización de teléfono, desglose
de error RFC, numeración reale catálogo"
```

En el resumen final incluye:

```bash
git diff --stat fin-fase-1..f
git log --oneline fin-fase-1.
```

más la salida de los tests y ios de verificación.
El resumen debe coincidir con el diff real.