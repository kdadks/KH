import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkCustomers() {
    try {
        // Get all customers with passwords
        const { data, error } = await supabase
            .from('customers')
            .select('id, first_name, last_name, email, password')
            .not('password', 'is', null)
            .eq('is_active', true);

        if (error) {
            console.error('Error:', error);
            return;
        }

        console.log('Customers with passwords:');
        data.forEach(customer => {
            console.log(`ID: ${customer.id}, Name: ${customer.first_name} ${customer.last_name}, Email: ${customer.email}, Password: ${customer.password}`);
        });

    } catch (error) {
        console.error('Exception:', error);
    }
}

checkCustomers();
