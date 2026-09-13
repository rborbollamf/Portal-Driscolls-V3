# Fase 1.2 — Hacer visibles los productores importados en `/producers`

## Contexto del problema

La Fase 1.1 quedó bien: las 50 filas validan sin errores y **la importación sí escribe
en PostgreSQL**. Verificado en el código: `importProducerRows` (`lib/db/index.ts:864-924`)
hace `INSERT ... ON CONFLICT DO UPDATE` sobre `producers` y `legal_entities` más la
bitácora, todo dentro de `withTransaction` con `COMMIT` explícito
(`lib/db/index.ts:194-207`). No hay ruta de simulación. Confirmado también en pantalla:
los nombres importados aparecen en la lista.

El problema es que **solo se ven 10 de 55 productores** y los filtros no sirven para
encontrar el resto. Son tres defectos independientes en la capa de listado, ninguno
tocado por la Fase 1.1:


| #   | Defecto                                                                                                                                                                                                                          | Efecto                                                                                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| a   | `app/producers/page.tsx:17-24` nunca manda `page` ni `limit`; el API usa `limit=10` por defecto (`app/api/producers/route.ts:14-15`) y la página **descarta** el objeto `pagination` que sí recibe                               | Máximo 10 filas, sin controles ni contador. 45 productores invisibles y sin indicio de que existen |
| b   | El dropdown de Zona está hardcodeado a `Occidente/Bajío/Centro/Norte` (`page.tsx:83-87`), pero el import escribe `zona` = columna Distrito del Excel (`Jalisco`, `Puebla`, `Guanajuato`, `Colima`, `Michoacan`, `Altos - Bajio`) | Intersección vacía: filtrar por zona nunca devuelve un productor importado                         |
| c   | El dropdown de Estado ofrece `OK/RISK/FAIL`, pero el import escribe `status='PENDIENTE'` (`lib/db/index.ts:892`)                                                                                                                 | No se puede filtrar por los recién importados, aunque la insignia sí los pinta                     |


**Decisión tomada:** el filtro opera **por Distrito, poblado desde la BD**, no por las
macrorregiones hardcodeadas. Es el campo que trae el Excel de Driscoll's. La migración
006 ya creó la columna `distrito` separada de `zona`.

## Alcance — SOLO estos cambios



### 1. Paginación real — `app/producers/page.tsx`

El componente ya recibe todo lo necesario del API; simplemente lo descarta.

- Agregar estado `page` y mandarlo en la query junto con `limit`
- Guardar `data.pagination` (el API ya devuelve `{ page, limit, total, totalPages }`)
- Renderizar debajo de la tabla: anterior / siguiente, "Página X de Y" y el total de registros
- Selector de tamaño de página: 10 / 25 / 50 / 100

**Detalle crítico:** `page` debe **volver a 1 cada vez que cambia un filtro**. Hoy el
`useEffect` depende de `[filter]`; al agregar `page` a las dependencias, cambiar de
filtro estando en la página 4 dejaría una lista vacía sin explicación.

### 2. Filtro por Distrito poblado desde la BD

**Backend —** `lib/db/index.ts:283-297`**.** `getProducers` ya arma condiciones dinámicas
con valores parametrizados. Agregar `distrito` siguiendo **exactamente el mismo patrón**
(`values.push(...)` + `$${values.length}`).

**No concatenar la entrada del usuario en el SQL.** La invariante de queries
parametrizados aplica igual aquí.

**Backend —** `app/api/producers/route.ts`**.** Leer el nuevo `distrito` de `searchParams` y
pasarlo a `getProducers`.

**Catálogo — nuevo** `GET /api/producers/facets`**.** Con `requireAuth(["ADMIN","ANALYST","PRODUCER"])`,
devuelve los distritos existentes:

```sql
SELECT DISTINCT distrito FROM producers
 WHERE distrito IS NOT NULL AND btrim(distrito) <> ''
 ORDER BY distrito
```

**Para un** `PRODUCER` **debe acotarse a su propio expediente**, igual que ya hace la ruta de
listado con `auth.producerId`. Si no, el catálogo de distritos filtra la existencia de
otros productores y rompe el aislamiento.

**Frontend.** El `<select>` de Distrito se llena con esa respuesta. Sustituye al de Zona,
que sale de la UI.

### 3. Opción `PENDIENTE` en el filtro de Estado

Agregar la cuarta opción al dropdown de Estado. Además, darle color propio en
`getStatusColor` en vez de dejarlo caer al `default` gris — es el estado inicial de todo
lo importado y conviene distinguirlo de "sin estado".

### 4. Corregir el N+1 del listado — `app/api/producers/route.ts:22-32`

