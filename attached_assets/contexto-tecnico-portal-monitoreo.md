# Contexto técnico del Portal de Monitoreo

## 1. Descripción general

El proyecto es un **Portal de Monitoreo Financiero-Fiscal para productores agrícolas**, desarrollado como un MVP interno con identidad visual de Driscoll’s.

Sus objetivos principales son:

- Centralizar información de productores, razones sociales, ranchos y cultivos.
- Evaluar riesgos fiscales, laborales, financieros y legales.
- Consultar proveedores externos para validaciones SAT, IMSS, financieras y legales.
- Generar alertas mediante reglas de negocio.
- Ejecutar diagnósticos manuales y monitoreo recurrente.
- Mostrar dashboards, reportes y expedientes individuales.
- Restringir la información mediante roles y asociaciones entre usuarios y productores.

---

## 2. Stack tecnológico real

### Aplicación

- Next.js 14.2 con App Router.
- React 18.
- TypeScript.
- Tailwind CSS.
- Recharts para visualizaciones.
- Route Handlers de Next.js como backend.
- Zod para validación de entradas y respuestas de integraciones.

### Seguridad y autenticación

- NextAuth 4.
- Inicio de sesión mediante email y contraseña.
- Contraseñas almacenadas con hash bcrypt.
- Sesiones basadas en JWT.
- Roles:
  - `ADMIN`
  - `ANALYST`
  - `PRODUCER`

### Persistencia

- PostgreSQL mediante el paquete `pg`.
- Conexión por `DATABASE_URL`.
- Pool de conexiones.
- Consultas parametrizadas.
- Transacciones para operaciones críticas.
- Migraciones SQL versionadas en `db/migrations/`.

El archivo `data/db.json` contiene un dataset histórico o demo y se conserva como fuente para importación. **La aplicación actual no lo usa como base de datos durante la ejecución normal.**

### Procesamiento en segundo plano

- La API encola trabajos en PostgreSQL.
- Existe un worker independiente ejecutado con:

```bash
npm run worker:monitoring
```

- El worker:
  - Reclama trabajos pendientes.
  - Maneja concurrencia mediante bloqueos de PostgreSQL.
  - Usa leases y tokens de reclamación.
  - Recupera trabajos estancados.
  - Implementa reintentos con espera exponencial.
  - Evita duplicados mediante claves de idempotencia.

Aunque `node-cron` está instalado y la documentación antigua habla de ejecuciones mensuales con cron, el código actual no implementa una llamada real a `node-cron`. El monitoreo recurrente debe ser disparado externamente o manualmente y después procesado por el worker.

---

## 3. Arquitectura del proyecto

La plataforma funciona como un monolito modular de Next.js:

```text
app/
├── api/                         Rutas HTTP del backend
├── admin/                       Pantallas administrativas
├── alerts/                      Centro de alertas
├── dashboard/                   Dashboard principal
├── login/                       Inicio de sesión
├── producers/                   Productores y expediente individual
└── reports/                     Reportería financiera/fiscal

components/
├── reports/                     Componentes de reportes
├── ui/                          Componentes compartidos
└── nav-bar.tsx                  Navegación principal

lib/
├── adapters/                    Integraciones externas
├── api/                         Lógica reutilizable de endpoints
├── auth/                        Autenticación, permisos y acceso
├── data/                        Dataset estático de reportería
├── db/                          Repositorio PostgreSQL
├── rules/                       Motor de reglas
├── services/                    Validaciones, scheduler y worker
└── utils/                       Utilidades

db/migrations/                   Migraciones SQL
scripts/                         Seed, migraciones, importación y respaldos
types/                           Tipos del dominio
docs/                            Documentación operativa
data/db.json                     Dataset histórico/demo para importación
```

---

## 4. Modelo funcional

Las entidades principales son:

