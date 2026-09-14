# CLAUDE.md — Portal Driscoll's V3 (guía para Claude Code)

> Colócalo en la **raíz del repo** y haz commit. Claude Code lo lee automáticamente en cada sesión.
> **Rol de Claude Code en este proyecto: revisar y auditar** los cambios que se construyen en Replit (fase por fase). Claude Code normalmente NO es el constructor principal; su trabajo es verificar calidad, seguridad y que no se rompan las invariantes. Si se te pide aplicar un arreglo, hazlo en una rama y muestra el diff.

## Qué es el proyecto

Portal web de monitoreo fiscal, legal y financiero de ~900 productores agrícolas para Driscoll's. Consulta fuentes externas (SAT, IMSS, OFAC, Buró de Crédito), evalúa reglas y genera alertas, con expedientes por productor y control por rol. Destino final: AWS (ECS Fargate o EC2 Linux + RDS PostgreSQL). Hoy se construye en Replit.

## Stack real

Next.js 14.2.x (App Router) · React 18 · TypeScript · Tailwind · Recharts · NextAuth (Credentials + JWT + bcrypt) · PostgreSQL (`pg`) · worker de monitoreo independiente con cola en PostgreSQL · Zod. Roles: `ADMIN`, `ANALYST`, `PRODUCER`.

## Invariantes que SIEMPRE deben cumplirse (verifícalas en cada auditoría)

- **PostgreSQL es la fuente de verdad.** No reemplazar por JSON ni memoria. `data/db.json` es solo fuente histórica de importación.
- **Sin datos mock en flujos operativos** salvo que se pida explícitamente. Los adaptadores reales fallan si no están configurados; no deben "inventar" respuestas.
- **Aislamiento de productor:** un `PRODUCER` solo accede a su propio expediente/alertas. El acceso cruzado debe responder como "no encontrado" (404), no filtrar existencia.
- **Autorización en el servidor** (`requireAuth`) en TODAS las rutas API; nunca solo ocultando botones. `requireAuth` revalida el usuario contra la BD (no confía solo en el JWT).
- **Secretos nunca al frontend** ni en logs ni en el repo. Tokens de proveedores se leen del servidor.
- **Procesamiento asíncrono** con cola PostgreSQL + worker: no volverlo síncrono. NO eliminar leases, claim tokens ni controles de concurrencia/idempotencia del worker.
- **Transacciones** cuando una operación toca varias entidades.
- **Migraciones:** no modificar migraciones ya aplicadas; crear nuevas y versionadas.
- **Nada destructivo** (seed/import/restore) sin autorización explícita; bloqueado en producción.
- **Queries parametrizados** siempre (nada de concatenar entrada de usuario en SQL).
- Mantener compatibilidad con Next.js 14 / TS / App Router salvo migración pedida.

## Estado conocido del código (línea base, sep 2026)

Bien: auth sólida, queries parametrizados (sin inyección SQL), worker con locks/idempotencia, adaptadores de proveedores autorizados (HTTP real, Bearer desde `*_API_TOKEN`, timeout 15s, Zod, sin mocks), migraciones versionadas, sin secretos reales versionados.

Pendientes/riesgos a vigilar (que las fases deberían ir cerrando):
- **Vulnerabilidad crítica:** Next.js 14.2.x tiene RCE (optimización de imágenes/AVIF) + varios CVEs; `npm audit` = ~22 (1 crítica, 13 altas). Arreglo pide subir Next (hasta 16.x). **Correr `npm audit` en cada auditoría.**
- **Credenciales demo** visibles en `/login` y en `README`/`GUIA_FUNCIONAL` — deben retirarse antes de staging.
- Faltan **headers de seguridad**, **rate limiting/lockout** en login y **middleware default-deny**.
- **Motor de reglas** hoy solo evalúa 5 códigos fijos; una regla nueva de la UI no se ejecuta (se corrige en la Fase 2B con expresiones seguras).
- **`/reports`** usa datos ESTÁTICOS de `lib/data/demoData.ts` (demo 2022), desconectado de PostgreSQL.
- **`node-cron`** instalado pero NO cableado: no hay disparador recurrente activo (hoy manual + worker).
- **dev-deps** (TS/ESLint/Tailwind/@types) mal puestas en `dependencies`.
- Menores: bcrypt cost 10 (subir a ≥12), JWT sin `maxAge` explícito, falta `output:'standalone'` para contenedores.

## Fuentes externas — catálogo objetivo

