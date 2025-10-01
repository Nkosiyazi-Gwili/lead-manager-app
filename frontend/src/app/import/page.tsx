'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';

interface ImportResult {
  message: string;
  leads: any[];
  errors?: string[];
}

export default function Import() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'csv' | 'excel' | 'meta'>('csv');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const importCSVMutation = useMutation({
    mutationFn: (formData: FormData) => 
      axios.post('/api/leads/import/csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }),
    onSuccess: (response) => {
      setImportResult(response.data);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (error: any) => {
      setImportResult({
        message: 'Import failed',
        leads: [],
        errors: [error.response?.data?.message || 'Unknown error']
      });
    }
  });

  const importExcelMutation = useMutation({
    mutationFn: (formData: FormData) => 
      axios.post('/api/leads/import/excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }),
    onSuccess: (response) => {
      setImportResult(response.data);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (error: any) => {
      setImportResult({
        message: 'Import failed',
        leads: [],
        errors: [error.response?.data?.message || 'Unknown error']
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

  const handleMetaImport = async () => {
    setIsLoading(true);
    setImportResult(null);
    
    try {
      // This would integrate with Meta Business API
      // For now, we'll simulate the API call
      const response = await axios.post('/api/leads/import/meta');
      setImportResult(response.data);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (error: any) {
      setImportResult({
        message: 'Meta import failed',
        leads: [],
        errors: [error.response?.data?.message || 'Failed to import from Meta']
      });
    } finally {
      setIsLoading(false);
    }
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
      // For Excel, we'd need a library like xlsx to create proper Excel file
      // For now, we'll just download as CSV with .xlsx extension
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
                      <li>• Required fields: Name, Email, Mobile Number</li>
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
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Connect Meta Business Account</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Connect your Meta Business account to import leads from your ad campaigns.
                      </p>
                      <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                        Connect Meta Account
                      </button>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Import Leads</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Import leads from your connected Meta Business account.
                      </p>
                      <button
                        onClick={handleMetaImport}
                        disabled={isLoading}
                        className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
                      >
                        {isLoading ? 'Importing...' : 'Import from Meta'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Import Results */}
              {importResult && (
                <div className={`mt-6 p-4 rounded-lg ${
                  importResult.errors ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
                }`}>
                  <h3 className={`font-semibold mb-2 ${
                    importResult.errors ? 'text-red-800' : 'text-green-800'
                  }`}>
                    {importResult.message}
                  </h3>
                  
                  {importResult.leads && importResult.leads.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-700">
                        Successfully imported {importResult.leads.length} leads
                      </p>
                    </div>
                  )}

                  {importResult.errors && (
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
                                <td className="px-4 py-2">
                                  <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                    {lead.leadStatus}
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
                    <td className="px-4 py-2 font-medium">company_registered_name</td>
                    <td className="px-4 py-2">Legal company name</td>
                    <td className="px-4 py-2">No</td>
                    <td className="px-4 py-2">ABC Company (Pty) Ltd</td>
                  </tr>
                  <tr className="border-t bg-gray-50">
                    <td className="px-4 py-2 font-medium">company_trading_name</td>
                    <td className="px-4 py-2">Trading name</td>
                    <td className="px-4 py-2">No</td>
                    <td className="px-4 py-2">ABC Company</td>
                  </tr>
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
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}