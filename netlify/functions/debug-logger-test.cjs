/**
 * Debug Logger Test - Check if debug logging is working
 */

exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    // Initialize Supabase
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    
    console.log('Testing debug logging...');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const testResults = {
      timestamp: new Date().toISOString(),
      tests: []
    };

    // Test 1: Check if debug_logs table exists
    console.log('Test 1: Checking if debug_logs table exists...');
    try {
      const { data: tableCheck, error: tableError } = await supabase
        .from('debug_logs')
        .select('count')
        .limit(1);

      testResults.tests.push({
        test: 'debug_logs_table_exists',
        result: tableError ? 'FAILED' : 'PASSED',
        error: tableError?.message,
        message: tableError ? 'Table does not exist or access denied' : 'Table exists and accessible'
      });
    } catch (error) {
      testResults.tests.push({
        test: 'debug_logs_table_exists',
        result: 'FAILED',
        error: error.message,
        message: 'Exception when checking table'
      });
    }

    // Test 2: Try to insert a test log entry
    console.log('Test 2: Attempting to insert test debug log...');
    try {
      const testLogEntry = {
        function_name: 'debug-logger-test',
        execution_id: 'test-' + Date.now(),
        log_level: 'INFO',
        message: 'Test debug log entry',
        details: JSON.stringify({ test: true, timestamp: new Date().toISOString() }),
        created_at: new Date().toISOString()
      };

      const { data: insertResult, error: insertError } = await supabase
        .from('debug_logs')
        .insert(testLogEntry)
        .select()
        .single();

      testResults.tests.push({
        test: 'insert_debug_log',
        result: insertError ? 'FAILED' : 'PASSED',
        error: insertError?.message,
        message: insertError ? 'Could not insert debug log' : 'Successfully inserted debug log',
        insertedId: insertResult?.id
      });
    } catch (error) {
      testResults.tests.push({
        test: 'insert_debug_log',
        result: 'FAILED',
        error: error.message,
        message: 'Exception during insert'
      });
    }

    // Test 3: Try to read back debug logs
    console.log('Test 3: Attempting to read debug logs...');
    try {
      const { data: readResult, error: readError } = await supabase
        .from('debug_logs')
        .select('id, function_name, log_level, message, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      testResults.tests.push({
        test: 'read_debug_logs',
        result: readError ? 'FAILED' : 'PASSED',
        error: readError?.message,
        message: readError ? 'Could not read debug logs' : `Found ${readResult?.length || 0} debug log entries`,
        logCount: readResult?.length || 0,
        latestLogs: readResult
      });
    } catch (error) {
      testResults.tests.push({
        test: 'read_debug_logs',
        result: 'FAILED',
        error: error.message,
        message: 'Exception during read'
      });
    }

    // Test 4: Check permissions
    console.log('Test 4: Checking RLS and permissions...');
    try {
      const { data: permissionTest, error: permissionError } = await supabase
        .rpc('version'); // Simple function to test connection

      testResults.tests.push({
        test: 'supabase_permissions',
        result: permissionError ? 'FAILED' : 'PASSED',
        error: permissionError?.message,
        message: permissionError ? 'Permission or connection issue' : 'Supabase connection and permissions OK'
      });
    } catch (error) {
      testResults.tests.push({
        test: 'supabase_permissions',
        result: 'FAILED',
        error: error.message,
        message: 'Exception during permission test'
      });
    }

    // Summary
    const passedTests = testResults.tests.filter(t => t.result === 'PASSED').length;
    const totalTests = testResults.tests.length;
    const allPassed = passedTests === totalTests;

    const response = {
      success: true,
      summary: {
        totalTests: totalTests,
        passedTests: passedTests,
        failedTests: totalTests - passedTests,
        allPassed: allPassed,
        recommendation: allPassed ? 
          'Debug logging should work properly' :
          'Debug logging has issues - check failed tests below'
      },
      testResults: testResults,
      instructions: {
        createTable: 'If debug_logs table does not exist, run the SQL from database/create-debug-logs-table.sql in Supabase SQL Editor',
        checkRLS: 'If permission issues, verify RLS policy allows access',
        troubleshoot: 'Check Supabase environment variables in Netlify'
      }
    };

    // Generate HTML for browser viewing
    const userAgent = event.headers['user-agent'] || '';
    const query = event.queryStringParameters || {};
    
    if (userAgent.includes('Mozilla') && !query.json) {
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Debug Logger Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #f8f9fa; }
        .container { max-width: 1000px; margin: 0 auto; }
        .card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .summary { text-align: center; }
        .success { background: #d4edda; color: #155724; padding: 15px; border-radius: 4px; }
        .error { background: #f8d7da; color: #721c24; padding: 15px; border-radius: 4px; }
        .warning { background: #fff3cd; color: #856404; padding: 15px; border-radius: 4px; }
        .test-result { margin: 15px 0; padding: 15px; border-radius: 4px; border-left: 4px solid #ccc; }
        .test-passed { border-left-color: #28a745; background: #f8fff9; }
        .test-failed { border-left-color: #dc3545; background: #fff8f8; }
        .metric { text-align: center; margin: 10px; }
        .metric-value { font-size: 2em; font-weight: bold; }
        .metric-label { color: #666; }
        pre { background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 0.9em; }
        .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; }
    </style>
    <script>
        function refresh() { window.location.reload(); }
    </script>
</head>
<body>
    <div class="container">
        <div class="card">
            <h1>Debug Logger Test Results</h1>
            <p>Timestamp: ${response.testResults.timestamp}</p>
            <button class="btn" onclick="refresh()">Run Tests Again</button>
        </div>

        <div class="card">
            <div class="summary">
                <div class="metric">
                    <div class="metric-value">${passedTests}/${totalTests}</div>
                    <div class="metric-label">Tests Passed</div>
                </div>
            </div>
            <div class="${allPassed ? 'success' : 'error'}">
                <strong>${response.summary.recommendation}</strong>
            </div>
        </div>

        <div class="card">
            <h2>Test Results</h2>
            ${testResults.tests.map(test => `
            <div class="test-result test-${test.result.toLowerCase()}">
                <h3>${test.test.replace(/_/g, ' ').toUpperCase()}: ${test.result}</h3>
                <p><strong>Message:</strong> ${test.message}</p>
                ${test.error ? `<p><strong>Error:</strong> ${test.error}</p>` : ''}
                ${test.insertedId ? `<p><strong>Inserted ID:</strong> ${test.insertedId}</p>` : ''}
                ${test.logCount !== undefined ? `<p><strong>Log Count:</strong> ${test.logCount}</p>` : ''}
                ${test.latestLogs ? `<details><summary>Latest Logs</summary><pre>${JSON.stringify(test.latestLogs, null, 2)}</pre></details>` : ''}
            </div>
            `).join('')}
        </div>

        <div class="card">
            <h2>Next Steps</h2>
            ${!allPassed ? `
            <div class="warning">
                <h3>Issues Found - Follow These Steps:</h3>
                <ol>
                    <li><strong>If debug_logs table doesn't exist:</strong><br>
                        Copy the SQL from <code>database/create-debug-logs-table.sql</code> and run it in your Supabase SQL Editor</li>
                    <li><strong>If permission errors:</strong><br>
                        Check that the RLS policy allows access or temporarily disable RLS for testing</li>
                    <li><strong>If connection issues:</strong><br>
                        Verify SUPABASE_URL and SUPABASE_ANON_KEY are set in Netlify environment variables</li>
                </ol>
            </div>` : `
            <div class="success">
                <h3>All Tests Passed!</h3>
                <p>Debug logging should work properly. Check your SumUp function to see if logs are being generated during payment processing.</p>
            </div>`}
            
            <h3>SQL to Create Debug Table:</h3>
            <pre>CREATE TABLE IF NOT EXISTS public.debug_logs (
    id SERIAL PRIMARY KEY,
    function_name VARCHAR(100) NOT NULL,
    execution_id VARCHAR(255) NOT NULL,
    log_level VARCHAR(20) DEFAULT 'INFO',
    message TEXT NOT NULL,
    details JSONB NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.debug_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow debug logs access" ON public.debug_logs FOR ALL USING (true);</pre>
        </div>
    </div>
</body>
</html>`;
      
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
        body: html
      };
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(response, null, 2)
    };

  } catch (error) {
    console.error('Debug logger test error:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        message: 'Debug logger test failed'
      })
    };
  }
};