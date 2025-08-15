# GDPR Migration Setup Guide

## ✅ ES Module Conversion Complete

The GDPR migration script has been successfully converted to ES module format and is now working correctly.

## 🚀 Current Status

**Fixed Issues:**
- ✅ Converted from CommonJS `require()` to ES module `import` statements
- ✅ Fixed `require.main === module` check for ES modules
- ✅ Added proper configuration validation
- ✅ Script now runs without syntax errors

## 🔧 Next Steps to Run Migration

### 1. Configure Supabase Credentials

Edit `scripts/migrate-gdpr-compliance.js` and update these values:

```javascript
// Configuration - UPDATE THESE VALUES
const SUPABASE_URL = 'https://your-project.supabase.co'; // Replace with your actual Supabase URL
const SUPABASE_ANON_KEY = 'your-anon-key'; // Replace with your actual anon key  
const ENCRYPTION_KEY = 'your-encryption-key-change-in-production'; // Generate a strong encryption key
```

### 2. Get Your Supabase Credentials

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings > API**
4. Copy:
   - **Project URL** → Use as `SUPABASE_URL`
   - **anon public** key → Use as `SUPABASE_ANON_KEY`

### 3. Generate Encryption Key

Generate a secure encryption key (32+ characters):
```bash
# Option 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Using OpenSSL
openssl rand -hex 32

# Option 3: Manual (ensure it's 32+ characters)
# Example: "MySecureGDPREncryptionKey2024!@#$%"
```

### 4. Update Environment Variables

Add the same encryption key to your `.env` file:
```bash
REACT_APP_ENCRYPTION_KEY=your-generated-encryption-key
```

### 5. Run Database Schema Migration

Before running the migration script, execute the GDPR database schema:

1. Go to your Supabase dashboard
2. Open the **SQL Editor**
3. Upload and run: `database/gdpr-compliance-schema.sql`

### 6. Run the Migration

Once configured, run:
```bash
npm run migrate-gdpr
```

## 🔍 What the Migration Does

1. **Validates GDPR Setup**: Checks if all GDPR tables exist
2. **Migrates Consent Records**: Sets up retroactive privacy consent for existing customers
3. **Encrypts Customer Data**: Encrypts sensitive PII fields (phone, address, etc.)
4. **Updates Compliance Flags**: Marks customers as having encrypted data

## ⚠️ Important Notes

- **Backup First**: Always backup your database before running migrations
- **Test Environment**: Run on a development copy first
- **Irreversible**: Encryption changes are permanent (have backups!)
- **Downtime**: Plan for brief service interruption during migration

## 🎯 Expected Output

When properly configured, you should see:
```
🚀 Starting GDPR Compliance Migration
=====================================
🔍 Validating GDPR compliance setup...
✅ GDPR Audit Log Table: OK
✅ Consent Records Table: OK
✅ Data Subject Requests Table: OK
✅ Data Retention Policies Table: OK
✅ Customer GDPR fields: OK
🎯 GDPR setup validation completed

📋 Starting consent records migration...
📊 Found X customers for consent migration
✅ Set up consent for customer 1 (email@example.com)
🎉 Consent migration completed: X processed, 0 errors

🔐 Starting customer data encryption...
📊 Found X customers for encryption
✅ Encrypted customer 1 (email@example.com)
🎉 Encryption migration completed: X processed, 0 errors

🎉 GDPR Compliance Migration Completed!
```

## 🆘 Troubleshooting

- **"Configuration Error"**: Update the Supabase credentials at the top of the script
- **"Table does not exist"**: Run the GDPR database schema first
- **"Permission denied"**: Check your Supabase anon key permissions
- **"Encryption failed"**: Verify your encryption key is properly set
