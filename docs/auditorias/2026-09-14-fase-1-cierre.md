# Cierre — Fase 1: carga masiva + validaciones

**Fecha:** 2026-09-14
**Rango:** `30600b6..d306616` (6 commits)
**Corrige:** [auditoría del 2026-09-14](2026-09-14-fase-1.md) · [prompt de correcciones](2026-09-14-fase-1-correcciones.md)

> El tag `fase-1.3-correcciones-auditoria` existe en el entorno de Replit pero **no se subió a GitHub**, así que esta auditoría se hizo por rango de commits. Ver N-5.

---

## Veredicto: FASE 1 CERRADA

Las cinco correcciones bloqueantes están aplicadas. Cuatro limpias, una parcial (M-1) que no afecta ningún criterio de aceptación. **Los nueve criterios de la Fase 1 quedan cumplidos y, por primera vez, verificados contra una base de datos real.**

---

## Lo que cambió respecto a la auditoría anterior

La diferencia de fondo no es solo que Replit corrigió: es que **se levantó PostgreSQL localmente en Docker**, así que dejaron de existir los «fallos ambientales» que arrastrábamos sin poder distinguir de defectos reales.

| Comprobación | Auditoría anterior | Cierre |
|---|---|---|
| `test:auth` | 12 / 15 | **14 / 15** |
| `test:monitoring` | 12 / 13 | **13 / 13** |
| `test:import` | 19 / 20 | **20 / 20** |
| `test:producers` | 7 / 7 | **7 / 7** |
| **Total** | 50 / 55 | **54 / 55** |

El único fallo real es **M-5**: `tests/auth/producer-association.test.ts:66` lee `data/db.json`, archivo que no existe en un clon limpio.

---

## Estado de las cinco correcciones

| | Hallazgo | Estado |
|---|---|---|
| **C-1** | Catálogo de distritos incompleto | **CUMPLE, demostrado** |
| **A-1** | Colisión de `Grower #` — criterio (i) | **CUMPLE, demostrado** |
| **A-2** | Lockfile atado a Replit | **CUMPLE, verificado** |
| **M-1** | Scripts de test | **PARCIAL** — ver N-1 |
| **M-3** | Error crudo de Postgres | **CUMPLE** |

### C-1 — corregido, y el impacto era exactamente el calculado

`.env.example:31` y `README.md:275` ya publican los seis distritos. Se conserva la advertencia de confirmarlos contra el catálogo oficial de Driscoll's.

Ejecutado contra el archivo de 50 registros:

| Escenario | Resultado |
|---|---|
| Sin `PRODUCER_IMPORT_DISTRICTS` | 50 válidas, 0 errores, **1 advertencia** |
| Con los seis distritos | 50 válidas, **0 errores, 0 advertencias** |
| Con el catálogo incompleto anterior | **30 de 50 bloqueadas** |

El tercer renglón confirma el hallazgo original: las 30 filas que se predijeron por conteo son exactamente las que el validador rechazaba.

### A-1 — se implementaron los dos caminos, no uno

`lib/db/index.ts:941` toma `pg_advisory_xact_lock(hashtext('producer_bulk_import'))` al abrir la transacción, **y además** re-ejecuta la verificación de conflictos dentro de la transacción, lanzando `ProducerImportConflictError`. El lock cierra import-contra-import; la re-verificación atrapa lo que otro escritor haya confirmado antes del lock.

Se corrigió además un bug latente que no estaba reportado: la verificación previa comparaba `numero_productor` crudo contra la entrada cruda, mientras el índice único es sobre `btrim(numero_productor)`. Ahora ambos lados normalizan, y el RFC pasa por `trim().toUpperCase()`. Un `Grower #` con espacios habría burlado la verificación y reventado en el insert.

**Prueba ejecutada con PostgreSQL real:**

```
ok 1 - concurrent imports serialize Grower number ownership without silent data loss
# pass 1  fail 0
```

Lanza dos `importProducerRows` concurrentes con `Promise.allSettled` y verifica que exactamente una triunfe, que la otra falle con código `EXISTING_GROWER_NUMBER`, que el número de fila reportado sea el físico, y que solo quede un productor con ese `Grower #`.

