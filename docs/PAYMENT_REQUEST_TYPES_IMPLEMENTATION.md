# Payment Request Types Implementation

## Overview
The payment system now supports two distinct types of payment requests:

1. **Auto-generated Booking Deposits** (20% of service cost)
2. **Manual Invoice Payment Requests** (Full remaining amount after deposit)

## Implementation Details

### 1. Auto-Generated Booking Payment Requests
**When**: Automatically created when a new booking is made
**Amount**: 20% of the service cost (deposit)
**Purpose**: Secure the booking slot

**Example Scenario**:
- Service: Premium Care - In Hour (€115)
- Booking created → Auto payment request for €23 (20% of €115)
- Customer pays €23 deposit

### 2. Manual Invoice Payment Requests  
**When**: Created from Admin Invoice Management
**Amount**: Full remaining balance (service cost minus any paid deposits)
**Purpose**: Request payment for the remaining service balance

**Example Scenario**:
- Same service: Premium Care - In Hour (€115)
- Customer already paid €23 deposit
- Admin creates invoice → Manual payment request for €92 (€115 - €23 = €92)

## Code Changes Made

### 1. Updated `createPaymentRequest` Function
Location: `src/utils/paymentRequestUtils.ts`

```typescript
export async function createPaymentRequest(
  customerId: number,
  serviceName: string,
  bookingDate: string,
  invoiceId?: number | null,
  bookingId?: string | null,
  isInvoicePaymentRequest?: boolean, // NEW: Distinguishes invoice vs booking requests
  customAmount?: number // NEW: Custom amount for invoices
): Promise<PaymentRequest>
```

**Key Logic**:
- If `isInvoicePaymentRequest = true` → Uses `customAmount` (no deposit calculation)
- If `isInvoicePaymentRequest = false/undefined` → Calculates 20% deposit

### 2. Updated Invoice Management
Location: `src/components/admin/InvoiceManagement.tsx`

**Enhanced `sendInvoicePaymentRequest` function**:
- Detects existing deposit deductions in invoice notes
- Calculates remaining amount after deposits
- Calls `createPaymentRequest` with invoice-specific parameters

```typescript
// Create payment request with full remaining amount (not deposit)
const paymentRequest = await createPaymentRequest(
  invoice.customer_id,
  `Invoice ${invoice.invoice_number}`,
  invoice.due_date,
  invoice.id!,
  null, // No booking ID for invoice requests
  true, // isInvoicePaymentRequest = true
  remainingAmount // Custom amount = full remaining balance
);
```

## Workflow Examples

### Scenario A: Standard Booking → Invoice Flow
1. **Customer books service**: Premium Care - In Hour (€115)
2. **Auto payment request created**: €23 (20% deposit)
3. **Customer pays deposit**: €23 ✅
4. **Admin creates invoice**: Total €115, with "Deposit Deducted: €23" note
5. **Invoice amount due**: €92 (€115 - €23)
6. **Admin sends payment request**: €92 (remaining balance)

### Scenario B: Direct Invoice (No Prior Booking)
1. **Admin creates invoice directly**: Service worth €115
2. **No prior deposits exist**
3. **Invoice amount due**: €115 (full amount)
4. **Admin sends payment request**: €115 (full amount)

## Database Structure

### Payment Requests Table
- `booking_id`: Links to auto-generated booking deposits
- `invoice_id`: Links to manual invoice payment requests  
- `amount`: Either 20% deposit OR full remaining balance
- `notes`: Distinguishes between deposit and invoice payments

### Sample Records

**Booking Deposit Request**:
```json
{
  "customer_id": 1,
  "booking_id": "uuid-123",
  "invoice_id": null,
  "amount": 23.00,
  "notes": "20% deposit for Premium Care - In Hour appointment on 8/15/2025"
}
```

**Invoice Payment Request**:
```json
{
  "customer_id": 1,
  "booking_id": null, 
  "invoice_id": 456,
  "amount": 92.00,
  "notes": "Payment for Invoice INV-202508-228 - remaining balance after deposit deduction"
}
```

## Benefits

### 1. Clear Separation of Concerns
- Booking deposits vs final payments are distinct
- Easy to track payment types in reporting
- Clear audit trail

### 2. Flexible Payment Amounts
- Auto deposits: Always 20% of service cost
- Invoice payments: Exact remaining amount needed
- No overpayment or underpayment issues

### 3. Backward Compatibility
- Existing booking creation continues to work unchanged
- Existing payment request functions remain functional
- New parameters are optional

## Testing Scenarios

### Test Case 1: Complete Booking-to-Payment Flow
1. Create booking for €115 service → Verify €23 deposit request
2. Pay deposit → Verify payment recorded
3. Create invoice → Verify €92 balance due
4. Send payment request → Verify €92 request amount

### Test Case 2: Direct Invoice Payment
1. Create invoice for €115 (no booking) → Verify €115 balance due
2. Send payment request → Verify €115 request amount

### Test Case 3: Multiple Services
1. Book Service A (€115) → €23 deposit
2. Book Service B (€85) → €17 deposit (20% of €85)  
3. Create combined invoice → Proper deposit deductions per service

## Configuration

The deposit percentage is configurable in:
`src/config/paymentConfig.ts`

```typescript
export const PAYMENT_CONFIG = {
  DEPOSIT_PERCENTAGE: 0.20, // 20% - can be changed if needed
  // ...
}
```

## Notes

- The system automatically handles deposit detection from invoice notes
- Payment requests are properly categorized for reporting
- Email notifications reflect the correct payment type and amount
- Dashboard displays correctly distinguish between deposit and final payments
