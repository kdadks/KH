# KH THERAPY - Physiotherapy Clinic Management System

## 🏥 Overview

KH THERAPY is a comprehensive, modern physiotherapy clinic management system built with React and TypeScript. It provides a complete solution for managing appointments, patient bookings, availability, and clinic administration with real-time data synchronization using Supabase.

## ✨ Features

### 🌐 Public-Facing Website
- **Modern Landing Page**: Hero section with compelling call-to-action
- **Services Showcase**: Detailed service packages with pricing (€65-€250)
- **Interactive Booking**: Real-time appointment booking with calendar integration
- **Patient Information**: Testimonials, FAQ section, and contact information
- **Mobile Responsive**: Fully optimized for all device sizes
- **SEO Optimized**: Meta tags, structured data, and sitemap generation

### 📊 Comprehensive Admin Console
- **Dashboard**: Real-time metrics and recent bookings overview
- **Booking Management**: Complete appointment lifecycle management
- **Service Administration**: Package and pricing management
- **Availability Control**: Time slot and schedule management
- **Advanced Reports**: Data analytics with export capabilities

### 📅 Booking System
- **Real-time Calendar**: BigCalendar integration with availability checking
- **Smart Scheduling**: Automatic conflict detection and validation
- **Status Management**: Pending, confirmed, and cancelled booking states
- **Multi-view Support**: Calendar and list views with filtering
- **Email Notifications**: Automated booking confirmations and updates

### 📋 Reports & Analytics
- **Flexible Filtering**: Date range (daily, weekly, monthly, custom) and status filtering
- **Export Options**: Professional Excel and PDF export with branding
- **Smart Validation**: Status-driven filtering with intelligent date validation
- **Mobile Responsive**: Optimized tables and controls for all devices
- **Summary Statistics**: Automatic calculations and insights

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript for type safety
- **Tailwind CSS** for responsive styling
- **React Router** for navigation
- **BigCalendar** for calendar functionality
- **Lucide React** for icons

### Backend & Database
- **Supabase** for real-time database and authentication
- **PostgreSQL** as the underlying database
- **Row Level Security (RLS)** for data protection

### Export & Reporting
- **xlsx** library for Excel export
- **jspdf** + **jspdf-autotable** for PDF generation
- **date-fns** for date manipulation and formatting

### Development Tools
- **Vite** for fast development and building
- **ESLint** for code quality
- **PostCSS** for CSS processing
- **TypeScript** for static type checking

## 📦 Service Packages

The system includes four pre-configured treatment packages:

1. **Basic Wellness** (€65) - 45-minute session with assessment and basic treatment
2. **Complete Therapy** (€120) - 90-minute comprehensive session with advanced techniques
3. **Premium Care** (€180) - 2-hour premium treatment with full body assessment
4. **Ultimate Health** (€250) - 3-hour ultimate wellness experience with personalized plan

## 🔐 Admin Features

### Dashboard
- Real-time booking statistics
- Today's appointments overview
- Quick navigation to different sections
- Recent bookings display

### Booking Management
- **List & Calendar Views**: Toggle between detailed list and visual calendar
- **Advanced Filtering**: Search, date filtering, and status filtering
- **Bulk Operations**: Export all bookings or filtered results
- **Status Management**: Pending → Confirmed → Cancelled workflow
- **Smart Actions**: Automatic date/time validation for confirmations

### Calendar Integration
- **Multi-view Support**: Day, week, and month views
- **Color-coded Status**: Visual distinction for different booking states
- **Click Actions**: Quick booking details and management
- **Availability Overlay**: See available time slots alongside bookings

### Reports System
- **Flexible Date Ranges**: 
  - Daily: Current day bookings
  - Weekly: Monday to Sunday range
  - Monthly: Full calendar month
  - Custom: User-defined date range
- **Status Filtering**: All, pending, confirmed, cancelled
- **Smart Validation**: Prevents invalid filter combinations
- **Professional Export**: 
  - Excel with formatted headers and data
  - PDF with company branding and summaries
  - Automatic file naming with date and filter information

