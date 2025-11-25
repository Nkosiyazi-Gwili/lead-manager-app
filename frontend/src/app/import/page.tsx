'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';

interface ImportResult {
  message: string;
  leads: any[];
  importedCount?: number;
  errorCount?: number;
  errors?: string[];
}

// Helper functions for API calls
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const isProduction = window.location.hostname.includes('vercel.app');
    return isProduction 
      ? 'https://lead-manager-back-end-app-i5rw.vercel.app'
      : 'http://localhost:5000';
  }
  return 'http://localhost:5000';
};

const getAuthHeaders = () => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    return token ? { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    } : {};
  }
  return {};
};

// Enhanced error handler for API calls
const handleApiError = (error: any): string => {
  console.error('API Error:', error);
  
  if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
    return 'Cannot connect to server. Please check if backend is running.';
  }
  
  if (error.response?.status === 404) {
    return 'API endpoint not found. The backend service might be unavailable.';
  }
  
  if (error.response?.status === 500) {
    return 'Server error. Please try again later.';
  }
  
  if (error.response?.status === 401) {
    return 'Authentication failed. Please login again.';
  }
  
  if (error.response?.status === 413) {
    return 'File too large. Please select a file smaller than 10MB.';
  }
  
  return error.response?.data?.message || 'An unexpected error occurred';
};