- Usuario.
- Productor.
- Razón social o entidad legal.
- Rancho.
- Cultivo.
- Snapshot financiero.
- Tarea de validación.
- Trabajo de monitoreo.
- Evento de integración.
- Regla.
- Alerta.
- Historial de alerta.
- Bitácora de auditoría.

Un productor puede tener:

- Una o varias razones sociales.
- Uno o varios ranchos.
- Cultivos asociados a sus ranchos.
- Historial financiero.
- Historial de validaciones.
- Alertas activas y resueltas.
- Estado general:
  - `PENDIENTE`
  - `OK`
  - `RISK`
  - `FAIL`

---

## 5. Flujo de diagnóstico

El diagnóstico completo contempla cuatro tipos:

1. SAT.
2. IMSS.
3. Financiero.
4. Legal.

El flujo real es asíncrono:

1. Un usuario autorizado solicita una validación.
2. La API requiere una clave de idempotencia.
3. Se crea una tarea de validación pendiente.
4. Se crea un trabajo en la cola de PostgreSQL.
5. La API devuelve una respuesta HTTP `202`.
6. El worker reclama el trabajo.
7. Se consulta el proveedor externo.
8. Se valida el formato de su respuesta.
9. Se ejecutan las reglas correspondientes.
10. Se crean, actualizan o resuelven alertas.
11. Se actualizan los estados del productor y la razón social.
12. Se registra el evento de integración.

Actualmente las reglas están vinculadas explícitamente a códigos conocidos:

- `SAT_OPINION_NEGATIVA`
- `IMSS_SUSPENSION`
- `ENDEUDAMIENTO_ALTO`
- `LIQUIDEZ_BAJA`
- `PODERES_VENCIDOS`

Aunque la interfaz permite crear reglas adicionales, una regla nueva no necesariamente será evaluada durante un diagnóstico. La capa de validación filtra explícitamente los códigos anteriores.

---

## 6. Integraciones externas

Existen adaptadores para:

- SAT.
- IMSS.
- Fuente financiera.
- Fuente legal.

Los adaptadores actuales **no generan respuestas mock durante la ejecución**. Están preparados para hacer solicitudes HTTP POST autenticadas a proveedores autorizados.

Cada integración contempla:

- URL configurable.
- Token Bearer.
- Límite de solicitudes por minuto.
- Timeout de 15 segundos.
- Identificador de correlación.
- Validación Zod de la respuesta.
- Clasificación de errores recuperables.
- Reintentos desde el worker.
- Registro de eventos de integración.

Variables esperadas:

```text
DATABASE_URL
NEXTAUTH_SECRET
NEXTAUTH_URL

SAT_VALIDATION_URL
SAT_API_TOKEN
SAT_RATE_LIMIT_PER_MINUTE

IMSS_VALIDATION_URL
IMSS_API_TOKEN
IMSS_RATE_LIMIT_PER_MINUTE

FINANCIAL_VALIDATION_URL
FINANCIAL_API_TOKEN
FINANCIAL_RATE_LIMIT_PER_MINUTE

LEGAL_VALIDATION_URL
LEGAL_API_TOKEN
LEGAL_RATE_LIMIT_PER_MINUTE

MONITORING_WORKER_POLL_MS
REPLIT_DEV_DOMAIN
PORT
NODE_ENV
```

Las credenciales deben almacenarse como secretos del servidor. No deben enviarse al navegador ni incorporarse al código.

Si las URLs o tokens de una integración no están configurados, el diagnóstico correspondiente falla explícitamente; no existe fallback silencioso a información ficticia.

---

## 7. Autenticación y control de acceso

El sistema usa exclusivamente un proveedor de credenciales de NextAuth.

Flujo:

1. Se recibe email y contraseña.
2. Se busca el usuario en PostgreSQL sin distinguir mayúsculas y minúsculas en el email.
3. Se comprueba que esté activo.
4. Se compara la contraseña mediante bcrypt.
5. Se emite una sesión JWT con ID y rol.

No hay actualmente:

