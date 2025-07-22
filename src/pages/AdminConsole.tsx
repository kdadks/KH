import React, { useState, useEffect } from 'react';
import { treatmentPackages } from '../data/packages';
import { supabase } from '../supabaseClient';

type Package = {
  name: string;
  price: string;
  features: string[];
};

type BookingFormData = {
  name: string;
  email: string;
  phone: string;
  service: string;
  date: string;
  time: string;
  notes: string;
  status?: string;
};



const AdminConsole: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [changePasswordMsg, setChangePasswordMsg] = useState('');
  const [packages, setPackages] = useState<Package[]>(treatmentPackages);
  const [newPackage, setNewPackage] = useState<Package>({ name: '', price: '', features: [''] });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'package' | 'bookings' | 'availability'>('dashboard');
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editPackage, setEditPackage] = useState<Package | null>(null);
  const [bookings, setBookings] = useState<BookingFormData[]>([]);
  const [filterDate, setFilterDate] = useState('');
  const [filterRange, setFilterRange] = useState<{start: string; end: string} | null>(null);
  const [availability, setAvailability] = useState<{ date: string; start: string; end: string }[]>([]);
  const [newAvailability, setNewAvailability] = useState<{ date: string; start: string; end: string }>({ date: '', start: '', end: '' });
  const [confirmedBookings, setConfirmedBookings] = useState<number[]>([]);

  // Login handler using Supabase Auth
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setLoginError(error.message);
    } else if (data.user) {
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('Login failed.');
    }
  };

  // Change password handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordMsg('');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setChangePasswordMsg('Failed to change password: ' + error.message);
    } else {
      setChangePasswordMsg('Password changed successfully!');
      setShowChangePassword(false);
      setNewPassword('');
    }
  };

  // Package management handlers
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

  // Load all bookings on login for dashboard metrics

  // Fetch bookings from Supabase after login or when bookings tab is active
  useEffect(() => {
    const fetchBookings = async () => {
      if (isLoggedIn && activeTab === 'bookings') {
        const { data } = await supabase.from('bookings').select('*').order('booking_date', { ascending: false });
        if (data) {
          // Map DB fields to BookingFormData shape for display, include status
          setBookings(data.map((b: any) => ({
            name: b.customer_name,
            email: b.customer_email,
            phone: b.customer_phone,
            service: b.package_name,
            date: b.booking_date ? b.booking_date.split('T')[0] : '',
            time: b.booking_date && b.booking_date.includes('T') ? b.booking_date.split('T')[1].slice(0,5) : '',
            notes: b.notes || '',
            status: b.status || 'pending',
          })));
        } else {
          setBookings([]);
        }
      }
    };
    fetchBookings();
  }, [isLoggedIn, activeTab]);

  const filteredBookings = filterRange
    ? bookings.filter(b => b.date >= filterRange.start && b.date <= filterRange.end)
    : filterDate
      ? bookings.filter(b => b.date === filterDate)
      : bookings;

  // Dashboard metrics
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const bookingsToday = bookings.filter(b => b.date === todayStr).length;
  const dayOfWeek = today.getDay();
  const diffToMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const bookingsThisWeek = bookings.filter(b => {
    const d = new Date(b.date);
    return d >= monday && d <= sunday;
  }).length;
  const month = today.getMonth();
  const year = today.getFullYear();
  const bookingsThisMonth = bookings.filter(b => {
    const d = new Date(b.date);
    return d.getMonth() === month && d.getFullYear() === year;
  }).length;
  // compute string ranges for drill-down filtering
  const mondayStr = monday.toISOString().split('T')[0];
  const sundayStr = sunday.toISOString().split('T')[0];
  const monthStart = new Date(year, month, 1).toISOString().split('T')[0];
  const monthEnd = new Date(year, month + 1, 0).toISOString().split('T')[0];

  const handleConfirmBooking = async (booking: BookingFormData, idx: number) => {
    // 1. Update booking status in the database
    const { data: dbBookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('customer_name', booking.name)
      .eq('customer_email', booking.email)
      .eq('package_name', booking.service)
      .eq('booking_date', booking.date + (booking.time ? `T${booking.time}` : ''));

    if (dbBookings && dbBookings.length > 0) {
      const bookingId = dbBookings[0].id;
      const { error } = await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', bookingId);
      if (!error) {
        // Update local state so UI reflects the change immediately
        setBookings(prev => prev.map((b, i) => {
          if (
            i === idx &&
            b.name === booking.name &&
            b.email === booking.email &&
            b.service === booking.service &&
            b.date === booking.date &&
            b.time === booking.time
          ) {
            return { ...b, status: 'confirmed' };
          }
          return b;
        }));
      }
    }

    // 2. Send calendar invite to customer and admin (placeholder)
    // ...existing code...

    setConfirmedBookings([...confirmedBookings, idx]);
    alert('Booking confirmed! Calendar invite will be sent.');
  };

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <form
          className="bg-white p-8 rounded shadow-md w-full max-w-xs"
          onSubmit={handleLogin}
        >
          <h2 className="text-xl font-bold mb-4">Admin Login</h2>
          <input
            className="border px-2 py-1 mb-2 w-full"
            placeholder="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            className="border px-2 py-1 mb-2 w-full"
            placeholder="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {loginError && <div className="text-red-500 mb-2">{loginError}</div>}
          <button
            className="bg-primary-600 text-white px-4 py-2 rounded w-full"
            type="submit"
          >
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Admin Console</h1>
      <div className="mb-6 flex gap-2">
        <button
          className="bg-gray-200 px-3 py-1 rounded"
          onClick={() => setIsLoggedIn(false)}
        >
          Logout
        </button>
        <button
          className="bg-blue-200 px-3 py-1 rounded"
          onClick={() => setShowChangePassword(v => !v)}
        >
          Change Password
        </button>
      </div>
      {showChangePassword && (
        <form className="mb-6 bg-white p-4 rounded shadow max-w-xs" onSubmit={handleChangePassword}>
          <h3 className="font-semibold mb-2">Change Password</h3>
          <input
            className="border px-2 py-1 mb-2 w-full"
            placeholder="New Password"
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
          />
          <button className="bg-primary-600 text-white px-4 py-2 rounded w-full" type="submit">Update Password</button>
          {changePasswordMsg && <div className="mt-2 text-green-600">{changePasswordMsg}</div>}
        </form>
      )}
      <div className="mb-8 flex gap-4">
        <button
          className={`px-4 py-2 rounded ${activeTab === 'dashboard' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={`px-4 py-2 rounded ${activeTab === 'package' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('package')}
        >
          Package Management
        </button>
        <button
          className={`px-4 py-2 rounded ${activeTab === 'bookings' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('bookings')}
        >
          Bookings
        </button>
        <button
          className={`px-4 py-2 rounded ${activeTab === 'availability' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('availability')}
        >
          Availability Management
        </button>
      </div>
      {activeTab === 'dashboard' && (
        <div>
          <h2 className="font-semibold mb-4">Dashboard</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => { setActiveTab('bookings'); setFilterRange({ start: todayStr, end: todayStr }); setFilterDate(''); }}
              className="cursor-pointer p-4 bg-white rounded shadow hover:bg-gray-100"
            >
              <h3 className="text-lg font-bold">Bookings Today</h3>
              <p className="text-2xl">{bookingsToday}</p>
            </div>
            <div
              onClick={() => { setActiveTab('bookings'); setFilterRange({ start: mondayStr, end: sundayStr }); setFilterDate(''); }}
              className="cursor-pointer p-4 bg-white rounded shadow hover:bg-gray-100"
            >
              <h3 className="text-lg font-bold">Bookings This Week</h3>
              <p className="text-2xl">{bookingsThisWeek}</p>
            </div>
            <div
              onClick={() => { setActiveTab('bookings'); setFilterRange({ start: monthStart, end: monthEnd }); setFilterDate(''); }}
              className="cursor-pointer p-4 bg-white rounded shadow hover:bg-gray-100"
            >
              <h3 className="text-lg font-bold">Bookings This Month</h3>
              <p className="text-2xl">{bookingsThisMonth}</p>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'package' && (
        <div>
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

          <h2 className="font-semibold mb-2 mt-8">Existing Packages</h2>
          <ul>
            {packages.map((pkg, idx) => (
              <li key={pkg.name} className="mb-4 border p-4 rounded">
                <div className="flex justify-between items-center">
                  <div>
                    {editIndex === idx && editPackage ? (
                      <div>
                        <input
                          className="border px-2 py-1 mr-2 mb-2"
                          value={editPackage.name}
                          onChange={e => handleEditChange('name', e.target.value)}
                        />
                        <input
                          className="border px-2 py-1 mr-2 mb-2"
                          value={editPackage.price}
                          onChange={e => handleEditChange('price', e.target.value)}
                        />
                        <div className="mb-2">
                          {editPackage.features.map((feature, fidx) => (
                            <input
                              key={fidx}
                              className="border px-2 py-1 mr-2 mt-2"
                              value={feature}
                              onChange={e => handleEditFeatureChange(fidx, e.target.value)}
                            />
                          ))}
                          <button className="bg-gray-200 px-2 py-1 rounded" onClick={addEditFeatureField}>+ Feature</button>
                        </div>
                        <button className="bg-primary-600 text-white px-4 py-2 rounded mr-2" onClick={handleSaveEdit}>Save</button>
                        <button className="bg-gray-400 text-white px-4 py-2 rounded" onClick={handleCancelEdit}>Cancel</button>
                      </div>
                    ) : (
                      <div>
                        <strong>{pkg.name}</strong> - {pkg.price}
                        <ul className="ml-4 list-disc">
                          {pkg.features.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {editIndex === idx ? null : (
                      <button className="bg-blue-500 text-white px-2 py-1 rounded" onClick={() => handleEdit(idx)}>Edit</button>
                    )}
                    <button className="bg-red-500 text-white px-2 py-1 rounded" onClick={() => handleDelete(idx)}>Delete</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {activeTab === 'availability' && (
        <div>
          <h2 className="font-semibold mb-2">Add Availability Block</h2>
          <input
            type="date"
            className="border px-2 py-1 mr-2"
            value={newAvailability.date}
            onChange={e => setNewAvailability({ ...newAvailability, date: e.target.value })}
          />
          <input
            type="time"
            className="border px-2 py-1 mr-2"
            placeholder="Start Time"
            value={newAvailability.start}
            onChange={e => setNewAvailability({ ...newAvailability, start: e.target.value })}
          />
          <input
            type="time"
            className="border px-2 py-1 mr-2"
            placeholder="End Time"
            value={newAvailability.end}
            onChange={e => setNewAvailability({ ...newAvailability, end: e.target.value })}
          />
          <button
            className="bg-primary-600 text-white px-4 py-2 rounded"
            onClick={() => {
              if (newAvailability.date && newAvailability.start && newAvailability.end && newAvailability.start < newAvailability.end) {
                setAvailability([...availability, newAvailability]);
                setNewAvailability({ date: '', start: '', end: '' });
              }
            }}
          >
            Add Availability Block
          </button>
          <h2 className="font-semibold mb-2 mt-8">Current Availability Blocks</h2>
          <ul>
            {availability.length === 0 ? (
              <li className="text-gray-500">No availability set.</li>
            ) : (
              availability.map((block, idx) => (
                <li key={idx} className="mb-2 border p-2 rounded flex justify-between items-center">
                  <span>{block.date} - {block.start} to {block.end}</span>
                  <button className="bg-red-500 text-white px-2 py-1 rounded" onClick={() => setAvailability(availability.filter((_, i) => i !== idx))}>Delete</button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
      {activeTab === 'bookings' && (
        <div>
          <h2 className="font-semibold mb-2">All Bookings</h2>
          <div className="mb-4">
            <label className="mr-2">Filter by Date:</label>
            <input
              type="date"
              value={filterDate}
              onChange={e => { setFilterDate(e.target.value); setFilterRange(null); }}
              className="border px-2 py-1"
            />
            <button className="ml-2 bg-gray-200 px-2 py-1 rounded" onClick={() => { setFilterDate(''); setFilterRange(null); }}>Clear</button>
          </div>
          <ul>
            {filteredBookings.length === 0 ? (
              <li className="text-gray-500">No bookings found.</li>
            ) : (
              filteredBookings.map((booking, idx) => {
                const isAvailable = availability.some(a =>
                  a.date === booking.date &&
                  booking.time >= a.start && booking.time <= a.end
                );
                const isConfirmed = booking.status === 'confirmed';
                return (
                  <li
                    key={idx}
                    className={`mb-4 border p-4 rounded ${isConfirmed ? 'bg-green-100' : isAvailable ? 'bg-green-100' : 'bg-red-100'}`}
                  >
                    <div><strong>Name:</strong> {booking.name}</div>
                    <div><strong>Email:</strong> {booking.email}</div>
                    <div><strong>Phone:</strong> {booking.phone}</div>
                    <div><strong>Service:</strong> {booking.service}</div>
                    <div><strong>Date:</strong> {booking.date}</div>
                    <div><strong>Time:</strong> {booking.time}</div>
                    <div><strong>Status:</strong> {booking.status || 'pending'}</div>
                    <div><strong>Notes:</strong> {booking.notes || '-'}</div>
                    <div className="mt-2">
                      {isConfirmed ? (
                        <span className="text-green-700 font-bold">Confirmed</span>
                      ) : (
                        <button
                          className="bg-blue-600 text-white px-3 py-1 rounded"
                          onClick={() => handleConfirmBooking(booking, idx)}
                        >
                          Confirm
                        </button>
                      )}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
      {/* Add more tab content here if needed */}
    </div>
  );
};

export default AdminConsole;