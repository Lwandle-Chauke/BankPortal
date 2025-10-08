// auth.js

const express = require('express');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const router = express.Router();

/* ==========================
   Validation Patterns
   ========================== */
const patterns = {
  fullName: /^[a-zA-Z\s]{2,50}$/,
  idNumber: /^\d{13}$/,
  username: /^[a-zA-Z0-9_]{3,20}$/,
  accountNumber: /^\d{10,12}$/,
  password: /^.{4,}$/  // Minimum 4 characters for testing
};

/* ==========================
   Helper Functions
   ========================== */

const validateInput = (field, value, pattern) => {
  if (!value || !pattern.test(value)) {
    return false;
  }
  return true;
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, '');
};

// Generate JWT Token - USING YOUR SECRET
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      username: user.username,
      type: 'customer'
    },
    process.env.JWT_SECRET, // Using your secure secret from .env
    { expiresIn: '7d' }
  );
};

/* ==========================
   Debug Helper
   ========================== */
const debugLog = (message, data = null) => {
  console.log(`[AUTH DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

/* ==========================
   Signup Route
   ========================== */
router.post('/signup', async (req, res) => {
  try {
    debugLog('Signup request received', req.body);

    // Sanitize inputs
    const fullName = sanitizeInput(req.body.fullName);
    const idNumber = sanitizeInput(req.body.idNumber);
    const username = sanitizeInput(req.body.username);
    const accountNumber = sanitizeInput(req.body.accountNumber);
    const password = req.body.password;

    debugLog('Sanitized inputs', { fullName, idNumber, username, accountNumber });

    // Validate inputs
    const validationErrors = [];
    if (!validateInput('fullName', fullName, patterns.fullName)) {
      validationErrors.push('Full name must be 2-50 characters, letters and spaces only');
    }
    if (!validateInput('idNumber', idNumber, patterns.idNumber)) {
      validationErrors.push('ID number must be exactly 13 digits');
    }
    if (!validateInput('username', username, patterns.username)) {
      validationErrors.push('Username must be 3-20 characters, alphanumeric and underscore only');
    }
    if (!validateInput('accountNumber', accountNumber, patterns.accountNumber)) {
      validationErrors.push('Account number must be 10-12 digits');
    }
    if (!validateInput('password', password, patterns.password)) {
      validationErrors.push('Password must be at least 4 characters long');
    }

    if (validationErrors.length > 0) {
      debugLog('Validation errors', validationErrors);
      return res.status(400).json({
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { username: username.toLowerCase() },
        { idNumber: idNumber },
        { accountNumber: accountNumber }
      ]
    });

    if (existingUser) {
      debugLog('User already exists', {
        existingUsername: existingUser.username,
        existingIdNumber: existingUser.idNumber,
        existingAccountNumber: existingUser.accountNumber
      });
      return res.status(400).json({
        message: 'User with this username, ID number, or account number already exists'
      });
    }

    // Create new user
    const user = new User({
      fullName,
      idNumber,
      username: username.toLowerCase(),
      accountNumber,
      password
    });

    debugLog('Creating new user', { 
      fullName, 
      idNumber, 
      username: username.toLowerCase(), 
      accountNumber 
    });

    await user.save();
    debugLog('User saved successfully');

    // Generate JWT token
    const token = generateToken(user);
    debugLog('JWT token generated');

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        accountNumber: user.accountNumber
      },
      token: token
    });

  } catch (error) {
    debugLog('Signup error', error.message);
    res.status(500).json({
      message: 'Error creating user',
      error: error.message
    });
  }
});

/* ==========================
   Login Route
   ========================== */
router.post('/login', async (req, res) => {
  try {
    debugLog('Login request received', req.body);

    const { username, accountNumber, password } = req.body;

    debugLog('Processing login for', { username, accountNumber });

    // Validate that we have required fields
    if (!password) {
      debugLog('Missing password');
      return res.status(400).json({
        message: 'Password is required'
      });
    }

    if (!username && !accountNumber) {
      debugLog('Missing both username and account number');
      return res.status(400).json({
        message: 'Username or account number is required'
      });
    }

    // Build query
    const query = {};
    if (username) {
      if (!patterns.username.test(username)) {
        debugLog('Invalid username format', username);
        return res.status(400).json({
          message: 'Invalid username format'
        });
      }
      query.username = username.toLowerCase();
    }
    
    if (accountNumber) {
      if (!patterns.accountNumber.test(accountNumber)) {
        debugLog('Invalid account number format', accountNumber);
        return res.status(400).json({
          message: 'Invalid account number format'
        });
      }
      query.accountNumber = accountNumber;
    }

    debugLog('Searching user with query', query);

    // Find user
    const user = await User.findOne(query);
    
    if (!user) {
      debugLog('User not found with query', query);
      return res.status(400).json({
        message: 'Invalid credentials - user not found'
      });
    }

    debugLog('User found', { 
      id: user._id, 
      username: user.username, 
      accountNumber: user.accountNumber 
    });

    // Check password
    debugLog('Checking password...');
    const isMatch = await user.matchPassword(password);
    
    if (!isMatch) {
      debugLog('Password does not match');
      return res.status(400).json({
        message: 'Invalid credentials - wrong password'
      });
    }

    debugLog('Password matched successfully');

    // Generate JWT token
    const token = generateToken(user);
    debugLog('JWT token generated for login');

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        accountNumber: user.accountNumber
      },
      token: token
    });

  } catch (error) {
    debugLog('Login error', error.message);
    debugLog('Full error stack', error.stack);
    res.status(500).json({
      message: 'Error during login',
      error: error.message
    });
  }
});

/* ==========================
   Test Route
   ========================== */
router.get('/test', (req, res) => {
  debugLog('Test route called');
  res.json({ 
    message: 'Auth API is working!',
    timestamp: new Date().toISOString(),
    jwt_secret: process.env.JWT_SECRET ? 'Set' : 'Not set'
  });
});

/* ==========================
   Check User Route
   ========================== */
router.post('/check-user', async (req, res) => {
  try {
    const { username, accountNumber } = req.body;
    const query = {};
    
    if (username) query.username = username.toLowerCase();
    if (accountNumber) query.accountNumber = accountNumber;

    debugLog('Checking user existence with query', query);
    
    const user = await User.findOne(query).select('-password');
    
    if (user) {
      res.json({ 
        exists: true, 
        user: {
          id: user._id,
          fullName: user.fullName,
          username: user.username,
          accountNumber: user.accountNumber
        }
      });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    debugLog('Check user error', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;