- Recuperación de contraseña.
- MFA.
- OIDC.
- SAML.
- LDAP o Active Directory.
- Google OAuth funcional.
- SSO corporativo implementado.

Existe una variable `ENABLE_GOOGLE_AUTH`, pero el proveedor de Google no está implementado.

### Restricciones por rol

#### ADMIN

- Acceso completo.
- Configuración de reglas.
- Administración de asociaciones entre cuentas y productores.
- Control del monitoreo.
- Ejecución de diagnósticos.
- Resolución y exportación de alertas.

#### ANALYST

- Dashboard.
- Productores.
- Alertas.
- Diagnósticos.
- Consulta de reglas.
- Exportaciones.

No puede modificar reglas ni acceder a las pantallas administrativas.

#### PRODUCER

- Solo puede consultar el productor asociado a su cuenta.
- Solo puede ver sus propias alertas, cultivos, validaciones y datos.
- No puede ejecutar diagnósticos.
- Requiere una asociación activa con un productor.

Las APIs vuelven a consultar el usuario en PostgreSQL para comprobar que continúa activo. En varios casos, el acceso no autorizado a información de otro productor responde como recurso no encontrado para evitar revelar su existencia.

---

## 8. Pantallas existentes

### `/login`

- Inicio de sesión con email y contraseña.
- Muestra credenciales de demostración directamente en la interfaz.
- Este comportamiento es útil para demo, pero debe retirarse antes de producción.

### `/dashboard`

- Total de productores.
- Alertas críticas.
- Productores en riesgo.
- Tareas pendientes.
- Distribución por zona.
- Distribución por cultivo.
- Alertas recientes.
- Los productores solo ven información asociada a su expediente.

### `/producers`

- Listado de productores.
- Búsqueda y filtros.
- Estado de riesgo.
- Acceso al expediente individual.

### `/producers/[id]`

Expediente detallado con:

- Información general.
- Razones sociales.
- Ranchos.
- Cultivos.
- Información financiera.
- Validaciones.
- Alertas.
- Ejecución de diagnóstico para usuarios autorizados.

### `/alerts`

- Listado de alertas.
- Filtros.
- Alertas activas y resueltas.
- Resolución de alertas.
- Consulta de historial.
- Exportación CSV mediante un endpoint separado.

### `/reports`

Módulo de reportería con cuatro vistas:

1. Visión General.
2. Rentabilidad y Ratios.
3. Clientes.
4. Riesgos y Cumplimiento.

Este módulo usa datos estáticos de `lib/data/demoData.ts`. No consume actualmente los productores, alertas ni snapshots de PostgreSQL.

La pantalla indica:

- “Empresa Demo SA de CV”.
- Fecha fija del 28 de abril de 2022.
- Reporte fijo número 2054.

Debe tratarse como una demostración visual independiente del resto del sistema.

### `/admin/rules`

- Consulta de reglas.
- Alta, edición, activación, desactivación y eliminación.
- Acceso exclusivo para administradores.

### `/admin/producer-accounts`

- Administración de cuentas con rol `PRODUCER`.
- Asociación de cuentas con expedientes de productores.
- Activación y desactivación de cuentas.

### `/admin/scheduler`

- Estado de la cola.
- Trabajos recientes.
- Errores de integración.
- Ejecución manual del monitoreo.
- Selección de cohortes generales o por zona.

No representa un cron autónomo interno, a pesar del nombre “Scheduler”.

---

## 9. Endpoints disponibles

### Autenticación

```text
/api/auth/[...nextauth]
```

### Productores

```text
GET  /api/producers
POST /api/producers
GET  /api/producers/[id]
```

### Alertas

```text
GET   /api/alerts
PATCH /api/alerts/[id]/resolve
GET   /api/alerts/[id]/history
GET   /api/exports/alerts
```

### Reglas

```text
GET    /api/rules
POST   /api/rules
PATCH  /api/rules/[id]
DELETE /api/rules/[id]
```

### Validaciones