Existen: SAT (opinión de cumplimiento), IMSS (situación patronal), FINANCIERA (snapshot), LEGAL (poderes notariales — **no** es OFAC). Faltan y se agregan como stub parametrizable: `SAT_CSF` (constancia), `SAT_69`, `SAT_69B`, `SAT_74`, `OFAC_SDN`, `IMSS_EMPLEADOS`, `BURO_PF`, `BURO_PM`. Endpoints editables desde el módulo admin (Fase 2B), con el token siempre en el gestor de secretos (nunca en BD/UI).

## Seguridad de datos sensibles (arquitectura acordada)

- **CIEC / e.firma** → AWS Secrets Manager + KMS (envelope AES-256-GCM, rotación); nunca en BD/logs/frontend; descifrado solo en memoria al usarse.
- **Documentos de consentimiento firmados** → S3 privado con SSE-KMS, versionado + Object Lock (WORM); acceso por URL prefirmada; hash SHA-256 en BD.
- **Metadatos de consentimiento** → PostgreSQL (tipo, versión del texto, fecha, evidencia/IP, estado, vigencia).
- **Llaves** → KMS CMK con rotación y auditoría.
- **Regla dura:** Buró de Crédito (PF/PM) NO consulta sin consentimiento vigente verificado en el servidor.

## Criterios de aceptación por fase (qué revisar al auditar cada una)

- **Fase 1 — Carga masiva + reportes:** pantalla de carga (solo ADMIN) que parsea el Excel de 19 campos en el servidor; validación fila por fila (RFC válido, obligatorios, catálogos, duplicados); comportamiento todo-o-nada; upsert por RFC en transacción y por lotes; plantilla descargable; `/reports` diferido tras feature flag `STAGE_2_ENABLED` o reconectado a datos reales (no dejarlo con demo); dos importaciones simultáneas no pierden datos.
- **Fase 2 — Auth:** sin credenciales demo en UI/semilla; política de contraseña + lockout; JWT con expiración corta; cookies httpOnly/secure/sameSite; aislamiento Productor–Productor probado; capa de proveedores lista para AD/OIDC/LDAP (sin romper el login local); auditoría de seguridad.
- **Fase 2B — Parametrización:** tabla `data_sources` (endpoints editables, token por `secret_ref`, nunca en UI); validación anti-SSRF (solo https, bloquea IPs internas); motor de reglas por **expresiones seguras en sandbox (sin `eval`/`Function`)** con lista blanca de variables/funciones; las 5 reglas actuales migradas; **una regla nueva por expresión SÍ se ejecuta**.
- **Fase 3 — CIEC/consentimientos:** `SecretsProvider` abstracto; CIEC fuera de la BD; tabla `consents` + `DocumentStore` (S3 en prod); gate de consentimiento para Buró; sin secretos en el repo; headers de seguridad.
- **Fase 4 — Integraciones:** adaptadores (existentes intactos + stubs nuevos) leyendo del catálogo; una fuente caída/no configurada no rompe el diagnóstico completo.
- **Fase 5 — Contenedores/AWS:** Dockerfile multi-stage (`output:'standalone'`, no-root), healthcheck `/api/health`, logs JSON a stdout, `.env.example` completo, sin ataduras a Replit/filesystem local.
- **Fase 6 — Escalabilidad:** scheduler fuera del proceso web; sin estado en memoria que impida 2+ instancias; idempotencia (sin alertas duplicadas).
- **Fase 7 — Verificación:** tests (unit/integración/E2E), `npm audit`, escaneo de secretos, headers, aislamiento de datos.

## Cómo auditar (comandos)

El repo **no usa ramas alternas**: se trabaja sobre `main` y cada fase se cierra con un tag anotado (`git tag -a`). El corte de una fase es el rango entre el tag anterior y el suyo.

```bash
git fetch --tags
git tag -l --sort=-creatordate                        # ver los cortes disponibles
git diff <tag-anterior>..<tag-de-la-fase>             # cambios exactos de la fase
git log --oneline <tag-anterior>..<tag-de-la-fase>
npm install
npm run build          # debe pasar
npm run test:auth && npm run test:monitoring
npm audit              # aquí sí hay red; reporta CVEs
```
Usa `..` (dos puntos), no `...`: sobre un `main` lineal no hay divergencia y `..` da exactamente los commits nuevos de la fase.

Revisa además: que no haya secretos en el diff ni en el historial, que las rutas API nuevas tengan `requireAuth`, que las migraciones nuevas no alteren las aplicadas, y que el "resumen de cambios" de Replit coincida con el diff real.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
