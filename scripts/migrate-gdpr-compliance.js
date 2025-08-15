#!/usr/bin/env node

/**
 * GDPR Compliance Migration Script
 * 
 * This script helps migrate existing customer data to be GDPR compliant
 * by encrypting sensitive fields and setting up proper consent records.
 * 
 * Usage: node migrate-gdpr-compliance.js
 * 
 * Prerequisites:
 * 1. Update SUPABASE_URL and SUPABASE_ANON_KEY below
 * 2. Ensure gdpr-compliance-schema.sql has been executed
 * 3. Install dependencies: npm install crypto-js
 */

import crypto from 'crypto-js';
import { createClient } from '@supabase/supabase-js';

// Configuration - UPDATE THESE VALUES
const SUPABASE_URL = 'https://hlmqgghrrmvstbmvwsni.supabase.co';
const SUPABASE_ANON_KEY ='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsbXFnZ2hycm12c3RibXZ3c25pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzU0MTgsImV4cCI6MjA2ODc1MTQxOH0.3qjmIl_2T9sJR71uuo_QM58t2gyAoF-6HnVCdfBgj6o';
const ENCRYPTION_KEY = 'e8887bee1e9d193180231ad1a5592369c251b6218c09fe873235bfce784a51ed'; // Generated secure encryption key

// Supabase client setup
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Encrypt sensitive data using AES encryption
 */
