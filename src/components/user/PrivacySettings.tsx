import React, { useState, useEffect } from 'react';
import { useUserAuth } from '../../contexts/UserAuthContext';
import { 
  exportUserData, 
  validateGdprCompliance 
} from '../../utils/gdprUtils';
import { supabase } from '../../supabaseClient';
import { useToast } from '../shared/toastContext';

interface ConsentRecord {
  id: number;
  consent_type: string;
  consent_given: boolean;
  consent_date: string;
  legal_basis: string;
  purpose: string;
}

interface DataSubjectRequest {
  id: number;
  request_type: string;
  request_date: string;
  status: string;
  completion_date?: string;
  response_details?: string;
}

const PrivacySettings: React.FC = () => {
  const { user } = useUserAuth();
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [consentRecords, setConsentRecords] = useState<ConsentRecord[]>([]);
  const [dataRequests, setDataRequests] = useState<DataSubjectRequest[]>([]);
  const [complianceStatus, setComplianceStatus] = useState<{ compliant: boolean; issues: string[] } | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'consents' | 'requests' | 'export'>('overview');

  useEffect(() => {
    if (user?.id) {
      loadPrivacyData();
      checkComplianceStatus();
    }
  }, [user]);

  const loadPrivacyData = async () => {
    if (!user?.id) return;

    try {
      // Load consent records
      const { data: consents, error: consentError } = await supabase
        .from('consent_records')
        .select('*')
        .eq('customer_id', user.id)
        .order('consent_date', { ascending: false });

      if (consentError) {
        console.error('Error loading consent records:', consentError);
      } else {
        setConsentRecords(consents || []);
      }

      // Load data subject requests
      const { data: requests, error: requestError } = await supabase
        .from('data_subject_requests')
        .select('*')
        .eq('customer_id', user.id)
        .order('request_date', { ascending: false });

      if (requestError) {
        console.error('Error loading data requests:', requestError);
      } else {
        setDataRequests(requests || []);
      }
    } catch (error) {
      console.error('Error loading privacy data:', error);
    }
  };

  const checkComplianceStatus = async () => {
    if (!user?.id) return;

    try {
      const status = await validateGdprCompliance(user.id);
      setComplianceStatus(status);
    } catch (error) {
      console.error('Error checking compliance status:', error);
    }
  };

  const handleExportData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const result = await exportUserData(user.id);
      
      if (result.success && result.data) {
        // Create data subject request record
        await supabase
          .from('data_subject_requests')
          .insert([{
            customer_id: user.id,
            request_type: 'access',
            request_details: 'User requested data export via privacy settings',
            status: 'completed',
            completion_date: new Date().toISOString()
          }]);

        // Create downloadable file
        const dataBlob = new Blob([JSON.stringify(result.data, null, 2)], { 
          type: 'application/json' 
        });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `my-data-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Update last export request timestamp
        await supabase
          .from('customers')
          .update({ last_data_export_request: new Date().toISOString() })
          .eq('id', user.id);

        showSuccess('Your data has been exported successfully!');
        loadPrivacyData();
      } else {
        showError('Failed to export data: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      showError('An error occurred while exporting your data.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestDeletion = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Create deletion request record
      const { error } = await supabase
        .from('data_subject_requests')
        .insert([{
          customer_id: user.id,
          request_type: 'erasure',
          request_details: 'User requested account deletion via privacy settings',
          status: 'pending'
        }]);

      if (error) throw error;

      // Mark customer as deletion requested
      await supabase
        .from('customers')
        .update({ 
          deletion_requested: true,
          deletion_request_date: new Date().toISOString()
        })
        .eq('id', user.id);

      showSuccess('Your deletion request has been submitted. We will process it within 30 days as required by GDPR.');
      setShowDeleteConfirmation(false);
      loadPrivacyData();
    } catch (error) {
      console.error('Error requesting deletion:', error);
      showError('An error occurred while submitting your deletion request.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConsent = async (consentType: string, consentGiven: boolean) => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Call the database function to record consent
      const { error } = await supabase.rpc('record_consent', {
        p_customer_id: user.id,
        p_consent_type: consentType,
        p_consent_given: consentGiven,
        p_consent_method: 'web_form',
        p_legal_basis: 'consent',
        p_purpose: `${consentType} consent updated via privacy settings`,
        p_data_categories: consentType === 'marketing' ? ['email', 'preferences'] : ['personal_data'],
        p_retention_period: '7 years',
        p_ip_address: null,
        p_user_agent: navigator.userAgent
      });

      if (error) throw error;

      showSuccess(`${consentType} consent has been updated successfully.`);
      loadPrivacyData();
    } catch (error) {
      console.error('Error updating consent:', error);
      showError('An error occurred while updating your consent preferences.');
    } finally {
      setLoading(false);
    }
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">Your Privacy Rights</h3>
        <p className="text-blue-700 mb-3">
          Under GDPR, you have the following rights regarding your personal data:
        </p>
        <ul className="list-disc list-inside space-y-1 text-blue-700">
          <li>Right to access your data</li>
          <li>Right to rectify incorrect data</li>
          <li>Right to erase your data ("right to be forgotten")</li>
          <li>Right to data portability</li>
          <li>Right to restrict processing</li>
          <li>Right to object to processing</li>
        </ul>
      </div>

      {complianceStatus && (
        <div className={`border rounded-lg p-4 ${
          complianceStatus.compliant 
            ? 'bg-green-50 border-green-200' 
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <h3 className={`text-lg font-semibold mb-2 ${
            complianceStatus.compliant ? 'text-green-800' : 'text-yellow-800'
          }`}>
            Privacy Compliance Status
          </h3>
          {complianceStatus.compliant ? (
            <p className="text-green-700">Your data is fully GDPR compliant.</p>
          ) : (
            <div>
              <p className="text-yellow-700 mb-2">Some privacy issues were identified:</p>
              <ul className="list-disc list-inside space-y-1 text-yellow-700">
                {complianceStatus.issues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">Recent Data Requests</h3>
          {dataRequests.length > 0 ? (
            <div className="space-y-2">
              {dataRequests.slice(0, 3).map((request) => (
                <div key={request.id} className="text-sm">
                  <span className="font-medium">{request.request_type}</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    request.status === 'completed' ? 'bg-green-100 text-green-800' :
                    request.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {request.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No data requests submitted</p>
          )}
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">Consent Status</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Privacy Policy:</span>
              <span className="text-green-600">✓ Accepted</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Marketing Communications:</span>
              <span className={user?.marketing_consent ? 'text-green-600' : 'text-gray-500'}>
                {user?.marketing_consent ? '✓ Accepted' : '✗ Declined'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderConsentsTab = () => (
    <div className="space-y-6">
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Manage Your Consents</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded">
            <div>
              <h4 className="font-medium">Marketing Communications</h4>
              <p className="text-sm text-gray-600">Receive promotional emails and updates</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleUpdateConsent('marketing', true)}
                disabled={loading || user?.marketing_consent}
                className={`px-3 py-1 rounded text-sm ${
                  user?.marketing_consent 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-700 hover:bg-green-100'
                }`}
              >
                Accept
              </button>
              <button
                onClick={() => handleUpdateConsent('marketing', false)}
                disabled={loading || !user?.marketing_consent}
                className={`px-3 py-1 rounded text-sm ${
                  !user?.marketing_consent 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-gray-100 text-gray-700 hover:bg-red-100'
                }`}
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Consent History</h3>
        {consentRecords.length > 0 ? (
          <div className="space-y-2">
            {consentRecords.map((record) => (
              <div key={record.id} className="flex justify-between items-center p-2 border rounded">
                <div>
                  <span className="font-medium">{record.consent_type}</span>
                  <span className="text-sm text-gray-600 ml-2">
                    {new Date(record.consent_date).toLocaleDateString()}
                  </span>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  record.consent_given ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {record.consent_given ? 'Accepted' : 'Declined'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No consent records found</p>
        )}
      </div>
    </div>
  );

  const renderRequestsTab = () => (
    <div className="space-y-6">
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Data Subject Requests</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button
            onClick={handleExportData}
            disabled={loading}
            className="p-4 border rounded-lg hover:bg-gray-50 text-left"
          >
            <h4 className="font-medium">Export My Data</h4>
            <p className="text-sm text-gray-600">Download all your personal data</p>
          </button>
          
          <button
            onClick={() => setShowDeleteConfirmation(true)}
            disabled={loading}
            className="p-4 border rounded-lg hover:bg-red-50 text-left"
          >
            <h4 className="font-medium text-red-600">Delete My Account</h4>
            <p className="text-sm text-gray-600">Request account deletion</p>
          </button>
          
          <div className="p-4 border rounded-lg bg-gray-50">
            <h4 className="font-medium">Contact Support</h4>
            <p className="text-sm text-gray-600">For other data requests</p>
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Request History</h3>
        {dataRequests.length > 0 ? (
          <div className="space-y-3">
            {dataRequests.map((request) => (
              <div key={request.id} className="border rounded p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium capitalize">{request.request_type} Request</h4>
                    <p className="text-sm text-gray-600">
                      Submitted: {new Date(request.request_date).toLocaleDateString()}
                    </p>
                    {request.completion_date && (
                      <p className="text-sm text-gray-600">
                        Completed: {new Date(request.completion_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    request.status === 'completed' ? 'bg-green-100 text-green-800' :
                    request.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {request.status}
                  </span>
                </div>
                {request.response_details && (
                  <p className="text-sm text-gray-700 mt-2">{request.response_details}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No data requests submitted</p>
        )}
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="p-4 text-center">
        <p>Please log in to access privacy settings.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Privacy & Data Settings</h1>
        <p className="text-gray-600">
          Manage your privacy preferences and exercise your GDPR rights
        </p>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'consents', label: 'Consents' },
            { key: 'requests', label: 'Data Requests' }
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

      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'consents' && renderConsentsTab()}
      {activeTab === 'requests' && renderRequestsTab()}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-red-600 mb-4">Delete Account</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to request account deletion? This action cannot be undone.
              Your booking history may be retained for legal compliance purposes but will be anonymized.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirmation(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestDeletion}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Request Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}

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

export default PrivacySettings;
