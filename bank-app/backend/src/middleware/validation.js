export const validateDeposit = (req, res, next) => {
  const { amount } = req.body;

  if (!amount || isNaN(amount)) {
    return res.status(400).json({ error: 'Valid amount is required' });
  }

  if (parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0' });
  }

  if (parseFloat(amount) > 1000000) {
    return res.status(400).json({ error: 'Amount exceeds maximum deposit limit' });
  }

  next();
};

export const validateWithdrawal = (req, res, next) => {
  const { amount } = req.body;

  if (!amount || isNaN(amount)) {
    return res.status(400).json({ error: 'Valid amount is required' });
  }

  if (parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0' });
  }

  next();
};

export const validateLoanRequest = (req, res, next) => {
  const { amount, term_months, purpose } = req.body;

  if (!amount || isNaN(amount)) {
    return res.status(400).json({ error: 'Valid loan amount is required' });
  }

  if (parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Loan amount must be greater than 0' });
  }

  if (parseFloat(amount) > 500000) {
    return res.status(400).json({ error: 'Loan amount exceeds maximum limit of $500,000' });
  }

  if (!term_months || isNaN(term_months)) {
    return res.status(400).json({ error: 'Valid loan term is required' });
  }

  if (parseInt(term_months) < 6 || parseInt(term_months) > 360) {
    return res.status(400).json({ error: 'Loan term must be between 6 and 360 months' });
  }

  if (!purpose || purpose.trim().length < 10) {
    return res.status(400).json({ error: 'Loan purpose must be at least 10 characters' });
  }

  next();
};

export const validateRegistration = (req, res, next) => {
  const { username, email, password, first_name, last_name } = req.body;

  if (!username || username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  if (!first_name || !last_name) {
    return res.status(400).json({ error: 'First name and last name are required' });
  }

  next();
};

// Made with Bob