function encryptSensitiveData(data) {
  if (!data || typeof data !== 'string') return data;
  try {
    return crypto.AES.encrypt(data, ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error('Encryption error:', error);
    return data;
  }
}

/**
 * Check if data appears to be encrypted
 */
function isDataEncrypted(data) {
  if (!data || typeof data !== 'string') return false;
  return data.includes('U2FsdGVkX1') || data.length > 100;
}

/**
 * Migrate customer data to encrypted format
 */
async function migrateCustomerEncryption() {
  console.log('🔐 Starting customer data encryption migration...');
  
  try {
    // Get all customers that need encryption
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .eq('pii_encrypted', false);

    if (error) {
      throw error;
    }

    if (!customers || customers.length === 0) {
      console.log('✅ No customers need encryption migration');
      return;
    }

    console.log(`📊 Found ${customers.length} customers to encrypt`);

    const sensitiveFields = [
      'first_name', 
      'last_name', 
      'phone', 
      'address_line_1', 
      'address_line_2', 
      'city', 
      'county', 
      'eircode',
      'date_of_birth',
      'emergency_contact_name',
      'emergency_contact_phone',
      'medical_notes'
    ];

    let processed = 0;
    let errors = 0;

    for (const customer of customers) {
      try {
        const updates = { pii_encrypted: true };
        let hasChanges = false;

        // Encrypt sensitive fields
        sensitiveFields.forEach(field => {
          if (customer[field] && !isDataEncrypted(customer[field])) {
            updates[field] = encryptSensitiveData(customer[field]);
            hasChanges = true;
          }
        });

        if (hasChanges) {
          const { error: updateError } = await supabase
            .from('customers')
            .update(updates)
            .eq('id', customer.id);

          if (updateError) {
            throw updateError;
          }
        } else {
          // Just mark as encrypted
          const { error: updateError } = await supabase
            .from('customers')
            .update({ pii_encrypted: true })
            .eq('id', customer.id);

          if (updateError) {
            throw updateError;
          }
        }

        processed++;
        console.log(`✅ Encrypted customer ${customer.id} (${customer.email})`);
      } catch (error) {
        errors++;
        console.error(`❌ Failed to encrypt customer ${customer.id}:`, error.message);
      }
    }

    console.log(`🎉 Encryption migration completed: ${processed} processed, ${errors} errors`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

/**
 * Set up retroactive consent for existing customers
 */
async function migrateConsentRecords() {
  console.log('📋 Starting consent records migration...');
  
  try {
    // Get customers without privacy consent
    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, email, created_at')
      .or('privacy_consent_given.is.null,privacy_consent_given.eq.false');

    if (error) {
      throw error;
    }

    if (!customers || customers.length === 0) {
      console.log('✅ No customers need consent migration');
      return;
    }

    console.log(`📊 Found ${customers.length} customers for consent migration`);

    let processed = 0;
    let errors = 0;

    for (const customer of customers) {
      try {
        // Record retroactive privacy consent (legitimate interest basis)
        const { error: consentError } = await supabase
          .from('consent_records')
          .insert([{
            customer_id: customer.id,
            consent_type: 'privacy',
            consent_given: true,
            consent_date: customer.created_at || new Date().toISOString(),
            consent_method: 'retroactive_migration',
            legal_basis: 'legitimate_interest',
            purpose: 'Healthcare service provision - retroactive consent for existing customers',
            data_categories: ['personal_data', 'health_data'],
            retention_period: '7 years'
          }]);

        if (consentError) {
          throw consentError;
        }

        // Update customer record
        const { error: updateError } = await supabase
          .from('customers')
          .update({
            privacy_consent_given: true,
            privacy_consent_date: customer.created_at || new Date().toISOString(),
            data_processing_basis: 'legitimate_interest'
          })
          .eq('id', customer.id);

        if (updateError) {
          throw updateError;
        }

        processed++;
        console.log(`✅ Set up consent for customer ${customer.id} (${customer.email})`);
      } catch (error) {
        errors++;
        console.error(`❌ Failed to set up consent for customer ${customer.id}:`, error.message);
      }
    }

    console.log(`🎉 Consent migration completed: ${processed} processed, ${errors} errors`);
  } catch (error) {
    console.error('❌ Consent migration failed:', error);
  }
}

/**
 * Validate GDPR compliance setup
 */
async function validateGdprSetup() {
  console.log('🔍 Validating GDPR compliance setup...');

  const checks = [
    { name: 'GDPR Audit Log Table', query: () => supabase.from('gdpr_audit_log').select('id').limit(1) },
    { name: 'Consent Records Table', query: () => supabase.from('consent_records').select('id').limit(1) },
    { name: 'Data Subject Requests Table', query: () => supabase.from('data_subject_requests').select('id').limit(1) },
    { name: 'Data Retention Policies Table', query: () => supabase.from('data_retention_policies').select('id').limit(1) },
  ];

  for (const check of checks) {
    try {
      const { error } = await check.query();
      if (error) {
        console.log(`❌ ${check.name}: ${error.message}`);
      } else {
        console.log(`✅ ${check.name}: OK`);
      }
    } catch (error) {
      console.log(`❌ ${check.name}: ${error.message}`);
    }
  }

  // Check if customers have GDPR fields
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('gdpr_anonymized, privacy_consent_given, pii_encrypted')
      .limit(1);
    
    if (error) {
      console.log(`❌ Customer GDPR fields: ${error.message}`);
    } else {
      console.log('✅ Customer GDPR fields: OK');
    }
  } catch (error) {
    console.log(`❌ Customer GDPR fields: ${error.message}`);
  }

  console.log('🎯 GDPR setup validation completed');
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('🚀 Starting GDPR Compliance Migration');
  console.log('=====================================');

  // Check configuration
  if (SUPABASE_URL === 'https://your-project.supabase.co' || 
      SUPABASE_ANON_KEY === 'your-anon-key' || 
      ENCRYPTION_KEY === 'your-encryption-key-change-in-production') {
    console.log('❌ Configuration Error:');
    console.log('Please update the configuration values at the top of this script:');
    console.log('- SUPABASE_URL: Your Supabase project URL');
    console.log('- SUPABASE_ANON_KEY: Your Supabase anon key');
    console.log('- ENCRYPTION_KEY: A secure encryption key (same as REACT_APP_ENCRYPTION_KEY)');
    console.log('');
    console.log('You can find these values in your Supabase dashboard under Settings > API');
    return;
  }

  // Validate setup first
  await validateGdprSetup();
  console.log('');

  // Run migrations
  await migrateConsentRecords();
  console.log('');
  
  await migrateCustomerEncryption();
  console.log('');

  console.log('🎉 GDPR Compliance Migration Completed!');
  console.log('');
  console.log('Next Steps:');
  console.log('1. Update your .env file with REACT_APP_ENCRYPTION_KEY');
  console.log('2. Deploy the updated application code');
  console.log('3. Train admin users on GDPR compliance tools');
  console.log('4. Test the privacy settings in the user portal');
  console.log('5. Update your privacy policy if needed');
}

// Run the migration (ES module equivalent of require.main === module)
// Fix for ES modules - use fileURLToPath for proper comparison
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const isMainModule = resolve(process.argv[1]) === __filename;

if (isMainModule) {
  runMigration().catch(console.error);
}

// ES module exports
export {
  migrateCustomerEncryption,
  migrateConsentRecords,
  validateGdprSetup,
  runMigration
};
