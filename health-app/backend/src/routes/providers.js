import express from 'express';
import { query } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all active healthcare providers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { specialty, accepting_patients } = req.query;
    
    let queryText = `
      SELECT id, provider_name, specialty, facility_name, phone, email, 
             accepting_patients, status
      FROM healthcare_providers
      WHERE status = 'active'
    `;
    const params = [];
    let paramCount = 0;

    if (specialty) {
      paramCount++;
      queryText += ` AND specialty = $${paramCount}`;
      params.push(specialty);
    }

    if (accepting_patients !== undefined) {
      paramCount++;
      queryText += ` AND accepting_patients = $${paramCount}`;
      params.push(accepting_patients === 'true');
    }

    queryText += ' ORDER BY provider_name ASC';

    const result = await query(queryText, params);

    res.json({ providers: result.rows });
  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({ error: 'Failed to fetch healthcare providers' });
  }
});

// Get provider by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, provider_name, specialty, facility_name, phone, email,
              address, accepting_patients, status, created_at
       FROM healthcare_providers
       WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    res.json({ provider: result.rows[0] });
  } catch (error) {
    console.error('Get provider error:', error);
    res.status(500).json({ error: 'Failed to fetch provider' });
  }
});

// Get all specialties
router.get('/specialties/list', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT DISTINCT specialty
       FROM healthcare_providers
       WHERE status = 'active'
       ORDER BY specialty ASC`
    );

    res.json({ specialties: result.rows.map(row => row.specialty) });
  } catch (error) {
    console.error('Get specialties error:', error);
    res.status(500).json({ error: 'Failed to fetch specialties' });
  }
});

export default router;

// Made with Bob