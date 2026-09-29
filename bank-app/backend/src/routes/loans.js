import express from 'express';
import { query } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateLoanRequest } from '../middleware/validation.js';

const router = express.Router();

// Calculate monthly payment for a loan
function calculateMonthlyPayment(principal, annualRate, months) {
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return principal / months;
  
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                  (Math.pow(1 + monthlyRate, months) - 1);
  return Math.round(payment * 100) / 100;
}

// Get interest rate based on loan amount and term
function getInterestRate(amount, termMonths) {
  // Simple interest rate logic for demo
  if (amount < 10000) return 8.5;
  if (amount < 50000) return 7.5;
  if (amount < 100000) return 6.5;
  if (termMonths > 120) return 5.5;
  return 6.0;
}

// Get all loans for logged-in user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, amount, interest_rate, term_months, monthly_payment, 
              status, purpose, requested_at, approved_at
       FROM loans
       WHERE user_id = $1
       ORDER BY requested_at DESC`,
      [req.user.id]
    );

    res.json({ loans: result.rows });
  } catch (error) {
    console.error('Get loans error:', error);
    res.status(500).json({ error: 'Failed to fetch loans' });
  }
});

// Get specific loan details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, amount, interest_rate, term_months, monthly_payment,
              status, purpose, requested_at, approved_at, approved_by
       FROM loans
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    res.json({ loan: result.rows[0] });
  } catch (error) {
    console.error('Get loan error:', error);
    res.status(500).json({ error: 'Failed to fetch loan' });
  }
});

// Request a new loan
router.post('/request', authenticateToken, validateLoanRequest, async (req, res) => {
  try {
    const { amount, term_months, purpose } = req.body;

    // Calculate interest rate and monthly payment
    const interestRate = getInterestRate(parseFloat(amount), parseInt(term_months));
    const monthlyPayment = calculateMonthlyPayment(
      parseFloat(amount),
      interestRate,
      parseInt(term_months)
    );

    // Create loan request
    const result = await query(
      `INSERT INTO loans (user_id, amount, interest_rate, term_months, monthly_payment, purpose, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING id, amount, interest_rate, term_months, monthly_payment, status, purpose, requested_at`,
      [req.user.id, amount, interestRate, term_months, monthlyPayment, purpose]
    );

    res.status(201).json({
      message: 'Loan request submitted successfully',
      loan: result.rows[0]
    });
  } catch (error) {
    console.error('Loan request error:', error);
    res.status(500).json({ error: 'Failed to submit loan request' });
  }
});

// Approve loan (admin function - simplified for demo)
router.post('/:id/approve', authenticateToken, async (req, res) => {
  try {
    const loanId = req.params.id;

    // In a real app, this would check admin permissions
    // For demo, we'll allow any user to approve their own loans
    const result = await query(
      `UPDATE loans
       SET status = 'approved', 
           approved_at = CURRENT_TIMESTAMP,
           approved_by = $1
       WHERE id = $2 AND user_id = $3 AND status = 'pending'
       RETURNING id, amount, interest_rate, term_months, monthly_payment, status, approved_at`,
      [req.user.username, loanId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found or already processed' });
    }

    res.json({
      message: 'Loan approved successfully',
      loan: result.rows[0]
    });
  } catch (error) {
    console.error('Loan approval error:', error);
    res.status(500).json({ error: 'Failed to approve loan' });
  }
});

// Reject loan (admin function - simplified for demo)
router.post('/:id/reject', authenticateToken, async (req, res) => {
  try {
    const loanId = req.params.id;

    const result = await query(
      `UPDATE loans
       SET status = 'rejected',
           approved_by = $1
       WHERE id = $2 AND user_id = $3 AND status = 'pending'
       RETURNING id, amount, status`,
      [req.user.username, loanId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found or already processed' });
    }

    res.json({
      message: 'Loan rejected',
      loan: result.rows[0]
    });
  } catch (error) {
    console.error('Loan rejection error:', error);
    res.status(500).json({ error: 'Failed to reject loan' });
  }
});

// Calculate loan estimate (before submitting)
router.post('/calculate', authenticateToken, async (req, res) => {
  try {
    const { amount, term_months } = req.body;

    if (!amount || !term_months) {
      return res.status(400).json({ error: 'Amount and term are required' });
    }

    const interestRate = getInterestRate(parseFloat(amount), parseInt(term_months));
    const monthlyPayment = calculateMonthlyPayment(
      parseFloat(amount),
      interestRate,
      parseInt(term_months)
    );

    const totalPayment = monthlyPayment * parseInt(term_months);
    const totalInterest = totalPayment - parseFloat(amount);

    res.json({
      amount: parseFloat(amount),
      term_months: parseInt(term_months),
      interest_rate: interestRate,
      monthly_payment: monthlyPayment,
      total_payment: Math.round(totalPayment * 100) / 100,
      total_interest: Math.round(totalInterest * 100) / 100
    });
  } catch (error) {
    console.error('Loan calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate loan' });
  }
});

export default router;

// Made with Bob