export default function Import() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'csv' | 'excel' | 'meta'>('csv');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Meta integration state
  const [metaToken, setMetaToken] = useState('');
  const [metaBusinesses, setMetaBusinesses] = useState<any[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [metaForms, setMetaForms] = useState<any[]>([]);
  const [selectedForm, setSelectedForm] = useState('');

  // Test backend connection
  const testBackendConnection = async (): Promise<boolean> => {
    try {
      const response = await axios.get(`${getApiBaseUrl()}/api/health`, {
        timeout: 5000,
        headers: getAuthHeaders()
      });
      return response.data.success;
    } catch (error) {
      console.error('Backend connection test failed:', error);
      return false;
    }
  };

  const importCSVMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const isConnected = await testBackendConnection();
      if (!isConnected) {
        throw new Error('Backend server is not available. Please ensure the backend is running.');
      }
      
      return axios.post(`${getApiBaseUrl()}/api/leads/import/csv`, formData, {
        headers: { 
          ...getAuthHeaders(),
          'Content-Type': 'multipart/form-data'
        },
        timeout: 60000
      });
    },
    onSuccess: (response) => {
      setImportResult(response.data);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (error: any) => {
      const errorMessage = handleApiError(error);
      setImportResult({
        message: 'Import failed',
        leads: [],
        errors: [errorMessage]
      });
    }
  });

  const importExcelMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const isConnected = await testBackendConnection();
      if (!isConnected) {
        throw new Error('Backend server is not available. Please ensure the backend is running.');
      }
      
      return axios.post(`${getApiBaseUrl()}/api/leads/import/excel`, formData, {
        headers: { 
          ...getAuthHeaders(),
          'Content-Type': 'multipart/form-data'
        },
        timeout: 60000
      });
    },
    onSuccess: (response) => {
      setImportResult(response.data);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (error: any) => {
      const errorMessage = handleApiError(error);
      setImportResult({
        message: 'Import failed',
        leads: [],
        errors: [errorMessage]
      });
    }
  });

  const handleFileUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setImportResult(null);

    const formData = new FormData(e.currentTarget);
    const file = formData.get('file') as File;

    if (!file) {
      setImportResult({
        message: 'No file selected',
        leads: [],
        errors: ['Please select a file to import']
      });
      setIsLoading(false);
      return;
    }

    // Validate file size
    if (file.size > 10 * 1024 * 1024) {
      setImportResult({
        message: 'File too large',
        leads: [],
        errors: ['File size must be less than 10MB']
      });
      setIsLoading(false);
      return;
    }

    try {
      if (activeTab === 'csv') {
        await importCSVMutation.mutateAsync(formData);
      } else if (activeTab === 'excel') {
        await importExcelMutation.mutateAsync(formData);
      }
    } catch (error) {
      // Error handled in mutation
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupMeta = async () => {
    if (!metaToken) {
      alert('Please enter a Meta access token');
      return;
    }

    setIsLoading(true);
    try {
      const isConnected = await testBackendConnection();
      if (!isConnected) {
        throw new Error('Backend server is not available. Please ensure the backend is running.');
      }

      const response = await axios.post(`${getApiBaseUrl()}/api/meta/setup`, 
        { accessToken: metaToken },
        { 
          headers: getAuthHeaders(),
          timeout: 15000
        }
      );
      
      alert('Meta access configured successfully!');
      
      // Fetch business accounts
      try {
        const businessesResponse = await axios.get(`${getApiBaseUrl()}/api/meta/businesses`, {
          headers: getAuthHeaders(),
          timeout: 15000
        });
        setMetaBusinesses(businessesResponse.data.data || []);
      } catch (businessError) {
        console.warn('Could not fetch business accounts:', businessError);
        // Continue without businesses
      }
    } catch (error: any) {
      const errorMessage = handleApiError(error);
      alert(`Failed to setup Meta access: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchForms = async (businessId: string) => {
    try {
      const response = await axios.get(`${getApiBaseUrl()}/api/meta/forms?pageId=${businessId}`, {
        headers: getAuthHeaders(),
        timeout: 15000
      });
      setMetaForms(response.data.data || []);
    } catch (error: any) {
      console.error('Failed to fetch forms:', error);
      const errorMessage = handleApiError(error);
      alert(`Failed to fetch forms: ${errorMessage}`);
    }
  };

  const handleMetaImport = async () => {
    setIsLoading(true);
    setImportResult(null);
    
    try {
      const isConnected = await testBackendConnection();
      if (!isConnected) {
        throw new Error('Backend server is not available.');
      }

      // Try both possible endpoints
      let response;
      try {
        response = await axios.post(`${getApiBaseUrl()}/api/leads/import/meta`, {
          formId: selectedForm,
          businessId: selectedBusiness
        }, {
          headers: getAuthHeaders(),
          timeout: 30000
        });
      } catch (error) {
        // Fallback to meta endpoint
        response = await axios.post(`${getApiBaseUrl()}/api/meta/import-leads`, {
          formId: selectedForm,
          businessId: selectedBusiness
        }, {
          headers: getAuthHeaders(),
          timeout: 30000
        });
      }
      
      setImportResult(response.data);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (error: any) {
      const errorMessage = handleApiError(error);
      setImportResult({
        message: 'Meta import failed',
        leads: [],
        errors: [errorMessage]
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Demo data for testing when backend is down
  const handleDemoImport = async () => {
    setIsLoading(true);
    setImportResult(null);
    
    // Simulate API call delay
    setTimeout(() => {
      setImportResult({
        message: 'Demo Import Completed',
        leads: [
          {
            id: 'demo-1',
            companyTradingName: 'Demo Company 1',
            name: 'John',
            surname: 'Doe',
            emailAddress: 'john@demo.com',
            mobileNumber: '+27781234567',
            leadStatus: 'new',
            source: 'demo_import'
          },
          {
            id: 'demo-2', 
            companyTradingName: 'Demo Company 2',
            name: 'Jane',
            surname: 'Smith',
            emailAddress: 'jane@demo.com',
            mobileNumber: '+27787654321',
            leadStatus: 'new',
            source: 'demo_import'
          }
        ],
        importedCount: 2
      });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setIsLoading(false);
    }, 2000);
  };

  const downloadTemplate = (type: 'csv' | 'excel') => {
    const templateData = [
      [
        'company_registered_name',
        'company_trading_name',
        'address',
        'name',
        'surname',
        'occupation',
        'website',
        'telephone_number',
        'mobile_number',
        'whatsapp_number',
        'industry',
        'number_of_employees',
        'bbbee_level',
        'number_of_branches',
        'email_address',
        'annual_turnover',
        'trading_hours',
        'directors_name',
        'directors_surname',
        'social_media_handles'
      ],
      [
        'ABC Company (Pty) Ltd',
        'ABC Company',
        '123 Main Street, Johannesburg',
        'John',
        'Doe',
        'Manager',
        'https://abccompany.com',
        '+27111234567',
        '+27771234567',
        '+27771234567',
        'Technology',
        '50',
        'B-BBEE 4',
        '2',
        'john@abccompany.com',
        'R10 million',
        '08:00-17:00',
        'Jane',
        'Doe',
        '@abccompany'
      ]
    ];

    if (type === 'csv') {
      const csvContent = templateData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'leads_import_template.csv';
      link.click();
      URL.revokeObjectURL(url);
    } else {
      const csvContent = templateData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'leads_import_template.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Import Leads</h1>
            <p className="text-gray-600">Import leads from CSV, Excel files, or Meta Business</p>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('csv')}
                  className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                    activeTab === 'csv'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  CSV Import
                </button>
                <button
                  onClick={() => setActiveTab('excel')}
                  className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                    activeTab === 'excel'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Excel Import
                </button>
                <button
                  onClick={() => setActiveTab('meta')}
                  className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                    activeTab === 'meta'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Meta Business
                </button>
              </nav>
            </div>

            <div className="p-6">
              {/* CSV/Excel Import */}
              {(activeTab === 'csv' || activeTab === 'excel') && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 mb-2">Import Instructions</h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Download the template file to ensure proper formatting</li>
                      <li>• Required fields: Name, Surname, Email, Mobile Number</li>
                      <li>• File size limit: 10MB</li>
                      <li>• Supported formats: {activeTab === 'csv' ? 'CSV' : 'XLSX, XLS'}</li>
                    </ul>
                  </div>

                  <div className="flex space-x-4">
                    <button
                      onClick={() => downloadTemplate(activeTab)}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    >
                      Download Template
                    </button>
                    <button
                      onClick={() => document.getElementById('fileInput')?.click()}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Choose File
                    </button>
                  </div>

                  <form onSubmit={handleFileUpload}>
                    <input
                      id="fileInput"
                      name="file"
                      type="file"
                      accept={activeTab === 'csv' ? '.csv' : '.xlsx,.xls'}
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          const form = e.target.form;
                          if (form) form.requestSubmit();
                        }
                      }}
                    />
                    
                    {isLoading && (
                      <div className="flex items-center space-x-2 text-blue-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span>Importing leads...</span>
                      </div>
                    )}
                  </form>
                </div>
              )}

              {/* Meta Business Import */}
              {activeTab === 'meta' && (
                <div className="space-y-6">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h3 className="font-semibold text-purple-800 mb-2">Meta Business Integration</h3>
                    <ul className="text-sm text-purple-700 space-y-1">
                      <li>• Import leads directly from Meta Business campaigns</li>
                      <li>• Automatically sync form responses</li>
                      <li>• Real-time lead capture</li>
                      <li>• Requires Meta Business account connection</li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    {/* Setup Section */}
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">1. Setup Meta Access</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Configure your Meta Business API access token.
                      </p>
                      <div className="space-y-3">
                        <input
                          type="password"
                          placeholder="Enter Meta Access Token"
                          className="w-full p-2 border rounded"
                          value={metaToken}
                          onChange={(e) => setMetaToken(e.target.value)}
                        />
                        <button 
                          onClick={handleSetupMeta}
                          disabled={isLoading}
                          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {isLoading ? 'Setting up...' : 'Setup Meta Access'}
                        </button>
                      </div>
                    </div>

                    {/* Business Accounts Section */}
                    {metaBusinesses.length > 0 && (
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold mb-2">2. Select Business Account</h4>
                        <select 
                          className="w-full p-2 border rounded"
                          value={selectedBusiness}
                          onChange={(e) => {
                            setSelectedBusiness(e.target.value);
                            setSelectedForm('');
                            if (e.target.value) {
                              fetchForms(e.target.value);
                            }
                          }}
                        >
                          <option value="">Select a business account</option>
                          {metaBusinesses.map(business => (
                            <option key={business.id} value={business.id}>
                              {business.name} {business.verification_status && `(${business.verification_status})`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Forms Section */}
                    {selectedBusiness && metaForms.length > 0 && (
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold mb-2">3. Select Form</h4>
                        <select 
                          className="w-full p-2 border rounded mb-4"
                          value={selectedForm}
                          onChange={(e) => setSelectedForm(e.target.value)}
                        >
                          <option value="">Select a form</option>
                          {metaForms.map(form => (
                            <option key={form.id} value={form.id}>
                              {form.name} {form.leads_count !== undefined && `(${form.leads_count} leads)`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Import Section */}
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">4. Import Leads</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Import leads from your selected Meta Business form.
                      </p>
                      <button
                        onClick={handleMetaImport}
                        disabled={isLoading || !selectedForm}
                        className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50 mr-2"
                      >
                        {isLoading ? 'Importing...' : 'Import from Meta'}
                      </button>
                    </div>

                    {/* Demo Section */}
                    {metaBusinesses.length === 0 && (
                      <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                        <h4 className="font-semibold text-yellow-800 mb-2">Demo Mode</h4>
                        <p className="text-sm text-yellow-700 mb-4">
                          No Meta Business accounts configured. You can test the import with demo data.
                        </p>
                        <button
                          onClick={handleDemoImport}
                          disabled={isLoading}
                          className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 disabled:opacity-50"
                        >
                          {isLoading ? 'Importing...' : 'Test with Demo Data'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Import Results */}
              {importResult && (
                <div className={`mt-6 p-4 rounded-lg ${
                  importResult.errors && importResult.errors.length > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
                }`}>
                  <h3 className={`font-semibold mb-2 ${
                    importResult.errors && importResult.errors.length > 0 ? 'text-red-800' : 'text-green-800'
                  }`}>
                    {importResult.message}
                  </h3>
                  
                  {importResult.importedCount !== undefined && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-700">
                        Successfully imported {importResult.importedCount} leads
                        {importResult.errorCount && importResult.errorCount > 0 && 
                          `, ${importResult.errorCount} errors`
                        }
                      </p>
                    </div>
                  )}

                  {importResult.errors && importResult.errors.length > 0 && (
                    <div>
                      <h4 className="font-medium text-red-700 mb-2">Errors:</h4>
                      <ul className="text-sm text-red-600 space-y-1">
                        {importResult.errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {importResult.leads && importResult.leads.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-gray-700 mb-2">Imported Leads Preview:</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full bg-white text-sm">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-4 py-2 text-left">Company</th>
                              <th className="px-4 py-2 text-left">Contact</th>
                              <th className="px-4 py-2 text-left">Email</th>
                              <th className="px-4 py-2 text-left">Phone</th>
                              <th className="px-4 py-2 text-left">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importResult.leads.slice(0, 5).map((lead, index) => (
                              <tr key={index} className="border-t">
                                <td className="px-4 py-2">
                                  {lead.companyTradingName || `${lead.name} ${lead.surname}`}
                                </td>
                                <td className="px-4 py-2">{lead.name} {lead.surname}</td>
                                <td className="px-4 py-2">{lead.emailAddress}</td>
                                <td className="px-4 py-2">{lead.mobileNumber}</td>
                                <td className="px-4 py-2">
                                  <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                    {lead.leadStatus || 'new'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {importResult.leads.length > 5 && (
                          <p className="text-xs text-gray-500 mt-2">
                            Showing first 5 of {importResult.leads.length} imported leads
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* File Format Guide */}
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">File Format Guide</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left">Field Name</th>
                    <th className="px-4 py-2 text-left">Description</th>
                    <th className="px-4 py-2 text-left">Required</th>
                    <th className="px-4 py-2 text-left">Example</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="px-4 py-2 font-medium">name</td>
                    <td className="px-4 py-2">Contact first name</td>
                    <td className="px-4 py-2">Yes</td>
                    <td className="px-4 py-2">John</td>
                  </tr>
                  <tr className="border-t bg-gray-50">
                    <td className="px-4 py-2 font-medium">surname</td>
                    <td className="px-4 py-2">Contact last name</td>
                    <td className="px-4 py-2">Yes</td>
                    <td className="px-4 py-2">Doe</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-4 py-2 font-medium">email_address</td>
                    <td className="px-4 py-2">Contact email</td>
                    <td className="px-4 py-2">Yes</td>
                    <td className="px-4 py-2">john@company.com</td>
                  </tr>
                  <tr className="border-t bg-gray-50">
                    <td className="px-4 py-2 font-medium">mobile_number</td>
                    <td className="px-4 py-2">Mobile phone</td>
                    <td className="px-4 py-2">Yes</td>
                    <td className="px-4 py-2">+27771234567</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-4 py-2 font-medium">company_trading_name</td>
                    <td className="px-4 py-2">Trading name</td>
                    <td className="px-4 py-2">No</td>
                    <td className="px-4 py-2">ABC Company</td>
                  </tr>
                  <tr className="border-t bg-gray-50">
                    <td className="px-4 py-2 font-medium">occupation</td>
                    <td className="px-4 py-2">Job title</td>
                    <td className="px-4 py-2">No</td>
                    <td className="px-4 py-2">Manager</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}