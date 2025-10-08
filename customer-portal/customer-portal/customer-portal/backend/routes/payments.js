const express = require('express');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { auth, requireEmployee } = require('../middleware/auth');
const router = express.Router();

// Validation patterns
const paymentPatterns = {
  accountNumber: /^\d{10,12}$/,
  amount: /^\d+(\.\d{1,2})?$/,
  swiftCode: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
  currency: /^[A-Z]{3}$/
};

// Sanitize function
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return String(input || '');
  return input.trim().replace(/[<>]/g, '');
};

// ===== CUSTOMER ROUTES =====

// Create payment route - protected
router.post('/create', auth, async (req, res) => {
  try {
    console.log('1. Received payment request from user:', req.user.id);
    
    // Sanitize inputs
    const payeeAccountNumber = sanitizeInput(req.body.payeeAccountNumber);
    const amount = parseFloat(sanitizeInput(req.body.amount));
    const currency = sanitizeInput(req.body.currency).toUpperCase();
    const provider = sanitizeInput(req.body.provider);
    const swiftCode = req.body.swiftCode ? sanitizeInput(req.body.swiftCode).toUpperCase() : undefined;
    
    // Use authenticated user's ID from token
    const userId = req.user.id;
    
    console.log('2. Using authenticated user ID:', userId);
    
    // Validation
    const validationErrors = [];
    
    if (!paymentPatterns.accountNumber.test(payeeAccountNumber)) {
      validationErrors.push('Invalid payee account number format');
    }
    
    if (!amount || amount <= 0 || amount > 1000000) {
      validationErrors.push('Amount must be between 0.01 and 1,000,000');
    }
    
    if (!paymentPatterns.currency.test(currency)) {
      validationErrors.push('Invalid currency code');
    }
    
    const validProviders = ['SWIFT', 'Local Bank Transfer', 'PayPal', 'Wire Transfer'];
    if (!validProviders.includes(provider)) {
      validationErrors.push('Invalid payment provider');
    }
    
    if (provider === 'SWIFT' && (!swiftCode || !paymentPatterns.swiftCode.test(swiftCode))) {
      validationErrors.push('Valid SWIFT code required for SWIFT payments');
    }
    
    if (validationErrors.length > 0) {
      console.log('3. Validation errors found:', validationErrors);
      return res.status(400).json({
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    console.log('4. Validation passed, creating payment...');
    
    // Create payment
    const payment = new Payment({
      userId,
      payeeAccountNumber,
      amount,
      currency,
      provider,
      swiftCode: provider === 'SWIFT' ? swiftCode : undefined
    });
    
    console.log('5. Payment object created, saving...');
    
    await payment.save();
    
    console.log('6. Payment saved successfully!');
    
    res.status(201).json({
      message: 'Payment initiated successfully',
      payment: {
        id: payment._id,
        transactionReference: payment.transactionReference,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        createdAt: payment.createdAt
      }
    });
    
  } catch (error) {
    console.error('ERROR creating payment:', error);
    res.status(500).json({
      message: 'Error creating payment',
      error: error.message
    });
  }
});

// Get user's payments - protected
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const userId = sanitizeInput(req.params.userId);

    // Ensure user can only access their own payments
    if (req.user.id !== userId && !req.user.employeeId) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    const payments = await Payment.find({ userId })
      .sort({ createdAt: -1 })
      .select('-__v');

    res.json({
      message: 'Payments retrieved successfully',
      payments
    });

  } catch (error) {
    res.status(500).json({
      message: 'Error retrieving payments',
      error: error.message
    });
  }
});

// ===== EMPLOYEE ROUTES =====

// Get all payments (for employees only) - with proper population
router.get('/', auth, requireEmployee, async (req, res) => {
  try {
    console.log('Employee fetching all payments...');
    
    const payments = await Payment.find()
      .populate({
        path: 'userId',
        select: 'fullName accountNumber username idNumber',
        model: 'User'
      })
      .sort({ createdAt: -1 });

    console.log(`Found ${payments.length} payments`);
    
    // Log the first payment to check if population worked
    if (payments.length > 0) {
      console.log('First payment sample:', {
        id: payments[0]._id,
        userId: payments[0].userId,
        hasUserData: !!payments[0].userId
      });
    }

    res.json({ 
      success: true, 
      payments 
    });
  } catch (error) {
    console.error('Error in employee payments route:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching payments',
      error: error.message 
    });
  }
});

// Verify payment (for employees only)
router.post('/verify/:paymentId', auth, requireEmployee, async (req, res) => {
  try {
    const paymentId = sanitizeInput(req.params.paymentId);
    const action = sanitizeInput(req.body.action);

    if (!['complete', 'fail'].includes(action)) {
      return res.status(400).json({ 
        message: 'Invalid action. Must be "complete" or "fail"' 
      });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ 
        message: 'Payment not found' 
      });
    }

    // Only allow verification if payment is pending
    if (payment.status !== 'pending') {
      return res.status(400).json({ 
        message: 'Payment has already been processed' 
      });
    }

    // Update payment status
    payment.status = action === 'complete' ? 'completed' : 'failed';
    await payment.save();

    res.json({
      message: `Payment ${action === 'complete' ? 'completed' : 'failed'} successfully`,
      payment: {
        id: payment._id,
        transactionReference: payment.transactionReference,
        status: payment.status
      }
    });

  } catch (error) {
    res.status(500).json({
      message: 'Error verifying payment',
      error: error.message
    });
  }
});

module.exports = router;