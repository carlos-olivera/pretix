# BNPL Integration Guide

## Overview

This guide explains how the Buy Now Pay Later (BNPL) system integrates with Pretix backend for ticketing.

## Architecture

```
Frontend (React)
    ↓
Supabase Edge Functions (Backend Logic)
    ↓
Pretix API (Ticket Management)
    ↓
Supabase Database (BNPL Data)
```

## Configuration

### 1. Environment Variables

Update `.env` with your Pretix credentials:

```bash
VITE_PRETIX_API_URL=https://pretix.ovopaydemo.live
VITE_PRETIX_API_TOKEN=your-api-token
VITE_PRETIX_ORGANIZER=prestaya-latam
VITE_PRETIX_EVENT=your-event-slug
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Pretix Setup

#### Create an Event

1. Go to Pretix control panel: `https://pretix.ovopaydemo.live/control/`
2. Navigate to Organizers > prestaya-latam
3. Create a new event
4. Add products (items) with prices
5. Set up quotas for availability

#### Configure Payment Providers

1. In your event settings, go to Payment > Settings
2. Enable at least one payment provider (e.g., bank transfer, manual)
3. Save configuration

### 3. Database Setup

The database tables are already created via migrations. Key tables:

- `bnpl_plans` - Payment plan definitions
- `ticket_bnpl_config` - Per-ticket BNPL configuration
- `bnpl_agreements` - Customer agreements
- `installment_schedules` - Payment schedules
- `ticket_reservations` - Pretix ticket reservations
- `user_kyc_profiles` - KYC verification data
- `risk_scores` - User risk assessment

#### Configure Ticket for BNPL

```sql
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
  'your-event-slug',
  1, -- Your Pretix item ID
  true,
  ARRAY[]::uuid[], -- Empty = all plans allowed
  2000,
  30
);
```

## Deployed Edge Functions

### 1. bnpl-eligibility

**Endpoint:** `POST /functions/v1/bnpl-eligibility`

**Purpose:** Check if a user is eligible for BNPL on a specific ticket

**Request:**
```json
{
  "user_id": "uuid",
  "item_id": 1,
  "ticket_price": 250.00,
  "organizer": "prestaya-latam",
  "event": "your-event-slug"
}
```

**Response:**
```json
{
  "eligible": true,
  "available_plans": [
    {
      "id": "uuid",
      "name": "Pay in 3",
      "number_of_installments": 3,
      "upfront_percentage": 33.33
    }
  ],
  "user_risk_score": 70,
  "active_agreements": 1
}
```

**Eligibility Checks:**
- BNPL enabled for ticket
- Ticket price within limits
- User has verified KYC
- Risk score meets minimum
- Active agreements < 3

### 2. bnpl-create-agreement

**Endpoint:** `POST /functions/v1/bnpl-create-agreement`

**Purpose:** Create a new BNPL agreement and ticket reservation

**Request:**
```json
{
  "user_id": "uuid",
  "plan_id": "uuid",
  "pretix_organizer": "prestaya-latam",
  "pretix_event": "your-event-slug",
  "pretix_item_id": 1,
  "pretix_variation_id": null,
  "ticket_price": 250.00,
  "event_date": "2026-06-15T19:00:00Z",
  "quantity": 1
}
```

**Response:**
```json
{
  "success": true,
  "agreement": {
    "id": "uuid",
    "agreement_number": "BNPL-20260315-ABC123",
    "status": "pending",
    "total_amount": 250.00,
    "upfront_amount": 83.33,
    "remaining_amount": 166.67,
    "installments": [...],
    "reservation": {...}
  }
}
```

**What Happens:**
1. Validates KYC profile (must be verified)
2. Creates BNPL agreement in database
3. Creates ticket reservation (holds inventory)
4. Generates installment schedule
5. Updates user risk score
6. Returns agreement with all details

### 3. bnpl-process-payment

**Endpoint:** `POST /functions/v1/bnpl-process-payment`

**Purpose:** Process a payment for an installment

**Request:**
```json
{
  "installment_id": "uuid",
  "payment_method": "credit_card",
  "payment_provider": "stripe",
  "provider_transaction_id": "txn_123"
}
```

**Response:**
```json
{
  "success": true,
  "payment_attempt": {...},
  "installment_status": "paid",
  "remaining_amount": 83.34,
  "agreement_status": "active",
  "ticket_released": false
}
```

