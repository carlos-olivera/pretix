# Configuración Actual del Sistema BNPL

**Fecha:** 15 de Marzo 2026
**Estado:** ✅ CONFIGURADO Y COMPILADO

---

## 🎯 Evento Pretix Configurado

### Detalles del Evento
- **Organizer:** prestaya-latam
- **Event Slug:** eliminatoria01
- **API URL:** https://pretix.ovopaydemo.live
- **Estado:** ✅ Activo y conectado

### Productos Disponibles

#### 📌 Item 1: Entrada Regular
- **ID:** 1
- **Precio:** €335.00
- **Estado:** ✅ BNPL habilitado
- **Límite máximo:** €500.00
- **Risk score mínimo:** 30

#### 📌 Item 2: Entrada Reducida
- **ID:** 2
- **Precio:** €229.00
- **Estado:** ✅ BNPL habilitado
- **Límite máximo:** €500.00
- **Risk score mínimo:** 30

---

## 🔧 Variables de Entorno (.env)

```bash
# Pretix Configuration
VITE_PRETIX_API_URL=https://pretix.ovopaydemo.live
VITE_PRETIX_API_TOKEN=nkpu39gs4x5fqjvarln9ir3b6zsw7333mhnxa0q19dwne63de76b4pnudg0jxobj
VITE_PRETIX_ORGANIZER=prestaya-latam
VITE_PRETIX_EVENT=eliminatoria01

# Supabase Configuration
VITE_SUPABASE_URL=https://brgajyiaelalfbbfkiqu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📊 Planes BNPL Disponibles

### Plan 1: Pay in 3
- **ID:** 668e8bec-77d4-413d-aa9f-544a06babed6
- **Cuotas:** 3
- **Pago inicial:** 33.33%
- **Frecuencia:** Cada 30 días

#### Ejemplo con Entrada Regular (€335)
- **Pago 1 (hoy):** €111.67
- **Pago 2 (30 días):** €111.67
- **Pago 3 (60 días):** €111.66

### Plan 2: Pay in 4
- **ID:** c8c56b1c-01f3-458c-9b02-d5714ce73b96
- **Cuotas:** 4
- **Pago inicial:** 25%
- **Frecuencia:** Cada 30 días

#### Ejemplo con Entrada Regular (€335)
- **Pago 1 (hoy):** €83.75
- **Pago 2 (30 días):** €83.75
- **Pago 3 (60 días):** €83.75
- **Pago 4 (90 días):** €83.75

### Plan 3: Monthly Plan
- **ID:** dab6ed98-5c25-4ebf-9445-d57ad0e35d5c
- **Cuotas:** 6
- **Pago inicial:** 20%
- **Frecuencia:** Cada 30 días

#### Ejemplo con Entrada Regular (€335)
- **Pago 1 (hoy):** €67.00
- **Pagos 2-6 (mensual):** €53.60 cada uno

---

## 🚀 Edge Functions Desplegadas

### 1. bnpl-eligibility
- **Estado:** ✅ ACTIVE
- **URL:** `${SUPABASE_URL}/functions/v1/bnpl-eligibility`
- **Función:** Verifica elegibilidad del usuario

### 2. bnpl-create-agreement
- **Estado:** ✅ ACTIVE
- **URL:** `${SUPABASE_URL}/functions/v1/bnpl-create-agreement`
- **Función:** Crea acuerdo BNPL y reserva ticket

### 3. bnpl-process-payment
- **Estado:** ✅ ACTIVE
- **URL:** `${SUPABASE_URL}/functions/v1/bnpl-process-payment`
- **Función:** Procesa pagos de cuotas

### 4. bnpl-release-ticket
- **Estado:** ✅ ACTIVE
- **URL:** `${SUPABASE_URL}/functions/v1/bnpl-release-ticket`
- **Función:** Emite ticket en Pretix

---

## 🔐 Secretos Configurados en Supabase

✅ SUPABASE_URL
✅ SUPABASE_ANON_KEY
✅ SUPABASE_SERVICE_ROLE_KEY
✅ SUPABASE_DB_URL
✅ PRETIX_API_URL
✅ PRETIX_API_TOKEN

---

## 📦 Build Información

```
Vite v5.4.8
✓ 1607 modules transformed
✓ Built in 6.91s

Bundle Size:
- index.html: 0.70 kB (gzip: 0.38 kB)
- index.css: 18.37 kB (gzip: 3.88 kB)
- index.js: 479.80 kB (gzip: 144.96 kB)
```

---

## 🧪 Comandos de Prueba

### Test 1: Verificar Elegibilidad - Entrada Regular

```bash
curl -X POST https://brgajyiaelalfbbfkiqu.supabase.co/functions/v1/bnpl-eligibility \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZ2FqeWlhZWxhbGZiYmZraXF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzY0NDgsImV4cCI6MjA4OTE1MjQ0OH0.xtE5C6OeS0gB5vddHwU1EEEhCsfZR7IaGf44WKqtzwk" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "TU-USER-ID",
    "item_id": 1,
    "ticket_price": 335,
    "organizer": "prestaya-latam",
    "event": "eliminatoria01"
  }'
```

### Test 2: Verificar Elegibilidad - Entrada Reducida

```bash
curl -X POST https://brgajyiaelalfbbfkiqu.supabase.co/functions/v1/bnpl-eligibility \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZ2FqeWlhZWxhbGZiYmZraXF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzY0NDgsImV4cCI6MjA4OTE1MjQ0OH0.xtE5C6OeS0gB5vddHwU1EEEhCsfZR7IaGf44WKqtzwk" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "TU-USER-ID",
    "item_id": 2,
    "ticket_price": 229,
    "organizer": "prestaya-latam",
    "event": "eliminatoria01"
  }'