### Service Management
- **Package Configuration**: Edit pricing, features, and descriptions
- **Real-time Updates**: Changes reflect immediately across the system
- **Feature Management**: Add/remove package features dynamically

### Availability Management
- **Time Slot Creation**: Define available appointment times
- **Calendar View**: Visual availability management
- **Conflict Prevention**: Automatic overlap detection
- **Bulk Operations**: Mass availability updates

## 🗄️ Database Schema

### Bookings Table
```sql
- customer_name: VARCHAR
- customer_email: VARCHAR  
- customer_phone: VARCHAR
- package_name: VARCHAR
- booking_date: TIMESTAMP
- notes: TEXT
- status: VARCHAR (pending, confirmed, cancelled)
```

### Availability Table
```sql
- date: DATE
- start: TIME
- end_time: TIME
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Supabase account and project
- Modern web browser

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd KH
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
Create a `.env.local` file with your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Database Setup**
Set up the required tables in your Supabase project:
```sql
-- Bookings table
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR NOT NULL,
  customer_email VARCHAR NOT NULL,
  customer_phone VARCHAR NOT NULL,
  package_name VARCHAR NOT NULL,
  booking_date TIMESTAMP,
  notes TEXT,
  status VARCHAR DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Availability table
CREATE TABLE availability (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  start TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

5. **Start Development**
```bash
npm run dev
```

6. **Build for Production**
```bash
npm run build
```

## 📱 Mobile Responsiveness

The application is fully responsive with:
- **Breakpoint System**: Mobile-first design with sm, md, lg, xl breakpoints
- **Touch-Friendly**: Large buttons and touch targets
- **Adaptive Layouts**: Stack/grid layouts that adapt to screen size
- **Optimized Tables**: Responsive tables with hidden columns on mobile
- **Mobile Navigation**: Hamburger menu and touch-friendly navigation

## 📊 Export Features

### Excel Export
- **Professional Formatting**: Headers, data validation, and styling
- **Complete Data**: All booking information including status and notes
- **Automatic Naming**: Files named with export date and filters
- **Error Handling**: Graceful error handling with user feedback

### PDF Export
- **Company Branding**: Logo and professional header
- **Structured Layout**: Well-organized tables with proper spacing
- **Summary Information**: Total records and export date
- **Mobile Optimized**: Responsive PDF generation for all devices

## 🔧 Admin Access

The admin console requires authentication through Supabase Auth. Default access is configured for authorized users with proper role-based access control.

### Admin Functions:
- View and manage all bookings
- Generate detailed reports
- Export data in multiple formats
- Manage clinic availability
- Configure service packages
- Monitor real-time statistics

## 🌐 Deployment

The application is configured for deployment on Netlify with:
- **Build Configuration**: Optimized Vite build process
- **Redirects**: SPA routing support
- **Environment Variables**: Secure configuration management
- **Performance**: Optimized assets and lazy loading

## 📞 Support & Maintenance

### Key Features for Administrators:
- **Real-time Sync**: All data updates in real-time across all sessions
- **Backup Ready**: Supabase provides automatic backups
- **Scalable**: Built to handle growing appointment volumes
- **Secure**: Industry-standard security with Supabase
- **Analytics Ready**: Built-in reporting for business insights

## 🎯 Business Benefits

- **Efficiency**: Automated booking management reduces manual work
- **Professional**: Modern interface enhances clinic reputation
- **Insights**: Detailed reports provide business intelligence
- **Scalability**: System grows with your clinic
- **Cost-Effective**: No per-appointment fees or transaction costs

## 📈 Future Enhancements

The system is designed for easy expansion with:
- **API Integration**: Ready for third-party integrations
- **Email Automation**: Built-in email system for notifications
- **Multi-location**: Expandable for multiple clinic locations
- **Advanced Analytics**: Ready for enhanced reporting features
- **Patient Portal**: Foundation for patient self-service features

---

**Built with ❤️ for KH THERAPY - Professional Physiotherapy & Rehabilitation Services**
