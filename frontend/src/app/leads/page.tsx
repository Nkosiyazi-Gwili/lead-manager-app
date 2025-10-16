'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import DataTable from 'react-data-table-component';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

interface Lead {
  _id: string;
  companyTradingName: string;
  companyRegisteredName: string;
  address: string;
  name: string;
  surname: string;
  occupation: string;
  website: string;
  telephoneNumber: string;
  mobileNumber: string;
  whatsappNumber: string;
  industry: string;
  numberOfEmployees: number;
  bbbeeLevel: string;
  numberOfBranches: number;
  emailAddress: string;
  annualTurnover: string;
  tradingHours: string;
  directorsName: string;
  directorsSurname: string;
  socialMediaHandles: string;
  leadStatus: string;
  leadSource: string;
  assignedTo: {
    _id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  notes: Array<{
    _id: string;
    content: string;
    createdBy: {
      name: string;
      email: string;
    };
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface LeadsResponse {
  success: boolean;
  data: Lead[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalLeads: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface UsersResponse {
  success: boolean;
  data: any[];
}

export default function Leads() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    status: '',
    source: '',
    page: 1,
    limit: 10
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newNote, setNewNote] = useState('');

  const { data: leadsData, isLoading } = useQuery<LeadsResponse>({
    queryKey: ['leads', filters],
    queryFn: async () => {
      const response = await axios.get('/api/leads', { params: filters });
      return response.data;
    }
  });

  const { data: usersData } = useQuery<UsersResponse>({
    queryKey: ['users-for-assignment'],
    queryFn: async () => {
      const response = await axios.get('/api/users/role/sales_agent');
      return response.data;
    },
    enabled: user?.role === 'admin' || user?.role === 'sales_manager'
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: string }) => {
      const response = await axios.patch(`/api/leads/${leadId}/status`, { status });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (error: any) => {
      console.error('Update status error:', error);
      alert(error.response?.data?.message || 'Failed to update status');
    }
  });

  const assignLeadMutation = useMutation({
    mutationFn: async ({ leadId, assignedTo }: { leadId: string; assignedTo: string }) => {
      const response = await axios.patch(`/api/leads/${leadId}/assign`, { assignedTo });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (error: any) => {
      console.error('Assign lead error:', error);
      alert(error.response?.data?.message || 'Failed to assign lead');
    }
  });

  const addNoteMutation = useMutation({
    mutationFn: async ({ leadId, content }: { leadId: string; content: string }) => {
      const response = await axios.post(`/api/leads/${leadId}/notes`, { content });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setShowNotesModal(false);
      setSelectedLead(null);
      setNewNote('');
    },
    onError: (error: any) => {
      console.error('Add note error:', error);
      alert(error.response?.data?.message || 'Failed to add note');
    }
  });

  const addLeadMutation = useMutation({
    mutationFn: async (leadData: any) => {
      const response = await axios.post('/api/leads', leadData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setShowAddModal(false);
    },
    onError: (error: any) => {
      console.error('Add lead error:', error);
      alert(error.response?.data?.message || 'Failed to create lead');
    }
  });

  const updateLeadMutation = useMutation({
    mutationFn: async (leadData: any) => {
      const response = await axios.put(`/api/leads/${leadData._id}`, leadData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setShowEditModal(false);
      setSelectedLead(null);
    },
    onError: (error: any) => {
      console.error('Update lead error:', error);
      alert(error.response?.data?.message || 'Failed to update lead');
    }
  });

  const handleAddLead = () => {
    setShowAddModal(true);
  };

  const handleView = (lead: Lead) => {
    setSelectedLead(lead);
    setShowViewModal(true);
  };

  const handleEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setShowEditModal(true);
  };

  const handleNotes = (lead: Lead) => {
    setSelectedLead(lead);
    setShowNotesModal(true);
  };

  const handleAddNote = () => {
    if (selectedLead && newNote.trim()) {
      addNoteMutation.mutate({
        leadId: selectedLead._id,
        content: newNote
      });
    }
  };

  const handleAssignLead = (leadId: string, assignedTo: string) => {
    assignLeadMutation.mutate({ leadId, assignedTo });
  };

  const handleAddNewLead = (leadData: any) => {
    addLeadMutation.mutate(leadData);
  };

  const handleUpdateLead = (leadData: any) => {
    updateLeadMutation.mutate(leadData);
  };

  const columns = [
    {
      name: 'Company',
      selector: (row: Lead) => row.companyTradingName || `${row.name} ${row.surname}`,
      sortable: true,
    },
    {
      name: 'Contact',
      selector: (row: Lead) => row.emailAddress || '-',
      sortable: true,
    },
    {
      name: 'Phone',
      selector: (row: Lead) => row.mobileNumber || row.telephoneNumber || '-',
    },
    {
      name: 'Status',
      selector: (row: Lead) => row.leadStatus,
      sortable: true,
      cell: (row: Lead) => (
        <select
          value={row.leadStatus}
          onChange={(e) => updateStatusMutation.mutate({ 
            leadId: row._id, 
            status: e.target.value 
          })}
          className="px-2 py-1 text-xs rounded border focus:outline-none focus:ring-1 focus:ring-blue-500"
          disabled={updateStatusMutation.isPending}
        >
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="proposal">Proposal</option>
          <option value="negotiation">Negotiation</option>
          <option value="closed_won">Closed Won</option>
          <option value="closed_lost">Closed Lost</option>
        </select>
      )
    },
    {
      name: 'Source',
      selector: (row: Lead) => row.leadSource,
      sortable: true,
      cell: (row: Lead) => (
        <span className="capitalize px-2 py-1 text-xs rounded-full bg-gray-100">
          {row.leadSource.replace('_', ' ')}
        </span>
      )
    },
    {
      name: 'Assigned To',
      selector: (row: Lead) => row.assignedTo?.name || 'Unassigned',
      sortable: true,
      cell: (row: Lead) => (
        <select
          value={row.assignedTo?._id || ''}
          onChange={(e) => handleAssignLead(row._id, e.target.value)}
          className="px-2 py-1 text-xs rounded border focus:outline-none focus:ring-1 focus:ring-blue-500"
          disabled={assignLeadMutation.isPending || !(user?.role === 'admin' || user?.role === 'sales_manager')}
        >
          <option value="">Unassigned</option>
          {usersData?.data?.map((user: any) => (
            <option key={user._id} value={user._id}>
              {user.name}
            </option>
          ))}
        </select>
      )
    },
    {
      name: 'Actions',
      cell: (row: Lead) => (
        <div className="space-x-2">
          <button
            onClick={() => handleView(row)}
            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
          >
            View
          </button>
          <button
            onClick={() => handleEdit(row)}
            className="text-green-600 hover:text-green-900 text-sm font-medium"
          >
            Edit
          </button>
          <button
            onClick={() => handleNotes(row)}
            className="text-purple-600 hover:text-purple-900 text-sm font-medium"
          >
            Notes
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
            <h1 className="text-2xl font-bold">Leads</h1>
            <button 
              onClick={handleAddLead}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Add New Lead
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded shadow mb-4">
            <div className="flex space-x-4">
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                className="border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="proposal">Proposal</option>
                <option value="negotiation">Negotiation</option>
                <option value="closed_won">Closed Won</option>
                <option value="closed_lost">Closed Lost</option>
              </select>

              <select
                value={filters.source}
                onChange={(e) => setFilters(prev => ({ ...prev, source: e.target.value, page: 1 }))}
                className="border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Sources</option>
                <option value="manual">Manual</option>
                <option value="csv_import">CSV Import</option>
                <option value="meta_business">Meta Business</option>
                <option value="eskils">Eskils</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Leads Table */}
          <div className="bg-white rounded shadow">
            <DataTable
              columns={columns}
              data={leadsData?.data || []}
              progressPending={isLoading}
              pagination
              paginationServer
              paginationTotalRows={leadsData?.pagination?.totalLeads || 0}
              onChangePage={(page) => setFilters(prev => ({ ...prev, page }))}
              onChangeRowsPerPage={(currentRowsPerPage) => setFilters(prev => ({ ...prev, limit: currentRowsPerPage }))}
            />
          </div>

          {/* Add Lead Modal */}
          {showAddModal && (
            <AddLeadModal
              onSave={handleAddNewLead}
              onClose={() => setShowAddModal(false)}
              isLoading={addLeadMutation.isPending}
            />
          )}

          {/* View Lead Modal */}
          {showViewModal && selectedLead && (
            <ViewLeadModal
              lead={selectedLead}
              onClose={() => {
                setShowViewModal(false);
                setSelectedLead(null);
              }}
            />
          )}

          {/* Edit Lead Modal */}
          {showEditModal && selectedLead && (
            <EditLeadModal
              lead={selectedLead}
              onSave={handleUpdateLead}
              onClose={() => {
                setShowEditModal(false);
                setSelectedLead(null);
              }}
              isLoading={updateLeadMutation.isPending}
            />
          )}

          {/* Notes Modal */}
          {showNotesModal && selectedLead && (
            <NotesModal
              lead={selectedLead}
              onSave={handleAddNote}
              onClose={() => {
                setShowNotesModal(false);
                setSelectedLead(null);
                setNewNote('');
              }}
              note={newNote}
              setNote={setNewNote}
              isLoading={addNoteMutation.isPending}
            />
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

// View Lead Modal Component
function ViewLeadModal({ lead, onClose }: { 
  lead: Lead;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Lead Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Company Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Company Information</h3>
            <DetailRow label="Trading Name" value={lead.companyTradingName} />
            <DetailRow label="Registered Name" value={lead.companyRegisteredName} />
            <DetailRow label="Address" value={lead.address} />
            <DetailRow label="Industry" value={lead.industry} />
            <DetailRow label="Number of Employees" value={lead.numberOfEmployees} />
            <DetailRow label="B-BBEE Level" value={lead.bbbeeLevel} />
            <DetailRow label="Number of Branches" value={lead.numberOfBranches} />
            <DetailRow label="Annual Turnover" value={lead.annualTurnover} />
            <DetailRow label="Trading Hours" value={lead.tradingHours} />
            <DetailRow label="Website" value={lead.website} />
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Contact Information</h3>
            <DetailRow label="Contact Person" value={`${lead.name} ${lead.surname}`} />
            <DetailRow label="Occupation" value={lead.occupation} />
            <DetailRow label="Email" value={lead.emailAddress} />
            <DetailRow label="Mobile" value={lead.mobileNumber} />
            <DetailRow label="Telephone" value={lead.telephoneNumber} />
            <DetailRow label="WhatsApp" value={lead.whatsappNumber} />
            
            <h3 className="text-lg font-semibold border-b pb-2 mt-6">Director Information</h3>
            <DetailRow label="Director Name" value={`${lead.directorsName} ${lead.directorsSurname}`} />
            <DetailRow label="Social Media" value={lead.socialMediaHandles} />
            
            <h3 className="text-lg font-semibold border-b pb-2 mt-6">Lead Information</h3>
            <DetailRow label="Status" value={lead.leadStatus} />
            <DetailRow label="Source" value={lead.leadSource} />
            <DetailRow label="Assigned To" value={lead.assignedTo?.name || 'Unassigned'} />
            <DetailRow label="Created" value={new Date(lead.createdAt).toLocaleDateString()} />
            <DetailRow label="Last Updated" value={new Date(lead.updatedAt).toLocaleDateString()} />
          </div>
        </div>

        {/* Notes Section */}
        {lead.notes && lead.notes.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Notes</h3>
            <div className="space-y-3">
              {lead.notes.map((note) => (
                <div key={note._id} className="bg-gray-50 p-3 rounded">
                  <p className="text-sm">{note.content}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    By {note.createdBy.name} on {new Date(note.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Edit Lead Modal Component
function EditLeadModal({ lead, onSave, onClose, isLoading }: { 
  lead: Lead;
  onSave: (leadData: any) => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    ...lead,
    name: lead.name || '',
    surname: lead.surname || '',
    emailAddress: lead.emailAddress || '',
    mobileNumber: lead.mobileNumber || '',
    telephoneNumber: lead.telephoneNumber || '',
    companyTradingName: lead.companyTradingName || '',
    companyRegisteredName: lead.companyRegisteredName || '',
    address: lead.address || '',
    industry: lead.industry || '',
    leadSource: lead.leadSource || 'manual',
    leadStatus: lead.leadStatus || 'new'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Edit Lead</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>
              
              <FormField
                label="Company Trading Name"
                type="text"
                value={formData.companyTradingName}
                onChange={(e) => handleChange('companyTradingName', e.target.value)}
              />

              <FormField
                label="First Name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
              />

              <FormField
                label="Last Name"
                type="text"
                value={formData.surname}
                onChange={(e) => handleChange('surname', e.target.value)}
              />

              <FormField
                label="Email"
                type="email"
                value={formData.emailAddress}
                onChange={(e) => handleChange('emailAddress', e.target.value)}
              />

              <FormField
                label="Mobile Number"
                type="tel"
                value={formData.mobileNumber}
                onChange={(e) => handleChange('mobileNumber', e.target.value)}
              />

              <FormField
                label="Telephone Number"
                type="tel"
                value={formData.telephoneNumber}
                onChange={(e) => handleChange('telephoneNumber', e.target.value)}
              />
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Additional Information</h3>
              
              <FormField
                label="Company Registered Name"
                type="text"
                value={formData.companyRegisteredName}
                onChange={(e) => handleChange('companyRegisteredName', e.target.value)}
              />

              <FormField
                label="Address"
                type="text"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
              />

              <FormField
                label="Industry"
                type="text"
                value={formData.industry}
                onChange={(e) => handleChange('industry', e.target.value)}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lead Status</label>
                <select
                  value={formData.leadStatus}
                  onChange={(e) => handleChange('leadStatus', e.target.value)}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="proposal">Proposal</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="closed_won">Closed Won</option>
                  <option value="closed_lost">Closed Lost</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lead Source</label>
                <select
                  value={formData.leadSource}
                  onChange={(e) => handleChange('leadSource', e.target.value)}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="manual">Manual</option>
                  <option value="csv_import">CSV Import</option>
                  <option value="meta_business">Meta Business</option>
                  <option value="eskils">Eskils</option>
                  <option value="other">Other</option>
                </select>
              </div>
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

// Helper Components
function DetailRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between">
      <span className="font-medium text-gray-700">{label}:</span>
      <span className="text-gray-900">{value || 'N/A'}</span>
    </div>
  );
}

function FormField({ label, type, value, onChange }: {
  label: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}

// Keep the existing AddLeadModal and NotesModal components...
// (They remain the same as in the previous version)

// Add Lead Modal Component
function AddLeadModal({ onSave, onClose, isLoading }: { 
  onSave: (leadData: any) => void; 
  onClose: () => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    companyTradingName: '',
    name: '',
    surname: '',
    emailAddress: '',
    mobileNumber: '',
    telephoneNumber: '',
    leadSource: 'manual'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Add New Lead</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Company Trading Name</label>
              <input
                type="text"
                value={formData.companyTradingName}
                onChange={(e) => handleChange('companyTradingName', e.target.value)}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Lead Source</label>
              <select
                value={formData.leadSource}
                onChange={(e) => handleChange('leadSource', e.target.value)}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="manual">Manual</option>
                <option value="csv_import">CSV Import</option>
                <option value="meta_business">Meta Business</option>
                <option value="eskils">Eskils</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">First Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Last Name</label>
              <input
                type="text"
                value={formData.surname}
                onChange={(e) => handleChange('surname', e.target.value)}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={formData.emailAddress}
                onChange={(e) => handleChange('emailAddress', e.target.value)}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
              <input
                type="tel"
                value={formData.mobileNumber}
                onChange={(e) => handleChange('mobileNumber', e.target.value)}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Telephone Number</label>
              <input
                type="tel"
                value={formData.telephoneNumber}
                onChange={(e) => handleChange('telephoneNumber', e.target.value)}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
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
              {isLoading ? 'Creating...' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Notes Modal Component
function NotesModal({ lead, onSave, onClose, note, setNote, isLoading }: { 
  lead: Lead;
  onSave: () => void;
  onClose: () => void;
  note: string;
  setNote: (note: string) => void;
  isLoading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          Add Note for {lead.companyTradingName || `${lead.name} ${lead.surname}`}
        </h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Note
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Enter your note here..."
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={isLoading || !note.trim()}
          >
            {isLoading ? 'Adding...' : 'Add Note'}
          </button>
        </div>
      </div>
    </div>
  );
}