Por cada productor se disparan `getLegalEntities` y `getRanches`, y luego un `getCrops`
**por cada rancho**. Con `limit=10` son ~30 queries por carga; con el selector de 100 que
agrega el punto 1, pasa de 300. La paginación convierte un problema latente en uno real,
por eso entra en el alcance.

Sustituir por una sola consulta agregada sobre los ids de la página:

```sql
SELECT p.id,
       COUNT(DISTINCT le.id) AS legal_entities_count,
       COUNT(DISTINCT r.id)  AS ranches_count,
       COUNT(DISTINCT c.id)  AS crops_count
  FROM producers p
  LEFT JOIN legal_entities le ON le.producer_id = p.id
  LEFT JOIN ranches r         ON r.producer_id  = p.id
  LEFT JOIN crops c           ON c.ranch_id     = r.id
 WHERE p.id = ANY($1::text[])
 GROUP BY p.id
```

Los `LEFT JOIN` son obligatorios: los productores recién importados no tienen ranchos ni
cultivos y deben aparecer con 0, no desaparecer del listado.

## Invariantes que NO se pueden romper

- `requireAuth` en todas las rutas, incluida la nueva `/api/producers/facets`
- **Aislamiento de productor:** un `PRODUCER` solo ve su propio expediente, tanto en el
listado como en el catálogo de distritos. El acceso cruzado responde 404, no filtra existencia
- Queries parametrizados — nada de concatenar entrada de usuario en SQL
- No modificar migraciones ya aplicadas; si hiciera falta un índice, va en una migración nueva
- Compatibilidad con Next.js 14 / App Router / TypeScript



## Fuera de alcance — NO tocar

- `importProducerRows` ni ninguna ruta de `/api/admin/producers/import/**`.
**Ya funciona correctamente, está verificado.**
- La validación de RFC y teléfono de la Fase 1.1
- La semántica de la columna `zona` (ver deuda técnica abajo)
- `/reports`, CVEs de Next.js, credenciales demo, headers de seguridad
- Cualquier refactor de conveniencia no listado arriba



## Deuda técnica — documentar, no resolver

El import copia Distrito a **dos** columnas: `zona` (por el `NOT NULL` de
`001_initial_schema.sql:20`) y `distrito`. Quedan duplicadas con el mismo valor, y `zona`
pierde su semántica original de macrorregión — los 5 productores del seed la usan así,
los 50 importados no.

Déjalo anotado en el resumen para definirlo con Driscoll's: o se conserva `zona` como
macrorregión con una tabla de equivalencias Distrito → Zona, o se retira del modelo.
Mientras tanto la UI no la muestra.

Efecto colateral asumido: los 5 productores del seed tienen `distrito` en NULL, así que
no aparecen bajo ningún filtro de distrito. Sin filtro sí se listan. Es aceptable.

## Verificación antes de entregar

```bash
npm run build
npx tsc --noEmit
npm run test:auth && npm run test:monitoring
npm audit
```

En `/producers` como ADMIN, con los 55 productores en BD:

1. Carga inicial → contador visible "55 productores", 10 filas, "Página 1 de 6"
2. Ir a la última página → se ven los productores hoy invisibles (final alfabético, `Y…`/`Z…`)
3. Tamaño de página a 100 → una sola página con los 55
4. Filtrar por distrito: `Guanajuato` → 12 · `Puebla` → 10 · `Jalisco` → 9 ·
  `Colima` → 8 · `Michoacan` → 6 · `Altos - Bajio` → 5
5. Estando en la página 3, cambiar de filtro → vuelve a la página 1 **con resultados**,
  no a una lista vacía
6. Filtrar por estado `PENDIENTE` → 50 resultados (los importados), ninguno del seed
7. Un productor importado muestra **1** en "Razones Sociales" (el import crea su
  `legal_entity`) y 0 en ranchos y cultivos
8. **Aislamiento:** iniciar sesión como `PRODUCER` y confirmar que `/api/producers` y
  `/api/producers/facets` solo devuelven su propio expediente y su propio distrito
9. Contar queries de una carga con `limit=100` → número constante (~3), no ~300



## Entrega

El repo **no usa ramas alternas**. Commits directos sobre `main`, atómicos, uno por punto
del alcance (paginación / filtro distrito / estado PENDIENTE / N+1).

Al terminar, tag **anotado**:

```bash
git tag -a fase-1.2-listado-productores -m "Fase 1.2: paginación en /producers, filtro por distrito desde BD, estado PENDIENTE, corrección del N+1 en el listado"
```

En el resumen final incluye:

```bash
git diff --stat <tag-de-la-fase-1.1>..fase-1.2-listado-productores
git log --oneline <tag-de-la-fase-1.1>..fase-1.2-listado-productores
```

más la salida de los tests y capturas de los 9 escenarios. El resumen debe coincidir con
el diff real.