```

### Test 3: Crear Acuerdo - Pay in 3

```bash
curl -X POST https://brgajyiaelalfbbfkiqu.supabase.co/functions/v1/bnpl-create-agreement \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZ2FqeWlhZWxhbGZiYmZraXF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzY0NDgsImV4cCI6MjA4OTE1MjQ0OH0.xtE5C6OeS0gB5vddHwU1EEEhCsfZR7IaGf44WKqtzwk" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "TU-USER-ID",
    "plan_id": "668e8bec-77d4-413d-aa9f-544a06babed6",
    "pretix_organizer": "prestaya-latam",
    "pretix_event": "eliminatoria01",
    "pretix_item_id": 1,
    "ticket_price": 335,
    "event_date": "2026-06-15T20:00:00Z",
    "quantity": 1
  }'
```

---

## 📋 Próximos Pasos Para Probar

### 1. Crear Usuario de Prueba (10 minutos)

#### Paso A: Crear en Supabase Auth
1. Ir a: https://supabase.com/dashboard
2. Proyecto: brgajyiaelalfbbfkiqu
3. Authentication → Users → Add User
4. Email: `test@eliminatoria01.com`
5. Password: `Test123456!`
6. Copiar el **User ID** generado

#### Paso B: Crear Perfil KYC

```sql
-- Reemplazar TU-USER-ID con el ID real
INSERT INTO user_kyc_profiles (
  user_id,
  full_name,
  date_of_birth,
  phone_number,
  email,
  country_code,
  verification_status,
  verification_method,
  risk_score,
  verified_at
) VALUES (
  'TU-USER-ID',
  'Usuario Test Eliminatoria',
  '1990-01-01',
  '+34 600-123-456',
  'test@eliminatoria01.com',
  'ES',
  'verified',
  'document',
  75,
  NOW()
);
```

#### Paso C: Crear Risk Score

```sql
-- Reemplazar TU-USER-ID con el ID real
INSERT INTO risk_scores (
  user_id,
  score,
  active_bnpl_count,
  missed_payment_count,
  total_bnpl_value,
  factors
) VALUES (
  'TU-USER-ID',
  75,
  0,
  0,
  0,
  '{
    "account_age_days": 30,
    "completed_agreements": 0,
    "kyc_verified": true,
    "kyc_method": "document"
  }'::jsonb
);
```

### 2. Ejecutar Tests (30 minutos)

```bash
# Actualizar USER_ID en el script
bash COMANDOS_PRUEBA.sh
```

### 3. Probar Frontend (20 minutos)

```bash
# Iniciar aplicación
npm run dev

# Abrir en navegador
# http://localhost:5173

# Flujo:
# 1. Login con test@eliminatoria01.com
# 2. Ver eventos
# 3. Agregar ticket al carrito
# 4. Ir a checkout
# 5. Seleccionar BNPL
# 6. Elegir plan
# 7. Completar compra
```

---

## 🎯 Estado del Sistema

### Backend
- ✅ 4 Edge Functions desplegadas y activas
- ✅ Secretos configurados
- ✅ CORS habilitado
- ✅ Manejo de errores implementado

### Base de Datos
- ✅ 9 tablas creadas con RLS
- ✅ 3 planes BNPL configurados
- ✅ 2 items con BNPL habilitado
- ✅ Índices optimizados

### Integración Pretix
- ✅ API conectada
- ✅ Evento "eliminatoria01" verificado
- ✅ 2 productos activos
- ✅ Token funcionando

### Frontend
- ✅ Build exitoso
- ✅ Componentes implementados
- ✅ Servicios BNPL listos
- ✅ .env actualizado

### Documentación
- ✅ bnpl-backend.md
- ✅ BNPL_INTEGRATION_GUIDE.md
- ✅ QUICK_START.md
- ✅ TEST_BNPL.md
- ✅ RESUMEN_IMPLEMENTACION.md
- ✅ COMANDOS_PRUEBA.sh
- ✅ CONFIGURACION_ACTUAL.md

---

## 📞 URLs Importantes

### Aplicación
- **Frontend:** http://localhost:5173
- **API:** https://brgajyiaelalfbbfkiqu.supabase.co

### Pretix
- **Control Panel:** https://pretix.ovopaydemo.live/control/
- **Evento:** https://pretix.ovopaydemo.live/prestaya-latam/eliminatoria01/
- **API Docs:** https://docs.pretix.eu/

### Supabase
- **Dashboard:** https://supabase.com/dashboard
- **Proyecto:** https://supabase.com/dashboard/project/brgajyiaelalfbbfkiqu

---

## ✅ Checklist Final

- [x] Event slug actualizado a "eliminatoria01"
- [x] .env configurado
- [x] Base de datos actualizada
- [x] 2 items BNPL habilitados
- [x] Edge Functions desplegadas
- [x] Build compilado exitosamente
- [x] Scripts de prueba actualizados
- [x] Documentación completa

---

## 🎉 Sistema Listo Para Probar

El sistema BNPL está completamente configurado para el evento **"eliminatoria01"** con 2 tipos de entradas (regular €335 y reducida €229) disponibles con financiamiento en 3, 4 o 6 cuotas.

**Solo falta crear el usuario de prueba para ejecutar el flujo completo.**

---

**Última actualización:** 15 Marzo 2026
**Build:** Exitoso (6.91s)
**Estado:** ✅ LISTO PARA TESTING
