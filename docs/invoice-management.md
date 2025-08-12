# Invoice Management System Documentation

## Overview
This document describes the invoice management system for KH Therapy, a physiotherapy practice in Ireland. The system is designed to handle professional invoicing while maintaining compliance with Irish tax regulations.

## Database Schema Changes

### New Tables

#### 1. customers
- **Purpose**: Stores detailed customer information for invoicing
- **Fields**:
  - `id` (Primary Key): Auto-incrementing integer
  - `first_name`: Customer's first name
  - `last_name`: Customer's last name
  - `email`: Email address
  - `phone`: Phone number
  - `address_line_1`: Primary address line
  - `address_line_2`: Secondary address line (optional)
  - `city`: City
  - `county`: County/State
  - `eircode`: Irish postal code
  - `country`: Country (defaults to 'Ireland')
  - `date_of_birth`: Date of birth (optional)
  - `emergency_contact_name`: Emergency contact name (optional)
  - `emergency_contact_phone`: Emergency contact phone (optional)
  - `medical_notes`: Medical history notes (optional)
  - `created_at`: Timestamp of creation
  - `updated_at`: Timestamp of last update

#### 2. invoices
- **Purpose**: Stores invoice information
- **Fields**:
  - `id` (Primary Key): Auto-incrementing integer
  - `invoice_number`: Unique invoice identifier (format: INV-YYYY-NNNN)
  - `customer_id`: Foreign key to customers table
  - `booking_id`: Foreign key to bookings table (optional)
  - `invoice_date`: Date of invoice
  - `due_date`: Payment due date
  - `subtotal`: Subtotal amount before tax
  - `vat_rate`: VAT rate (23% in Ireland for physiotherapy)
  - `vat_amount`: VAT amount
  - `total_amount`: Total amount including VAT
  - `status`: Invoice status (draft, sent, paid, overdue, cancelled)
  - `payment_method`: Payment method (cash, card, bank_transfer, etc.)
  - `payment_date`: Date of payment (when paid)
  - `notes`: Additional notes
  - `created_at`: Timestamp of creation
  - `updated_at`: Timestamp of last update

#### 3. invoice_items
- **Purpose**: Stores individual line items for invoices
- **Fields**:
  - `id` (Primary Key): Auto-incrementing integer
  - `invoice_id`: Foreign key to invoices table
  - `service_id`: Foreign key to services table
  - `description`: Service description
  - `quantity`: Quantity (usually 1 for physiotherapy sessions)
  - `unit_price`: Price per unit
  - `total_price`: Total price for this line item
  - `created_at`: Timestamp of creation

### Modified Tables

#### bookings
- **New Fields Added**:
  - `customer_id`: Foreign key to customers table
- **Migration Strategy**: Populate customer_id by creating customer records from existing booking data

## Irish Tax Compliance

### VAT (Value Added Tax)
- Standard VAT rate: 23%
- Physiotherapy services in Ireland are subject to VAT
- VAT registration threshold: €37,500 (as of 2025)

### Invoice Requirements (Irish Revenue)
- Unique sequential invoice number
- Date of issue
- VAT registration number (if applicable)
- Customer details (name, address)
- Description of services
- Amount excluding VAT
- VAT rate and amount
- Total amount including VAT

## Features

### 1. Customer Management
- Create, read, update, delete customer records
- Merge duplicate customers
- View customer history
- Medical notes and emergency contacts

### 2. Invoice Generation
- Generate invoices from bookings
- Manual invoice creation
- Bulk invoice generation
- PDF export with professional template

### 3. Payment Tracking
- Record payments
- Track overdue invoices
- Payment reminders
- Financial reporting

### 4. Reporting
- Revenue reports
- VAT reports
- Customer statements
- Overdue accounts

## Technical Implementation

### Components
- `InvoiceManagement.tsx`: Main invoice management component
- `CustomerManagement.tsx`: Customer CRUD operations
- `InvoiceGenerator.tsx`: Invoice creation and PDF generation
- `PaymentTracker.tsx`: Payment recording and tracking

### Database Migrations
- Create new tables without affecting existing data
- Populate customer data from existing bookings
- Add foreign key relationships

### Security Considerations
- Customer data encryption for sensitive information
- Access control for financial data
- Audit logging for all financial transactions

## Usage Workflow

1. **Customer Creation**: When a new booking is made, check if customer exists, create if needed
2. **Service Delivery**: After service is provided, mark booking as completed
3. **Invoice Generation**: Generate invoice from completed booking
4. **Payment Processing**: Record payment when received
5. **Reporting**: Generate financial reports for business analysis

## Migration Plan

### Phase 1: Database Setup
1. Create new tables (customers, invoices, invoice_items)
2. Create migration scripts to populate customers from bookings
3. Add customer_id foreign key to bookings table

### Phase 2: Component Development
1. Develop customer management interface
2. Create invoice generation system
3. Implement payment tracking

### Phase 3: Integration
1. Integrate with existing admin console
2. Update booking workflow to use customer records
3. Testing and validation

### Phase 4: Deployment
1. Deploy database changes
2. Run migration scripts
3. Deploy new components
4. User training

## Support and Maintenance

### Regular Tasks
- Monthly VAT return preparation
- Quarterly financial reports
- Annual customer data cleanup
- Backup verification

### Troubleshooting
- Data inconsistency resolution
- Payment reconciliation
- Invoice correction procedures
