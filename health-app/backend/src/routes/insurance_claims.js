import express from 'express';
import { query } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateInsuranceClaim } from '../middleware/validation.js';

const router = express.Router();

// Calculate coverage amount based on claim amount and coverage percentage
function calculateCoverageAmount(claimAmount, coveragePercentage, copay, deductible) {
  const coveredAmount = (claimAmount * coveragePercentage) / 100;
  const patientResponsibility = copay + deductible;
  const insurancePays = Math.max(0, coveredAmount - patientResponsibility);
  const patientPays = claimAmount - insurancePays;
  
  return {
    insurance_pays: Math.round(insurancePays * 100) / 100,
    patient_pays: Math.round(patientPays * 100) / 100
  };
}

// Get coverage percentage based on claim type
function getCoveragePercentage(claimType) {
  // Simplified coverage logic for demo
  const coverageMap = {
    'Preventive Care': 100,
    'Primary Care Visit': 80,
    'Specialist Visit': 70,
    'Emergency Care': 80,
    'Hospital Stay': 70,
    'Surgery': 80,
    'Diagnostic Tests': 85,
    'Prescription Drugs': 75,
    'Mental Health': 80,
    'Physical Therapy': 70
  };
  
  return coverageMap[claimType] || 70;
}

// Get all insurance claims (for insurance provider dashboard)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT ic.id, ic.claim_amount, ic.coverage_percentage, ic.copay_amount,
              ic.deductible_amount, ic.status, ic.claim_type, ic.service_date,
              ic.provider_name, ic.diagnosis_code, ic.procedure_code,
              ic.submitted_at, ic.processed_at,
              p.first_name, p.last_name, p.date_of_birth
       FROM insurance_claims ic
       JOIN patients p ON ic.patient_id = p.id
       ORDER BY ic.submitted_at DESC`
    );

    res.json({ insurance_claims: result.rows });
  } catch (error) {
    console.error('Get insurance claims error:', error);
    res.status(500).json({ error: 'Failed to fetch insurance claims' });
  }
});

// Get available claim types (must be before /:id route)
router.get('/types/list', authenticateToken, async (req, res) => {
  try {
    const claimTypes = [
      { type: 'Preventive Care', coverage: 100 },
      { type: 'Primary Care Visit', coverage: 80 },
      { type: 'Specialist Visit', coverage: 70 },
      { type: 'Emergency Care', coverage: 80 },
      { type: 'Hospital Stay', coverage: 70 },
      { type: 'Surgery', coverage: 80 },
      { type: 'Diagnostic Tests', coverage: 85 },
      { type: 'Prescription Drugs', coverage: 75 },
      { type: 'Mental Health', coverage: 80 },
      { type: 'Physical Therapy', coverage: 70 }
    ];

    res.json({ claim_types: claimTypes });
  } catch (error) {
    console.error('Get claim types error:', error);
    res.status(500).json({ error: 'Failed to fetch claim types' });
  }
});

// Get specific insurance claim details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, claim_amount, coverage_percentage, copay_amount, deductible_amount,
              status, claim_type, service_date, provider_name, diagnosis_code,
              procedure_code, notes, submitted_at, processed_at, processed_by
       FROM insurance_claims
       WHERE id = $1 AND patient_id = $2`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Insurance claim not found' });
    }

    const claim = result.rows[0];
    
    // Calculate coverage breakdown
    const coverage = calculateCoverageAmount(
      parseFloat(claim.claim_amount),
      parseFloat(claim.coverage_percentage),
      parseFloat(claim.copay_amount),
      parseFloat(claim.deductible_amount)
    );

    res.json({ 
      insurance_claim: {
        ...claim,
        coverage_breakdown: coverage
      }
    });
  } catch (error) {
    console.error('Get insurance claim error:', error);
    res.status(500).json({ error: 'Failed to fetch insurance claim' });
  }
});

