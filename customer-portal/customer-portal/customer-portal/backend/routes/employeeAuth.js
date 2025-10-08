const express = require('express');
const Employee = require('../models/Employee');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Employee login
router.post('/login', async (req, res) => {
  try {
    console.log('Employee login attempt:', req.body);
    
    const { employeeId, password } = req.body;

    if (!employeeId || !password) {
      return res.status(400).json({
        message: 'Employee ID and password are required'
      });
    }

    // Find employee by employeeId
    const employee = await Employee.findOne({ employeeId });
    console.log('Employee found:', employee ? 'Yes' : 'No');

    if (!employee) {
      return res.status(400).json({
        message: 'Invalid employee credentials'
      });
    }

    // Check password
    const isMatch = await employee.matchPassword(password);
    console.log('Password match:', isMatch);

    if (!isMatch) {
      return res.status(400).json({
        message: 'Invalid employee credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        employeeId: employee.employeeId,
        role: employee.role,
        type: 'employee'
      },
      process.env.JWT_SECRET || 'fallback_secret', // Add fallback
      { expiresIn: '8h' }
    );

    res.json({
      message: 'Employee login successful',
      employee: {
        id: employee._id,
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        role: employee.role,
        department: employee.department
      },
      token: token
    });

  } catch (error) {
    console.error('Employee login error:', error);
    res.status(500).json({
      message: 'Error during employee login',
      error: error.message
    });
  }
});

module.exports = router;