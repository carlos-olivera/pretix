#!/bin/bash
# Comandos de Prueba BNPL - Copy & Paste Ready
# ============================================

# CONFIGURACIÓN
SUPABASE_URL="https://brgajyiaelalfbbfkiqu.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZ2FqeWlhZWxhbGZiYmZraXF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzY0NDgsImV4cCI6MjA4OTE1MjQ0OH0.xtE5C6OeS0gB5vddHwU1EEEhCsfZR7IaGf44WKqtzwk"

# VALORES A REEMPLAZAR
USER_ID="REEMPLAZAR-CON-USER-ID"
ITEM_ID=1
EVENT_SLUG="eliminatoria01"
PLAN_ID="668e8bec-77d4-413d-aa9f-544a06babed6"  # Pay in 3

# ============================================
# TEST 1: VERIFICAR ELEGIBILIDAD
# ============================================
echo "🔍 Test 1: Verificando elegibilidad BNPL..."

curl -X POST "${SUPABASE_URL}/functions/v1/bnpl-eligibility" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"${USER_ID}\",
    \"item_id\": ${ITEM_ID},
    \"ticket_price\": 100,
    \"organizer\": \"prestaya-latam\",
    \"event\": \"${EVENT_SLUG}\"
  }" | jq '.'

echo ""
echo "✅ Resultado esperado: eligible = true, available_plans con 3 planes"
echo ""

# ============================================
# TEST 2: CREAR ACUERDO BNPL
# ============================================
echo "📝 Test 2: Creando acuerdo BNPL..."

AGREEMENT_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/bnpl-create-agreement" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"${USER_ID}\",
    \"plan_id\": \"${PLAN_ID}\",
    \"pretix_organizer\": \"prestaya-latam\",
    \"pretix_event\": \"${EVENT_SLUG}\",
    \"pretix_item_id\": ${ITEM_ID},
    \"ticket_price\": 100,
    \"event_date\": \"2026-06-15T20:00:00Z\",
    \"quantity\": 1
  }")

echo $AGREEMENT_RESPONSE | jq '.'

# Extraer IDs del acuerdo
AGREEMENT_ID=$(echo $AGREEMENT_RESPONSE | jq -r '.agreement.id')
INSTALLMENT_1_ID=$(echo $AGREEMENT_RESPONSE | jq -r '.agreement.installments[0].id')
INSTALLMENT_2_ID=$(echo $AGREEMENT_RESPONSE | jq -r '.agreement.installments[1].id')
INSTALLMENT_3_ID=$(echo $AGREEMENT_RESPONSE | jq -r '.agreement.installments[2].id')

echo ""
echo "✅ Acuerdo creado: ${AGREEMENT_ID}"
echo "✅ Cuota 1 ID: ${INSTALLMENT_1_ID}"
echo "✅ Cuota 2 ID: ${INSTALLMENT_2_ID}"
echo "✅ Cuota 3 ID: ${INSTALLMENT_3_ID}"
echo ""

# ============================================
# TEST 3: PROCESAR PRIMER PAGO
# ============================================
echo "💳 Test 3: Procesando primer pago..."

curl -X POST "${SUPABASE_URL}/functions/v1/bnpl-process-payment" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"installment_id\": \"${INSTALLMENT_1_ID}\",
    \"payment_method\": \"credit_card\",
    \"payment_provider\": \"test\",
    \"provider_transaction_id\": \"test_txn_001\"
  }" | jq '.'

echo ""
echo "✅ Resultado esperado: success = true, agreement_status = active"
echo ""

# ============================================
# TEST 4: PROCESAR SEGUNDO PAGO
# ============================================
echo "💳 Test 4: Procesando segundo pago..."

curl -X POST "${SUPABASE_URL}/functions/v1/bnpl-process-payment" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"installment_id\": \"${INSTALLMENT_2_ID}\",
    \"payment_method\": \"credit_card\",
    \"payment_provider\": \"test\",
    \"provider_transaction_id\": \"test_txn_002\"
  }" | jq '.'

echo ""
echo "✅ Resultado esperado: success = true, remaining_amount reducido"
echo ""

# ============================================
# TEST 5: PROCESAR TERCER PAGO
# ============================================
echo "💳 Test 5: Procesando tercer pago..."

curl -X POST "${SUPABASE_URL}/functions/v1/bnpl-process-payment" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"installment_id\": \"${INSTALLMENT_3_ID}\",
    \"payment_method\": \"credit_card\",
    \"payment_provider\": \"test\",
    \"provider_transaction_id\": \"test_txn_003\"
  }" | jq '.'

echo ""
echo "✅ Resultado esperado: success = true, agreement_status = completed, ticket_released = true"
echo ""

# ============================================
# TEST 6: LIBERAR TICKET
# ============================================
echo "🎟️ Test 6: Liberando ticket en Pretix..."

curl -X POST "${SUPABASE_URL}/functions/v1/bnpl-release-ticket" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"agreement_id\": \"${AGREEMENT_ID}\",
    \"email\": \"test@example.com\"
  }" | jq '.'

echo ""
echo "✅ Resultado esperado: success = true, order_code presente, order_url disponible"
echo ""

# ============================================
# VERIFICACIONES EN BASE DE DATOS
# ============================================
echo "🔍 Verificaciones adicionales..."
echo ""
echo "Para verificar en la base de datos, ejecuta estos queries en Supabase:"
echo ""
echo "-- Ver acuerdo creado"
echo "SELECT agreement_number, status, total_amount, remaining_amount"
echo "FROM bnpl_agreements WHERE id = '${AGREEMENT_ID}';"
echo ""
echo "-- Ver todas las cuotas"
echo "SELECT installment_number, amount, due_date, status"
echo "FROM installment_schedules WHERE agreement_id = '${AGREEMENT_ID}';"
echo ""
echo "-- Ver intentos de pago"
echo "SELECT amount, status, payment_method, attempted_at"
echo "FROM payment_attempts WHERE agreement_id = '${AGREEMENT_ID}';"
echo ""
echo "-- Ver reservación"
echo "SELECT reservation_status, pretix_order_code, confirmed_at"
echo "FROM ticket_reservations WHERE agreement_id = '${AGREEMENT_ID}';"
echo ""

# ============================================
# INSTRUCCIONES FINALES
# ============================================
echo "============================================"
echo "🎉 TESTS COMPLETADOS"
echo "============================================"
echo ""
echo "Próximos pasos:"
echo "1. Revisar que todos los tests pasaron exitosamente"
echo "2. Verificar en Pretix que la orden se creó"
echo "3. Probar el flujo completo en el frontend"
echo ""
echo "Frontend URL: http://localhost:5173"
echo "Pretix Control: https://pretix.ovopaydemo.live/control/"
echo ""