```text
POST /api/validation/run
```

### Monitoreo

```text
GET  /api/scheduler/status
POST /api/scheduler/run
```

### Cuentas de productores

```text
GET   /api/admin/producer-accounts
PATCH /api/admin/producer-accounts/[userId]
```

---

## 10. Datos de demostración

El repositorio contiene información completamente ficticia:

- Usuarios demo.
- Productores ficticios.
- RFC ficticios.
- Contactos y direcciones ficticias.
- Ranchos y cultivos ficticios.
- Snapshots financieros generados.
- Alertas de ejemplo.
- Reglas iniciales.

También existen credenciales demo documentadas y visibles en `/login`.

El script de seed actual crea un dataset más pequeño que el descrito en el README. El README y la guía funcional no deben usarse como fuente exacta para cantidades de registros.

El seed destructivo está protegido:

- Requiere confirmación explícita.
- Está bloqueado en producción.

Los scripts de importación y restauración tienen protecciones similares.

---

## 11. Operación y recuperación

Existen scripts para:

```bash
npm run db:migrate
npm run db:import
npm run seed
npm run db:backup
npm run db:restore
npm run db:restore-test
```

Características relevantes:

- Migraciones SQL versionadas.
- Backups lógicos.
- Checksum de los respaldos.
- Validación de relaciones y conteos.
- Restauración bloqueada en producción.
- Prueba de restauración.
- Lecturas consistentes mediante transacciones.
- Script posterior a una integración o merge para sincronizar dependencias y migraciones.

---

## 12. Despliegue actual

La configuración de Replit usa:

- Node.js 20.
- PostgreSQL 16.
- Puerto interno 5000.
- Un workflow para Next.js.
- Un workflow independiente para el worker.
- Ejecución paralela de ambos procesos.

Comandos principales:

```bash
npm run dev
npm run worker:monitoring
npm run build
npm run start
```

No existen:

- `Dockerfile`.
- `.dockerignore`.
- Healthcheck HTTP dedicado.
- Configuración completa para Kubernetes o múltiples réplicas.
- Programador externo incluido en el repositorio.

La aplicación no está conceptualmente limitada a Replit porque usa PostgreSQL y variables de entorno, pero la configuración actual de ejecución sí contiene elementos específicos de Replit.

Para desplegarla fuera de Replit habría que provisionar:

1. PostgreSQL.
2. Servidor Next.js.
3. Worker independiente.
4. Gestión de secretos.
5. Disparador recurrente externo.
6. Migraciones.
7. Healthchecks.
8. Almacenamiento persistente para respaldos o un servicio externo.

---

## 13. Contradicciones de la documentación

La documentación mezcla distintas etapas del proyecto.

### Integraciones

El README y la guía todavía hablan de adaptadores mock. El código actual usa integraciones HTTP reales y falla cuando no están configuradas.

### Base de datos

La guía funcional dice que el MVP almacena datos en JSON. El código actual usa PostgreSQL. El JSON es únicamente una fuente histórica o demo para importación.

### Monitoreo recurrente

Los documentos hablan de `node-cron` mensual. El código actual utiliza una cola PostgreSQL y un worker independiente, pero no contiene una programación mensual autónoma.

### Diagnósticos

La guía presenta el diagnóstico como una operación síncrona. Actualmente se encola y responde con HTTP `202`; el resultado aparece después de que el worker lo procesa.

### Reportería

La guía puede dar a entender que los reportes reflejan la información operacional. En realidad `/reports` utiliza un dataset estático independiente.

### Reglas configurables

La interfaz permite crear reglas, pero el proceso de validación solo selecciona cinco códigos conocidos. No existe un sistema totalmente dinámico para asociar reglas nuevas con tipos de validación.

### Cantidades del dataset

Las cantidades declaradas en el README no coinciden con el script de seed actual.

---

## 14. Riesgos y puntos de atención

