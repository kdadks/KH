# Visit Type Email Analysis and Fix Plan

## Executive Summary

**Issue:** Booking-related emails are not consistently displaying the visit type selected during the booking process, leading to service expectation mismatches and operational errors.

**Impact:** Customers may arrive expecting a different service type than what was booked, causing confusion, delays, and potential service delivery issues.

**Root Cause:** While the visit type field is properly stored in the database and implemented in most email templates, several critical templates are missing this essential information.

---

## Current System Analysis

### ✅ What's Working Well

1. **Database Implementation**
   - `bookings.visit_type` field exists with proper constraints
   - Supports three visit types: 'clinic', 'home', 'online'
   - Data integrity maintained through check constraints

2. **Email Template Coverage**
   - Most booking confirmation templates include visit type
   - Consistent emoji mapping: 🏥 Clinic, 🏠 Home, 💻 Online
   - Proper location logic based on visit type

3. **User Interface**
   - Visit type selection implemented in booking forms
   - Clear visual distinction between service types

### ❌ Critical Issues Identified

#### 1. Missing Visit Type in Key Templates

| Template | Status | Impact | Priority |
|----------|--------|--------|----------|
| `booking_reminder` | ❌ Missing | High - Customers don't know appointment type before arrival | Critical |
| `payment_receipt` | ❌ Missing | High - Payment confirmation lacks service context | Critical |
| `invoice_notification` | ❌ Missing | Medium - Invoice doesn't specify service type | Medium |
| `booking_with_payment_pending` | ❌ Missing | Medium - Pending payment lacks service clarity | Medium |
| `booking_with_payment_failed` | ❌ Missing | Medium - Failed payment notification incomplete | Medium |
| `booking_captured` | ❌ Missing | Low - Initial booking confirmation incomplete | Low |

#### 2. Calendar Integration Issue
- **ICS Calendar Description** missing visit type information
- Calendar events don't indicate appointment type
- Affects customer scheduling and preparation

#### 3. Data Flow Verification
- Database field exists and is populated correctly
- Email system receives visit type data for most templates
- Inconsistent implementation across template types

---

## Detailed Technical Analysis

### Email Template Analysis

#### Working Templates (Include Visit Type)
- ✅ `booking_confirmation` - Line 422
- ✅ `admin_booking_confirmation` - Line 1242, 1302
- ✅ `booking_rescheduled` - Line 1635
- ✅ `deposit_payment_received` - Line 1480
- ✅ `booking_cancelled` - Line 1551 (has service but no visit type)
- ✅ `contact_form` - Not applicable (no appointment data)

#### Missing Visit Type Templates

**1. booking_reminder (Lines 685-729)**
```javascript
// Current template missing visit type
<div class="details">
  <h3>📅 Appointment Details</h3>
  <p><strong>Service:</strong> ${escapeHtmlEntities(data.service_name)}</p>
  <p><strong>Date:</strong> ${data.appointment_date}</p>
  <p><strong>Time:</strong> ${data.appointment_time}</p>
  <p><strong>Reference:</strong> ${escapeHtmlEntities(data.booking_reference)}</p>
</div>
// MISSING: Visit Type line
```

**2. payment_receipt (Lines 457-499)**
```javascript
// Current template missing visit type
<div class="details">
  <h3>💳 Payment Details</h3>
  <p><strong>Transaction ID:</strong> ${escapeHtmlEntities(data.transaction_id)}</p>
  <p><strong>Amount:</strong> €${escapeHtmlEntities(data.payment_amount)}</p>
  <p><strong>Date:</strong> ${data.payment_date}</p>
  <p><strong>Service:</strong> ${escapeHtmlEntities(data.service_name || 'Therapy Session')}</p>
  <p><strong>Status:</strong> <span class="success-icon">✅</span> Completed</p>
</div>
// MISSING: Visit Type line
```

**3. ICS Calendar Generation (Lines 128-140)**
```javascript
// Current description missing visit type
let description = `${data.service_name} appointment at KH Therapy\\nBooking Reference: ${data.booking_reference}`;
// MISSING: Visit type information in description
```

### Database Schema Verification

```sql
-- Visit type field exists in bookings table
ALTER TABLE public.bookings ADD COLUMN visit_type VARCHAR(50) DEFAULT 'clinic';
ALTER TABLE public.bookings ADD CONSTRAINT check_booking_visit_type
CHECK (visit_type IN ('home', 'online', 'clinic'));

-- Visit type field exists in services table  
ALTER TABLE public.services ADD COLUMN visit_type VARCHAR(50) DEFAULT 'clinic';
ALTER TABLE public.services ADD CONSTRAINT check_visit_type
CHECK (visit_type IN ('home', 'online', 'clinic'));
```

**Status:** ✅ Database schema is correct and properly implemented.

---

## Fix Implementation Plan

### Phase 1: Critical Fixes (High Priority)

#### 1. Fix booking_reminder Template
**File:** `netlify/functions/send-email.cjs`
**Lines:** 703-709

