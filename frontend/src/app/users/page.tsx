'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import DataTable from 'react-data-table-component';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  isActive: boolean;
  createdAt: string;
}

interface Filters {
  role: string;
  department: string;
  status: string;
  search: string;
}

// Helper functions for API calls
const getApiBaseUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
};

const getAuthHeaders = () => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  return {};
};

export default function Users() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<Filters>({
    role: '',
    department: '',
    status: '',
    search: ''
  });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Debounce search to avoid too many API calls
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 500);

    return () => clearTimeout(timer);
  }, [filters.search]);

  const { data: usersData, isLoading, error } = useQuery({
    queryKey: ['users', { ...filters, search: debouncedSearch }],
    queryFn: async () => {
      const params: any = {};
      
      if (filters.role) params.role = filters.role;
      if (filters.department) params.department = filters.department;
      if (filters.status) params.status = filters.status;
      if (debouncedSearch) params.search = debouncedSearch;

      const response = await axios.get(`${getApiBaseUrl()}/api/users`, { 
        params,
        headers: getAuthHeaders()
      });
      return response.data.data || response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const updateUserMutation = useMutation({
    mutationFn: (userData: any) => 
      axios.put(`${getApiBaseUrl()}/api/users/${userData._id}`, userData, {
        headers: getAuthHeaders()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowEditModal(false);
      setEditingUser(null);
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => 
      axios.delete(`${getApiBaseUrl()}/api/users/${userId}`, {
        headers: getAuthHeaders()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowDeleteModal(false);
      setUserToDelete(null);
    }
  });

  const addUserMutation = useMutation({
    mutationFn: (userData: any) => 
      axios.post(`${getApiBaseUrl()}/api/auth/register`, userData, {
        headers: getAuthHeaders()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowAddModal(false);
    }
  });

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  const handleDelete = (user: User) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const handleAdd = () => {
    setShowAddModal(true);
  };

  const handleSave = (userData: any) => {
    updateUserMutation.mutate(userData);
  };

  const handleAddNew = (userData: any) => {
    addUserMutation.mutate(userData);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete._id);
    }
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      role: '',
      department: '',
      status: '',
      search: ''
    });
  };

  const getActiveFilterCount = () => {
    return Object.values(filters).filter(value => value !== '').length;
  };

  const columns = [
    {
      name: 'Name',
      selector: (row: User) => row.name,
      sortable: true,
    },
    {
      name: 'Email',
      selector: (row: User) => row.email,
      sortable: true,
    },
    {
      name: 'Role',
      selector: (row: User) => row.role,
      sortable: true,
      cell: (row: User) => (
        <span className="capitalize px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
          {row.role.replace('_', ' ')}
        </span>
      )
    },
    {
      name: 'Department',
      selector: (row: User) => row.department || 'N/A',
      sortable: true,
      cell: (row: User) => (
        <span className="capitalize">
          {row.department || 'N/A'}
        </span>
      )
    },
    {
      name: 'Status',
      selector: (row: User) => row.isActive ? 'Active' : 'Inactive',
      sortable: true,
      cell: (row: User) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          row.isActive 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      name: 'Created',
      selector: (row: User) => new Date(row.createdAt).toLocaleDateString(),
      sortable: true,
    },
    {
      name: 'Actions',
      cell: (row: User) => (
        <div className="space-x-2">
          <button
            onClick={() => handleEdit(row)}
            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
            disabled={updateUserMutation.isPending}
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="text-red-600 hover:text-red-900 text-sm font-medium"
            disabled={row._id === currentUser?.id || deleteUserMutation.isPending}
          >
            Delete
          </button>
        </div>
      )
    }
  ];

  return (
    <ProtectedRoute>
      <Layout>
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">User Management</h1>
              <p className="text-gray-600 text-sm">
                {usersData?.length || 0} users found
                {getActiveFilterCount() > 0 && ` (${getActiveFilterCount()} filter${getActiveFilterCount() > 1 ? 's' : ''} active)`}
              </p>
            </div>
            <button 
              onClick={handleAdd}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Add New User
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded shadow mb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Filters</h3>
              {getActiveFilterCount() > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear all filters
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="w-full border rounded px-3 py-2 pl-10 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Role Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={filters.role}
                  onChange={(e) => handleFilterChange('role', e.target.value)}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="sales_manager">Sales Manager</option>
                  <option value="sales_agent">Sales Agent</option>
                  <option value="marketing_manager">Marketing Manager</option>
                  <option value="marketing_agent">Marketing Agent</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Department Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <select
                  value={filters.department}
                  onChange={(e) => handleFilterChange('department', e.target.value)}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Departments</option>
                  <option value="sales">Sales</option>
                  <option value="marketing">Marketing</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Quick Actions */}
              <div className="flex items-end space-x-2">
                <button
                  onClick={clearFilters}
                  className="w-full bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-500"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Active Filters Display */}
            {getActiveFilterCount() > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {filters.role && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Role: {filters.role.replace('_', ' ')}
                    <button
                      onClick={() => handleFilterChange('role', '')}
                      className="ml-1 hover:text-blue-600"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.department && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Department: {filters.department}
                    <button
                      onClick={() => handleFilterChange('department', '')}
                      className="ml-1 hover:text-green-600"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.status && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    Status: {filters.status}
                    <button
                      onClick={() => handleFilterChange('status', '')}
                      className="ml-1 hover:text-purple-600"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.search && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Search: "{filters.search}"
                    <button
                      onClick={() => handleFilterChange('search', '')}
                      className="ml-1 hover:text-yellow-600"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Users Table */}
          <div className="bg-white rounded shadow">
            <DataTable
              columns={columns}
              data={usersData || []}
              progressPending={isLoading}
              pagination
              highlightOnHover
              noDataComponent={
                <div className="p-8 text-center">
                  {getActiveFilterCount() > 0 ? (
                    <div>
                      <p className="text-gray-500 mb-2">No users found matching your filters</p>
                      <button
                        onClick={clearFilters}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Clear all filters
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-500">No users found</p>
                  )}
                </div>
              }
            />
          </div>

          {/* Add User Modal */}
          {showAddModal && (
            <AddUserModal
              onSave={handleAddNew}
              onClose={() => setShowAddModal(false)}
              isLoading={addUserMutation.isPending}
            />
          )}

          {/* Edit User Modal */}
          {showEditModal && editingUser && (
            <EditUserModal
              user={editingUser}
              onSave={handleSave}
              onClose={() => {
                setShowEditModal(false);
                setEditingUser(null);
              }}
              isLoading={updateUserMutation.isPending}
            />
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteModal && userToDelete && (
            <DeleteUserModal
              user={userToDelete}
              onConfirm={confirmDelete}
              onClose={() => {
                setShowDeleteModal(false);
                setUserToDelete(null);
              }}
              isLoading={deleteUserMutation.isPending}
            />
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

// Add User Modal Component
function AddUserModal({ onSave, onClose, isLoading }: { 
  onSave: (userData: any) => void; 
  onClose: () => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'sales_agent',
    department: 'sales',
    isActive: true
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const { confirmPassword, ...userData } = formData;
      onSave(userData);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Add New User</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : ''
                }`}
                required
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  errors.email ? 'border-red-500' : ''
                }`}
                required
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password *</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  errors.password ? 'border-red-500' : ''
                }`}
                required
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm Password *</label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  errors.confirmPassword ? 'border-red-500' : ''
                }`}
                required
              />
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <select
                value={formData.role}
                onChange={(e) => handleChange('role', e.target.value)}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="admin">Admin</option>
                <option value="sales_manager">Sales Manager</option>
                <option value="sales_agent">Sales Agent</option>
                <option value="marketing_manager">Marketing Manager</option>
                <option value="marketing_agent">Marketing Agent</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Department</label>
              <select
                value={formData.department}
                onChange={(e) => handleChange('department', e.target.value)}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="sales">Sales</option>
                <option value="marketing">Marketing</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => handleChange('isActive', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Active User</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit User Modal Component
function EditUserModal({ user, onSave, onClose, isLoading }: { 
  user: User; 
  onSave: (userData: any) => void; 
  onClose: () => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    isActive: user.isActive
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...user, ...formData });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Edit User</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="admin">Admin</option>
                <option value="sales_manager">Sales Manager</option>
                <option value="sales_agent">Sales Agent</option>
                <option value="marketing_manager">Marketing Manager</option>
                <option value="marketing_agent">Marketing Agent</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="sales">Sales</option>
                <option value="marketing">Marketing</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Active User</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Delete User Modal Component
function DeleteUserModal({ user, onConfirm, onClose, isLoading }: { 
  user: User; 
  onConfirm: () => void; 
  onClose: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-red-600">Delete User</h2>
        <p className="mb-4">
          Are you sure you want to delete user <strong>{user.name}</strong> ({user.email})?
        </p>
        <p className="text-sm text-gray-600 mb-6">
          This action cannot be undone. All data associated with this user will be permanently removed.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? 'Deleting...' : 'Delete User'}
          </button>
        </div>
      </div>
    </div>
  );
}