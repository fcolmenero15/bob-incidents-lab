import express from 'express';
import { query, transaction } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateDeposit, validateWithdrawal } from '../middleware/validation.js';

const router = express.Router();

// Get all accounts for logged-in user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, account_number, account_type, balance, status, created_at
       FROM accounts
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({ accounts: result.rows });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// Get specific account details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, account_number, account_type, balance, status, created_at
       FROM accounts
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({ account: result.rows[0] });
  } catch (error) {
    console.error('Get account error:', error);
    res.status(500).json({ error: 'Failed to fetch account' });
  }
});

// Deposit money
router.post('/:id/deposit', authenticateToken, validateDeposit, async (req, res) => {
  try {
    const { amount, description } = req.body;
    const accountId = req.params.id;

    const result = await transaction(async (client) => {
      // Verify account ownership
      const accountCheck = await client.query(
        'SELECT id, balance, status FROM accounts WHERE id = $1 AND user_id = $2',
        [accountId, req.user.id]
      );

      if (accountCheck.rows.length === 0) {
        throw new Error('Account not found');
      }

      const account = accountCheck.rows[0];

      if (account.status !== 'active') {
        throw new Error('Account is not active');
      }

      const depositAmount = parseFloat(amount);
      const newBalance = parseFloat(account.balance) + depositAmount;

      // Update account balance
      await client.query(
        'UPDATE accounts SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newBalance, accountId]
      );

      // Record transaction
      const transactionResult = await client.query(
        `INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description)
         VALUES ($1, 'deposit', $2, $3, $4)
         RETURNING *`,
        [accountId, depositAmount, newBalance, description || 'Deposit']
      );

      return {
        transaction: transactionResult.rows[0],
        newBalance
      };
    });

    res.json({
      message: 'Deposit successful',
      transaction: result.transaction,
      newBalance: result.newBalance
    });
  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({ error: error.message || 'Failed to process deposit' });
  }
});

// Withdraw money
router.post('/:id/withdraw', authenticateToken, validateWithdrawal, async (req, res) => {
  try {
    const { amount, description } = req.body;
    const accountId = req.params.id;

    const result = await transaction(async (client) => {
      // Verify account ownership and balance
      const accountCheck = await client.query(
        'SELECT id, balance, status FROM accounts WHERE id = $1 AND user_id = $2',
        [accountId, req.user.id]
      );

      if (accountCheck.rows.length === 0) {
        throw new Error('Account not found');
      }

      const account = accountCheck.rows[0];

      if (account.status !== 'active') {
        throw new Error('Account is not active');
      }

      const withdrawAmount = parseFloat(amount);
      const currentBalance = parseFloat(account.balance);

      if (currentBalance < withdrawAmount) {
        throw new Error('Insufficient funds');
      }

      const newBalance = currentBalance - withdrawAmount;

      // Update account balance
      await client.query(
        'UPDATE accounts SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newBalance, accountId]
      );

      // Record transaction
      const transactionResult = await client.query(
        `INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description)
         VALUES ($1, 'withdrawal', $2, $3, $4)
         RETURNING *`,
        [accountId, withdrawAmount, newBalance, description || 'Withdrawal']
      );

      return {
        transaction: transactionResult.rows[0],
        newBalance
      };
    });

    res.json({
      message: 'Withdrawal successful',
      transaction: result.transaction,
      newBalance: result.newBalance
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ error: error.message || 'Failed to process withdrawal' });
  }
});

// Get account transactions (statement)
router.get('/:id/transactions', authenticateToken, async (req, res) => {
  try {
    const accountId = req.params.id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    // Verify account ownership
    const accountCheck = await query(
      'SELECT id FROM accounts WHERE id = $1 AND user_id = $2',
      [accountId, req.user.id]
    );

    if (accountCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Get transactions
    const result = await query(
      `SELECT id, transaction_type, amount, balance_after, description, created_at
       FROM transactions
       WHERE account_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [accountId, limit, offset]
    );

    // Get total count
    const countResult = await query(
      'SELECT COUNT(*) as total FROM transactions WHERE account_id = $1',
      [accountId]
    );

    res.json({
      transactions: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Create new account
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { account_type } = req.body;

    if (!account_type || !['checking', 'savings'].includes(account_type)) {
      return res.status(400).json({ error: 'Valid account type is required (checking or savings)' });
    }

    // Generate account number
    const accountNumber = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');

    const result = await query(
      `INSERT INTO accounts (user_id, account_number, account_type, balance)
       VALUES ($1, $2, $3, 0.00)
       RETURNING id, account_number, account_type, balance, status, created_at`,
      [req.user.id, accountNumber, account_type]
    );

    res.status(201).json({
      message: 'Account created successfully',
      account: result.rows[0]
    });
  } catch (error) {
    console.error('Create account error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

export default router;

// Made with Bob
