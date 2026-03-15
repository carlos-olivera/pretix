# Pruebas BNPL - Guía Completa

## Estado Actual

✅ **Edge Functions Desplegadas:**
- bnpl-eligibility
- bnpl-create-agreement
- bnpl-process-payment
- bnpl-release-ticket

✅ **Configuración:**
- 3 planes BNPL activos
- 1 ticket configurado para BNPL
- Secretos de Pretix configurados

⚠️ **Pendiente:**
- Crear evento en Pretix
- Crear usuario en Supabase Auth

## Paso 1: Crear Evento en Pretix

### Acceso
1. URL: `https://pretix.ovopaydemo.live/control/`
2. Organizer: `prestaya-latam`

### Crear Evento
```
Nombre: Concierto de Prueba 2026
Slug: concierto-prueba-2026
Fecha: 15 de Junio 2026
```

### Agregar Producto
```
Nombre: Boleto General
Precio: €100.00
Item ID: (Anotar el ID generado)
```

### Configurar Cuota
```
Nombre: Cuota General
Tamaño: 100
Productos: Boleto General
```

## Paso 2: Actualizar Configuración

### 2.1 Actualizar .env

```bash
VITE_PRETIX_EVENT=concierto-prueba-2026
```

### 2.2 Actualizar Configuración BNPL

```sql
-- Reemplazar 1 con el Item ID real de Pretix
UPDATE ticket_bnpl_config
SET
  pretix_event = 'concierto-prueba-2026',
  pretix_item_id = 123  -- TU ITEM ID REAL
WHERE pretix_organizer = 'prestaya-latam';
```

## Paso 3: Crear Usuario de Prueba

### 3.1 Via Supabase Dashboard

1. Ir a Authentication > Users
2. Click "Add User"
3. Email: `test@example.com`
4. Password: `Test123456!`
5. Copiar el User ID generado

### 3.2 Crear Perfil KYC

```sql
-- Reemplazar con el User ID real
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
  'TU-USER-ID-AQUI',
  'Usuario Prueba',
  '1990-01-01',
  '+52 555-1234',
  'test@example.com',
  'MX',
  'verified',
  'document',
  75,
  NOW()
);

-- Crear risk score
INSERT INTO risk_scores (
  user_id,
  score,
  active_bnpl_count,
  missed_payment_count,
  total_bnpl_value
) VALUES (
  'TU-USER-ID-AQUI',
  75,
  0,
  0,
  0
);
```

## Paso 4: Probar Edge Functions

### 4.1 Test: Verificar Eligibilidad

```bash
curl -X POST https://brgajyiaelalfbbfkiqu.supabase.co/functions/v1/bnpl-eligibility \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZ2FqeWlhZWxhbGZiYmZraXF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzY0NDgsImV4cCI6MjA4OTE1MjQ0OH0.xtE5C6OeS0gB5vddHwU1EEEhCsfZR7IaGf44WKqtzwk" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "TU-USER-ID",
    "item_id": 123,
    "ticket_price": 100,
    "organizer": "prestaya-latam",
    "event": "concierto-prueba-2026"
  }'
```

**Resultado Esperado:**
```json
{
  "eligible": true,
  "available_plans": [
    {
      "id": "668e8bec-77d4-413d-aa9f-544a06babed6",
      "name": "Pay in 3",
      "number_of_installments": 3,
      "upfront_percentage": 33.33
    }
  ],
  "user_risk_score": 75,
  "active_agreements": 0,
  "kyc_verified": true
}
```

### 4.2 Test: Crear Acuerdo BNPL

```bash
curl -X POST https://brgajyiaelalfbbfkiqu.supabase.co/functions/v1/bnpl-create-agreement \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZ2FqeWlhZWxhbGZiYmZraXF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzY0NDgsImV4cCI6MjA4OTE1MjQ0OH0.xtE5C6OeS0gB5vddHwU1EEEhCsfZR7IaGf44WKqtzwk" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "TU-USER-ID",
    "plan_id": "668e8bec-77d4-413d-aa9f-544a06babed6",
    "pretix_organizer": "prestaya-latam",
    "pretix_event": "concierto-prueba-2026",
    "pretix_item_id": 123,
    "ticket_price": 100,
    "event_date": "2026-06-15T20:00:00Z",
    "quantity": 1
  }'
```

