import express from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db/database.js';
import { generateToken } from '../middleware/auth.js';
import { validateRegistration } from '../middleware/validation.js';

const router = express.Router();

// Register new patient
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const { username, email, password, first_name, last_name, date_of_birth, phone, address, emergency_contact, emergency_phone } = req.body;

    // Check if patient already exists
    const existingPatient = await query(
      'SELECT id FROM patients WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingPatient.rows.length > 0) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create patient
    const result = await query(
      `INSERT INTO patients (username, email, password_hash, first_name, last_name,
                            date_of_birth, phone, address, emergency_contact, emergency_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, username, email, first_name, last_name, date_of_birth, phone, created_at`,
      [username, email, password_hash, first_name, last_name,
       date_of_birth || null, phone || null, address || null,
       emergency_contact || null, emergency_phone || null]
    );

    const patient = result.rows[0];

    // Create default general medical record
    const recordNumber = 'MRN' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
    await query(
      `INSERT INTO medical_records (patient_id, record_number, record_type)
       VALUES ($1, $2, 'general')`,
      [patient.id, recordNumber]
    );

    // Generate token
    const token = generateToken(patient);

    res.status(201).json({
      message: 'Patient registered successfully',
      patient: {
        id: patient.id,
        username: patient.username,
        email: patient.email,
        first_name: patient.first_name,
        last_name: patient.last_name,
        date_of_birth: patient.date_of_birth,
        phone: patient.phone
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register patient' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Get patient
    const result = await query(
      'SELECT * FROM patients WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const patient = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, patient.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(patient);

    res.json({
      message: 'Login successful',
      patient: {
        id: patient.id,
        username: patient.username,
        email: patient.email,
        first_name: patient.first_name,
        last_name: patient.last_name,
        date_of_birth: patient.date_of_birth,
        phone: patient.phone
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

export default router;

// Made with Bob
