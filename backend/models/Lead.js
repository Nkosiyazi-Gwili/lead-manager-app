const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  // Basic lead information
  leadSource: {
    type: String,
    enum: ['manual', 'csv_import', 'meta_business', 'eskils', 'other'],
    required: true
  },
  leadStatus: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'],
    default: 'new'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Company information
  companyRegisteredName: {
    type: String,
    maxlength: 255
  },
  companyTradingName: {
    type: String,
    maxlength: 255
  },
  address: String,
  website: String,
  industry: {
    type: String,
    maxlength: 100
  },
  numberOfEmployees: Number,
  bbbeeLevel: {
    type: String,
    maxlength: 10
  },
  numberOfBranches: Number,
  annualTurnover: {
    type: String,
    maxlength: 100
  },
  tradingHours: {
    type: String,
    maxlength: 100
  },
  
  // Contact person information
  name: {
    type: String,
    maxlength: 100
  },
  surname: {
    type: String,
    maxlength: 100
  },
  occupation: {
    type: String,
    maxlength: 100
  },
  telephoneNumber: {
    type: String,
    maxlength: 20
  },
  mobileNumber: {
    type: String,
    maxlength: 20
  },
  whatsappNumber: {
    type: String,
    maxlength: 20
  },
  emailAddress: String,
  
  // Director information
  directorsName: {
    type: String,
    maxlength: 100
  },
  directorsSurname: {
    type: String,
    maxlength: 100
  },
  socialMediaHandles: String,
  
  // Eskils specific fields
  idNumber: String,
  dateOfBirth: Date,
  disability: String,
  gender: String,
  race: String,
  postalCode: String,
  course: String,
  level: String,
  studyMode: {
    type: String,
    enum: ['f2f', 'distance', '']
  },
  
  // Meta Business specific fields
  metaAdId: String,
  metaFormId: String,
  metaCampaignId: String,
  metaData: Object,
  
  // Tracking
  notes: [{
    content: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Lead', leadSchema);