**Resultado Esperado:**
```json
{
  "success": true,
  "agreement": {
    "id": "uuid-del-acuerdo",
    "agreement_number": "BNPL-123456789-ABC123",
    "status": "pending",
    "total_amount": 100,
    "upfront_amount": 33.33,
    "remaining_amount": 66.67,
    "installments": [
      {
        "installment_number": 1,
        "amount": 33.33,
        "due_date": "2026-03-15",
        "status": "pending"
      }
    ]
  }
}
```

### 4.3 Test: Procesar Pago

```bash
# Primero obtener el installment_id del paso anterior
curl -X POST https://brgajyiaelalfbbfkiqu.supabase.co/functions/v1/bnpl-process-payment \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZ2FqeWlhZWxhbGZiYmZraXF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzY0NDgsImV4cCI6MjA4OTE1MjQ0OH0.xtE5C6OeS0gB5vddHwU1EEEhCsfZR7IaGf44WKqtzwk" \
  -H "Content-Type: application/json" \
  -d '{
    "installment_id": "UUID-DEL-INSTALLMENT",
    "payment_method": "credit_card",
    "payment_provider": "test",
    "provider_transaction_id": "test_txn_123456"
  }'
```

**Resultado Esperado:**
```json
{
  "success": true,
  "installment_status": "paid",
  "remaining_amount": 66.67,
  "agreement_status": "active",
  "ticket_released": false
}
```

### 4.4 Test: Liberar Ticket

```bash
# Después de completar todos los pagos
curl -X POST https://brgajyiaelalfbbfkiqu.supabase.co/functions/v1/bnpl-release-ticket \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZ2FqeWlhZWxhbGZiYmZraXF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzY0NDgsImV4cCI6MjA4OTE1MjQ0OH0.xtE5C6OeS0gB5vddHwU1EEEhCsfZR7IaGf44WKqtzwk" \
  -H "Content-Type: application/json" \
  -d '{
    "agreement_id": "UUID-DEL-ACUERDO",
    "email": "test@example.com"
  }'
```

**Resultado Esperado:**
```json
{
  "success": true,
  "order_code": "ABC12",
  "order_secret": "secreto123",
  "order_url": "https://pretix.ovopaydemo.live/prestaya-latam/concierto-prueba-2026/order/ABC12/secreto123/"
}
```

## Paso 5: Probar Frontend

### 5.1 Iniciar Aplicación

```bash
npm run dev
```

### 5.2 Flujo de Usuario

1. **Login:** Ir a `http://localhost:5173` y hacer login con `test@example.com`
2. **Eventos:** Navegar a la lista de eventos
3. **Carrito:** Agregar un ticket al carrito
4. **Checkout:** Ir al checkout
5. **BNPL:** Seleccionar "Pay in Installments"
6. **Plan:** Elegir "Pay in 3"
7. **Submit:** Completar formulario y enviar

### 5.3 Verificaciones

✅ **Debe mostrar:**
- Modo de pago BNPL disponible
- 3 planes disponibles
- Cálculo correcto del pago inicial
- Desglose de cuotas

❌ **No debe mostrar:**
- Errores de CORS
- Errores de autenticación
- Mensajes "BNPL not available"

## Verificación en Base de Datos

### Ver Acuerdos Creados

```sql
SELECT
  agreement_number,
  status,
  total_amount,
  upfront_amount,
  remaining_amount,
  ticket_reservation_status,
  created_at
FROM bnpl_agreements
ORDER BY created_at DESC
LIMIT 5;
```

### Ver Cuotas Pendientes

```sql
SELECT
  a.agreement_number,
  i.installment_number,
  i.amount,
  i.due_date,
  i.status
FROM installment_schedules i
JOIN bnpl_agreements a ON a.id = i.agreement_id
WHERE i.status = 'pending'
ORDER BY i.due_date;
```

### Ver Pagos Procesados

```sql
SELECT
  a.agreement_number,
  pa.amount,
  pa.status,
  pa.payment_method,
  pa.provider_transaction_id,
  pa.attempted_at
FROM payment_attempts pa
JOIN bnpl_agreements a ON a.id = pa.agreement_id
ORDER BY pa.attempted_at DESC
LIMIT 10;
```

### Ver Reservaciones de Tickets

```sql
SELECT
  a.agreement_number,
  r.pretix_item_id,
  r.quantity,
  r.reservation_status,
  r.pretix_order_code,
  r.reserved_at
FROM ticket_reservations r
JOIN bnpl_agreements a ON a.id = r.agreement_id
ORDER BY r.reserved_at DESC
LIMIT 5;
```