// Submit a new insurance claim
router.post('/submit', authenticateToken, validateInsuranceClaim, async (req, res) => {
  try {
    const {
      patient_id,
      claim_amount,
      claim_type,
      service_date,
      provider_id,
      diagnosis_code,
      procedure_code,
      notes,
      copay_amount,
      deductible_amount
    } = req.body;

    if (!patient_id || !claim_amount || !claim_type || !service_date || !provider_id) {
      return res.status(400).json({
        error: 'Patient, claim amount, type, service date, and provider are required'
      });
    }

    // Get coverage percentage based on claim type
    const coveragePercentage = getCoveragePercentage(claim_type);
    
    // Calculate coverage
    const coverage = calculateCoverageAmount(
      parseFloat(claim_amount),
      coveragePercentage,
      parseFloat(copay_amount || 0),
      parseFloat(deductible_amount || 0)
    );

    // Verify provider exists
    const providerCheck = await query(
      'SELECT provider_name FROM healthcare_providers WHERE id = $1 AND status = $2',
      [provider_id, 'active']
    );

    if (providerCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or inactive provider' });
    }

    const providerName = providerCheck.rows[0].provider_name;

    // Create insurance claim
    const result = await query(
      `INSERT INTO insurance_claims (patient_id, claim_amount, coverage_percentage,
                                     copay_amount, deductible_amount, claim_type,
                                     service_date, provider_name, diagnosis_code,
                                     procedure_code, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
       RETURNING id, claim_amount, coverage_percentage, copay_amount, deductible_amount,
                 status, claim_type, service_date, provider_name, submitted_at`,
      [
        patient_id,
        claim_amount,
        coveragePercentage,
        copay_amount || 0,
        deductible_amount || 0,
        claim_type,
        service_date,
        providerName,
        diagnosis_code || null,
        procedure_code || null,
        notes || null
      ]
    );

    res.status(201).json({
      message: 'Insurance claim submitted successfully',
      insurance_claim: {
        ...result.rows[0],
        coverage_breakdown: coverage
      }
    });
  } catch (error) {
    console.error('Insurance claim submission error:', error);
    res.status(500).json({ error: 'Failed to submit insurance claim' });
  }
});

// Approve insurance claim (admin/processor function - simplified for demo)
router.post('/:id/approve', authenticateToken, async (req, res) => {
  try {
    const claimId = req.params.id;

    // In a real app, this would check admin/processor permissions
    // For demo, insurance providers can approve any pending claim
    const result = await query(
      `UPDATE insurance_claims
       SET status = 'approved',
           processed_at = CURRENT_TIMESTAMP,
           processed_by = $1
       WHERE id = $2 AND status = 'pending'
       RETURNING id, claim_amount, coverage_percentage, status, processed_at`,
      [req.user.username, claimId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Insurance claim not found or already processed' });
    }

    res.json({
      message: 'Insurance claim approved successfully',
      insurance_claim: result.rows[0]
    });
  } catch (error) {
    console.error('Insurance claim approval error:', error);
    res.status(500).json({ error: 'Failed to approve insurance claim' });
  }
});

// Reject insurance claim (admin/processor function - simplified for demo)
router.post('/:id/reject', authenticateToken, async (req, res) => {
  try {
    const claimId = req.params.id;
    const { reason } = req.body;

    const result = await query(
      `UPDATE insurance_claims
       SET status = 'rejected',
           processed_at = CURRENT_TIMESTAMP,
           processed_by = $1,
           notes = COALESCE(notes || E'\n\n', '') || 'Rejection reason: ' || $2
       WHERE id = $3 AND status = 'pending'
       RETURNING id, claim_amount, status, notes`,
      [req.user.username, reason || 'Not specified', claimId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Insurance claim not found or already processed' });
    }

    res.json({
      message: 'Insurance claim rejected',
      insurance_claim: result.rows[0]
    });
  } catch (error) {
    console.error('Insurance claim rejection error:', error);
    res.status(500).json({ error: 'Failed to reject insurance claim' });
  }
});

// Mark claim as paid
router.post('/:id/mark-paid', authenticateToken, async (req, res) => {
  try {
    const claimId = req.params.id;

    const result = await query(
      `UPDATE insurance_claims
       SET status = 'paid'
       WHERE id = $1 AND status = 'approved'
       RETURNING id, claim_amount, status`,
      [claimId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Insurance claim not found or not in approved status'
      });
    }

    res.json({
      message: 'Insurance claim marked as paid',
      insurance_claim: result.rows[0]
    });
  } catch (error) {
    console.error('Mark claim paid error:', error);
    res.status(500).json({ error: 'Failed to mark claim as paid' });
  }
});

// Calculate coverage estimate (before submitting)
router.post('/estimate', authenticateToken, async (req, res) => {
  try {
    const { claim_amount, claim_type, copay_amount, deductible_amount } = req.body;

    if (!claim_amount || !claim_type) {
      return res.status(400).json({ error: 'Claim amount and type are required' });
    }

    const coveragePercentage = getCoveragePercentage(claim_type);
    const coverage = calculateCoverageAmount(
      parseFloat(claim_amount),
      coveragePercentage,
      parseFloat(copay_amount || 0),
      parseFloat(deductible_amount || 0)
    );

    res.json({
      claim_amount: parseFloat(claim_amount),
      claim_type,
      coverage_percentage: coveragePercentage,
      copay_amount: parseFloat(copay_amount || 0),
      deductible_amount: parseFloat(deductible_amount || 0),
      estimated_coverage: coverage
    });
  } catch (error) {
    console.error('Coverage estimation error:', error);
    res.status(500).json({ error: 'Failed to estimate coverage' });
  }
});

export default router;

// Made with Bob