import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Eye, 
  EyeOff, 
  Save, 
  X, 
  AlertTriangle,
  CheckCircle,
  Settings,
  Key,
  Globe,
  Shield
} from 'lucide-react';
import { useToast } from '../shared/toastContext';
import { 
  getAllPaymentGateways, 
  savePaymentGateway, 
  deletePaymentGateway,
  PaymentGateway as PaymentGatewayType 
} from '../../utils/paymentManagementUtils';

interface PaymentGatewayManagementProps {
  gateways: PaymentGatewayType[];
  setGateways: React.Dispatch<React.SetStateAction<PaymentGatewayType[]>>;
  onRefresh: () => void;
}

interface GatewayFormData {
  id?: string;
  name: string;
  provider: 'sumup' | 'stripe' | 'paypal';
  environment: 'sandbox' | 'production';
  api_key: string;
  secret_key: string;
  webhook_url: string;
  merchant_id: string;
  client_id: string;
  is_active: boolean;
}

const initialFormData: GatewayFormData = {
  name: '',
  provider: 'sumup',
  environment: 'sandbox',
  api_key: '',
  secret_key: '',
  webhook_url: '',
  merchant_id: '',
  client_id: '',
  is_active: false
};

export const PaymentGatewayManagement: React.FC<PaymentGatewayManagementProps> = ({
  gateways,
  setGateways,
  onRefresh
}) => {
  const { showSuccess, showError } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGateway, setEditingGateway] = useState<PaymentGatewayType | null>(null);
  const [formData, setFormData] = useState<GatewayFormData>(initialFormData);
  const [showSecrets, setShowSecrets] = useState<{[key: string]: boolean}>({});
  const [showFormApiKey, setShowFormApiKey] = useState(false);
  const [showFormSecretKey, setShowFormSecretKey] = useState(false);
  const [showFormClientId, setShowFormClientId] = useState(false);
  const [showFormMerchantId, setShowFormMerchantId] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleCreateNew = () => {
    setEditingGateway(null);
    setFormData(initialFormData);
    setShowFormApiKey(false);
    setShowFormSecretKey(false);
    setShowFormClientId(false);
    setShowFormMerchantId(false);
    setIsModalOpen(true);
  };

  const handleEdit = (gateway: PaymentGatewayType) => {
    setEditingGateway(gateway);
    setFormData({
      id: gateway.id,
      name: gateway.name,
      provider: gateway.provider,
      environment: gateway.environment,
      api_key: gateway.api_key,
      secret_key: gateway.secret_key || '',
      webhook_url: gateway.webhook_url || '',
      merchant_id: gateway.merchant_id || '',
      client_id: gateway.client_id || '',
      is_active: gateway.is_active
    });
    setShowFormApiKey(false);
    setShowFormSecretKey(false);
    setShowFormClientId(false);
    setShowFormMerchantId(false);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.api_key.trim()) {
      showError('Validation Error', 'Name and API Key are required');
      return;
    }

    setLoading(true);
    try {
      const savedGateway = await savePaymentGateway(formData);
      if (savedGateway) {
        showSuccess('Success', `Gateway ${editingGateway ? 'updated' : 'created'} successfully`);
        setIsModalOpen(false);
        onRefresh();
      } else {
        showError('Error', 'Failed to save gateway');
      }
    } catch (error) {
      console.error('Error saving gateway:', error);
      showError('Error', 'Failed to save gateway');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (gatewayId: string) => {
    if (deleteConfirm !== gatewayId) {
      setDeleteConfirm(gatewayId);
      return;
    }

    setLoading(true);
    try {
      const success = await deletePaymentGateway(gatewayId);
      if (success) {
        showSuccess('Success', 'Gateway deleted successfully');
        setDeleteConfirm(null);
        onRefresh();
      } else {
        showError('Error', 'Failed to delete gateway');
      }
    } catch (error) {
      console.error('Error deleting gateway:', error);
      showError('Error', 'Failed to delete gateway');
    } finally {
      setLoading(false);
    }
  };

  const toggleSecretVisibility = (gatewayId: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [gatewayId]: !prev[gatewayId]
    }));
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'sumup':
        return '💳';
      case 'stripe':
        return '🟣';
      case 'paypal':
        return '🟡';
      default:
        return '💰';
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'sumup':
        return 'bg-blue-100 text-blue-800';
      case 'stripe':
        return 'bg-purple-100 text-purple-800';
      case 'paypal':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const maskSecret = (secret: string) => {
    if (!secret) return 'Not set';
    if (secret.length <= 8) return '••••••••';
    return secret.substring(0, 4) + '••••••••' + secret.substring(secret.length - 4);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Payment Gateway Management</h3>
          <p className="text-sm text-gray-600">Configure and manage payment gateway connections</p>
        </div>
        <button
          onClick={handleCreateNew}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Gateway
        </button>
      </div>

      {/* Gateway Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {gateways.length === 0 ? (
          <div className="col-span-full bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <Settings className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No payment gateways configured</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding your first payment gateway.</p>
            <div className="mt-6">
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="-ml-1 mr-2 h-5 w-5" />
                Add Gateway
              </button>
            </div>
          </div>
        ) : (
          gateways.map((gateway) => (
            <div key={gateway.id} className="bg-white rounded-lg shadow border">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{getProviderIcon(gateway.provider)}</span>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">{gateway.name}</h4>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getProviderColor(gateway.provider)}`}>
                        {gateway.provider.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {gateway.is_active ? (
                      <div title="Active">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                    ) : (
                      <div title="Inactive">
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Environment:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      gateway.environment === 'production' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {gateway.environment}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">API Key:</span>
                    <div className="flex items-center">
                      <span className="font-mono text-xs">
                        {showSecrets[gateway.id] ? gateway.api_key : maskSecret(gateway.api_key)}
                      </span>
                      <button
                        onClick={() => toggleSecretVisibility(gateway.id)}
                        className="ml-2 text-gray-400 hover:text-gray-600"
                      >
                        {showSecrets[gateway.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  {gateway.secret_key && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Secret Key:</span>
                      <div className="flex items-center">
                        <span className="font-mono text-xs">
                          {showSecrets[gateway.id] ? gateway.secret_key : maskSecret(gateway.secret_key)}
                        </span>
                        <button
                          onClick={() => toggleSecretVisibility(gateway.id)}
                          className="ml-2 text-gray-400 hover:text-gray-600"
                        >
                          {showSecrets[gateway.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {gateway.merchant_id && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Merchant Code:</span>
                      <div className="flex items-center">
                        <span className="font-mono text-xs">
                          {showSecrets[gateway.id] ? gateway.merchant_id : maskSecret(gateway.merchant_id)}
                        </span>
                        <button
                          onClick={() => toggleSecretVisibility(gateway.id)}
                          className="ml-2 text-gray-400 hover:text-gray-600"
                        >
                          {showSecrets[gateway.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {gateway.client_id && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Client ID:</span>
                      <div className="flex items-center">
                        <span className="font-mono text-xs">
                          {showSecrets[gateway.id] ? gateway.client_id : maskSecret(gateway.client_id)}
                        </span>
                        <button
                          onClick={() => toggleSecretVisibility(gateway.id)}
                          className="ml-2 text-gray-400 hover:text-gray-600"
                        >
                          {showSecrets[gateway.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {gateway.webhook_url && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Webhook:</span>
                      <span className="text-green-600 flex items-center">
                        <Globe className="w-3 h-3 mr-1" />
                        Configured
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-6 flex justify-between">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(gateway)}
                      disabled={loading}
                      className="flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Edit
                    </button>
                  </div>
                  <button
                    onClick={() => handleDelete(gateway.id)}
                    disabled={loading}
                    className={`flex items-center px-3 py-1 text-sm rounded disabled:opacity-50 ${
                      deleteConfirm === gateway.id
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    {deleteConfirm === gateway.id ? 'Confirm' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingGateway ? 'Edit Payment Gateway' : 'Add Payment Gateway'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Basic Information */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gateway Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Main SumUp Gateway"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provider *
                  </label>
                  <select
                    value={formData.provider}
                    onChange={(e) => setFormData(prev => ({ ...prev, provider: e.target.value as any }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="sumup">SumUp</option>
                    <option value="stripe">Stripe</option>
                    <option value="paypal">PayPal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Environment *
                  </label>
                  <select
                    value={formData.environment}
                    onChange={(e) => setFormData(prev => ({ ...prev, environment: e.target.value as any }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="sandbox">Sandbox</option>
                    <option value="production">Production</option>
                  </select>
                </div>
              </div>

              {/* API Configuration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key * <Key className="inline w-3 h-3 ml-1" />
                </label>
                <div className="relative">
                  <input
                    type={showFormApiKey ? "text" : "password"}
                    value={formData.api_key}
                    onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter API key"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFormApiKey(!showFormApiKey)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  >
                    {showFormApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Secret Key <Shield className="inline w-3 h-3 ml-1" />
                </label>
                <div className="relative">
                  <input
                    type={showFormSecretKey ? "text" : "password"}
                    value={formData.secret_key}
                    onChange={(e) => setFormData(prev => ({ ...prev, secret_key: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter secret key (if required)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFormSecretKey(!showFormSecretKey)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  >
                    {showFormSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Additional Configuration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Webhook URL <Globe className="inline w-3 h-3 ml-1" />
                </label>
                <input
                  type="url"
                  value={formData.webhook_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, webhook_url: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://your-domain.com/webhook"
                />
              </div>

              {formData.provider === 'paypal' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client ID
                  </label>
                  <div className="relative">
                    <input
                      type={showFormClientId ? "text" : "password"}
                      value={formData.client_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_id: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="PayPal Client ID"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFormClientId(!showFormClientId)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                    >
                      {showFormClientId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {formData.provider === 'sumup' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Merchant Code
                  </label>
                  <div className="relative">
                    <input
                      type={showFormMerchantId ? "text" : "password"}
                      value={formData.merchant_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, merchant_id: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="SumUp Merchant Code"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFormMerchantId(!showFormMerchantId)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                    >
                      {showFormMerchantId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  Active (Enable this gateway for processing payments)
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {editingGateway ? 'Update' : 'Create'} Gateway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentGatewayManagement;