**Current:**
```javascript
<div class="details">
  <h3>📅 Appointment Details</h3>
  <p><strong>Service:</strong> ${escapeHtmlEntities(data.service_name)}</p>
  <p><strong>Date:</strong> ${data.appointment_date}</p>
  <p><strong>Time:</strong> ${data.appointment_time}</p>
  <p><strong>Reference:</strong> ${escapeHtmlEntities(data.booking_reference)}</p>
</div>
```

**Fix:**
```javascript
<div class="details">
  <h3>📅 Appointment Details</h3>
  <p><strong>Service:</strong> ${escapeHtmlEntities(data.service_name)}</p>
  <p><strong>Visit Type:</strong> ${data.visit_type === 'clinic' ? '🏥 Clinic Visit' : data.visit_type === 'home' ? '🏠 Home Visit' : data.visit_type === 'online' ? '💻 Online Session' : '🏥 Clinic Visit'}</p>
  <p><strong>Date:</strong> ${data.appointment_date}</p>
  <p><strong>Time:</strong> ${data.appointment_time}</p>
  <p><strong>Reference:</strong> ${escapeHtmlEntities(data.booking_reference)}</p>
</div>
```

#### 2. Fix payment_receipt Template
**File:** `netlify/functions/send-email.cjs`
**Lines:** 475-482

**Current:**
```javascript
<div class="details">
  <h3>💳 Payment Details</h3>
  <p><strong>Transaction ID:</strong> ${escapeHtmlEntities(data.transaction_id)}</p>
  <p><strong>Amount:</strong> €${escapeHtmlEntities(data.payment_amount)}</p>
  <p><strong>Date:</strong> ${data.payment_date}</p>
  <p><strong>Service:</strong> ${escapeHtmlEntities(data.service_name || 'Therapy Session')}</p>
  <p><strong>Status:</strong> <span class="success-icon">✅</span> Completed</p>
</div>
```

**Fix:**
```javascript
<div class="details">
  <h3>💳 Payment Details</h3>
  <p><strong>Transaction ID:</strong> ${escapeHtmlEntities(data.transaction_id)}</p>
  <p><strong>Amount:</strong> €${escapeHtmlEntities(data.payment_amount)}</p>
  <p><strong>Date:</strong> ${data.payment_date}</p>
  <p><strong>Service:</strong> ${escapeHtmlEntities(data.service_name || 'Therapy Session')}</p>
  <p><strong>Visit Type:</strong> ${data.visit_type === 'clinic' ? '🏥 Clinic Visit' : data.visit_type === 'home' ? '🏠 Home Visit' : data.visit_type === 'online' ? '💻 Online Session' : '🏥 Clinic Visit'}</p>
  <p><strong>Status:</strong> <span class="success-icon">✅</span> Completed</p>
</div>
```

#### 3. Fix ICS Calendar Generation
**File:** `netlify/functions/send-email.cjs`
**Lines:** 128-140

**Current:**
```javascript
let description = `${data.service_name} appointment at KH Therapy\\nBooking Reference: ${data.booking_reference}`;
```

**Fix:**
```javascript
// Add visit type to calendar description
const visitTypeLabel = data.visit_type === 'clinic' ? '🏥 Clinic' : 
                       data.visit_type === 'home' ? '🏠 Home' : 
                       '💻 Online';

let description = `${visitTypeLabel} - ${data.service_name} appointment at KH Therapy\\nBooking Reference: ${data.booking_reference}`;
```

### Phase 2: Additional Email Templates (Medium Priority)

#### 4. Fix invoice_notification Template
**File:** `netlify/functions/send-email.cjs`
**Lines:** 630-636

**Current:**
```javascript
<div class="details">
  <h3>📄 Invoice Details</h3>
  <p><strong>Invoice Number:</strong> ${escapeHtmlEntities(data.invoice_number)}</p>
  <p><strong>Amount:</strong> €${escapeHtmlEntities(data.amount)}</p>
  <p><strong>Due Date:</strong> ${data.due_date}</p>
  <p><strong>Service:</strong> ${escapeHtmlEntities(data.service_name || 'Therapy Session')}</p>
</div>
```

**Fix:** Add visit type line after service line.

#### 5. Fix booking_with_payment_pending Template
**File:** `netlify/functions/send-email.cjs`
**Lines:** 1086-1094

**Current:**
```javascript
<div class="details">
  <h3>📅 Booking Details</h3>
  <p><strong>Service:</strong> ${escapeHtmlEntities(data.service_name)}</p>
  <p><strong>Date:</strong> ${data.appointment_date}</p>
  <p><strong>Time:</strong> ${data.appointment_time}</p>
  <p><strong>Reference:</strong> ${escapeHtmlEntities(data.booking_reference)}</p>
</div>
```

**Fix:** Add visit type line after service line.

#### 6. Fix booking_with_payment_failed Template
**File:** `netlify/functions/send-email.cjs`
**Lines:** 1030-1037