1. **Credenciales demo visibles**  
   La pantalla de login y la documentación muestran usuarios y contraseñas demo.

2. **Documentación desactualizada**  
   Puede provocar ajustes basados en una arquitectura que ya no existe.

3. **Reportería desconectada de PostgreSQL**  
   Los reportes no muestran datos reales del portal.

4. **Reglas parcialmente configurables**  
   Se pueden guardar reglas nuevas que nunca sean ejecutadas.

5. **Ausencia de recuperación de contraseña y MFA**  
   El sistema de autenticación es adecuado para MVP, no para un entorno corporativo sensible.

6. **Sin SSO corporativo**  
   No hay puntos implementados para OIDC, SAML o Active Directory.

7. **JWT con rol persistido**  
   Algunas pantallas pueden confiar en información de la sesión hasta que se renueve. Las APIs son más estrictas porque revalidan al usuario en PostgreSQL.

8. **Programación recurrente incompleta**  
   Hace falta un disparador externo para iniciar ejecuciones periódicas.

9. **Sin healthcheck específico**  
   Dificulta supervisar por separado servidor, base de datos e integraciones.

10. **Backups en filesystem local**  
    Fuera del entorno de desarrollo deben enviarse a almacenamiento persistente externo.

11. **Dependencias de desarrollo clasificadas como producción**  
    TypeScript, ESLint, tipos y Tailwind aparecen en `dependencies` y no en `devDependencies`.

12. **Integraciones reales todavía sin proveedor concreto**  
    Existe el contrato HTTP, pero no una implementación específica para APIs oficiales de SAT, IMSS o Buró de Crédito.

---

## 15. Reglas para solicitar ajustes

Al generar instrucciones para modificar esta plataforma, deben considerarse estas restricciones:

- No reemplazar PostgreSQL por JSON ni almacenamiento en memoria.
- No introducir datos mock en flujos operativos sin indicarlo explícitamente.
- Mantener el aislamiento de los productores.
- Mantener las validaciones de rol en servidor, no solo ocultar botones.
- No exponer tokens o URLs privadas al frontend.
- Conservar el procesamiento asíncrono mediante cola y worker.
- Mantener la idempotencia de los diagnósticos.
- No eliminar leases, claim tokens ni controles de concurrencia del worker.
- Mantener transacciones cuando una validación modifica varias entidades.
- Diferenciar claramente reportería demo y datos operativos.
- No asumir que `node-cron` está activo.
- No usar el README o la guía como única fuente; verificar el código actual.
- No modificar migraciones ya aplicadas; crear migraciones nuevas.
- No ejecutar seed, importación, restauración ni operaciones destructivas sin autorización explícita.
- Mantener compatibilidad con Next.js 14, TypeScript y App Router, salvo que se solicite expresamente una migración.

---

## 16. Instrucción sugerida para Claude

```text
Usa el contexto anterior como descripción del estado actual del proyecto.

Necesito que me ayudes a redactar un prompt de implementación para Replit Agent. No escribas todavía el código final.

Primero analiza mis ajustes solicitados y después genera un prompt técnico, preciso y listo para copiar, que incluya:

1. Objetivo del cambio.
2. Comportamiento esperado.
3. Pantallas, componentes, endpoints y capas afectadas.
4. Restricciones de autenticación y RBAC.
5. Consideraciones sobre PostgreSQL, migraciones y datos.
6. Consideraciones sobre la cola y el worker de monitoreo.
7. Casos de error y estados vacíos.
8. Criterios de aceptación observables.
9. Pruebas o verificaciones necesarias.
10. Elementos expresamente fuera de alcance.
11. Instrucción de conservar todo comportamiento no relacionado.
12. Prohibición de usar datos mock salvo que yo lo solicite.
13. Prohibición de realizar operaciones destructivas o exponer secretos.

Cuando te comparta los ajustes, haz las preguntas indispensables si existe alguna ambigüedad. Después entrega únicamente el prompt final para Replit Agent.
```
