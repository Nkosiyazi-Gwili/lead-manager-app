import { NextRequest, NextResponse } from 'next/server';

// Mock data for demonstration - replace with your actual database logic
const mockLeads = [
  {
    _id: '1',
    companyTradingName: 'ABC Company',
    companyRegisteredName: 'ABC Company Pty Ltd',
    address: '123 Main St, Johannesburg',
    name: 'John',
    surname: 'Doe',
    occupation: 'Manager',
    website: 'https://abccompany.com',
    telephoneNumber: '+27111234567',
    mobileNumber: '+27821234567',
    whatsappNumber: '+27821234567',
    industry: 'Technology',
    numberOfEmployees: 50,
    bbbeeLevel: 'Level 4',
    numberOfBranches: 3,
    emailAddress: 'john@abccompany.com',
    annualTurnover: 'R50M',
    tradingHours: '9:00-17:00',
    directorsName: 'John',
    directorsSurname: 'Doe',
    socialMediaHandles: '@abccompany',
    leadStatus: 'new',
    leadSource: 'manual',
    assignedTo: null,
    notes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Filter leads based on query parameters
    let filteredLeads = mockLeads;

    if (status) {
      filteredLeads = filteredLeads.filter(lead => lead.leadStatus === status);
    }

    if (source) {
      filteredLeads = filteredLeads.filter(lead => lead.leadSource === source);
    }

    // Pagination logic
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLeads = filteredLeads.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      data: paginatedLeads,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(filteredLeads.length / limit),
        totalLeads: filteredLeads.length,
        hasNext: endIndex < filteredLeads.length,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const newLead = {
      _id: Date.now().toString(),
      ...body,
      leadStatus: 'new',
      notes: [],
      assignedTo: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // In a real application, save to database here
    // await db.leads.create(newLead);

    return NextResponse.json({
      success: true,
      data: newLead,
      message: 'Lead created successfully'
    });
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create lead' },
      { status: 500 }
    );
  }
}