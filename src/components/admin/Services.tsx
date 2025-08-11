import React from 'react';
import { Plus, Edit, Trash2, Check, X } from 'lucide-react';
import { Package } from './types';

interface ServicesProps {
  packages: Package[];
  setPackages: React.Dispatch<React.SetStateAction<Package[]>>;
  newPackage: Package;
  setNewPackage: React.Dispatch<React.SetStateAction<Package>>;
  editIndex: number | null;
  setEditIndex: React.Dispatch<React.SetStateAction<number | null>>;
  editPackage: Package | null;
  setEditPackage: React.Dispatch<React.SetStateAction<Package | null>>;
}

export const Services: React.FC<ServicesProps> = ({
  packages,
  setPackages,
  newPackage,
  setNewPackage,
  editIndex,
  setEditIndex,
  editPackage,
  setEditPackage
}) => {
  // Package management handlers
  const handleAdd = () => {
    setPackages([
      ...packages,
      { ...newPackage, features: newPackage.features.filter(f => f), category: newPackage.category || 'Uncategorized' }
    ]);
    setNewPackage({ name: '', price: '', inHourPrice: '', outOfHourPrice: '', features: [''], category: '' });
  };

  const handleDelete = (index: number) => {
    setPackages(packages.filter((_, i) => i !== index));
  };

  const handleFeatureChange = (idx: number, value: string) => {
    const features = [...newPackage.features];
    features[idx] = value;
    setNewPackage({ ...newPackage, features });
  };

  const addFeatureField = () => {
    setNewPackage({ ...newPackage, features: [...newPackage.features, ''] });
  };

  // Edit handlers
  const handleEdit = (index: number) => {
    setEditIndex(index);
    setEditPackage({ ...packages[index] });
  };

  const handleEditChange = (field: keyof Package, value: string) => {
    if (!editPackage) return;
    setEditPackage({ ...editPackage, [field]: value });
  };

  const handleEditFeatureChange = (idx: number, value: string) => {
    if (!editPackage) return;
    const features = [...editPackage.features];
    features[idx] = value;
    setEditPackage({ ...editPackage, features });
  };

  const addEditFeatureField = () => {
    if (!editPackage) return;
    setEditPackage({ ...editPackage, features: [...editPackage.features, ''] });
  };

  const handleSaveEdit = () => {
    if (editIndex === null || !editPackage) return;
    const updated = [...packages];
    updated[editIndex] = { ...editPackage, features: editPackage.features.filter(f => f) };
    setPackages(updated);
    setEditIndex(null);
    setEditPackage(null);
  };

  const handleCancelEdit = () => {
    setEditIndex(null);
    setEditPackage(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Services Management</h2>
          <p className="text-gray-600 mt-1">Manage your treatment packages and services</p>
        </div>
      </div>

      {/* Add New Service */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Service</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Service Name</label>
            <input
              type="text"
              value={newPackage.name}
              onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter service name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={newPackage.category}
              onChange={(e) => setNewPackage({ ...newPackage, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
            >
              <option value="">Select category</option>
              <option value="Packages">Packages</option>
              <option value="Individual">Individual</option>
              <option value="Classes">Classes</option>
              <option value="Rehab & Fitness">Rehab & Fitness</option>
              <option value="Corporate Packages">Corporate Packages</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Flat Price (optional)</label>
            <input
              type="text"
              value={newPackage.price}
              onChange={(e) => setNewPackage({ ...newPackage, price: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="€25 / class or Contact for Quote"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">In Hour Price</label>
            <input
              type="text"
              value={newPackage.inHourPrice}
              onChange={(e) => setNewPackage({ ...newPackage, inHourPrice: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="€65"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Out of Hour Price</label>
            <input
              type="text"
              value={newPackage.outOfHourPrice}
              onChange={(e) => setNewPackage({ ...newPackage, outOfHourPrice: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="€80"
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Features</label>
          <div className="space-y-2">
            {newPackage.features.map((feature, idx) => (
              <input
                key={idx}
                type="text"
                value={feature}
                onChange={(e) => handleFeatureChange(idx, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder={`Feature ${idx + 1}`}
              />
            ))}
            <button
              onClick={addFeatureField}
              className="flex items-center px-3 py-2 text-sm text-primary-600 hover:text-primary-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Feature
            </button>
          </div>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Service
        </button>
      </div>

      {/* Services List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Current Services</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {packages.map((pkg, idx) => (
            <div key={idx} className="p-6">
              {editIndex === idx && editPackage ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input
                      type="text"
                      value={editPackage.name}
                      onChange={(e) => handleEditChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Name"
                    />
                    <select
                      value={editPackage.category || ''}
                      onChange={(e) => handleEditChange('category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                    >
                      <option value="">Category</option>
                      <option value="Packages">Packages</option>
                      <option value="Individual">Individual</option>
                      <option value="Classes">Classes</option>
                      <option value="Rehab & Fitness">Rehab & Fitness</option>
                      <option value="Corporate Packages">Corporate Packages</option>
                    </select>
                    <input
                      type="text"
                      value={editPackage.inHourPrice || ''}
                      onChange={(e) => handleEditChange('inHourPrice', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="In Hour"
                    />
                    <input
                      type="text"
                      value={editPackage.outOfHourPrice || ''}
                      onChange={(e) => handleEditChange('outOfHourPrice', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Out of Hour"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      value={editPackage.price || ''}
                      onChange={(e) => handleEditChange('price', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Flat Price / Quote"
                    />
                  </div>
                  <div className="space-y-2">
                    {editPackage.features.map((feature, fidx) => (
                      <input
                        key={fidx}
                        type="text"
                        value={feature}
                        onChange={(e) => handleEditFeatureChange(fidx, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    ))}
                    <button
                      onClick={addEditFeatureField}
                      className="flex items-center px-3 py-2 text-sm text-primary-600 hover:text-primary-700"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Feature
                    </button>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveEdit}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xl font-semibold text-gray-900">{pkg.name}</h4>
                    <p className="text-2xl font-bold text-primary-600 mt-1">{pkg.price}</p>
                    {pkg.category && (
                      <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full mt-2">
                        {pkg.category}
                      </span>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                      {pkg.inHourPrice && (
                        <div className="text-sm">
                          <span className="text-gray-600">In Hour:</span>
                          <span className="font-medium ml-1">{pkg.inHourPrice}</span>
                        </div>
                      )}
                      {pkg.outOfHourPrice && (
                        <div className="text-sm">
                          <span className="text-gray-600">Out of Hour:</span>
                          <span className="font-medium ml-1">{pkg.outOfHourPrice}</span>
                        </div>
                      )}
                    </div>
                    <ul className="mt-3 space-y-1">
                      {pkg.features.filter(Boolean).map((feature, fidx) => (
                        <li key={fidx} className="text-gray-600 flex items-center">
                          <Check className="w-4 h-4 text-green-500 mr-2" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(idx)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(idx)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
