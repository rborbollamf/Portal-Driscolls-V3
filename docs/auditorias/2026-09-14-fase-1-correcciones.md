# Fase 1.3 — Correcciones de la auditoría de la Fase 1

> Prompt para Replit. Copiar íntegro.
> Informe completo del que salen estos hallazgos: [`2026-09-14-fase-1.md`](2026-09-14-fase-1.md).

---

## Contexto

Se auditó el rango `base-fase-1..fase-1.1-validaciones-import` (`295a362..d9e9cb8`) contra los criterios de aceptación de la Fase 1 del `CLAUDE.md`. Veredicto: **con cambios**.

Lo que está bien y **no hay que tocar**: los 9 criterios están implementados, 7 cumplen limpio. `requireAuth` en las 5 rutas nuevas, queries parametrizados, aislamiento de productor intacto, ninguna migración alterada, cero secretos, build limpio, 24/24 pruebas nuevas pasando.

Bloquean el cierre 5 hallazgos. Este prompt los cubre y nada más.

## Alcance — SOLO estos cambios

### 1. [C-1 · CRÍTICO] Completar el catálogo de distritos

`.env.example:31` y `README.md:275` publican 3 de los 6 distritos reales del padrón. Faltan **Guanajuato**, **Puebla** y **Colima**.

Mientras `PRODUCER_IMPORT_DISTRICTS` está vacía, `producer-import.ts:143` solo advierte. En cuanto se define, `:154` convierte todo distrito fuera de lista en **error bloqueante**. Con el valor actual, 30 de 50 registros de prueba dejan de poder cargarse.

```bash
PRODUCER_IMPORT_DISTRICTS="Jalisco,Puebla,Guanajuato,Colima,Michoacan,Altos - Bajio"
```

Conteo observado en el archivo real de 50 productores:

```
Guanajuato 12 · Puebla 10 · Jalisco 9 · Colima 8 · Michoacan 6 · Altos - Bajio 5
```

Actualizar el valor y el comentario en `.env.example`, y la nota de `README.md:275`, que repite la lista corta. Mantener la advertencia de que el catálogo debe confirmarse contra el oficial de Driscoll's antes de activarse en un entorno.

### 2. [A-1 · ALTO] Manejar la colisión de `Grower #` en la escritura

**Este es el criterio (i) de la Fase 1 y hoy no se cumple.**

`db/migrations/006_producer_bulk_import.sql:56` crea `producers_grower_number_uq` sobre `btrim(numero_productor)`, pero el upsert de `lib/db/index.ts:948` solo declara `ON CONFLICT (upper(btrim(rfc)))`. La única defensa es la lectura previa de `getProducerImportDatabaseIssues` (`lib/db/index.ts:1010-1018`), que ocurre **fuera** de la transacción de escritura: TOCTOU.

Escenario que rompe: dos importaciones simultáneas con distinto RFC y el mismo `Grower #`. Ambas pasan la verificación previa; la segunda revienta con violación de unicidad al insertar. Como todo va en una sola transacción, se pierden las 900 filas de esa importación.

Dos caminos aceptables, elige uno y justifícalo en el resumen:

- **Serializar la importación** con `pg_advisory_xact_lock` sobre un identificador fijo del padrón, al inicio de la transacción de `importProducerRows`. Simple y suficiente: las importaciones masivas no necesitan concurrencia real entre sí.
- **Manejar el segundo índice** capturando la violación de `producers_grower_number_uq` y convirtiéndola en un `ImportError` con el número de fila físico, en vez de dejar que aborte la transacción.

**No** se resuelve moviendo la verificación previa dentro de la transacción: eso reduce la ventana pero no la cierra.

Agregar una **prueba de integración** que lance dos importaciones concurrentes con distinto RFC y el mismo `Grower #`, y verifique que ninguna pierde datos silenciosamente.

### 3. [A-2 · ALTO] Regenerar el `package-lock.json` contra el registro público

139 de las 609 entradas `resolved` apuntan a `package-firewall.replit.local` y `.replit.internal`, hosts que no resuelven fuera de Replit:

```
"resolved": "http://package-firewall.replit.local/npm/..."
"resolved": "http://package-firewall.replit.internal/npm/..."
```

En cualquier otra máquina `npm ci` falla con `ENOTFOUND`. Rompe el Dockerfile multi-stage y el despliegue a ECS/Fargate de la Fase 5, cuyo criterio pide literalmente «sin ataduras a Replit». Viene de `dad7f6b`, pero cada commit lo arrastra.

