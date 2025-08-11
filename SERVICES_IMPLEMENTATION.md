# Services Management Implementation

## Database Schema

The Services Management system uses two main database tables:

### 1. services table
```sql
CREATE TABLE services (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  price VARCHAR(100),
  in_hour_price VARCHAR(50),
  out_of_hour_price VARCHAR(50),
  features TEXT[], -- PostgreSQL array for multiple features
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. services_time_slots table
```sql
CREATE TABLE services_time_slots (
  id SERIAL PRIMARY KEY,
  service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
  slot_type VARCHAR(20) NOT NULL CHECK (slot_type IN ('in-hour', 'out-of-hour')),
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Features Implemented

### Core CRUD Operations
- **Create**: Add new services with comprehensive form validation
- **Read**: Fetch and display all active services from database
- **Update**: Edit existing services with real-time updates
- **Delete**: Soft delete (sets is_active = false) with confirmation dialog

### Time Slots Management
- **In-Hour & Out-of-Hour Classification**: Services can have different pricing and availability
- **Weekly Schedule**: Configure specific time slots for each day of the week
- **Visual Management**: Collapsible time slots interface for each service
- **Color-coded Display**: Green for in-hour, Orange for out-of-hour slots

### Advanced Features
- **Database Integration**: Full Supabase integration with RLS policies
- **Toast Notifications**: Success/error feedback for all operations
- **Form Validation**: Client-side validation with error messages
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Loading States**: Loading indicators for database operations
- **Confirmation Dialogs**: Safety confirmations for destructive actions

## Database Setup Instructions

1. **Run the schema creation script** in your Supabase SQL editor:
   ```bash
   # Execute the contents of database/services-schema.sql
   ```

2. **Verify table creation**:
   - Check that `services` and `services_time_slots` tables exist
   - Verify that RLS policies are active
   - Test with a sample insert to ensure permissions work

3. **Optional: Load sample data** (uncomment the sample data section in schema file)

## Component Structure

### Main Component: Services.tsx
- **Location**: `src/components/admin/Services.tsx`
- **Dependencies**: Supabase client, Toast context, TypeScript types
- **State Management**: Local state for services list, editing, and time slots

### Type Definitions
- **Updated Package type**: Extended with database fields (id, description, timestamps)
- **New ServiceTimeSlot type**: For managing availability slots
- **Location**: `src/components/admin/types.ts`

## Key Functions

### Service Management
- `fetchServices()`: Loads all active services from database
- `handleAdd()`: Creates new service with validation
- `handleSaveEdit()`: Updates existing service
- `handleDelete()`: Soft deletes service with confirmation

### Time Slot Management
- `fetchTimeSlots(serviceId)`: Loads time slots for specific service
- `handleAddTimeSlot()`: Creates new time slot
- `handleDeleteTimeSlot()`: Removes time slot
- `handleViewTimeSlots()`: Toggles time slot interface

## Usage Instructions

### Adding a Service
1. Fill in required service name
2. Optionally add category, pricing, and features
3. Click "Add Service" to save to database
4. Service appears at top of list with success notification

### Managing Time Slots
1. Click "Time Slots" button on any service
2. Use the form to add in-hour/out-of-hour slots
3. Select day of week, start time, and end time
4. View all configured slots with color coding
5. Delete unwanted slots with trash button

### Editing Services
1. Click edit icon on any service
2. Modify fields in inline edit form
3. Click "Save Changes" to update database
4. Changes reflect immediately with success notification

## Security & Performance

### Row Level Security (RLS)
- All tables have RLS enabled
- Policies allow public read access
- Write operations require authentication
- Policies support both authenticated and anonymous users

### Performance Optimizations
- Indexes on frequently queried columns
- Efficient database queries with specific selects
- Optimistic UI updates for better user experience
- Proper error handling and loading states

## Migration from Legacy System

The system maintains backward compatibility with existing package management:
- Legacy treatment packages from `data/packages.ts` are not automatically migrated
- Admin can manually re-create services through the new interface
- New database-backed system replaces local state management
- All existing functionality preserved with enhanced database persistence

## Troubleshooting

### Common Issues
1. **Database connection errors**: Verify Supabase URL and keys in `supabaseClient.ts`
2. **RLS policy errors**: Check that policies allow your authentication level
3. **Time slot validation**: Ensure end time is after start time
4. **Features array**: Empty strings are automatically filtered out

### Error Handling
- All database operations wrapped in try-catch blocks
- User-friendly error messages via toast notifications
- Graceful fallbacks for network/database issues
- Form validation prevents invalid data submission

This implementation provides a robust, scalable services management system with comprehensive time slot functionality suitable for a physiotherapy practice management system.
