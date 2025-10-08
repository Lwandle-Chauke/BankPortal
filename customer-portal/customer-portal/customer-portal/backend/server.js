const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Verify environment variables are loaded
console.log('Environment check:');
console.log('- MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
console.log('- JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Not set');
console.log('- PORT:', process.env.PORT);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/employee/auth', require('./routes/employeeAuth'));
app.use('/api/payments', require('./routes/payments'));

// MongoDB Connection with enhanced error handling
const connectDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB...');
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Add connection options for better stability
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('MongoDB connected successfully');
    console.log('Database:', conn.connection.db.databaseName);
    console.log('Host:', conn.connection.host);
    
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    
    if (error.name === 'MongoServerError') {
      console.log('Authentication failed. Please check:');
      console.log('   - MongoDB Atlas username and password');
      console.log('   - Database user permissions');
      console.log('   - IP whitelist in MongoDB Atlas');
    }
    
    console.log('Try these solutions:');
    console.log('   1. Reset your MongoDB Atlas password');
    console.log('   2. Check if your IP is whitelisted in MongoDB Atlas');
    console.log('   3. Use local MongoDB: mongodb://localhost:27017/customerportal');
    
    process.exit(1);
  }
};

// Initialize database connection
connectDB();

// Simple test route (works even without DB connection)
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API server is running!',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Health check route
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: 'OK', 
    database: dbStatus,
    server_time: new Date().toISOString(),
    node_env: process.env.NODE_ENV || 'development'
  });
});

// Database connection events
mongoose.connection.on('connected', () => {
  console.log('📚 Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
  console.log('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log(' Mongoose disconnected');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/api/health`);
  console.log(` Test route: http://localhost:${PORT}/api/test`);
});