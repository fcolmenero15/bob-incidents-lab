import express from 'express';
import { query, transaction } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateAppointment, validateMedicalRecord } from '../middleware/validation.js';

const router = express.Router();

// Get all medical records for logged-in patient
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, record_number, record_type, blood_type, allergies, 
              chronic_conditions, current_medications, status, created_at
       FROM medical_records
       WHERE patient_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({ medical_records: result.rows });
  } catch (error) {
    console.error('Get medical records error:', error);
    res.status(500).json({ error: 'Failed to fetch medical records' });
  }
});

// Get specific medical record details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, record_number, record_type, blood_type, allergies,
              chronic_conditions, current_medications, status, created_at
       FROM medical_records
       WHERE id = $1 AND patient_id = $2`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Medical record not found' });
    }

    res.json({ medical_record: result.rows[0] });
  } catch (error) {
    console.error('Get medical record error:', error);
    res.status(500).json({ error: 'Failed to fetch medical record' });
  }
});

// Schedule appointment
router.post('/:id/schedule-appointment', authenticateToken, validateAppointment, async (req, res) => {
  try {
    const { appointment_type, provider_name, appointment_date, duration_minutes, notes } = req.body;
    const recordId = req.params.id;

    if (!appointment_type || !provider_name || !appointment_date) {
      return res.status(400).json({ 
        error: 'Appointment type, provider name, and date are required' 
      });
    }

    const result = await transaction(async (client) => {
      // Verify medical record ownership
      const recordCheck = await client.query(
        'SELECT id, status FROM medical_records WHERE id = $1 AND patient_id = $2',
        [recordId, req.user.id]
      );

      if (recordCheck.rows.length === 0) {
        throw new Error('Medical record not found');
      }

      const record = recordCheck.rows[0];

      if (record.status !== 'active') {
        throw new Error('Medical record is not active');
      }

      // Create appointment
      const appointmentResult = await client.query(
        `INSERT INTO appointments (medical_record_id, appointment_type, provider_name, 
                                   appointment_date, duration_minutes, notes, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'scheduled')
         RETURNING *`,
        [recordId, appointment_type, provider_name, appointment_date, 
         duration_minutes || 30, notes || '']
      );

      return appointmentResult.rows[0];
    });

    res.json({
      message: 'Appointment scheduled successfully',
      appointment: result
    });
  } catch (error) {
    console.error('Schedule appointment error:', error);
    res.status(500).json({ error: error.message || 'Failed to schedule appointment' });
  }
});

// Update appointment status
router.patch('/:id/appointments/:appointmentId', authenticateToken, async (req, res) => {
  try {
    const { status, diagnosis, treatment_plan, notes } = req.body;
    const recordId = req.params.id;
    const appointmentId = req.params.appointmentId;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['scheduled', 'completed', 'cancelled', 'no-show'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Status must be one of: ${validStatuses.join(', ')}` 
      });
    }

    const result = await transaction(async (client) => {
      // Verify medical record ownership
      const recordCheck = await client.query(
        'SELECT id FROM medical_records WHERE id = $1 AND patient_id = $2',
        [recordId, req.user.id]
      );

      if (recordCheck.rows.length === 0) {
        throw new Error('Medical record not found');
      }

      // Update appointment
      const updateFields = ['status = $1'];
      const values = [status];
      let paramCount = 1;

      if (diagnosis) {
        paramCount++;
        updateFields.push(`diagnosis = $${paramCount}`);
        values.push(diagnosis);
      }
      if (treatment_plan) {
        paramCount++;
        updateFields.push(`treatment_plan = $${paramCount}`);
        values.push(treatment_plan);
      }
      if (notes) {
        paramCount++;
        updateFields.push(`notes = $${paramCount}`);
        values.push(notes);
      }

      values.push(appointmentId, recordId);
      
      const appointmentResult = await client.query(
        `UPDATE appointments 
         SET ${updateFields.join(', ')}
         WHERE id = $${paramCount + 1} AND medical_record_id = $${paramCount + 2}
         RETURNING *`,
        values
      );

      if (appointmentResult.rows.length === 0) {
        throw new Error('Appointment not found');
      }

      return appointmentResult.rows[0];
    });

    res.json({
      message: 'Appointment updated successfully',
      appointment: result
    });
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ error: error.message || 'Failed to update appointment' });
  }
});

// Get appointments for a medical record
router.get('/:id/appointments', authenticateToken, async (req, res) => {
  try {
    const recordId = req.params.id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    // Verify medical record ownership
    const recordCheck = await query(
      'SELECT id FROM medical_records WHERE id = $1 AND patient_id = $2',
      [recordId, req.user.id]
    );

    if (recordCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Medical record not found' });
    }

    // Get appointments
    const result = await query(
      `SELECT id, appointment_type, provider_name, appointment_date, 
              duration_minutes, status, notes, diagnosis, treatment_plan, created_at
       FROM appointments
       WHERE medical_record_id = $1
       ORDER BY appointment_date DESC
       LIMIT $2 OFFSET $3`,
      [recordId, limit, offset]
    );

    // Get total count
    const countResult = await query(
      'SELECT COUNT(*) as total FROM appointments WHERE medical_record_id = $1',
      [recordId]
    );

    res.json({
      appointments: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset
    });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Create new medical record
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { record_type, blood_type, allergies, chronic_conditions, current_medications } = req.body;

    if (!record_type || !['general', 'specialist'].includes(record_type)) {
      return res.status(400).json({ 
        error: 'Valid record type is required (general or specialist)' 
      });
    }

    // Generate medical record number
    const recordNumber = 'MRN' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');

    const result = await query(
      `INSERT INTO medical_records (patient_id, record_number, record_type, blood_type, 
                                    allergies, chronic_conditions, current_medications)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, record_number, record_type, blood_type, allergies, 
                 chronic_conditions, current_medications, status, created_at`,
      [req.user.id, recordNumber, record_type, blood_type || null, 
       allergies || null, chronic_conditions || null, current_medications || null]
    );

    res.status(201).json({
      message: 'Medical record created successfully',
      medical_record: result.rows[0]
    });
  } catch (error) {
    console.error('Create medical record error:', error);
    res.status(500).json({ error: 'Failed to create medical record' });
  }
});

// Update medical record information
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const recordId = req.params.id;
    const { blood_type, allergies, chronic_conditions, current_medications } = req.body;

    const updateFields = [];
    const values = [];
    let paramCount = 0;

    if (blood_type !== undefined) {
      paramCount++;
      updateFields.push(`blood_type = $${paramCount}`);
      values.push(blood_type);
    }
    if (allergies !== undefined) {
      paramCount++;
      updateFields.push(`allergies = $${paramCount}`);
      values.push(allergies);
    }
    if (chronic_conditions !== undefined) {
      paramCount++;
      updateFields.push(`chronic_conditions = $${paramCount}`);
      values.push(chronic_conditions);
    }
    if (current_medications !== undefined) {
      paramCount++;
      updateFields.push(`current_medications = $${paramCount}`);
      values.push(current_medications);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(recordId, req.user.id);

    const result = await query(
      `UPDATE medical_records 
       SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount + 1} AND patient_id = $${paramCount + 2}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Medical record not found' });
    }

    res.json({
      message: 'Medical record updated successfully',
      medical_record: result.rows[0]
    });
  } catch (error) {
    console.error('Update medical record error:', error);
    res.status(500).json({ error: 'Failed to update medical record' });
  }
});

export default router;

// Made with Bob