**What Happens:**
1. Validates installment exists and is unpaid
2. Creates payment attempt record
3. Processes payment (simulated - integrate with real gateway)
4. Updates installment status to "paid"
5. Updates agreement remaining balance
6. Activates agreement if first payment
7. Completes agreement if all paid
8. Releases ticket if threshold reached

### 4. bnpl-release-ticket

**Endpoint:** `POST /functions/v1/bnpl-release-ticket`

**Purpose:** Create Pretix order and issue ticket

**Request:**
```json
{
  "agreement_id": "uuid",
  "email": "customer@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "order_code": "ABC12",
  "order_secret": "secret123",
  "order_url": "https://pretix.ovopaydemo.live/prestaya-latam/event/order/ABC12/secret123/"
}
```

**What Happens:**
1. Validates ticket is released
2. Calls Pretix API to create order
3. Updates reservation with order details
4. Customer receives ticket

## Frontend Integration

### Checkout Flow

The `CheckoutWithBNPL` component provides:

1. **Payment Mode Selection**
   - Pay in Full (traditional)
   - Pay in Installments (BNPL)

2. **BNPL Eligibility Check**
   - Automatic on page load
   - Shows available plans
   - Displays ineligibility reasons

3. **Plan Selection**
   - Visual plan cards
   - Shows upfront amount
   - Shows installment breakdown

4. **Form Submission**
   - Full payment → Creates Pretix order directly
   - BNPL → Creates agreement, redirects to dashboard

### Using the Service

```typescript
import { bnplService } from './lib/services/bnpl-service';

// Check eligibility
const eligibility = await bnplService.checkEligibility(
  userId,
  itemId,
  ticketPrice,
  organizer,
  event,
  authToken
);

// Create agreement
const result = await bnplService.createAgreement(
  {
    user_id: userId,
    plan_id: selectedPlanId,
    pretix_organizer: organizer,
    pretix_event: event,
    pretix_item_id: itemId,
    ticket_price: price,
    event_date: eventDate,
  },
  authToken
);

// Process payment
const payment = await bnplService.processPayment(
  installmentId,
  'credit_card',
  'stripe',
  transactionId,
  authToken
);

// Release ticket
const ticket = await bnplService.releaseTicket(
  agreementId,
  email,
  authToken
);
```

## BNPL Workflow

### 1. Customer Checkout

```mermaid
sequenceDiagram
    Customer->>Frontend: Select ticket
    Frontend->>Edge Function: Check eligibility
    Edge Function->>Database: Query config & KYC
    Edge Function->>Frontend: Return plans
    Customer->>Frontend: Select plan
    Frontend->>Edge Function: Create agreement
    Edge Function->>Database: Create agreement & reservation
    Edge Function->>Frontend: Return agreement
    Frontend->>Customer: Show payment schedule
```

### 2. Payment Processing

```mermaid
sequenceDiagram
    Customer->>Frontend: Make payment
    Frontend->>Edge Function: Process payment
    Edge Function->>Payment Gateway: Charge card
    Payment Gateway->>Edge Function: Success
    Edge Function->>Database: Update installment
    Edge Function->>Database: Check release threshold
    Edge Function->>Frontend: Payment confirmed
```

### 3. Ticket Release

```mermaid
sequenceDiagram
    Edge Function->>Database: Check payment threshold
    Database->>Edge Function: Threshold met
    Edge Function->>Pretix API: Create order
    Pretix API->>Edge Function: Order created
    Edge Function->>Database: Update reservation
    Edge Function->>Customer: Ticket issued
```

## Business Rules

### Payment Thresholds

Default: 100% paid → ticket released

Configurable in `ticket_bnpl_config.ticket_release_threshold_percentage`:
- 100% = All payments required
- 50% = Half paid → release
- Custom percentage

### Deadlines

- **Reservation expiry:** 24 hours from agreement creation
- **Final payment deadline:** 7 days before event (configurable)
- **Grace period:** 3 days after due date (configurable)

### Risk Scoring

Base score: 70/100

Positive factors:
- Completed agreements: +5 each
- On-time payments: +10
- Verified KYC: +10

Negative factors:
- Active agreements > 3: -10
- Missed payments: -15 each
- Total BNPL value > €5,000: -10

### Cancellation

Users can cancel:
- Within 14-day cooling-off period (full refund)
- After cooling-off (partial refund minus fee)

System cancels:
- Payment deadline missed
- Multiple missed payments
- Fraud detected

## Testing

### Test Scenarios

