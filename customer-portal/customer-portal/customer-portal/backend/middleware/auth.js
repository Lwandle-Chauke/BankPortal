const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Employee = require('../models/Employee');

const JWT_SECRET = process.env.JWT_SECRET || 'apds7311_secure_jwt_key_$%^&*@!12345_CUSTOMER_PORTAL_2025';

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        message: 'No token provided, access denied' 
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    let user;
    
    // Handle different token formats
    if (decoded.userId) {
      // Customer token from auth.js (contains userId)
      user = await User.findById(decoded.userId).select('-password');
    } else if (decoded.employeeId) {
      // Employee token from employeeAuth.js (contains employeeId)
      user = await Employee.findOne({ employeeId: decoded.employeeId }).select('-password');
    } else if (decoded.id) {
      // Standard token format (contains id)
      user = await User.findById(decoded.id).select('-password');
    } else {
      return res.status(401).json({ 
        message: 'Invalid token format' 
      });
    }
    
    if (!user) {
      return res.status(401).json({ 
        message: 'Token is not valid, user not found' 
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ 
      message: 'Token is not valid' 
    });
  }
};

// Employee only middleware
const requireEmployee = (req, res, next) => {
  // Check if user has employeeId (from Employee model) or role is employee
  if (!req.user.employeeId && req.user.role !== 'employee') {
    return res.status(403).json({ 
      message: 'Access denied. Employee role required.' 
    });
  }
  next();
};

// Customer only middleware
const requireCustomer = (req, res, next) => {
  // Check if user doesn't have employeeId and is not an employee
  if (req.user.employeeId || req.user.role === 'employee') {
    return res.status(403).json({ 
      message: 'Access denied. Customer access only.' 
    });
  }
  next();
};

module.exports = { auth, requireEmployee, requireCustomer };