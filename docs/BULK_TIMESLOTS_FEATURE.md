# Bulk Time Slot Creation Feature

## Overview

A new bulk time slot creation feature has been added to the Services Management section in the Admin Console. This feature allows administrators to create multiple 50-minute time slots in bulk for services across different days and times.

## Features

### 1. Global Bulk Creation
- Located in the Services Management page, above the services list
- Allows creating time slots for multiple services at once
- Option to apply to all services or select specific services

### 2. Per-Service Quick Bulk Creation
- Available when viewing time slots for a specific service
- "Quick Bulk" button pre-selects the current service
- Streamlined workflow for single-service bulk creation

### 3. 50-Minute Slot Generation
- Automatically calculates and creates 50-minute time slots
- Slots are generated within the specified time range
- No overlapping or invalid time slots are created

## How It Works

### Time Slot Generation Algorithm
1. Takes a start time and end time as input
2. Generates consecutive 50-minute slots within that range
3. Each slot is exactly 50 minutes long
4. Stops when there isn't enough time for another complete slot

### Example:
- Start Time: 09:00
- End Time: 17:00
- Generated Slots:
  - 09:00 - 09:50
  - 09:50 - 10:40
  - 10:40 - 11:30
  - 11:30 - 12:20
  - 12:20 - 13:10
  - 13:10 - 14:00
  - 14:00 - 14:50
  - 14:50 - 15:40
  - 15:40 - 16:30
  - (16:30 - 17:20 would exceed end time, so not created)

## User Interface

### Configuration Options
- **Slot Type**: In Hours / Out of Hours
- **Time Range**: Start and End times
- **Days Selection**: Multi-select for days of the week
- **Service Selection**: 
  - "All Services" toggle
  - Individual service selection checkboxes

### Preview Section
Shows a real-time preview of:
- Number of slots per day
- Number of days selected
- Number of services selected
- Total time slots to be created

### Validation
- Ensures at least one day is selected
- Validates that end time is after start time
- Requires at least one service to be selected
- Shows error messages for validation failures

## Database Integration

### Table: `services_time_slots`
Each generated slot creates a record with:
- `service_id`: The service ID
- `slot_type`: 'in-hour' or 'out-of-hour'
- `day_of_week`: 0 (Sunday) to 6 (Saturday)
- `start_time`: Slot start time (HH:MM format)
- `end_time`: Slot end time (HH:MM format)
- `is_available`: Always set to true initially

### Bulk Insert Operation
- All slots are inserted in a single database transaction
- Time slot counts are automatically updated
- If viewing time slots for an affected service, the display is refreshed

## Success Feedback

After successful bulk creation, the system shows:
- Total number of time slots created
- Number of services affected
- Number of days configured
- Time slot counts are updated in real-time

## Error Handling

Comprehensive error handling for:
- Database connection issues
- Validation errors
- Duplicate time slot conflicts (handled by database)
- Network timeouts

## Benefits

1. **Time Saving**: Create hundreds of time slots in seconds instead of manually adding one by one
2. **Consistency**: All slots are exactly 50 minutes long
3. **Flexibility**: Can apply to specific services or all services at once
4. **User Friendly**: Clear preview and validation before creation
5. **Efficient**: Single database transaction for all operations

## Usage Scenarios

### Scenario 1: New Service Setup
When adding a new service, quickly create a full week's worth of time slots across business hours.

### Scenario 2: Schedule Changes
When updating business hours, bulk create new time slots for all services at once.

### Scenario 3: Weekend/Holiday Hours
Create special out-of-hour slots for weekends or holidays for all services.

### Scenario 4: Service-Specific Hours
Some services may have different availability - use the quick bulk feature for individual services.

## Technical Implementation

- Pure TypeScript/React implementation
- Uses Supabase for database operations
- Real-time preview calculations
- Optimized database queries with bulk inserts
- Comprehensive error handling and user feedback
