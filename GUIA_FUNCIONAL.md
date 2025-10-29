# Portal de Monitoreo Financiero-Fiscal Driscoll's
## Guía Funcional para Usuarios

---

## 📋 Tabla de Contenidos
1. [Introducción](#introducción)
2. [Acceso al Sistema](#acceso-al-sistema)
3. [Roles y Permisos](#roles-y-permisos)
4. [Funcionalidades Principales](#funcionalidades-principales)
5. [Guía de Uso por Módulo](#guía-de-uso-por-módulo)
6. [Casos de Uso Comunes](#casos-de-uso-comunes)
7. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## Introducción

El **Portal de Monitoreo Financiero-Fiscal Driscoll's** es una herramienta diseñada para detectar y monitorear riesgos fiscales y financieros de productores agrícolas. El sistema realiza validaciones automáticas con:

- **SAT** (Servicio de Administración Tributaria)
- **IMSS** (Instituto Mexicano del Seguro Social)
- **Indicadores Financieros** (liquidez, endeudamiento, flujo de efectivo)
- **Validaciones Legales** (poderes notariales, documentación)

### Beneficios Clave
✅ **Detección temprana** de riesgos fiscales y financieros  
✅ **Monitoreo automatizado** con alertas en tiempo real  
✅ **Motor de reglas configurable** adaptable a políticas de negocio  
✅ **Trazabilidad completa** con auditoría de todas las acciones  
✅ **Dashboards visuales** con KPIs y análisis por zona/cultivo  

---

## Acceso al Sistema

### URL de Acceso
```
https://[tu-dominio-replit]/login
```

### Usuarios Demo Disponibles

#### 👨‍💼 Administrador
- **Email:** `admin@demo.local`
- **Contraseña:** `Admin123!`
- **Acceso:** Total (configuración, monitoreo, reportes)

#### 👩‍💻 Analista
- **Email:** `analyst@demo.local`
- **Contraseña:** `Analyst123!`
- **Acceso:** Monitoreo, análisis y ejecución de diagnósticos

#### 🌾 Productor
- **Email:** `producer@demo.local`
- **Contraseña:** `Producer123!`
- **Acceso:** Solo lectura de su información

---

## Roles y Permisos

| Funcionalidad | Administrador | Analista | Productor |
|--------------|---------------|----------|-----------|
| Ver Dashboard | ✅ | ✅ | ✅ |
| Ver Productores | ✅ | ✅ | ✅ (solo propios) |
| Ejecutar Diagnósticos | ✅ | ✅ | ❌ |
| Ver Alertas | ✅ | ✅ | ✅ (solo propias) |
| Resolver Alertas | ✅ | ✅ | ❌ |
| Configurar Reglas | ✅ | ❌ | ❌ |
| Gestionar Scheduler | ✅ | ❌ | ❌ |
| Exportar Reportes | ✅ | ✅ | ❌ |

---

## Funcionalidades Principales

### 1. 📊 Dashboard
Vista general del sistema con métricas clave:
- Total de productores monitoreados
- Alertas críticas activas
- Productores en riesgo
- Tareas de validación pendientes
- Distribución por zona geográfica
- Distribución por tipo de cultivo
- Historial reciente de alertas

### 2. 🌾 Gestión de Productores
- Listado completo de productores
- Filtros por zona y estado de riesgo
- Paginación para grandes volúmenes
- Semáforo visual de estados (OK, RIESGO, CRÍTICO)
- Ficha detallada con:
  - Información general
  - Razones sociales asociadas
  - Ranchos y cultivos
  - Snapshots financieros históricos
  - Historial de validaciones
  - Alertas relacionadas

### 3. 🚨 Centro de Alertas
- Listado de todas las alertas generadas
- Filtros por:
  - Severidad (HIGH, MEDIUM, LOW)
  - Zona geográfica
  - Estado (activas/resueltas)
  - Período de tiempo
- Acciones disponibles:
  - Resolver alertas
  - Ver detalles completos
  - Exportar a CSV

### 4. ⚙️ Motor de Reglas (Solo Admin)
Editor visual de reglas de negocio con:
- Crear nuevas reglas
- Editar reglas existentes
- Activar/desactivar reglas
- Probar reglas antes de aplicarlas
- Tipos de evaluadores:
  - **Threshold:** Umbrales numéricos
  - **Boolean:** Condiciones verdadero/falso
  - **Custom:** Lógica personalizada

### 5. 🔄 Programador de Validaciones (Solo Admin)
- Configurar monitoreo recurrente automático
- Definir frecuencia (mensual en demo)
- Iniciar validaciones manuales
- Ver estado del scheduler
- Histórico de ejecuciones

### 6. 📥 Exportación de Datos
- Exportar alertas a CSV
- Filtrar por período antes de exportar
- Incluye información completa de productor y razón social

---

## Guía de Uso por Módulo

### 🔐 Inicio de Sesión

1. Accede a la URL del portal
2. Ingresa tu email y contraseña
3. Haz clic en "Iniciar Sesión"
4. Serás redirigido al Dashboard

**Nota:** Las credenciales demo están listadas en la página de login para facilitar las pruebas.

---

### 📊 Uso del Dashboard

**¿Qué puedo ver?**
- **KPIs principales:** Métricas resumidas en cards de colores
- **Gráficos de distribución:** Barras horizontales con porcentajes
- **Alertas recientes:** Últimas 10 alertas generadas con badges de severidad

**Interpretación de colores:**
- 🟢 **Verde:** Estado OK, sin riesgos detectados
- 🟡 **Amarillo:** Estado RIESGO, requiere atención
- 🔴 **Rojo:** Estado CRÍTICO, requiere acción inmediata

**Navegación:**
Usa el menú superior para acceder a otras secciones:
- Dashboard
- Productores
- Alertas
- Reglas (solo Admin)
- Scheduler (solo Admin)

---

### 🌾 Gestión de Productores

#### Listado de Productores

1. Haz clic en **"Productores"** en el menú superior
2. Verás una tabla con todos los productores:
   - Nombre
   - Zona (Norte, Centro, Sur)
   - Razones Sociales asociadas
   - Estado (semáforo de color)

**Filtros disponibles:**
- **Por Zona:** Norte / Centro / Sur / Todas
- **Por Estado:** OK / RISK / FAIL / Todos
- **Paginación:** 10 productores por página

#### Ficha Detallada de Productor

1. Haz clic en el **nombre** de cualquier productor
2. Se abrirá la vista detallada con pestañas:

**📋 Pestaña General:**
- Información del productor
- Estado actual
- Datos de contacto
- **Acción:** Botón "Ejecutar Diagnóstico Completo"

**🏢 Pestaña Razones Sociales:**
- Lista de personas morales asociadas
- RFC y régimen fiscal
- Estado individual de cada razón social

**🌱 Pestaña Ranchos:**
- Ubicación de ranchos
- Cultivos por rancho (hectáreas)
- Tipos: berries, vegetables, fruits, grains

**💰 Pestaña Financieros:**
- Snapshots históricos por período
- Ratios financieros:
  - Liquidez
  - Endeudamiento (%)
  - Ingresos anuales
  - Egresos anuales

**📋 Pestaña Validaciones:**
- Historial de diagnósticos ejecutados
- Tipo de validación
- Estado resultante
- Fecha de ejecución

**🚨 Pestaña Alertas:**
- Alertas específicas del productor
- Severidad
- Estado (activa/resuelta)
- Mensaje descriptivo

---

### 🔍 Ejecutar Diagnóstico One-Shot

**¿Qué es un diagnóstico?**
Es una validación puntual que consulta las fuentes externas (SAT, IMSS, APIs financieras) y evalúa las reglas de negocio para detectar riesgos.

**¿Cómo ejecutarlo?**

**Opción 1: Diagnóstico Completo**
1. Entra a la ficha de un productor
2. Pestaña "General"
3. Haz clic en **"Ejecutar Diagnóstico Completo"**
4. El sistema validará: SAT + IMSS + Financiero + Legal
5. Se generarán alertas si detecta problemas

**Opción 2: Diagnóstico por Tipo** (mediante API)
- SAT: Valida opinión de cumplimiento fiscal
- IMSS: Verifica suspensiones o adeudos
- FINANCIERO: Analiza ratios de liquidez y endeudamiento
- LEGAL: Revisa vigencia de poderes notariales

**Resultado:**
- El estado del productor se actualiza automáticamente
- Se crean alertas según la severidad
- Se registra en el historial de validaciones
- Se guarda un snapshot financiero (si aplica)

---

### 🚨 Gestión de Alertas

#### Ver Alertas

1. Haz clic en **"Alertas"** en el menú
2. Verás todas las alertas con:
   - Mensaje descriptivo
   - Productor afectado
   - Severidad (badge de color)
   - Fecha de creación
   - Estado (Activa/Resuelta)

**Filtros:**
- **Severidad:** HIGH / MEDIUM / LOW / Todas
- **Zona:** Norte / Centro / Sur / Todas
- **Estado:** Solo activas / Solo resueltas / Todas
- **Período:** Último mes / Últimos 3 meses / Personalizado

#### Resolver una Alerta

1. Localiza la alerta en el listado
2. Haz clic en el botón **"Resolver"**
3. La alerta se marca como resuelta
4. Se registra en la auditoría quién y cuándo la resolvió

**Nota:** Solo usuarios Admin y Analyst pueden resolver alertas.

#### Exportar Alertas

1. Aplica los filtros deseados
2. Haz clic en **"Exportar CSV"**
3. Se descargará un archivo con:
   - Productor
   - Razón Social
   - Zona
   - Mensaje de alerta
   - Severidad
   - Fecha

---

### ⚙️ Configuración de Reglas (Solo Admin)

#### ¿Qué es una regla?

Una regla es una condición de negocio que evalúa datos y genera alertas cuando se incumple. Ejemplos:

- **SAT_OPINION_NEGATIVA:** Alerta si la opinión fiscal es negativa
- **LIQUIDEZ_BAJA:** Alerta si liquidez < 1.5
- **ENDEUDAMIENTO_ALTO:** Alerta si deuda > 60%

#### Crear Nueva Regla

1. Ve a **"Admin → Reglas"**
2. Haz clic en **"+ Nueva Regla"**
3. Completa el formulario:
   - **Código:** Identificador único (ej: `LIQUIDEZ_CRITICA`)
   - **Nombre:** Nombre descriptivo
   - **Descripción:** Explicación de qué valida
   - **Tipo de Evaluador:** 
     - `threshold`: Para valores numéricos
     - `boolean`: Para condiciones sí/no
     - `custom`: Para lógica compleja
   - **Configuración:** JSON con parámetros
   - **Severidad:** HIGH / MEDIUM / LOW
   - **Activa:** Checkbox para habilitar/deshabilitar

4. Haz clic en **"Guardar"**

**Ejemplo de configuración (threshold):**
```json
{
  "field": "financialSnapshot.liquidez",
  "operator": "<",
  "threshold": 1.2
}
```

#### Editar Regla Existente

1. Localiza la regla en el listado
2. Haz clic en **"Editar"**
3. Modifica los campos necesarios
4. Haz clic en **"Guardar"**

#### Probar una Regla

1. En el editor de regla, haz clic en **"Test Rule"**
2. Pega un JSON de ejemplo con datos de prueba
3. El sistema evaluará la regla y mostrará el resultado
4. Útil para verificar la lógica antes de aplicarla

#### Eliminar una Regla

1. Haz clic en **"Eliminar"** junto a la regla
2. Confirma la eliminación
3. La regla dejará de evaluarse en futuros diagnósticos

**⚠️ Precaución:** Las reglas borradas no afectan alertas ya generadas.

---

### 🔄 Programador de Validaciones (Solo Admin)

#### ¿Para qué sirve?

El scheduler automatiza el monitoreo recurrente. En lugar de ejecutar diagnósticos manualmente, el sistema los ejecuta automáticamente según la frecuencia configurada.

**Configuración actual:** Mensual (modo demo)

#### Ver Estado del Scheduler

1. Ve a **"Admin → Scheduler"**
2. Verás:
   - **Estado:** Running / Stopped
   - **Frecuencia:** Cron expression
   - **Próxima ejecución:** Fecha estimada
   - **Última ejecución:** Timestamp

#### Ejecutar Monitoreo Manual

1. Haz clic en **"Ejecutar Ahora"**
2. Selecciona el cohort:
   - **all:** Todos los productores
   - (Futuros: por zona, por cultivo, etc.)
3. El sistema ejecutará diagnósticos completos para todos
4. Se generarán alertas según corresponda
5. Verás una confirmación al finalizar

#### Configuración Avanzada

El scheduler usa **node-cron** internamente. La expresión cron actual es:
```
0 0 1 * * (Día 1 de cada mes a medianoche)
```

Para cambiar la frecuencia, modifica `lib/services/scheduler.ts` (requiere acceso a código).

---

## Casos de Uso Comunes

### 📌 Caso 1: Monitoreo Mensual Automatizado

**Objetivo:** Detectar productores con riesgos nuevos cada mes.

**Pasos:**
1. **(Admin)** Verifica que el scheduler esté activo
2. El sistema ejecuta automáticamente el día 1 de cada mes
3. Se generan alertas para productores con problemas
4. **(Analyst)** Revisa las nuevas alertas en el centro de alertas
5. **(Analyst)** Investiga productores en estado RISK o FAIL
6. **(Analyst)** Resuelve alertas tras tomar acción correctiva
7. **(Admin)** Exporta reporte mensual para dirección

---

### 📌 Caso 2: Diagnóstico Previo a Renovación de Contrato

**Objetivo:** Validar que un productor está libre de riesgos antes de renovar.

**Pasos:**
1. **(Analyst)** Busca al productor en "Productores"
2. Entra a la ficha detallada
3. Haz clic en **"Ejecutar Diagnóstico Completo"**
4. Espera unos segundos mientras se consultan las APIs
5. Revisa el resultado:
   - ✅ **Estado OK:** Procede con renovación
   - ⚠️ **Estado RISK:** Solicita plan de mejora
   - 🔴 **Estado FAIL:** Rechaza renovación o aplica condiciones
6. Revisa las alertas específicas para entender el problema
7. Exporta la ficha del productor para documentación

---

### 📌 Caso 3: Investigación de Alerta Crítica

**Objetivo:** Entender y resolver una alerta HIGH de un productor.

**Pasos:**
1. **(Analyst)** Ve al "Centro de Alertas"
2. Filtra por Severidad = HIGH
3. Identifica la alerta a investigar
4. Lee el mensaje (ej: "Opinión de cumplimiento fiscal NEGATIVA")
5. Haz clic en el productor para ver su ficha
6. Pestaña "Razones Sociales": Identifica cuál tiene el problema
7. Pestaña "Validaciones": Revisa el historial
8. Contacta al productor para solicitar corrección
9. Una vez corregido, ejecuta nuevo diagnóstico
10. Si el estado mejora, resuelve la alerta

---

### 📌 Caso 4: Configurar Nueva Regla de Negocio

**Objetivo:** Crear una regla que alerte si los egresos superan el 90% de los ingresos.

**Pasos:**
1. **(Admin)** Ve a "Admin → Reglas"
2. Haz clic en **"+ Nueva Regla"**
3. Completa:
   - **Código:** `EGRESOS_ALTOS`
   - **Nombre:** "Egresos superiores al 90% de ingresos"
   - **Descripción:** "Alerta cuando la proporción egresos/ingresos supera 0.9"
   - **Tipo:** `custom`
   - **Config:**
   ```json
   {
     "logic": "egresosAnuales / ingresosAnuales > 0.9"
   }
   ```
   - **Severidad:** MEDIUM
   - **Activa:** ✅
4. Haz clic en **"Test Rule"** con datos de prueba
5. Si funciona correctamente, haz clic en **"Guardar"**
6. La regla se aplicará en los próximos diagnósticos

---

### 📌 Caso 5: Exportar Reporte Trimestral de Alertas

**Objetivo:** Crear un reporte CSV de todas las alertas del trimestre.

**Pasos:**
1. **(Admin/Analyst)** Ve al "Centro de Alertas"
2. Aplica filtro de período: Últimos 3 meses
3. (Opcional) Filtra por zona o severidad
4. Haz clic en **"Exportar CSV"**
5. Se descarga archivo `alertas_YYYY-MM-DD.csv`
6. Abre con Excel para análisis
7. El archivo incluye:
   - Productor
   - Razón Social
   - RFC
   - Zona
   - Mensaje completo
   - Severidad
   - Fecha de creación

---

## Preguntas Frecuentes

### ❓ ¿Qué significa cada estado de productor?

- **OK:** Todas las validaciones pasaron exitosamente. No hay riesgos detectados.
- **RISK:** Al menos una validación generó alerta de severidad MEDIUM. Requiere monitoreo.
- **FAIL:** Al menos una validación generó alerta de severidad HIGH. Requiere acción inmediata.
- **PENDIENTE:** No se han ejecutado validaciones aún.

### ❓ ¿Con qué frecuencia se actualizan los datos?

- **Modo Manual (One-Shot):** Cuando un usuario ejecuta un diagnóstico
- **Modo Recurrente:** Según la configuración del scheduler (mensual en demo)
- Los datos de SAT/IMSS/Financieros son consultados en tiempo real al ejecutar validaciones

### ❓ ¿Qué pasa si una API externa falla?

El sistema captura el error y:
1. Marca la validación como FAIL
2. Registra el error en el payload de salida
3. Permite reintentar manualmente
4. Las demás validaciones se ejecutan normalmente

### ❓ ¿Puedo personalizar las reglas de negocio?

Sí, los usuarios con rol **ADMIN** pueden:
- Crear nuevas reglas
- Editar reglas existentes
- Activar/desactivar reglas sin borrarlas
- Probar reglas antes de aplicarlas

### ❓ ¿Las alertas se envían por email?

En la versión MVP actual, las alertas solo se muestran en el portal. La integración con notificaciones por email/SMS está planificada para futuras versiones.

### ❓ ¿Cómo se protegen los datos sensibles?

- Autenticación con contraseñas hasheadas (bcrypt)
- Control de acceso basado en roles (RBAC)
- Validación de sesiones en cada petición
- Auditoría completa de acciones
- Las APIs externas son simulaciones (modo demo)

### ❓ ¿Puedo dar acceso a productores externos?

Sí, puedes crear usuarios con rol **PRODUCTOR**. Solo verán:
- Su propia información
- Sus alertas
- Su historial de validaciones

No podrán ejecutar diagnósticos ni ver información de otros productores.

### ❓ ¿Cómo se calcula el ratio de liquidez?

```
Liquidez = Activos Circulantes / Pasivos Circulantes
```

Valores recomendados:
- **< 1.0:** Riesgo alto de insolvencia
- **1.0 - 1.5:** Riesgo moderado
- **> 1.5:** Estado saludable

### ❓ ¿Cómo se calcula el endeudamiento?

```
Endeudamiento % = (Pasivos Totales / Activos Totales) × 100
```

Valores recomendados:
- **< 40%:** Bajo endeudamiento
- **40% - 60%:** Moderado
- **> 60%:** Alto endeudamiento (alerta)

### ❓ ¿Dónde se almacenan los datos?

En la versión MVP, los datos se almacenan en archivos JSON en el directorio `/data`. Para producción, se recomienda migrar a PostgreSQL (ya configurado en el proyecto).

### ❓ ¿Qué navegadores son compatibles?

- Google Chrome (recomendado)
- Mozilla Firefox
- Microsoft Edge
- Safari

Requiere JavaScript habilitado.

---

## 🆘 Soporte Técnico

### Contacto
Para soporte técnico o reportar problemas:
- **Email:** soporte@driscoll.local
- **Horario:** Lunes a Viernes, 9:00 - 18:00 hrs

### Información de Versión
- **Versión MVP:** 1.0.0
- **Última actualización:** Octubre 2025
- **Framework:** Next.js 14 con TypeScript

---

## 📖 Glosario

**API:** Interfaz de programación que permite consultar datos externos (SAT, IMSS, etc.)

**Diagnóstico:** Proceso de validación que consulta fuentes externas y evalúa reglas de negocio

**One-Shot:** Validación puntual ejecutada manualmente

**Recurrente:** Validación automática programada con el scheduler

**Snapshot Financiero:** Fotografía de los indicadores financieros en un momento específico

**RFC:** Registro Federal de Contribuyentes

**Razón Social:** Persona moral/empresa legalmente constituida

**KPI:** Indicador clave de desempeño (Key Performance Indicator)

**RBAC:** Control de acceso basado en roles (Role-Based Access Control)

**CSV:** Formato de archivo de valores separados por comas, compatible con Excel

---

## 📝 Notas Finales

Esta guía cubre las funcionalidades del **Portal MVP**. Para funcionalidades avanzadas, consulta la documentación técnica o contacta al equipo de desarrollo.

**¡Gracias por usar el Portal de Monitoreo Financiero-Fiscal Driscoll's!** 🍓
