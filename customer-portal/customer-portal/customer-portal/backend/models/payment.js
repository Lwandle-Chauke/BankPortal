const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  payeeAccountNumber: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  currency: {
    type: String,
    required: true,
    enum: ['ZAR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'CNY']
  },
  provider: {
    type: String,
    required: true,
    enum: ['SWIFT', 'Local Bank Transfer', 'PayPal', 'Wire Transfer']
  },
  swiftCode: {
    type: String,
    required: function() {
      return this.provider === 'SWIFT';
    }
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  transactionReference: {
    type: String,
    unique: true,
   
  }
}, {
  timestamps: true
});

// Generate transaction reference
PaymentSchema.pre('validate', function(next) {
  if (!this.transactionReference) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    this.transactionReference = `TXN${timestamp}${random}`;
  }
  next();
});

module.exports = mongoose.model('Payment', PaymentSchema);