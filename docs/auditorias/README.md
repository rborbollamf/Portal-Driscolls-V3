# Auditorías por fase

Reportes de auditoría de Claude Code sobre el trabajo construido en Replit. Uno por fase, versionados junto al código que auditan.

## Convención de nombres

```
AAAA-MM-DD-<fase>-prompt.md          prompt de implementación para Replit (abre la fase)
AAAA-MM-DD-<fase>.md                 informe de auditoría
AAAA-MM-DD-<fase>-correcciones.md    prompt de correcciones para Replit
AAAA-MM-DD-<fase>-cierre.md          informe de cierre, tras aplicar las correcciones
AAAA-MM-DD-<fase>-pendientes.md      prompt de pendientes no bloqueantes
```

El ciclo completo de una fase —sesión de diseño, prompt, implementación, auditoría, correcciones, cierre— está definido en la sección «Cómo se abre cada fase» del [`CLAUDE.md`](../../CLAUDE.md) de la raíz. **Ninguna fase arranca sin la sesión de diseño previa:** los criterios de aceptación del `CLAUDE.md` sirven para auditar, no para encargar.

A la fecha solo la Fase 1 tiene prompts escritos.

## Índice

| Fecha | Fase | Rango auditado | Veredicto | Documentos |
|---|---|---|---|---|
| 2026-09-14 | Fase 1 — carga masiva + validaciones | `base-fase-1..fase-1.1-validaciones-import` (`295a362..d9e9cb8`) | Con cambios — 1 crítico, 2 altos | [informe](2026-09-14-fase-1.md) · [correcciones](2026-09-14-fase-1-correcciones.md) |
| 2026-09-14 | Fase 1 — cierre | `30600b6..d306616` | **Cerrada** — 9/9 criterios, verificados contra PostgreSQL real | [cierre](2026-09-14-fase-1-cierre.md) · [pendientes](2026-09-14-fase-1-pendientes.md) |

## Cómo se audita

El repo no usa ramas alternas: se trabaja sobre `main` y cada fase se marca con un tag anotado. El corte de una fase es el rango entre el tag anterior y el suyo.

**El tag lo pone Claude Code, no Replit**, y va **antes** de auditar, porque es lo que fija el rango. Marca el estado *entregado*, no el aprobado.

```bash
# 1. confirmar que la entrega de Replit está en el remoto
git fetch --tags
git ls-remote origin refs/heads/main
git pull --ff-only origin main

# 2. etiquetar el último commit entregado
git tag -a <tag-de-la-fase> -m "<resumen del alcance>"
git push origin <tag-de-la-fase>

# 3. auditar el rango
git diff <tag-anterior>..<tag-de-la-fase>
git log --oneline <tag-anterior>..<tag-de-la-fase>
npm ci
npm run build
npm test
npm audit
```

Usa `..` (dos puntos), no `...`: sobre un `main` lineal no hay divergencia y `..` da exactamente los commits nuevos de la fase.

Verifica que el tag quedó **anotado**, no ligero — un tag ligero no guarda autor, fecha ni mensaje:

```bash
git for-each-ref --format='%(refname:short) %(objecttype)' refs/tags/<tag>   # debe decir "tag"
```

Si `git pull --ff-only` falla, el local y el remoto divergieron: resuélvelo antes de etiquetar, no después.

Los criterios de aceptación de cada fase están en el `CLAUDE.md` de la raíz.

---

## Base de datos local para auditar

Sin PostgreSQL, buena parte de la suite falla por `ECONNREFUSED 5432` y esos fallos son indistinguibles de defectos reales. Levantar una base desechable en Docker elimina esa ambigüedad y permite verificar la importación de extremo a extremo.

### Levantarla

```bash
docker run -d --name driscolls-audit-pg \
  --restart unless-stopped \
  -e POSTGRES_PASSWORD=auditlocal \
  -e POSTGRES_USER=driscolls \
  -e POSTGRES_DB=driscolls_audit \
  -p 127.0.0.1:5432:5432 \
  postgres:16-alpine

export DATABASE_URL="postgres://driscolls:auditlocal@127.0.0.1:5432/driscolls_audit"
npm run db:migrate
```

