# Payment Modal Auto-Close Flow

## Problem
When user completes payment in SumUp hosted checkout window and gets redirected to `/payment-success`, the background PaymentModal remains open and waits for user confirmation.

## Solution
Implemented cross-window communication using localStorage and event listeners to automatically detect payment completion and close the modal.

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User Initiates Payment                                       │
│    PaymentModal opens → Creates SumUp checkout                  │
│    Stores checkoutReference: "payment-request-161-1760276099520"│
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. SumUp Window Opens (New Window/Tab)                          │
│    User completes payment in SumUp hosted checkout              │
│    SumUp redirects to: /payment-success?checkout_reference=...  │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. PaymentSuccessPage Loads                                     │
│    • Verifies payment with SumUp API                            │
│    • Creates/updates payment record                             │
│    • Sets localStorage flag:                                    │
│      localStorage.setItem(                                      │
│        'payment_completed_payment-request-161-1760276099520',   │
│        'true'                                                   │
│      )                                                          │
│    • Auto-redirects to /my-account after 2 seconds             │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. PaymentModal Detects Completion (Multiple Triggers)          │
│                                                                 │
│    TRIGGER 1: Storage Event                                     │
│    ┌──────────────────────────────────────────────────────┐   │
│    │ window.addEventListener('storage', handler)          │   │
│    │ Fires when localStorage changes in another window    │   │
│    └──────────────────────────────────────────────────────┘   │
│                                                                 │
│    TRIGGER 2: Window Focus Event                               │
│    ┌──────────────────────────────────────────────────────┐   │
│    │ window.addEventListener('focus', handler)            │   │
│    │ Fires when user returns to original tab/window       │   │
│    └──────────────────────────────────────────────────────┘   │
│                                                                 │
│    TRIGGER 3: Polling (Fallback)                               │
│    ┌──────────────────────────────────────────────────────┐   │
│    │ setInterval(() => checkCompletion(), 2000)           │   │
│    │ Checks localStorage every 2 seconds                  │   │
│    └──────────────────────────────────────────────────────┘   │
│                                                                 │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Modal Auto-Closes                                            │
│    • setShowSumUpModal(false) - Close SumUp modal               │
│    • setCurrentStep('success') - Show success state             │
│    • onPaymentComplete() - Call parent handler                  │
│    • setTimeout(() => onClose(), 2000) - Close after 2s         │
│    • localStorage.removeItem(...) - Clean up flag               │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Details

### PaymentModal (src/components/shared/PaymentModal.tsx)

```typescript
useEffect(() => {
  if (!isOpen || !checkoutReference) return;

  const checkPaymentCompletion = async () => {
    const completionKey = `payment_completed_${checkoutReference}`;
    const paymentCompleted = localStorage.getItem(completionKey);
    
    if (paymentCompleted) {
      // Clean up flag
      localStorage.removeItem(completionKey);
      
      // Close modal and show success
      setShowSumUpModal(false);
      setCurrentStep('success');
      onPaymentComplete?.();
      
      // Auto-close after 2 seconds
      setTimeout(() => onClose(), 2000);
    }
  };

  // Multiple detection methods
  window.addEventListener('storage', handleStorageChange);
  window.addEventListener('focus', handleWindowFocus);
  const pollInterval = setInterval(checkPaymentCompletion, 2000);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
    window.removeEventListener('focus', handleWindowFocus);
    clearInterval(pollInterval);
  };
}, [isOpen, checkoutReference]);
```

### PaymentSuccessPage (src/pages/PaymentSuccessPage.tsx)

```typescript
// After payment verification succeeds
applyVerificationState('confirmed', 'Payment verified successfully. Redirecting...');

// Set completion flag for PaymentModal
localStorage.setItem(
  `payment_completed_${checkoutReference}`, 
  'true'
);

// Auto-redirect after 2 seconds
setTimeout(() => {
  window.location.href = '/my-account?tab=payments&highlight=success';
}, 2000);
```

## User Experience Timeline

```
T+0s:   User clicks "Pay €15"
T+1s:   PaymentModal opens
T+2s:   SumUp window opens with checkout form
T+15s:  User completes payment in SumUp
T+16s:  SumUp redirects to /payment-success
T+17s:  PaymentSuccessPage verifies payment
T+17s:  localStorage flag set: payment_completed_XXX = true
T+17s:  PaymentModal detects flag (via focus/storage/poll)
T+17s:  PaymentModal closes SumUp window reference
T+17s:  PaymentModal shows success state
T+19s:  PaymentModal auto-closes completely
T+19s:  PaymentSuccessPage auto-redirects to /my-account
T+20s:  User sees "My Account" page with payment history
```

## Why Multiple Triggers?

### 1. **Storage Event**
- **Pros**: Instant detection, cross-tab communication
- **Cons**: Doesn't fire in the same tab that set the value
- **Use Case**: When payment happens in a different tab

### 2. **Window Focus Event**
- **Pros**: Fires immediately when user returns to tab
- **Cons**: Only works when user actively switches tabs
- **Use Case**: User manually switches back to original tab

### 3. **Polling (Fallback)**
- **Pros**: Always works, catches edge cases
- **Cons**: 2-second delay maximum
- **Use Case**: Fallback when events don't fire

## Benefits

✅ **Automatic**: No manual "Return to merchant" button clicking
✅ **Fast**: Detects completion within 2 seconds
✅ **Reliable**: Multiple detection methods ensure it works
✅ **Clean**: Removes completion flags after detection
✅ **User-Friendly**: Shows success state before closing
✅ **No Confusion**: Modal doesn't stay open indefinitely

## Testing

To test the auto-close functionality:

1. Create a test booking
2. Select deposit payment
3. Complete payment in SumUp window
4. Observe:
   - PaymentSuccessPage appears
   - Background PaymentModal automatically detects completion
   - Modal shows success state briefly
   - Modal auto-closes after 2 seconds
   - User is on PaymentSuccessPage
   - PaymentSuccessPage redirects to /my-account after its own 2-second timer

## Troubleshooting

**Issue**: Modal doesn't close automatically
**Solution**: Check browser console for localStorage access errors

**Issue**: Polling is slow (2 second delay)
**Solution**: Storage/Focus events should fire immediately; polling is just fallback

**Issue**: Modal closes too quickly
**Solution**: Adjust the `setTimeout(() => onClose(), 2000)` delay

**Issue**: Completion flag persists
**Solution**: Check that `localStorage.removeItem(completionKey)` is being called
