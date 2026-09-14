# Auditorías por fase

Reportes de auditoría de Claude Code sobre el trabajo construido en Replit. Uno por fase, versionados junto al código que auditan.

## Convención de nombres

```
AAAA-MM-DD-<fase>.md                 informe de auditoría
AAAA-MM-DD-<fase>-correcciones.md    prompt de correcciones para Replit
```

## Índice

| Fecha | Fase | Rango auditado | Veredicto | Documentos |
|---|---|---|---|---|
| 2026-09-14 | Fase 1 completa — carga masiva + validaciones (incluye 1.1 y el listado) | `base-fase-1..fase-1.1-validaciones-import` (`295a362..d9e9cb8`) | **Con cambios** — 1 crítico, 2 altos | [informe](2026-09-14-fase-1.md) · [correcciones](2026-09-14-fase-1-correcciones.md) |

## Cómo se audita

El repo no usa ramas alternas: se trabaja sobre `main` y cada fase se cierra con un tag anotado. El corte de una fase es el rango entre el tag anterior y el suyo.

```bash
git fetch --tags
git tag -l --sort=-creatordate
git diff <tag-anterior>..<tag-de-la-fase>
git log --oneline <tag-anterior>..<tag-de-la-fase>
npm run build
npm run test:auth && npm run test:monitoring
npm audit
```

Usa `..` (dos puntos), no `...`: sobre un `main` lineal no hay divergencia y `..` da exactamente los commits nuevos de la fase.

Los criterios de aceptación de cada fase están en el `CLAUDE.md` de la raíz.

## Nota sobre el entorno local

El `package-lock.json` versionado contiene URLs internas de Replit (`package-firewall.replit.local` / `.replit.internal`) que no resuelven fuera de ese entorno, así que `npm ci` falla en cualquier otra máquina. Mientras eso no se corrija, para auditar en local:

```bash
npm install --no-package-lock --no-audit --no-fund
npm install --no-package-lock --save-exact @types/node@22.10.2 typescript@5.6.3
```

El segundo comando es obligatorio: sin fijar `@types/node`, el rango de caret deja entrar una versión más nueva y el build falla por deriva de tipos de `Buffer`, no por el código.

Las suites `tests/import/**` y `tests/producers/**` todavía no tienen script de npm; se invocan a mano:

```bash
npx tsx --test tests/import/*.test.ts
npx tsx --test tests/producers/*.test.ts
```