**Current:**
```javascript
<div class="details">
  <h3>📅 Booking Details</h3>
  <p><strong>Service:</strong> ${escapeHtmlEntities(data.service_name)}</p>
  <p><strong>Date:</strong> ${data.appointment_date}</p>
  <p><strong>Time:</strong> ${data.appointment_time}</p>
  <p><strong>Reference:</strong> ${escapeHtmlEntities(data.booking_reference)}</p>
</div>
```

**Fix:** Add visit type line after service line.

#### 7. Fix booking_captured Template
**File:** `netlify/functions/send-email.cjs`
**Lines:** 1361-1367

**Current:**
```javascript
<div class="details">
  <h3>📅 Appointment Details:</h3>
  <p><strong>Service:</strong> ${data.service_name}</p>
  <p><strong>Visit Type:</strong> ${data.visit_type === 'clinic' ? '🏥 Clinic Visit' : data.visit_type === 'home' ? '🏠 Home Visit' : data.visit_type === 'online' ? '💻 Online Session' : '🏥 Clinic Visit'}</p>
  <p><strong>Date:</strong> ${data.appointment_date}</p>
  <p><strong>Time:</strong> ${data.appointment_time}</p>
  <p><strong>Reference:</strong> ${escapeHtmlEntities(data.booking_reference)}</p>
</div>
```

**Note:** This template already has visit type! No fix needed.

### Phase 3: Validation and Testing

#### 8. Test All Email Templates
- Verify visit type displays correctly in all templates
- Test edge cases (missing visit_type, invalid values)
- Ensure consistent formatting across templates

#### 9. Verify Data Flow
- Confirm visit_type is passed from booking creation to email generation
- Check that all email functions receive the visit_type parameter
- Validate database queries include visit_type field

#### 10. Calendar Integration Testing
- Verify ICS files include visit type in description
- Test calendar import in different calendar applications
- Ensure visit type information is preserved in calendar events

---

## Expected Outcomes

### Immediate Benefits
1. **Improved Customer Experience**
   - Clear service expectations in all communications
   - Reduced confusion about appointment types
   - Better preparation for different visit types

2. **Operational Efficiency**
   - Fewer no-shows due to misunderstanding service type
   - Better therapist preparation for different visit types
   - Reduced administrative overhead for clarifying appointments

3. **Service Quality**
   - Consistent service delivery matching customer expectations
   - Better resource allocation for different visit types
   - Improved customer satisfaction scores

### Long-term Benefits
1. **Reduced Errors**
   - Fewer service expectation mismatches
   - Better appointment scheduling accuracy
   - Improved resource utilization

2. **Enhanced Communication**
   - Clear, consistent messaging across all touchpoints
   - Better customer self-service capabilities
   - Improved transparency in service delivery

3. **Scalability**
   - Easy to add new visit types in the future
   - Consistent implementation across all customer communications
   - Better integration with external systems

---

## Risk Assessment

### Low Risk
- Template modifications are straightforward
- Existing functionality remains unchanged
- Consistent implementation pattern already established

### Medium Risk
- Calendar integration changes may affect existing calendar imports
- Need to ensure all email functions receive visit_type parameter
- Testing required across different email clients

### Mitigation Strategies
1. **Backward Compatibility**
   - Implement fallback to 'clinic' if visit_type is missing
   - Maintain existing template structure
   - Test with existing booking data

2. **Testing Strategy**
   - Create test cases for all visit types
   - Test with missing/invalid visit_type values
   - Verify calendar integration works correctly

3. **Rollout Plan**
   - Implement changes in phases
   - Monitor for any issues after each deployment
   - Have rollback plan ready if needed

---

## Success Metrics

### Quantitative Metrics
1. **Reduction in Service Mismatches**
   - Track number of customer inquiries about appointment type
   - Monitor no-show rates by visit type
   - Measure resolution time for service clarification requests

2. **Customer Satisfaction**
   - Track NPS scores after implementation
   - Monitor customer feedback about clarity of communications
   - Measure increase in positive reviews mentioning clear expectations

3. **Operational Efficiency**
   - Reduce time spent clarifying appointment details
   - Improve therapist preparation time
   - Decrease administrative overhead

### Qualitative Metrics
1. **Customer Feedback**
   - Collect feedback on email clarity
   - Monitor customer satisfaction with service delivery
   - Track reduction in confusion-related inquiries

2. **Internal Feedback**
   - Gather feedback from administrative staff
   - Monitor therapist satisfaction with appointment clarity
   - Track improvement in scheduling accuracy

---

## Conclusion

The visit type email fix is a critical enhancement that will significantly improve customer experience and operational efficiency. By ensuring consistent display of visit type across all email communications, we eliminate service expectation mismatches and provide customers with the information they need to prepare appropriately for their appointments.

The implementation is straightforward and carries minimal risk, with clear benefits for both customers and the organization. The phased approach ensures that critical fixes are implemented first, followed by additional improvements to achieve comprehensive coverage across all customer communications.

**Recommended Action:** Proceed with Phase 1 implementation immediately, followed by Phase 2 and Phase 3 based on priority and resource availability.