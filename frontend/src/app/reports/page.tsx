'use client';

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

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

interface DashboardStats {
  totalLeads: number;
  statusCounts: {
    new: number;
    contacted: number;
    qualified: number;
    proposal: number;
    negotiation: number;
    closed_won: number;
    closed_lost: number;
  };
  sourceCounts: {
    manual: number;
    csv_import: number;
    meta_business: number;
    eskils: number;
    other: number;
  };
  myLeads: number;
  conversionRate: number;
  recentLeads?: Array<{
    _id: string;
    name: string;
    surname: string;
    companyTradingName: string;
    leadStatus: string;
    leadSource: string;
    updatedAt: string;
  }>;
}

export default function Reports() {
  const { data: stats, isLoading, error } = useQuery<{ data: DashboardStats }>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await axios.get(`${getApiBaseUrl()}/api/reports/dashboard`, {
        headers: getAuthHeaders()
      });
      return response.data;
    }
  });

  if (isLoading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center h-64">
            <div className="text-red-600 text-center">
              <p className="text-lg font-semibold">Error loading reports</p>
              <p className="text-sm">Please try again later</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  // Prepare data for charts
  const statusData = stats?.data?.statusCounts ? Object.entries(stats.data.statusCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
    value,
    count: value
  })) : [];

  const sourceData = stats?.data?.sourceCounts ? Object.entries(stats.data.sourceCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
    value,
    count: value
  })) : [];

  // Performance metrics data
  const performanceData = [
    { name: 'New', leads: stats?.data?.statusCounts?.new || 0 },
    { name: 'Contacted', leads: stats?.data?.statusCounts?.contacted || 0 },
    { name: 'Qualified', leads: stats?.data?.statusCounts?.qualified || 0 },
    { name: 'Proposal', leads: stats?.data?.statusCounts?.proposal || 0 },
    { name: 'Won', leads: stats?.data?.statusCounts?.closed_won || 0 },
    { name: 'Lost', leads: stats?.data?.statusCounts?.closed_lost || 0 },
  ];

  return (
    <ProtectedRoute>
      <Layout>
        <div className="container mx-auto px-4 py-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
            <p className="text-gray-600 mt-2">Comprehensive overview of your lead management performance</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-blue-500">
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-600">Total Leads</h3>
                  <p className="text-3xl font-bold text-gray-900">{stats?.data?.totalLeads || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-green-500">
              <div className="flex items-center">
                <div className="bg-green-100 p-3 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-600">Conversion Rate</h3>
                  <p className="text-3xl font-bold text-gray-900">{stats?.data?.conversionRate || 0}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-purple-500">
              <div className="flex items-center">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-600">My Leads</h3>
                  <p className="text-3xl font-bold text-gray-900">{stats?.data?.myLeads || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-yellow-500">
              <div className="flex items-center">
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-600">Won Leads</h3>
                  <p className="text-3xl font-bold text-gray-900">{stats?.data?.statusCounts?.closed_won || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Lead Status Chart */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Leads by Status</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#8884d8" name="Number of Leads" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Lead Source Chart */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Leads by Source</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 gap-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Lead Conversion Funnel</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="leads" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    name="Number of Leads"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h4 className="text-lg font-semibold mb-3 text-gray-800">Status Distribution</h4>
              <div className="space-y-2">
                {statusData.map((status, index) => (
                  <div key={status.name} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{status.name}</span>
                    <span className="font-semibold">{status.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h4 className="text-lg font-semibold mb-3 text-gray-800">Source Distribution</h4>
              <div className="space-y-2">
                {sourceData.map((source, index) => (
                  <div key={source.name} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{source.name}</span>
                    <span className="font-semibold">{source.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h4 className="text-lg font-semibold mb-3 text-gray-800">Key Metrics</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                  <span className="text-sm text-blue-700">Total Pipeline Value</span>
                  <span className="font-semibold text-blue-700">-</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                  <span className="text-sm text-green-700">Avg. Response Time</span>
                  <span className="font-semibold text-green-700">-</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
                  <span className="text-sm text-purple-700">Lead Response Rate</span>
                  <span className="font-semibold text-purple-700">-</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}