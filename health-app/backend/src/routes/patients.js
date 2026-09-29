import express from 'express';
import { query } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all patients (for insurance provider use)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT p.id, p.username, p.first_name, p.last_name, p.date_of_birth, 
              p.phone, p.email,
              COUNT(DISTINCT mr.id) as medical_records_count
       FROM patients p
       LEFT JOIN medical_records mr ON mr.patient_id = p.id
       GROUP BY p.id, p.username, p.first_name, p.last_name, p.date_of_birth, p.phone, p.email
       ORDER BY p.last_name ASC, p.first_name ASC`
    );

    res.json({ patients: result.rows });
  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

// Get patient by ID with medical records
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const patientResult = await query(
      `SELECT id, username, first_name, last_name, date_of_birth, 
              phone, email, address, emergency_contact, emergency_phone, created_at
       FROM patients
       WHERE id = $1`,
      [req.params.id]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const medicalRecordsResult = await query(
      `SELECT id, record_number, record_type, blood_type, allergies,
              chronic_conditions, current_medications, status, created_at
       FROM medical_records
       WHERE patient_id = $1
       ORDER BY created_at DESC`,
      [req.params.id]
    );

    res.json({
      patient: patientResult.rows[0],
      medical_records: medicalRecordsResult.rows
    });
  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

// Get patient's medical records
router.get('/:id/medical-records', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, record_number, record_type, blood_type, allergies,
              chronic_conditions, current_medications, status, created_at
       FROM medical_records
       WHERE patient_id = $1
       ORDER BY created_at DESC`,
      [req.params.id]
    );

    res.json({ medical_records: result.rows });
  } catch (error) {
    console.error('Get patient medical records error:', error);
    res.status(500).json({ error: 'Failed to fetch medical records' });
  }
});

export default router;

// Made with Bob