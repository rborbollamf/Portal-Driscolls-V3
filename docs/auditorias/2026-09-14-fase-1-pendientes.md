# Fase 1.4 — Pendientes del cierre de la Fase 1

> Prompt para Replit. Copiar íntegro.
> Origen: [informe de cierre](2026-09-14-fase-1-cierre.md).

---

## Contexto

La Fase 1 **está cerrada**: los nueve criterios de aceptación se cumplen y se verificaron contra una base de datos PostgreSQL real. Las cinco correcciones bloqueantes quedaron aplicadas.

Nada de lo que sigue bloquea la fase. Son pendientes de higiene, y el primero tiene retorno alto: hoy 27 pruebas no corren en CI.

**No toques nada fuera de esta lista.** En particular: el algoritmo de módulo 11 del RFC, la normalización de teléfono, la concurrencia del import, la paginación, `/reports` y `demoData.ts` están fuera de alcance y funcionando.

## Alcance

### 1. [M-5 + N-1] Que `npm test` pueda quedar en verde

Este es el punto de mayor retorno del lote.

`npm test` encadena las cuatro suites con `&&` y **aborta en la primera**, así que `test:import` y `test:producers` —las 27 pruebas que protegen la Fase 1— nunca se ejecutan. Con base de datos real, lo único que hace fallar a `test:auth` es una sola prueba:

```
tests/auth/producer-association.test.ts:66  →  ENOENT: data/db.json
```

Ese archivo no existe en un clon limpio. El `CLAUDE.md` lo declara **solo fuente histórica de importación**, así que la prueba nunca podrá pasar en CI.

Dos cosas que arreglar:

- **Omitir, no fallar**, cuando el insumo no está: si `data/db.json` no existe, la prueba se marca como omitida (`test.skip` o el mecanismo equivalente de `node:test`), no como fallo.
- **Mismo criterio para la prueba de integración de concurrencia**: si no hay `DATABASE_URL` alcanzable, debe omitirse con un mensaje claro, no reventar con `ECONNREFUSED`. Hoy hace imposible que `npm test` pase en cualquier entorno sin base.

Criterio de aceptación: `npm test` termina con código 0 **sin** base de datos (omitiendo lo que la requiere) y con código 0 **con** base de datos (ejecutando todo). En ambos casos deben reportarse las cuatro suites.

### 2. [N-2] Revertir `tsconfig.json`

Se commiteó `"jsx": "react-jsx"`. Next 14.2.35 lo reescribe a `"preserve"` en cada `npm run build`, así que **todo desarrollador que compile queda con el árbol sucio**. Verificado:

```diff
-    "jsx": "react-jsx",
+    "jsx": "preserve",
```

- Restaurar `"jsx": "preserve"`.
- Quitar `.next/dev/types/**/*.ts` del `include`: es una ruta de Next 15/16 y este proyecto está en Next 14.2.35.
- El reformateo a una propiedad por línea es indiferente; consérvalo o revviértelo, pero deja el archivo estable frente a `next build`.

### 3. [N-5] Subir el tag

`fase-1.3-correcciones-auditoria` existe en tu entorno pero **no está en GitHub**. `git push` no envía tags:

```bash
git push origin fase-1.3-correcciones-auditoria
```

Confirma con `git ls-remote --tags origin`.

### 4. [N-4] Confirmar el comportamiento del firewall de Replit

En la memoria compartida quedó escrito que el firewall de paquetes de Replit bloquea Next 14.2.35 por su CVE crítica, y que por eso `npm ci` podría no funcionar dentro de Replit aunque todas las URLs del lockfile sean públicas.

Se verificó que `npm ci` **sí funciona fuera de Replit** (556 paquetes, exit 0). Falta confirmar la otra mitad:

- ¿`npm ci` funciona hoy dentro de Replit con el lockfile público? Pega la salida.
- Si no funciona, ¿cuál es el mensaje exacto del firewall?

Esto condiciona el plan de contenerización de la Fase 5, así que necesita un dato, no una suposición.

### 5. [Nuevo requisito] Snapshot de esquema por fase

Se adoptó un mecanismo para detectar cambios hechos directamente contra la base sin pasar por una migración, que hoy son invisibles desde el repositorio.

Ya está versionado `db/schema.sql`, generado desde una base creada **solo con las migraciones**. A partir de ahora, **al cerrar cada fase debes regenerarlo desde tu base y commitearlo**:

```bash
pg_dump "$DATABASE_URL" --schema-only --no-owner --no-privileges \
  | grep -vE '^\\(restrict|unrestrict)' > db/schema.sql
```

El `grep` es necesario: `pg_dump` emite una línea `\restrict` con un token aleatorio en cada corrida, que haría ruido en todos los diffs.

Si el archivo no cambia, tu base es exactamente lo que producen las migraciones. Si cambia, el diff muestra el cambio fuera de banda — y entonces hay que escribir la migración que falta.

### 6. [N-3, N-6, N-7, N-8] Limpieza menor

- **N-3** — Quitar el bloque `<!-- BEGIN:nextjs-agent-rules -->` de `CLAUDE.md`. Lo inyecta `next dev` y apunta a `node_modules/next/dist/server/lib/generate-agent-files.js`, que no existe en Next 14.2.35. Si reaparece al correr `next dev`, añádelo a `.gitignore` o quítalo antes de commitear: ese archivo lleva las invariantes del proyecto y no debe cargar ruido de herramienta.
- **N-6** — `app/api/admin/producers/import/route.ts:38-40` recalcula `invalidRows`, que `filterValidImportRows` ya calcula internamente, y filtra `rowNumbers` por valor mientras la otra filtra por índice. Son equivalentes solo porque los `rowNumbers` son únicos. Unificar en un solo helper que devuelva filas y números ya filtrados en paralelo.
- **N-7** — La prueba de integración no cierra el pool: el runner queda colgado ~30 s tras pasar, para un test de 88 ms. Cerrar el pool en un `after`.
- **N-8** — La prueba de concurrencia exige un ADMIN preexistente y aborta si no lo hay. Documentarlo, o que cree y limpie su propio usuario de fixture.

## Invariantes que NO se pueden romper

- `requireAuth` en todas las rutas API
- Aislamiento de productor: acceso cruzado responde 404
- Queries parametrizados
- No modificar migraciones ya aplicadas; lo nuevo va en `007_*.sql`
- El upsert sigue en transacción, con el advisory lock y la re-verificación de conflictos
- Sin datos mock en flujos operativos
- Compatibilidad con Next.js 14 / App Router / TypeScript

## Verificación antes de entregar

```bash
npm ci
npm run build
npx tsc --noEmit
git status --short          # debe quedar limpio DESPUÉS del build (N-2)
npm test                    # exit 0 sin base de datos
DATABASE_URL=... npm test   # exit 0 con base de datos
npm audit
git ls-remote --tags origin
```

Y confirma que `db/schema.sql` regenerado desde tu base no produce diff.

## Entrega

Commits atómicos sobre `main`, uno por punto. Tag anotado, **y esta vez súbelo**:

```bash
git tag -a fase-1.4-pendientes -m "Fase 1.4: npm test en verde, tsconfig estable, snapshot de esquema, limpieza menor"
git push origin main
git push origin fase-1.4-pendientes
```

En el resumen incluye `git diff --stat` y `git log --oneline` del rango, la salida de los comandos de verificación, y la respuesta al punto 4 sobre el firewall.