1. **Eligible User - Full Flow**
   ```bash
   # 1. Create KYC profile
   # 2. Set risk score > 30
   # 3. Check eligibility → eligible
   # 4. Create agreement → success
   # 5. Process first payment → activated
   # 6. Process remaining payments → completed
   # 7. Ticket released → Pretix order created
   ```

2. **Ineligible - No KYC**
   ```bash
   # 1. User has no KYC profile
   # 2. Check eligibility → not eligible
   # Reason: "KYC verification required"
   ```

3. **Ineligible - Low Risk Score**
   ```bash
   # 1. Risk score < minimum (e.g., 25)
   # 2. Check eligibility → not eligible
   # Reason: "Risk score too low"
   ```

4. **Ticket Price Too High**
   ```bash
   # 1. Ticket price > maximum_ticket_price
   # 2. Check eligibility → not eligible
   # Reason: "Ticket price exceeds maximum"
   ```

### Manual Testing

```bash
# Check if Edge Functions are deployed
curl -X POST https://your-project.supabase.co/functions/v1/bnpl-eligibility \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user-id",
    "item_id": 1,
    "ticket_price": 100,
    "organizer": "prestaya-latam",
    "event": "your-event-slug"
  }'
```

## Pretix API Integration

### Key Endpoints Used

1. **Get Events:** `GET /api/v1/organizers/{org}/events/`
2. **Get Items:** `GET /api/v1/organizers/{org}/events/{event}/items/`
3. **Create Order:** `POST /api/v1/organizers/{org}/events/{event}/orders/`
4. **Get Order:** `GET /api/v1/organizers/{org}/events/{event}/orders/{code}/`

### Authentication

All Pretix API calls require:
```bash
Authorization: Token YOUR_PRETIX_API_TOKEN
```

### CORS Configuration

**Important:** Pretix doesn't include CORS headers by default. For frontend to work:

1. **Option A:** Configure nginx reverse proxy with CORS headers
2. **Option B:** Use Edge Functions as proxy (current implementation)
3. **Option C:** Add django-cors-headers to Pretix

Current implementation uses Edge Functions, so frontend calls:
```
Frontend → Supabase Edge Function → Pretix API
```

## Common Issues

### 1. Self-Signed Certificate Error

**Error:** `SSL certificate problem: self-signed certificate`

**Solution:**
- Production: Install valid SSL certificate (Let's Encrypt)
- Development: Edge Functions handle this automatically

### 2. No Events in Pretix

**Error:** Eligibility check fails, no tickets available

**Solution:**
1. Create event in Pretix control panel
2. Add items (products) with prices
3. Set up quotas
4. Update `VITE_PRETIX_EVENT` in `.env`

### 3. BNPL Not Available

**Error:** "BNPL not available for this ticket"

**Solution:**
1. Check `ticket_bnpl_config` has entry for item
2. Verify `bnpl_enabled = true`
3. Check `pretix_organizer` and `pretix_event` match

### 4. KYC Verification Required

**Error:** "KYC verification required"

**Solution:**
1. User must complete KYC verification first
2. Create `user_kyc_profiles` entry with `verification_status = 'verified'`
3. In production, integrate with KYC provider (Onfido, Jumio)

## Next Steps

### Production Readiness

1. **Payment Gateway Integration**
   - Replace simulated payments in `bnpl-process-payment`
   - Integrate with Stripe/Adyen/PayPal
   - Handle webhooks from payment provider

2. **KYC Integration**
   - Integrate with Onfido or Jumio
   - Implement document upload
   - Add liveness detection

3. **Authentication**
   - Replace mock `user-123` with real auth
   - Use Supabase Auth
   - Implement JWT verification

4. **Notifications**
   - Email reminders for upcoming payments
   - SMS alerts for overdue payments
   - Push notifications for ticket release

5. **Admin Dashboard**
   - View all agreements
   - Manage configurations
   - Generate reports
   - Handle disputes

6. **Webhooks**
   - Listen to Pretix webhooks (order updates, cancellations)
   - Create webhook handler Edge Function
   - Sync order status with agreements

7. **Monitoring**
   - Set up error tracking (Sentry)
   - Add analytics (Mixpanel/Amplitude)
   - Create alerts for failed payments
   - Monitor conversion rates

## Support

For issues or questions:
1. Check logs in Supabase Edge Functions dashboard
2. Review Pretix API documentation: https://docs.pretix.eu/
3. Check BNPL Backend specification: `bnpl-backend.md`
