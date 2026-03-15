# BNPL Quick Start Guide

## 🚀 What's Been Built

A complete **Buy Now Pay Later (BNPL)** system integrated with **Pretix** ticketing platform, featuring:

- ✅ 4 Supabase Edge Functions (deployed)
- ✅ Complete database schema with 9 tables
- ✅ Enhanced checkout with BNPL support
- ✅ Pretix API integration
- ✅ Risk scoring system
- ✅ Installment payment scheduling
- ✅ Ticket reservation and release logic

## 📋 Prerequisites

Before you start, you need:

1. ✅ Supabase account (already configured)
2. ✅ Pretix instance at `https://pretix.ovopaydemo.live`
3. ✅ Pretix API token (already configured)
4. ⚠️ At least one event in Pretix with products
5. ⏳ Payment gateway account (Stripe/Adyen) - for production

## 🎯 5-Minute Setup

### Step 1: Create a Pretix Event (Required!)

1. Go to: `https://pretix.ovopaydemo.live/control/`
2. Click **Organizers** → **prestaya-latam**
3. Click **Create Event**
4. Fill in:
   - Event name: "Test Concert 2026"
   - Event slug: `test-concert-2026` (note this!)
   - Event date: Pick a future date
5. Click **Create**

### Step 2: Add Products

1. In your new event, go to **Products**
2. Click **Create Product**
3. Add product:
   - Name: "General Admission"
   - Price: €100
   - Active: Yes
4. Go to **Quotas** → **Create Quota**
5. Set:
   - Name: "General Admission Quota"
   - Size: 100
   - Select your product
6. Save

### Step 3: Update Environment

Update `.env` with your event slug:

```bash
VITE_PRETIX_EVENT=test-concert-2026
```

### Step 4: Configure BNPL for Your Product

Get your item ID from Pretix (visible in product URL) and run:

```sql
-- Replace 123 with your actual Pretix item ID
INSERT INTO ticket_bnpl_config (
  pretix_organizer,
  pretix_event,
  pretix_item_id,
  bnpl_enabled,
  allowed_plan_ids,
  maximum_ticket_price,
  minimum_user_risk_score
) VALUES (
  'prestaya-latam',
  'test-concert-2026',
  123, -- YOUR ITEM ID
  true,
  ARRAY[]::uuid[],
  2000,
  30
) ON CONFLICT DO NOTHING;
```

### Step 5: Create Test User

```sql
-- Create a test user with KYC
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
  'test-user-123',
  'Test User',
  '1990-01-01',
  '+1234567890',
  'test@example.com',
  'US',
  'verified',
  'basic',
  70,
  NOW()
) ON CONFLICT DO NOTHING;

-- Create risk score
INSERT INTO risk_scores (
  user_id,
  score,
  active_bnpl_count,
  missed_payment_count,
  total_bnpl_value
) VALUES (
  'test-user-123',
  70,
  0,
  0,
  0
) ON CONFLICT DO NOTHING;
```

### Step 6: Start Development

```bash
npm run dev
```

Visit: `http://localhost:5173`

## 🧪 Testing the Flow

### Test 1: Check Eligibility

```bash
curl -X POST https://brgajyiaelalfbbfkiqu.supabase.co/functions/v1/bnpl-eligibility \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZ2FqeWlhZWxhbGZiYmZraXF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzY0NDgsImV4cCI6MjA4OTE1MjQ0OH0.xtE5C6OeS0gB5vddHwU1EEEhCsfZR7IaGf44WKqtzwk" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user-123",
    "item_id": 123,
    "ticket_price": 100,
    "organizer": "prestaya-latam",
    "event": "test-concert-2026"
  }'
```

**Expected:** `{"eligible": true, "available_plans": [...]}`

### Test 2: Create Agreement

```bash
curl -X POST https://brgajyiaelalfbbfkiqu.supabase.co/functions/v1/bnpl-create-agreement \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user-123",
    "plan_id": "668e8bec-77d4-413d-aa9f-544a06babed6",
    "pretix_organizer": "prestaya-latam",
    "pretix_event": "test-concert-2026",
    "pretix_item_id": 123,
    "ticket_price": 100,
    "event_date": "2026-06-15T19:00:00Z",
    "quantity": 1
  }'
```

**Expected:** Agreement created with installment schedule

### Test 3: Process Payment

```bash
curl -X POST https://brgajyiaelalfbbfkiqu.supabase.co/functions/v1/bnpl-process-payment \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "installment_id": "your-installment-id",
    "payment_method": "credit_card",
    "payment_provider": "test",
    "provider_transaction_id": "test_123"
  }'
```

**Expected:** Payment successful, installment marked as paid

## 📊 Available BNPL Plans

Three plans are pre-configured:

| Plan | Installments | Upfront | Frequency |
|------|--------------|---------|-----------|
| Pay in 3 | 3 payments | 33.33% | 30 days |
| Pay in 4 | 4 payments | 25% | 30 days |
| Monthly | 6 payments | 20% | 30 days |

## 🎨 Frontend Features

### Checkout Page (`/checkout`)

- Payment mode toggle (Full vs BNPL)
- Automatic eligibility check
- Visual plan selection
- Real-time payment calculation
- Contact and billing forms

### User Flow

1. **Browse Events** → Event List page
2. **Select Ticket** → Event Detail page
3. **Add to Cart** → Cart page
4. **Checkout** → Choose BNPL or Full Payment
5. **Select Plan** → Pick installment plan
6. **Make First Payment** → Redirects to payment
7. **View Dashboard** → See payment schedule

