/**
 * Update existing customers without passwords to set default hashed password same as email
 * 
 * Prerequisites:
 * 1. Install bcryptjs: npm install bcryptjs
 * 2. Update supabaseUrl and supabaseKey with your actual credentials
 * 3. Run: node update-existing-customers-passwords.js
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Configure Supabase client
const supabaseUrl = 'https://your-supabase-project.supabase.co'; // Replace with your actual URL
const supabaseKey = 'your-supabase-anon-key'; // Replace with your actual key
const supabase = createClient(supabaseUrl, supabaseKey);

// Salt rounds for password hashing
const SALT_ROUNDS = 12;

/**
 * Hash a plain text password using bcrypt
 */
async function hashPassword(plainPassword) {
  try {
    const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);
    return hashedPassword;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * Update existing customers who don't have passwords to set default password same as email
 */
async function updateExistingCustomersWithDefaultPasswords() {
  try {
    console.log('Starting to update existing customers without passwords...');

    // Find customers who don't have passwords set
    const { data: customersWithoutPasswords, error: fetchError } = await supabase
      .from('customers')
      .select('id, email, password')
      .or('password.is.null,password.eq.')
      .eq('is_active', true);

    if (fetchError) {
      console.error('Error fetching customers:', fetchError);
      return;
    }

    if (!customersWithoutPasswords || customersWithoutPasswords.length === 0) {
      console.log('No customers found without passwords. All customers already have passwords set.');
      return;
    }

    console.log(`Found ${customersWithoutPasswords.length} customers without passwords.`);

    // Update each customer to set password same as email and require password change
    const updatePromises = customersWithoutPasswords.map(async (customer) => {
      try {
        const defaultPassword = customer.email.toLowerCase().trim();
        const hashedPassword = await hashPassword(defaultPassword);
        
        const { error } = await supabase
          .from('customers')
          .update({
            password: hashedPassword, // Store hashed password
            must_change_password: true,
            first_login: true
          })
          .eq('id', customer.id);

        if (error) {
          console.error(`Error updating customer ${customer.email}:`, error);
          return { success: false, email: customer.email, error: error.message };
        } else {
          console.log(`✓ Updated customer: ${customer.email} (password hashed)`);
          return { success: true, email: customer.email };
        }
      } catch (error) {
        console.error(`Error processing customer ${customer.email}:`, error);
        return { success: false, email: customer.email, error: error.message };
      }
    });

    const results = await Promise.all(updatePromises);
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log('\n=== Update Summary ===');
    console.log(`Successfully updated: ${successful} customers`);
    console.log(`Failed to update: ${failed} customers`);
    
    if (failed > 0) {
      console.log('\nFailed updates:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`- ${r.email}: ${r.error}`);
      });
    }

  } catch (error) {
    console.error('Unexpected error during customer update:', error);
  }
}

// Run the script
updateExistingCustomersWithDefaultPasswords()
  .then(() => {
    console.log('\nScript completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