**El criterio (i) queda demostrado, no solo revisado.**

### A-2 — verificado de extremo a extremo

```
grep -c "package-firewall.replit" package-lock.json   →  0
609 de 609 entradas "resolved"                        →  registry.npmjs.org
npm ci desde cero                                      →  556 paquetes, exit 0
```

Comparación paquete por paquete entre los dos lockfiles: **0 versiones movidas, 0 añadidos, 0 eliminados**. Es exactamente un cambio de URLs, como se pidió. `package.json` solo sumó los tres scripts.

Efecto secundario positivo: `@types/node` queda fijado en 22.10.2 por lockfile, así que **desaparece el pin manual** que antes exigía el procedimiento de auditoría local.

### M-3 — saneo correcto y con la distinción pedida

`lib/services/producer-import-response.ts` separa tres casos:

- `ProducerImportBusinessError` → 400 conservando su mensaje específico (extensión inválida, archivo vacío, hoja mal nombrada, CSV mal formado)
- `ProducerImportConflictError` → 422 con el detalle por fila
- Cualquier otra excepción → 500 genérico con `correlationId`, y la traza completa al log del servidor

---

## Verificación con base de datos real

Se levantó PostgreSQL 16 en Docker. Procedimiento completo en el [README de esta carpeta](README.md).

**Migraciones:** las seis aplican limpias sobre base vacía, incluida la 006 con sus tres índices únicos.

**Importación real del archivo de 50 registros:**

```
created: 50, updated: 0, imported: 50
```

```
productores | pendientes | tel_10_digitos | cel_10_digitos | tel_con_basura
         50 |         50 |             50 |             50 |              0

razones_sociales: 50
Guanajuato 12 · Puebla 10 · Jalisco 9 · Colima 8 · Michoacan 6 · Altos - Bajio 5

audit_logs: PRODUCER_BULK_IMPORT | creados=50 | recibidos=50
```

Las 100 celdas de teléfono quedaron con exactamente 10 dígitos y cero caracteres no numéricos: **la normalización persiste, no solo valida**.

**Idempotencia (criterio e):** segunda corrida idéntica → `created: 0, updated: 50`, sin filas duplicadas y sin `legal_entities` de más.

---

## Hallazgos nuevos

### MEDIO

**N-1 · El agregador `npm test` nunca llega a las pruebas nuevas**

```
> npm run test:auth && npm run test:monitoring && npm run test:import && npm run test:producers
# tests 15  pass 14  fail 1      ← aborta aquí
```

Los `&&` cortan en la primera suite. Con base de datos real, lo único que la hace fallar es **M-5**, así que N-1 y M-5 son el mismo problema: arreglando M-5, `npm test` queda en verde y las 27 pruebas nuevas sí corren en CI. Hoy no corren, que es justo lo que M-1 debía evitar.

Se agrava porque la prueba de integración de concurrencia falla duro sin PostgreSQL en vez de omitirse.

**N-2 · `tsconfig.json` fuera de alcance, con un valor que Next revierte solo**

Se commiteó `"jsx": "react-jsx"`. Ejecutar `npm run build` con Next 14.2.35 lo reescribe de vuelta a `"preserve"`:

```diff
-    "jsx": "react-jsx",
+    "jsx": "preserve",
```

**Cualquier desarrollador que compile queda con el árbol sucio.** También se añadió `.next/dev/types/**/*.ts` al `include`, ruta de Next 15/16 en un proyecto Next 14. El resto es reformateo a una propiedad por línea.

**N-4 · Afirmación sin verificar sobre el firewall de Replit**

Replit reescribió la entrada de memoria compartida e introdujo:

> A public lockfile does not guarantee `npm ci` can run inside Replit. Replit's package firewall blocks the pinned Next.js 14 release because of its critical CVE.

Si es cierto, la corrección de A-2 arregló el entorno externo y rompió el interno. Se verificó que `npm ci` funciona fuera de Replit; no se puede verificar lo contrario. **Confirmar con Replit antes de planear la contenerización.**