El puerto se ata a `127.0.0.1` a propósito: la base no se expone a la red. No existe `.env` en el repo y los scripts no cargan `dotenv`, así que `DATABASE_URL` sale únicamente de la variable que se exporta — no hay forma de tocar otra base por accidente.

### Usuario de fixture

Varias pruebas exigen un ADMIN preexistente. **No uses `npm run seed`**: el `CLAUDE.md` lo clasifica como destructivo. Inserta lo mínimo:

```sql
INSERT INTO app_users (id, name, email, role, hash, is_active, created_at)
VALUES ('audit-admin', 'Auditor Local', 'auditor@local.invalid', 'ADMIN',
        '$2b$12$notarealhashnotarealhashnotarealhashnotarealhashnotare', true, NOW());
```

El hash es basura a propósito: este usuario existe para satisfacer llaves foráneas y bitácoras, nunca para iniciar sesión.

### Correrla y destruirla

```bash
docker start driscolls-audit-pg     # tras reiniciar Docker o WSL
docker rm -f driscolls-audit-pg     # destruir (el volumen anónimo queda huérfano)
```

**Trátala como reproducible, no como preciosa.** Se reconstruye entera en menos de un minuto con los comandos de arriba. Si se pierde, no se pierde nada.

---

## Snapshot de esquema — detección de deriva

`schema_migrations` registra solo el **nombre** del archivo de migración, sin checksum. Si alguien edita una migración ya aplicada, el runner la salta en silencio y las bases divergen sin aviso. Peor: un cambio hecho directamente contra la base de Replit, sin escribir migración, no deja ningún rastro en git.

El riesgo va en la dirección peligrosa. Su base tendría una columna que las migraciones no crean, su aplicación funciona, las pruebas pasan, y el despliegue limpio a AWS revienta.

`db/schema.sql` cierra ese hueco. Es el esquema producido por las migraciones sobre una base vacía, versionado. **Es requisito de entrega de cada fase que Replit lo regenere desde su base y lo commitee.**

```bash
pg_dump "$DATABASE_URL" --schema-only --no-owner --no-privileges \
  | grep -vE '^\\(restrict|unrestrict)' > db/schema.sql
```

El `grep` no es opcional: `pg_dump` emite una línea `\restrict` con token aleatorio en cada corrida, que ensuciaría todos los diffs. Con ese filtro el dump es determinista — verificado generándolo dos veces.

Para comparar contra lo que producen las migraciones:

```bash
docker rm -f driscolls-audit-pg          # base limpia
# ...volver a levantarla y migrar...
pg_dump ... | grep -vE '^\\(restrict|unrestrict)' > /tmp/schema-esperado.sql
diff /tmp/schema-esperado.sql db/schema.sql
```

Sin diferencias, la base de Replit es exactamente lo que las migraciones producen. Con diferencias, ahí está el cambio fuera de banda.

---

## Verificación de extremo a extremo de la importación

Con la base levantada se puede validar el flujo completo, no solo el parser. Lo que conviene comprobar tras cualquier cambio al import:

```sql
SELECT count(*) AS productores,
       count(*) FILTER (WHERE status='PENDIENTE') AS pendientes,
       count(*) FILTER (WHERE telefono_contacto ~ '^[0-9]{10}$') AS tel_10_digitos,
       count(*) FILTER (WHERE telefono_contacto ~ '[^0-9]')      AS tel_con_basura
  FROM producers;

SELECT count(*) FROM legal_entities;          -- una por productor
SELECT distrito, count(*) FROM producers GROUP BY distrito ORDER BY 2 DESC;
SELECT actor_user_id, action, metadata->>'created', metadata->>'received'
  FROM audit_logs WHERE action='PRODUCER_BULK_IMPORT';
```

Para idempotencia, correr la misma importación dos veces: la segunda debe reportar `created: 0, updated: N` y no dejar filas ni razones sociales de más.
