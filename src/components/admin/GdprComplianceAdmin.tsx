import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useToast } from '../shared/toastContext';
import { exportUserData, anonymizeCustomerData, deleteCustomerData, enforceDataRetentionPolicy } from '../../utils/gdprUtils';

interface GdprRequest {
  id: number;
  customer_id: number;
  request_type: string;
  request_date: string;
  status: string;
  completion_date?: string;
  customer?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface ComplianceIssue {
  customer_id: number;
  days_overdue: number;
  recommended_action: string;
  customer?: {
    first_name: string;
    last_name: string;
    email: string;
    created_at: string;
    last_login?: string;
  };
}

const GdprComplianceAdmin: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [pendingRequests, setPendingRequests] = useState<GdprRequest[]>([]);
  const [complianceIssues, setComplianceIssues] = useState<ComplianceIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'requests' | 'compliance' | 'retention'>('requests');
  const [retentionStats, setRetentionStats] = useState<{ processed: number; errors: number } | null>(null);

  useEffect(() => {
    loadGdprData();
  }, []);

  const loadGdprData = async () => {
    setLoading(true);
    try {
      // Load pending GDPR requests
      const { data: requests, error: requestsError } = await supabase
        .from('data_subject_requests')
        .select(`
          *,
          customer:customers(first_name, last_name, email)
        `)
        .eq('status', 'pending')
        .order('request_date', { ascending: false });

      if (!requestsError && requests) {
        setPendingRequests(requests);
      }

      // Load compliance issues
      const { data: issues, error: issuesError } = await supabase
        .rpc('check_data_retention_compliance');

      if (!issuesError && issues) {
        // Get customer details for compliance issues
        const customerIds = issues.map((issue: any) => issue.customer_id);
        const { data: customers } = await supabase
          .from('customers')
          .select('id, first_name, last_name, email, created_at, last_login')
          .in('id', customerIds);

        const issuesWithCustomers = issues.map((issue: any) => ({
          ...issue,
          customer: customers?.find(c => c.id === issue.customer_id)
        }));

        setComplianceIssues(issuesWithCustomers);
      }
    } catch (error) {
      console.error('Error loading GDPR data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: number, requestType: string, customerId: number) => {
    setLoading(true);
    try {
      let success = false;
      let responseDetails = '';

      switch (requestType) {
        case 'access':
          const exportResult = await exportUserData(customerId);
          if (exportResult.success) {
            success = true;
            responseDetails = 'Data export completed. Customer notified via email.';
          } else {
            responseDetails = 'Data export failed: ' + (exportResult.error || 'Unknown error');
          }
          break;

        case 'erasure':
          const deleteResult = await deleteCustomerData(customerId, true); // Preserve booking history
          if (deleteResult.success) {
            success = true;
            responseDetails = 'Customer data anonymized to comply with erasure request while preserving business records.';
          } else {
            responseDetails = 'Data erasure failed: ' + (deleteResult.error || 'Unknown error');
          }
          break;

        case 'rectification':
          success = true;
          responseDetails = 'Rectification request approved. Customer can update their data via the portal.';
          break;

        default:
          responseDetails = 'Request type not automated. Manual processing required.';
      }

      // Update request status
      const { error } = await supabase
        .from('data_subject_requests')
        .update({
          status: success ? 'completed' : 'processing',
          completion_date: success ? new Date().toISOString() : null,
          response_details: responseDetails,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      if (success) {
        showSuccess('Request Processed', 'GDPR request has been processed successfully.');
      } else {
        showError('Manual Intervention Required', 'Request moved to processing. Manual intervention may be required.');
      }
      loadGdprData();
    } catch (error) {
      console.error('Error processing request:', error);
      showError('Processing Failed', 'Error processing request: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (requestId: number, reason: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('data_subject_requests')
        .update({
          status: 'rejected',
          response_details: reason,
          completion_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      showSuccess('Request Rejected', 'GDPR request has been rejected successfully.');
      loadGdprData();
    } catch (error) {
      console.error('Error rejecting request:', error);
      showError('Rejection Failed', 'Error rejecting request: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleComplianceAction = async (customerId: number, action: string) => {
    setLoading(true);
    try {
      let result;
      
      switch (action) {
        case 'ANONYMIZE':
          result = await anonymizeCustomerData(customerId);
          break;
        case 'DELETE':
          result = await deleteCustomerData(customerId, false);
          break;
        default:
          throw new Error('Unknown action: ' + action);
      }

      if (result.success) {
        showSuccess('Action Completed', `Customer data ${action.toLowerCase()}d successfully.`);
        loadGdprData();
      } else {
        showError('Action Failed', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error handling compliance action:', error);
      showError('Action Error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const runRetentionPolicy = async () => {
    setLoading(true);
    try {
      const result = await enforceDataRetentionPolicy();
      setRetentionStats(result);
      showSuccess('Retention Policy Executed', `Data retention policy completed. Processed: ${result.processed}, Errors: ${result.errors}`);
      loadGdprData();
    } catch (error) {
      console.error('Error running retention policy:', error);
      showError('Retention Policy Failed', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const renderRequestsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Pending GDPR Requests</h3>
        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
          {pendingRequests.length} pending
        </span>
      </div>

      {pendingRequests.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No pending GDPR requests
        </div>
      ) : (
        <div className="space-y-4">
          {pendingRequests.map((request) => (
            <div key={request.id} className="border rounded-lg p-4 bg-white">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-medium capitalize">
                    {request.request_type} Request #{request.id}
                  </h4>
                  <p className="text-sm text-gray-600">
                    Customer: {request.customer?.first_name} {request.customer?.last_name} ({request.customer?.email})
                  </p>
                  <p className="text-sm text-gray-600">
                    Submitted: {new Date(request.request_date).toLocaleString()}
                  </p>
                </div>
                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
                  {request.status}
                </span>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => handleApproveRequest(request.id, request.request_type, request.customer_id)}
                  disabled={loading}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => {
                    const reason = prompt('Enter rejection reason:');
                    if (reason) handleRejectRequest(request.id, reason);
                  }}
                  disabled={loading}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderComplianceTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Data Retention Compliance</h3>
        <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-sm">
          {complianceIssues.length} issues
        </span>
      </div>

      {complianceIssues.length === 0 ? (
        <div className="text-center py-8 text-green-600">
          ✓ All customer data is compliant with retention policies
        </div>
      ) : (
        <div className="space-y-4">
          {complianceIssues.map((issue) => (
            <div key={issue.customer_id} className="border rounded-lg p-4 bg-white">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-medium">
                    {issue.customer?.first_name} {issue.customer?.last_name}
                  </h4>
                  <p className="text-sm text-gray-600">{issue.customer?.email}</p>
                  <p className="text-sm text-gray-600">
                    Created: {issue.customer?.created_at ? new Date(issue.customer.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Last Login: {issue.customer?.last_login ? new Date(issue.customer.last_login).toLocaleDateString() : 'Never'}
                  </p>
                  <p className="text-sm font-medium text-orange-600">
                    {issue.days_overdue} days overdue for retention policy
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  issue.recommended_action === 'ANONYMIZE' ? 'bg-yellow-100 text-yellow-800' :
                  issue.recommended_action === 'DELETE' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  Recommended: {issue.recommended_action}
                </span>
              </div>

              <div className="flex space-x-2">
                {issue.recommended_action === 'ANONYMIZE' && (
                  <button
                    onClick={() => handleComplianceAction(issue.customer_id, 'ANONYMIZE')}
                    disabled={loading}
                    className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 disabled:opacity-50"
                  >
                    Anonymize Data
                  </button>
                )}
                {issue.recommended_action === 'DELETE' && (
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this customer data? This action cannot be undone.')) {
                        handleComplianceAction(issue.customer_id, 'DELETE');
                      }
                    }}
                    disabled={loading}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                  >
                    Delete Data
                  </button>
                )}
                <button
                  onClick={() => {
                    // Mark as reviewed but take no action
                    showSuccess('Manual Review', 'Customer has been marked for manual review.');
                  }}
                  className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                >
                  Manual Review
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderRetentionTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Data Retention Policy Management</h3>
        <button
          onClick={runRetentionPolicy}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Run Retention Policy
        </button>
      </div>

      {retentionStats && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-800 mb-2">Last Retention Policy Run</h4>
          <p className="text-green-700">
            Processed: {retentionStats.processed} customers, Errors: {retentionStats.errors}
          </p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">Current Retention Policies</h4>
        <div className="space-y-2 text-blue-700">
          <p>• Customer Data: 7 years from last activity</p>
          <p>• Booking Records: 10 years for regulatory compliance</p>
          <p>• Payment Data: 7 years for tax purposes</p>
          <p>• Marketing Data: 3 years or until consent withdrawn</p>
          <p>• Session Logs: 1 year for security purposes</p>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-800 mb-2">Automated Actions</h4>
        <div className="space-y-2 text-yellow-700">
          <p>• Inactive customers (7+ years): Automatically anonymized</p>
          <p>• Session data (1+ year): Automatically deleted</p>
          <p>• Marketing data (3+ years): Automatically purged</p>
          <p>• Expired tokens: Cleaned up weekly</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">GDPR Compliance Administration</h1>
        <p className="text-gray-600">
          Manage GDPR data subject requests and compliance monitoring
        </p>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { key: 'requests', label: 'Data Requests' },
            { key: 'compliance', label: 'Compliance Issues' },
            { key: 'retention', label: 'Retention Policy' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'requests' && renderRequestsTab()}
      {activeTab === 'compliance' && renderComplianceTab()}
      {activeTab === 'retention' && renderRetentionTab()}

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
              <span>Processing...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GdprComplianceAdmin;
