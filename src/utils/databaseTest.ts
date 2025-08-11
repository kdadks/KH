import { supabase } from '../supabaseClient';

// Test database connectivity
export const testDatabaseConnection = async () => {
  try {
    console.log('Testing database connection...');
    
    // Test bookings table
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('count')
      .limit(1);
    
    if (bookingsError) {
      console.error('Bookings table error:', bookingsError);
    } else {
      console.log('Bookings table accessible:', bookings);
    }
    
    // Test availability table
    const { data: availability, error: availabilityError } = await supabase
      .from('availability')
      .select('count')
      .limit(1);
    
    if (availabilityError) {
      console.error('Availability table error:', availabilityError);
      console.log('The availability table might not exist. Creating it...');
      
      // Try to create the table (this will fail if we don't have permissions, which is expected)
      console.log('Please ensure the availability table is created in your Supabase dashboard:');
      console.log(`
        CREATE TABLE availability (
          id SERIAL PRIMARY KEY,
          date DATE NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          is_available BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW()
        );
        
        ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Enable read access for all users" ON availability FOR SELECT USING (true);
        CREATE POLICY "Enable insert for all users" ON availability FOR INSERT WITH CHECK (true);
        CREATE POLICY "Enable update for authenticated users" ON availability FOR UPDATE USING (auth.role() = 'authenticated');
        CREATE POLICY "Enable delete for authenticated users" ON availability FOR DELETE USING (auth.role() = 'authenticated');
      `);
    } else {
      console.log('Availability table accessible:', availability);
    }
  } catch (error) {
    console.error('Database connection test failed:', error);
  }
};
