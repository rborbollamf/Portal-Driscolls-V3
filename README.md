# Portal de Monitoreo Financiero-Fiscal para Productores

Portal de diagnóstico y monitoreo para productores agrícolas (caso Driscoll's). Sistema completo para detectar riesgos fiscales/financieros (SAT, IMSS, liquidez/endeudamiento), emitir alertas y ofrecer visibilidad mediante dashboards y fichas por productor.

## 🌟 Características Principales

- ✅ **Diagnóstico One-Shot**: Análisis instantáneo de cumplimiento fiscal y financiero
- 🔄 **Monitoreo Recurrente**: Validaciones programadas con node-cron
- 📊 **Motor de Reglas Configurable**: 5 reglas predefinidas editables sin re-deploy
- 👥 **RBAC Completo**: Roles ADMIN, ANALYST, PRODUCER con permisos diferenciados
- 📈 **Dashboards Interactivos**: KPIs, gráficos por zona/cultivo, alertas en tiempo real
- 📤 **Exportes CSV**: Descarga de alertas por periodo
- 🎯 **Adapters Mock**: SAT, IMSS y Financial con respuestas deterministas

## 🛠️ Stack Tecnológico

### Frontend
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Recharts** para visualizaciones

### Backend
- **Next.js API Routes**
- **NextAuth** para autenticación (email/password + JWT)
- **node-cron** para tareas programadas
- **Almacenamiento en JSON** (data/db.json)

### Seguridad
- **bcrypt** para hashing de contraseñas
- **Zod** para validación de inputs
- **Audit logging** en acciones críticas

## 📁 Estructura del Proyecto

```
.
├── app/                      # Next.js App Router
│   ├── api/                  # API Routes
│   │   ├── auth/            # NextAuth endpoints
│   │   ├── producers/       # Gestión de productores
│   │   ├── alerts/          # Gestión de alertas
│   │   ├── rules/           # CRUD de reglas
│   │   ├── validation/      # Ejecución de validaciones
│   │   ├── scheduler/       # Control del scheduler
│   │   └── exports/         # Exportación CSV
│   ├── dashboard/           # Dashboard principal
│   ├── producers/           # Lista y fichas de productores
│   ├── alerts/              # Gestión de alertas
│   ├── admin/               # Panel administrativo
│   │   ├── rules/          # Editor de reglas
│   │   └── scheduler/      # Configuración de scheduler
│   └── login/               # Página de login
├── components/              # Componentes React
│   ├── ui/                 # Componentes UI (shadcn-ready)
│   └── nav-bar.tsx         # Navegación principal
├── lib/                     # Lógica de negocio
│   ├── adapters/           # Adapters mock (SAT, IMSS, Financial)
│   ├── auth/               # Configuración NextAuth
│   ├── db/                 # Sistema de almacenamiento JSON
│   ├── rules/              # Motor de reglas
│   ├── services/           # Servicios (validation, scheduler)
│   └── utils/              # Utilidades
├── scripts/                 # Scripts de utilidad
│   └── seed.ts             # Seed de datos demo
├── types/                   # Definiciones TypeScript
│   └── index.ts            # Tipos principales
└── data/                    # Almacenamiento JSON
    └── db.json             # Base de datos (generada)
```

## 🚀 Configuración e Instalación

### 1. Variables de Entorno

Crea un archivo `.env.local` (ya existe uno preconfigura do):

```bash
# NextAuth Configuration
NEXTAUTH_SECRET="demo-secret-key-12345678901234567890"
NEXTAUTH_URL="http://localhost:3000"

# Mock External APIs
SAT_API_KEY="demo-sat-key"
IMSS_API_KEY="demo-imss-key"

# Optional Features
ENABLE_GOOGLE_AUTH=false
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Generar Datos Demo

```bash
npm run seed
```

Esto creará:
- 3 usuarios demo (admin, analyst, producer)
- 10 productores con perfiles variados
- 21 razones sociales
- 19 ranchos
- 28 cultivos
- 42 snapshots financieros
- 5 reglas de validación
- 5 alertas de ejemplo

### 4. Iniciar Servidor de Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en: http://localhost:5000

## 👤 Usuarios Demo

| Email | Contraseña | Rol | Permisos |
|-------|-----------|-----|----------|
| admin@demo.local | Admin123! | ADMIN | Acceso completo + gestión de reglas y scheduler |
| analyst@demo.local | Analyst123! | ANALYST | Dashboard, productores, alertas, validaciones |
| producer@demo.local | Producer123! | PRODUCER | Solo su ficha y alertas propias |

## 🏗️ Arquitectura del Sistema

```mermaid
graph TB
    subgraph Frontend
        A[Next.js App Router]
        B[Dashboard]
        C[Productores]
        D[Alertas]
        E[Admin Panel]
    end
    
    subgraph Backend
        F[API Routes]
        G[NextAuth]
        H[Validation Service]
        I[Rule Engine]
        J[Scheduler]
    end
    
    subgraph Storage
        K[JSON Database]
    end
    
    subgraph External
        L[SAT Adapter Mock]
        M[IMSS Adapter Mock]
        N[Financial Adapter Mock]
    end
    
    A --> F
    F --> G
    F --> H
    H --> I
    H --> L
    H --> M
    H --> N
    I --> K
    J --> H
    F --> K
```

## 🔍 Flujos Principales

### Diagnóstico One-Shot

1. Usuario hace clic en "Diagnóstico" en la ficha de productor
2. Sistema crea ValidationTask por cada tipo (SAT, IMSS, FINANCIERA, LEGAL)
3. Se invocan los adapters correspondientes
4. El RuleEngine evalúa reglas activas
5. Se generan alertas según resultados
6. Se actualiza el semáforo de estado del productor

### Monitoreo Recurrente

1. node-cron ejecuta según programación (demo: mensual)
2. Se seleccionan entidades por cohorte (zona o lista)
3. Se ejecutan validaciones completas
4. Si cambian métricas → nuevas alertas
5. Se registra en AuditLog

## 📊 Modelo de Datos

### Entidades Principales

- **User**: Usuarios del sistema con roles RBAC
- **Producer**: Productores agrícolas
- **LegalEntity**: Razones sociales (personas morales/físicas)
- **Ranch**: Ranchos/unidades productivas
- **Crop**: Cultivos (fresa, frambuesa, arándano, mora)
- **FinancialSnapshot**: Snapshots financieros por periodo
- **ValidationTask**: Tareas de validación ejecutadas
- **Alert**: Alertas generadas por el sistema
- **Rule**: Reglas de validación configurables
- **AuditLog**: Bitácora de auditoría

## 🎯 Reglas de Validación Iniciales

| Código | Nombre | Severidad | Tipo | Descripción |
|--------|--------|-----------|------|-------------|
| SAT_OPINION_NEGATIVA | Opinión SAT Negativa | HIGH | BOOLEAN | Detecta opinión negativa del SAT |
| IMSS_SUSPENSION | Suspensión IMSS | HIGH | BOOLEAN | Detecta estatus suspendido en IMSS |
| ENDEUDAMIENTO_ALTO | Endeudamiento Alto | HIGH | THRESHOLD | Endeudamiento > 35% |
| LIQUIDEZ_BAJA | Liquidez Baja | MEDIUM | THRESHOLD | Liquidez < umbral (1.0) |
| PODERES_VENCIDOS | Poderes Vencidos | MEDIUM | CUSTOM | Poderes notariales vencidos/próximos |

## 🧪 Criterios de Aceptación (QA Manual)

### ✅ Flujo Completo

1. **Login**: Ingresar con usuario admin/analyst/producer
2. **Dashboard**: Verificar KPIs, gráficos y alertas recientes
3. **Productores**: Filtrar por zona/estado, ver listado
4. **Diagnóstico One-Shot**: Ejecutar en un productor → ver alertas generadas
5. **Ficha de Productor**: Ver razones sociales, ranchos, cultivos, financiero, alertas
6. **Alertas**: Filtrar, resolver, exportar CSV
7. **Reglas (Admin)**: Ver, activar/desactivar, modificar configuración
8. **Scheduler (Admin)**: Ejecutar monitoreo manual por zona

### ✅ RBAC

- ADMIN: Acceso a /admin/*
- ANALYST: Acceso a dashboard, productores, alertas, validación
- PRODUCER: Solo su ficha y alertas propias (limitado)

## 📦 Scripts Disponibles

```bash
# Desarrollo
npm run dev          # Inicia servidor en puerto 5000

# Producción
npm run build        # Construye para producción
npm run start        # Inicia servidor de producción

# Utilidades
npm run seed         # Genera datos demo
npm run lint         # Ejecuta ESLint
```

## 🔄 Migración a PostgreSQL (Futuro)

El sistema está diseñado para migrar fácilmente de JSON a PostgreSQL:

1. Instalar Prisma: `npm install @prisma/client prisma`
2. Crear schema en `prisma/schema.prisma`
3. Ejecutar `npx prisma migrate dev`
4. Reemplazar funciones en `lib/db/index.ts`

## 🚀 Próximas Fases

- [ ] Integración con APIs reales de SAT e IMSS
- [ ] Reglas avanzadas con multi-condiciones
- [ ] Notificaciones por email/SMS
- [ ] Analytics avanzado con tendencias
- [ ] Sistema de gestión documental
- [ ] Dashboard ejecutivo con BI

## 📝 Notas de Desarrollo

- **Sin Docker**: El entorno usa Nix, no se requiere virtualización
- **Puerto 5000**: Único puerto no bloqueado por firewall en Replit
- **LSP Warnings**: Normales hasta que Next.js compile, se resuelven al iniciar
- **JSON Database**: Para prototipado rápido, lista para migrar a PostgreSQL

## 🤝 Contribución

Este es un MVP funcional. Para agregar features:

1. Crear nueva regla en `lib/rules/engine.ts`
2. Agregar endpoint en `app/api/`
3. Crear componente en `components/`
4. Actualizar tipos en `types/index.ts`

## 📄 Licencia

Proyecto demo para Driscoll's - Uso interno

---

**Desarrollado con Next.js 14 + TypeScript + Tailwind CSS**
