# Payment Request Filtering Implementation

## Overview
This update implements smart payment request filtering to only create payment requests for services with fixed package pricing, while skipping services that require quotes or have per-session pricing.

## Business Logic Changes

### Payment Request Creation Rules

**✅ CREATE Payment Request for:**
- Services with fixed package pricing: `"Ultimate Health (€150)"`
- Fixed amount services: `"Physiotherapy Assessment (€75)"`
- Any service with a standalone euro amount in brackets

**❌ SKIP Payment Request for:**
- Contact for quote services: `"Ultimate Health (Contact for Quote)"`
- Per-class pricing: `"Ultimate Health (€25/class)"`
- Per-session pricing: `"Ultimate Health (€30/session)"`
- Any service with `/class`, `/session`, `per class`, or `per session` indicators

### Booking Behavior
- **Bookings are ALWAYS created** regardless of payment request status
- **Email notifications are sent** for all bookings
- **Different success messages** are shown based on payment request creation

## Technical Implementation

### 1. Enhanced Price Extraction Logic

**File: `src/utils/paymentRequestUtils.ts`**

```typescript
function extractPriceFromServiceName(serviceName: string): number | null {
  // Skip patterns for services that shouldn't have payment requests
  const skipPatterns = [
    /contact\s+for\s+quote/i,
    /€\d+\s*\/\s*class/i,
    /€\d+\s*per\s*class/i,
    /€\d+\s*\/\s*session/i,
    /€\d+\s*per\s*session/i
  ];
  
  // Check if service matches any skip pattern
  for (const pattern of skipPatterns) {
    if (pattern.test(serviceName)) {
      console.log('⏭️ Skipping payment request - service requires quote or is per-session:', serviceName);
      return null;
    }
  }
  
  // Look for fixed package pricing (avoiding per-class/session patterns)
  const priceMatch = serviceName.match(/€(\d+)(?!\s*\/|\s*per)/);
  
  if (priceMatch) {
    const price = parseInt(priceMatch[1]);
    console.log('✅ Found fixed package price:', price, 'for service:', serviceName);
    return price;
  }
  
  console.log('⏭️ No fixed package price found for service:', serviceName);
  return null;
}
```

### 2. Database Lookup Integration

**File: `src/utils/paymentRequestUtils.ts`**

```typescript
async function getServicePriceFromDatabase(serviceName: string): Promise<number | null> {
  // Apply same skip patterns to database lookup
  const skipPatterns = [
    /contact\s+for\s+quote/i,
    /€\d+\s*\/\s*class/i,
    /€\d+\s*per\s*class/i,
    /€\d+\s*\/\s*session/i,
    /€\d+\s*per\s*session/i
  ];
  
  // Check if service matches any skip pattern
  for (const pattern of skipPatterns) {
    if (pattern.test(serviceName)) {
      console.log('⏭️ Database lookup skipped - service requires quote or is per-session:', serviceName);
      return null;
    }
  }
  
  // Continue with normal database lookup...
}
```

### 3. Updated Return Type

**File: `src/utils/paymentRequestUtils.ts`**

```typescript
export async function createPaymentRequest(
  customerId: number,
  serviceName: string,
  bookingDate: string,
  invoiceId?: number | null,
  bookingId?: string | null,
  isInvoicePaymentRequest?: boolean,
  customAmount?: number
): Promise<PaymentRequest | null> {
  // Returns null when no payment request should be created
  if (baseCost === null) {
    console.log('⏭️ No payment request created - service requires quote or is per-session pricing:', serviceName);
    return null;
  }
  // ... rest of logic
}
```

## UI Updates

### 1. Hero Section Booking Form

**File: `src/components/home/HeroSection.tsx`**

```typescript
if (paymentRequest) {
  // Show payment interface with "Pay Now" button
  setPaymentState({
    showPayment: true,
    paymentRequest,
    booking,
    customer,
    paymentCompleted: false
  });
} else {
  // Show contact message for quote-based services
  setSuccessMsg('Booking submitted successfully! Contact Physiotherapist for more details about rate card for services.');
  await sendBookingEmail(data);
  reset();
}
```

### 2. Main Booking Page

**File: `src/pages/BookingPage.tsx`**

```typescript
if (paymentRequest) {
  // Show payment interface
  setPaymentState({
    showPayment: true,
    paymentRequest,
    booking,
    customer,
    paymentCompleted: false
  });
} else {
  // Show contact message
  setSuccessMsg('Booking submitted successfully! Contact Physiotherapist for more details about rate card for services.');
  await sendBookingEmail(data);
  reset();
}
```

### 3. Booking Form Component

**File: `src/components/BookingForm.tsx`**

```typescript
if (paymentRequest && booking && customer) {
  // Show payment interface
  showSuccess('Booking Created!', 'Please complete the deposit payment to confirm your booking.');
} else {
  // Show contact message
  showSuccess('Booking Submitted!', 'Contact Physiotherapist for more details about rate card for services.');
  resetForm();
}
```

## Success Messages

### With Payment Request
- **Booking Created** → Payment interface shows with "Pay Now" button
- Success message handled by payment flow

### Without Payment Request
- **Message**: "Booking submitted successfully! Contact Physiotherapist for more details about rate card for services."
- **Email sent** to customer with booking confirmation
- **Form reset** automatically

## Service Examples

### Services WITH Payment Requests
```
✅ "Ultimate Health (€150)"
✅ "Physiotherapy Assessment (€75)"
✅ "Sports Therapy Package (€200)"
✅ "Rehabilitation Program (€300)"
```

### Services WITHOUT Payment Requests
```
❌ "Ultimate Health (Contact for Quote)"
❌ "Pilates Classes (€25/class)"
❌ "Personal Training (€30/session)"
❌ "Group Therapy (€20 per class)"
❌ "Consultation (Contact for Quote)"
```

## Testing Scenarios

### Test Case 1: Fixed Package Service
1. Select "Ultimate Health (€150)"
2. Fill booking form and submit
3. **Expected**: Booking created + Payment interface appears with "Pay Now" button

### Test Case 2: Contact for Quote Service
1. Select "Ultimate Health (Contact for Quote)"
2. Fill booking form and submit
3. **Expected**: Booking created + Message: "Contact Physiotherapist for more details about rate card for services"

### Test Case 3: Per-Class Service
1. Select "Pilates Classes (€25/class)"
2. Fill booking form and submit
3. **Expected**: Booking created + Contact message (no payment interface)

## Database Impact

- **Bookings table**: All bookings are created regardless of payment request status
- **Payment_requests table**: Only created for fixed package services
- **Customers table**: All customers are created/updated as normal

## Backward Compatibility

- ✅ Existing fixed-price services continue to work
- ✅ Existing booking flow remains intact
- ✅ Admin booking creation unaffected
- ✅ Payment processing for existing requests unchanged

## Logging & Debugging

Enhanced console logging helps identify why payment requests are/aren't created:

```
✅ Found fixed package price: 150 for service: Ultimate Health (€150)
⏭️ Skipping payment request - service requires quote or is per-session: Ultimate Health (Contact for Quote)
⏭️ Database lookup skipped - service requires quote or is per-session: Pilates Classes (€25/class)
```

## Files Modified

1. `src/utils/paymentRequestUtils.ts` - Core filtering logic
2. `src/components/home/HeroSection.tsx` - Hero section messaging
3. `src/pages/BookingPage.tsx` - Main booking page messaging
4. `src/components/BookingForm.tsx` - Generic booking form messaging

All changes maintain existing functionality while adding the new filtering behavior.