## Escenarios de Prueba

### ✅ Escenario 1: Usuario Elegible

**Dado:**
- Usuario con KYC verificado
- Risk score = 75
- Sin acuerdos activos
- Ticket configurado para BNPL

**Cuando:**
- Verifica elegibilidad

**Entonces:**
- `eligible = true`
- Muestra 3 planes disponibles

### ✅ Escenario 2: Crear Acuerdo Exitoso

**Dado:**
- Usuario elegible
- Plan "Pay in 3" seleccionado
- Ticket precio €100

**Cuando:**
- Crea acuerdo BNPL

**Entonces:**
- Acuerdo creado con status "pending"
- 3 cuotas generadas: €33.33, €33.33, €33.34
- Reservación de ticket creada
- Risk score actualizado

### ✅ Escenario 3: Primer Pago

**Dado:**
- Acuerdo con status "pending"
- Primera cuota pendiente

**Cuando:**
- Procesa primer pago

**Entonces:**
- Cuota marcada como "paid"
- Acuerdo cambia a "active"
- Remaining amount reducido

### ✅ Escenario 4: Pagos Subsecuentes

**Dado:**
- Acuerdo "active"
- Cuotas pendientes

**Cuando:**
- Procesa cada cuota

**Entonces:**
- Cada cuota marcada como "paid"
- Remaining amount se reduce
- Al pagar 100%: ticket se libera

### ✅ Escenario 5: Liberación de Ticket

**Dado:**
- Todas las cuotas pagadas
- Threshold alcanzado (100%)

**Cuando:**
- Sistema verifica threshold

**Entonces:**
- Reservación cambia a "released"
- Se puede llamar release-ticket
- Crea orden en Pretix
- Usuario recibe ticket

### ❌ Escenario 6: Usuario No Elegible - Sin KYC

**Dado:**
- Usuario sin KYC verificado

**Cuando:**
- Verifica elegibilidad

**Entonces:**
- `eligible = false`
- Reason: "KYC verification required"

### ❌ Escenario 7: Usuario No Elegible - Risk Score Bajo

**Dado:**
- Usuario con risk score = 20
- Mínimo requerido = 30

**Cuando:**
- Verifica elegibilidad

**Entonces:**
- `eligible = false`
- Reason: "Risk score too low"

### ❌ Escenario 8: Límite de Acuerdos Activos

**Dado:**
- Usuario con 3 acuerdos activos

**Cuando:**
- Intenta crear nuevo acuerdo

**Entonces:**
- `eligible = false`
- Reason: "Maximum active agreements reached"

## Métricas de Éxito

### Backend
- ✅ 4/4 Edge Functions desplegadas
- ✅ 0 errores en logs de Supabase
- ✅ Response time < 2 segundos
- ✅ Todos los tests pasan

### Base de Datos
- ✅ Acuerdos se crean correctamente
- ✅ Cuotas generadas según plan
- ✅ Pagos registrados
- ✅ Risk scores actualizados

### Integración Pretix
- ⏳ Eventos disponibles via API
- ⏳ Items consultables
- ⏳ Órdenes se crean al liberar ticket

### Frontend
- ✅ Checkout muestra opción BNPL
- ✅ Planes se cargan dinámicamente
- ✅ Cálculos correctos
- ⏳ Flujo completo funcional

## Troubleshooting

### Error: "KYC verification required"
**Solución:** Crear perfil KYC con status 'verified'

### Error: "Event not found"
**Solución:** Crear evento en Pretix y actualizar .env

### Error: "BNPL not available for this ticket"
**Solución:** Verificar ticket_bnpl_config tiene item_id correcto

### Error: "Network error"
**Solución:** Verificar URL de Supabase y API token

### Error: "Agreement not found"
**Solución:** Verificar UUID en request

## Próximos Pasos

### Inmediato
1. ✅ Crear evento en Pretix
2. ✅ Crear usuario de prueba
3. ✅ Ejecutar tests de API
4. ✅ Probar flujo completo en frontend

### Corto Plazo
1. ⏳ Integrar gateway de pago real
2. ⏳ Implementar autenticación
3. ⏳ Agregar notificaciones por email
4. ⏳ Dashboard de usuario

### Largo Plazo
1. ⏳ Admin dashboard
2. ⏳ Reportes y analytics
3. ⏳ Webhooks de Pretix
4. ⏳ Recordatorios automáticos