## 🔧 Configuration

### BNPL Plans

Edit in Supabase dashboard or via SQL:

```sql
UPDATE bnpl_plans
SET
  upfront_percentage = 30,  -- Change upfront amount
  late_fee_amount = 10,     -- Set late fee
  grace_period_days = 5     -- Grace period
WHERE slug = 'pay-in-4';
```

### Ticket Configuration

```sql
UPDATE ticket_bnpl_config
SET
  maximum_ticket_price = 500,          -- Max price for BNPL
  minimum_user_risk_score = 50,        -- Min risk score
  ticket_release_threshold_percentage = 80  -- Release at 80% paid
WHERE pretix_item_id = 123;
```

## 📁 Project Structure

```
src/
├── lib/
│   ├── api/
│   │   ├── pretix-client.ts          # Pretix API wrapper
│   │   └── bnpl-client.ts            # Supabase direct queries
│   ├── services/
│   │   └── bnpl-service.ts           # Edge Function caller
│   └── config/
│       └── env.ts                    # Environment config
├── features/
│   ├── checkout/
│   │   └── CheckoutWithBNPL.tsx      # Enhanced checkout
│   ├── bnpl/
│   │   ├── dashboard/
│   │   │   └── BNPLDashboard.tsx     # User dashboard
│   │   ├── kyc/
│   │   │   └── KYCVerification.tsx   # KYC flow
│   │   └── plans/
│   │       └── BNPLPlanSelector.tsx  # Plan selection
│   └── events/
│       ├── EventList.tsx
│       └── EventDetail.tsx

supabase/
├── functions/
│   ├── bnpl-eligibility/
│   ├── bnpl-create-agreement/
│   ├── bnpl-process-payment/
│   └── bnpl-release-ticket/
└── migrations/
    └── 20260315135705_create_bnpl_system.sql
```

## 🚨 Common Issues

### "BNPL not available for this ticket"

**Cause:** No configuration in `ticket_bnpl_config`

**Fix:** Run Step 4 with correct item ID

### "KYC verification required"

**Cause:** No KYC profile for user

**Fix:** Run Step 5 to create test user

### "Pretix API error"

**Cause:** Event doesn't exist or API token invalid

**Fix:**
1. Verify event exists in Pretix
2. Check `VITE_PRETIX_API_TOKEN` is correct
3. Verify `VITE_PRETIX_EVENT` matches event slug

### "No events found"

**Cause:** Event not created in Pretix

**Fix:** Complete Step 1 to create event

## 🎓 Learn More

- **Full Backend Spec:** See `bnpl-backend.md` (83 pages)
- **Integration Guide:** See `BNPL_INTEGRATION_GUIDE.md`
- **Implementation Details:** See `IMPLEMENTATION_SUMMARY.md`
- **Pretix API:** See your Pretix API documentation file

## 🔐 Security Notes

### Current State (Development)

- ❌ Mock user authentication (`test-user-123`)
- ❌ Simulated payments (no real gateway)
- ❌ No KYC provider integration
- ⚠️ Self-signed SSL certificate

### Production Requirements

- ✅ Implement Supabase Auth
- ✅ Integrate payment gateway (Stripe/Adyen)
- ✅ Add KYC provider (Onfido/Jumio)
- ✅ Install valid SSL certificate
- ✅ Enable rate limiting
- ✅ Add monitoring and logging

## 📈 Next Steps

### Immediate (This Week)

1. ✅ Create Pretix event - **Done in 15 min**
2. ✅ Test eligibility endpoint - **5 min**
3. ✅ Create test agreement - **5 min**
4. ✅ Test payment flow - **10 min**

### Short Term (Next Sprint)

1. ⏳ Implement Supabase Auth - **1 day**
2. ⏳ Integrate Stripe - **2 days**
3. ⏳ Build KYC flow - **3 days**
4. ⏳ Add email notifications - **2 days**

### Long Term (Next Month)

1. ⏳ Admin dashboard
2. ⏳ Analytics and reporting
3. ⏳ Mobile app support
4. ⏳ Multi-currency

## 💡 Tips

1. **Start Simple:** Test with simulated payments first
2. **Use Pretix Test Mode:** Enable test mode in event settings
3. **Check Logs:** View Edge Function logs in Supabase dashboard
4. **Database Access:** Use Supabase Table Editor for quick data inspection
5. **API Testing:** Use Postman or curl for Edge Function testing

## 🆘 Getting Help

1. **Check logs:** Supabase Dashboard → Edge Functions → Logs
2. **Database:** Supabase Dashboard → Table Editor
3. **Pretix:** Control panel for order/event status
4. **Documentation:** See markdown files in project root

## ✅ Verification Checklist

- [ ] Pretix event created with products
- [ ] `.env` updated with event slug
- [ ] Ticket BNPL config added to database
- [ ] Test user with KYC profile created
- [ ] Edge Functions deployed (check Supabase dashboard)
- [ ] Frontend builds successfully (`npm run build`)
- [ ] Can access checkout page
- [ ] Eligibility check works
- [ ] Can create BNPL agreement

## 🎉 Success!

If all checklist items are done, you're ready to:
1. Browse events at `http://localhost:5173`
2. Add ticket to cart
3. Go to checkout
4. Select "Pay in Installments"
5. See available plans
6. Create BNPL agreement

**The backend is connected and functional!**
