import React, { useState } from 'react';

type Package = {
  name: string;
  price: string;
  features: string[];
};

const initialPackages: Package[] = [
  {
    name: 'Basic Wellness',
    price: '$49',
    features: ['30 min Consultation', 'Personalized Diet Plan', '1 Follow-up Session'],
  },
  {
    name: 'Premium Care',
    price: '$99',
    features: ['60 min Consultation', 'Personalized Diet & Exercise Plan', '3 Follow-up Sessions', 'Priority Support'],
  },
];

const AdminConsole: React.FC = () => {
  const [packages, setPackages] = useState<Package[]>(initialPackages);
  const [newPackage, setNewPackage] = useState<Package>({ name: '', price: '', features: [''] });

  const handleAdd = () => {
    setPackages([...packages, { ...newPackage, features: newPackage.features.filter(f => f) }]);
    setNewPackage({ name: '', price: '', features: [''] });
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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Admin Console - Manage Packages</h1>
      <div className="mb-8">
        <h2 className="font-semibold mb-2">Add New Package</h2>
        <input
          className="border px-2 py-1 mr-2"
          placeholder="Name"
          value={newPackage.name}
          onChange={e => setNewPackage({ ...newPackage, name: e.target.value })}
        />
        <input
          className="border px-2 py-1 mr-2"
          placeholder="Price"
          value={newPackage.price}
          onChange={e => setNewPackage({ ...newPackage, price: e.target.value })}
        />
        <div className="mb-2">
          {newPackage.features.map((feature, idx) => (
            <input
              key={idx}
              className="border px-2 py-1 mr-2 mt-2"
              placeholder={`Feature ${idx + 1}`}
              value={feature}
              onChange={e => handleFeatureChange(idx, e.target.value)}
            />
          ))}
          <button className="bg-gray-200 px-2 py-1 rounded" onClick={addFeatureField}>+ Feature</button>
        </div>
        <button className="bg-primary-600 text-white px-4 py-2 rounded" onClick={handleAdd}>Add Package</button>
      </div>
      <h2 className="font-semibold mb-2">Existing Packages</h2>
      <ul>
        {packages.map((pkg, idx) => (
          <li key={pkg.name} className="mb-4 border p-4 rounded">
            <div className="flex justify-between items-center">
              <div>
                <strong>{pkg.name}</strong> - {pkg.price}
                <ul className="ml-4 list-disc">
                  {pkg.features.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
              <button className="bg-red-500 text-white px-2 py-1 rounded" onClick={() => handleDelete(idx)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminConsole;