// customer-portal/backend/seedEmployees.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Employee = require('./models/Employee');

dotenv.config();

const employees = [
  {
    employeeId: 'EMP001',
    fullName: 'John Smith',
    email: 'john.smith@bank.com',
    password: 'password123',
    role: 'teller',
    department: 'customer service'
  },
  {
    employeeId: 'EMP002',
    fullName: 'Sarah Johnson',
    email: 'sarah.johnson@bank.com',
    password: 'password123',
    role: 'manager',
    department: 'operations'
  },
  {
    employeeId: 'EMP003',
    fullName: 'Mike Davis',
    email: 'mike.davis@bank.com',
    password: 'password123',
    role: 'teller',
    department: 'customer service'
  }
];

const seedEmployees = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear old data
    await Employee.deleteMany({});
    console.log('Cleared existing employees');

    // Insert employees (passwords will be hashed via pre-save hook)
    for (const emp of employees) {
      const newEmp = new Employee(emp);
      await newEmp.save();
    }

    console.log('🌱 Employees seeded successfully\n');

    const created = await Employee.find({});
    created.forEach(emp =>
      console.log(`- ${emp.employeeId}: ${emp.fullName} (${emp.role})`)
    );

    console.log('\n Employee accounts created!');
    console.log('Login with:');
    console.log('EMP001 / password123');
    console.log('EMP002 / password123');
    console.log('EMP003 / password123');

    process.exit();
  } catch (err) {
    console.error('Error seeding employees:', err);
    process.exit(1);
  }
};

seedEmployees();