También suavizó la afirmación sobre los distritos, de «el catálogo real tiene seis» a «seis valores observados, pendientes de confirmación oficial». Ese cambio es correcto y se acepta: los seis se dedujeron del archivo de prueba, no de Driscoll's.

**N-5 · El tag no está en GitHub**

`fase-1.3-correcciones-auditoria` no existe en `origin`. `git push` no envía tags:

```bash
git push origin fase-1.3-correcciones-auditoria
```

### BAJO

| Id | Hallazgo |
|---|---|
| N-3 | `CLAUDE.md` contaminado con el bloque `nextjs-agent-rules`, inyectado por `next dev`, que apunta a `node_modules/next/dist/server/lib/generate-agent-files.js` — archivo inexistente en Next 14.2.35. Ruido de herramienta dentro del archivo que lleva las invariantes del proyecto |
| N-6 | `import/route.ts:38-40` recalcula `invalidRows`, que `filterValidImportRows` ya calcula internamente, y filtra `rowNumbers` por valor mientras la otra filtra por índice. Equivalentes solo porque los `rowNumbers` son únicos |
| N-7 | La prueba de integración no cierra el pool: el runner queda colgado ~30 s tras pasar (`duration_ms: 30696` para un test de 88 ms) |
| N-8 | La prueba de concurrencia exige un ADMIN preexistente y aborta si no lo hay. Necesita base sembrada, no solo migrada |

### Deriva de esquema — hueco de proceso identificado

`schema_migrations` registra **solo el nombre del archivo, sin checksum**. Si alguien edita una migración ya aplicada, el runner la salta en silencio y las bases divergen sin aviso. Lo que hoy nos protege es la revisión del diff de `db/migrations/` en cada auditoría: una defensa de proceso, no del código.

Más grave: un cambio hecho **directamente contra la base de Replit** sin escribir migración no deja rastro en git y es indetectable desde el repositorio. El riesgo va en la dirección peligrosa — su base tendría una columna que las migraciones no crean, su aplicación funciona, y el despliegue limpio a AWS revienta.

**Mitigación adoptada:** se versiona `db/schema.sql`, generado con `pg_dump --schema-only` sobre una base creada solo con las migraciones. A partir de ahora es requisito de entrega de cada fase que Replit regenere ese archivo desde su base; cualquier cambio fuera de banda aparece como diff. Procedimiento en el [README](README.md).

---

## Estado final de los criterios de la Fase 1

| | Criterio | Estado |
|---|---|---|
| a | Carga masiva solo ADMIN | **CUMPLE** |
| b | Parsing en servidor, 19 columnas | **CUMPLE** |
| c | Validación fila por fila antes de escribir | **CUMPLE, demostrado** |
| d | Todo-o-nada o solo válidas | **CUMPLE** |
| e | Upsert idempotente, transacción, lotes | **CUMPLE, demostrado** |
| f | Bitácora de la importación | **CUMPLE, demostrado** |
| g | Plantilla .xlsx con encabezados exactos | **CUMPLE** |
| h | `/reports` sin datos demo | **CUMPLE con reserva** — diferido tras `STAGE_2_ENABLED`, no reconectado |
| i | Dos importaciones simultáneas | **CUMPLE, demostrado** |

Invariantes del `CLAUDE.md`: sin cambios respecto a la auditoría anterior. Ninguna migración alterada, cero secretos en el diff, `requireAuth` intacto, queries parametrizados, `npm audit` idéntico (23 vulnerabilidades, sin CVE nuevo).

---

## Pendientes, ninguno bloqueante

1. **M-5 / N-1** — que `npm test` pueda quedar en verde. Es el arreglo de mayor retorno: desbloquea 27 pruebas en CI.
2. **N-2** — revertir `tsconfig.json`; ensucia el árbol de todos en cada build.
3. **N-5** — subir el tag.
4. **N-4** — confirmar si el firewall de Replit bloquea Next 14.2.35.
5. **N-3, N-6, N-7, N-8** — limpieza, pueden ir con la Fase 2.

Prompt con estos puntos: [`2026-09-14-fase-1-pendientes.md`](2026-09-14-fase-1-pendientes.md).