Regenerar apuntando a `https://registry.npmjs.org` y versionar ese lockfile. **Sin cambiar ninguna versión de `package.json`**: es un cambio de URLs, no de dependencias. Verificar que el diff no mueva versiones instaladas.

Criterio de aceptación: `grep -c "package-firewall.replit" package-lock.json` devuelve `0`.

### 4. [M-1 · MEDIO] Scripts de npm para las suites nuevas

`package.json:11-12` solo define `test:auth` y `test:monitoring`. Las 24 pruebas de `tests/import/**` y `tests/producers/**` —las que protegen esta fase— quedan fuera y no correrán en CI.

Agregar `test:import`, `test:producers` y un `test` agregador que encadene las cuatro suites.

### 5. [M-3 · MEDIO] Dejar de devolver el error crudo de Postgres

`app/api/admin/producers/import/route.ts:59`:

```ts
return NextResponse.json({ error: error instanceof Error ? error.message : "Import failed" }, { status: 400 });
```

Cualquier excepción de BD expone nombres de índices y de columnas. El endpoint es solo-ADMIN, así que el impacto es bajo, pero es divulgación innecesaria y deja al usuario con un mensaje inservible.

Registrar el detalle completo en el log del servidor y devolver al cliente un mensaje genérico más un identificador de correlación que permita encontrar la traza.

Distinguir los errores de negocio ya existentes —extensión no permitida, archivo vacío, límite de 25 MB, hoja mal nombrada— que **sí** deben conservar su mensaje actual, de las excepciones inesperadas, que son las que hay que ocultar.

## Invariantes que NO se pueden romper

- `requireAuth` en las 5 rutas de import y facetas
- Aislamiento de productor: un `PRODUCER` solo ve su expediente; acceso cruzado responde 404
- Queries parametrizados — nada de concatenar entrada de usuario en SQL
- No modificar migraciones ya aplicadas; si hace falta algo en BD, va en `007_*.sql`
- El upsert sigue en transacción; comportamiento todo-o-nada intacto
- Sin datos mock en flujos operativos
- Compatibilidad con Next.js 14 / App Router / TypeScript

## Fuera de alcance — NO tocar

- El algoritmo de módulo 11 del RFC — verificado correcto contra RFCs reales del SAT
- La validación de teléfono y el desglose de errores de RFC de la Fase 1.1
- La paginación y el filtro por distrito de la Fase 1.2
- `/reports` y `lib/data/demoData.ts` — el diferimiento tras `STAGE_2_ENABLED` cumple el criterio; el banner de datos demo va en otra fase
- Los CVEs de `npm audit`, incluida la crítica de Next.js — se cierran con la subida de versión, que es su propio trabajo
- Cualquier refactor de conveniencia no listado arriba

## Verificación antes de entregar

```bash
grep -c "package-firewall.replit" package-lock.json   # debe dar 0
npm ci                                                # debe funcionar desde cero
npm run build
npx tsc --noEmit
npm test                                              # las cuatro suites
npm audit
```

Funcional, en `/admin/producer-import` como ADMIN:

1. Archivo de 50 registros **sin** `PRODUCER_IMPORT_DISTRICTS` → 0 errores, 1 advertencia de catálogo
2. Archivo de 50 registros **con** la variable completa de 6 distritos → **0 errores, 0 advertencias**, importa 50 filas
3. Un archivo con un distrito inventado y la variable definida → error bloqueante solo en esa fila
4. Dos importaciones concurrentes con distinto RFC y el mismo `Grower #` → ninguna pierde datos en silencio; el usuario ve un error entendible con el número de fila, no un mensaje de Postgres
5. Forzar una excepción inesperada en la ruta de import → el cliente recibe mensaje genérico con identificador de correlación; el detalle aparece en el log del servidor
6. Los errores de negocio existentes (extensión inválida, archivo vacío, >25 MB) siguen mostrando su mensaje específico

## Entrega

El repo **no usa ramas alternas**. Commits directos sobre `main`, **atómicos, uno por punto del alcance** — el punto 2 y el punto 3 deben poder revisarse y revertirse por separado.

Al terminar, tag **anotado**:

```bash
git tag -a fase-1.3-correcciones-auditoria \
  -m "Fase 1.3: catálogo de distritos completo, colisión de Grower # en concurrencia, lockfile público, scripts de test, saneo de errores del import"
```

En el resumen final incluye:

```bash
git diff --stat fase-1.1-validaciones-import..fase-1.3-correcciones-auditoria
git log --oneline fase-1.1-validaciones-import..fase-1.3-correcciones-auditoria
```

más la salida de los comandos de verificación y capturas de los 6 escenarios funcionales. El resumen debe coincidir con el diff real.
