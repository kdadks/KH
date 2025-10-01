/**
 * Database schema inspector for payments table
 */

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  try {
    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing Supabase configuration' })
      };
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get table schema
    const schemaQuery = `
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        datetime_precision
      FROM information_schema.columns 
      WHERE table_name = 'payments' 
        AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;
    
    const { data: schema, error: schemaError } = await supabase.rpc('exec_sql', { 
      sql: schemaQuery 
    });
    
    if (schemaError) {
      // Try alternative approach
      const { data: altSchema, error: altError } = await supabase
        .from('payments')
        .select('*')
        .limit(1);
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          message: 'Schema inspection (sample-based)',
          sampleRecord: altSchema?.[0] || null,
          schemaError: schemaError?.message,
          altError: altError?.message
        })
      };
    }
    
    // Get constraints
    const constraintsQuery = `
      SELECT 
        constraint_name,
        constraint_type,
        column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_name = 'payments'
        AND tc.table_schema = 'public';
    `;
    
    const { data: constraints, error: constraintsError } = await supabase.rpc('exec_sql', { 
      sql: constraintsQuery 
    });
    
    // Get sample data to understand structure
    const { data: sampleData, error: sampleError } = await supabase
      .from('payments')
      .select('*')
      .limit(3)
      .order('created_at', { ascending: false });
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        message: 'Payments table schema analysis',
        schema: schema || 'Schema query failed',
        constraints: constraints || 'Constraints query failed',
        sampleData: sampleData || 'No sample data',
        errors: {
          schema: schemaError?.message,
          constraints: constraintsError?.message,
          sample: sampleError?.message
        }
      })
    };
    
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'Schema inspection failed',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};