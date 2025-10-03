# Multiple Customer Names Per Email Address

## Overview
The system now supports multiple customer records with the same email address but different names. This allows situations where different family members or individuals use the same email for bookings.

## Example Use Case
- Sarah Tiwari books a service using sarah@domain.com
- Later, Neha Tiwari books a service using the same sarah@domain.com
- Both customers will be created as separate records in the database
- In the invoice management, both will appear as separate options:
  - Sarah Tiwari - sarah@domain.com
  - Neha Tiwari - sarah@domain.com

## Technical Implementation

### Database Changes
- Removed UNIQUE constraint on customers.email column
- Added composite index on (email, first_name, last_name) for performance
- Created migration file: `database/allow-multiple-names-per-email.sql`

### Code Changes
1. **Customer Creation Logic** (`src/utils/customerBookingUtils.ts`):
   - Modified `findOrCreateCustomer()` to check for exact name match within customers with same email
   - If exact name match found, update only phone if needed
   - If no exact name match, create new customer record

2. **Error Handling** (`src/components/admin/CustomerManagement.tsx`):
   - Updated error handling to no longer treat email duplicates as errors
   - Still handle primary key violations and other constraint errors

### User Interface
- **Invoice Management**: Customer dropdown shows both name and email, so multiple customers with same email are distinguishable
- **Customer Management**: Table naturally supports multiple entries with same email, showing names in separate column
- **Booking Process**: Unchanged - users can continue booking as before

## Benefits
- Families can use shared email addresses
- No disruption to existing functionality
- Clear distinction in admin interfaces
- Maintains data integrity through proper relationships

## Backward Compatibility
- Existing customer records remain unchanged
- Existing bookings maintain their customer relationships
- All existing functionality continues to work as before