-- Bank Simulator Database Schema

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS loans CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Accounts table
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    account_number VARCHAR(20) UNIQUE NOT NULL,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('checking', 'savings')),
    balance DECIMAL(15,2) DEFAULT 0.00 CHECK (balance >= 0),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'closed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'transfer')),
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    balance_after DECIMAL(15,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loans table
CREATE TABLE loans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    interest_rate DECIMAL(5,2) NOT NULL CHECK (interest_rate >= 0),
    term_months INTEGER NOT NULL CHECK (term_months > 0),
    monthly_payment DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'paid', 'defaulted')),
    purpose TEXT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    approved_by VARCHAR(100)
);

-- Create indexes for better query performance
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_loans_user_id ON loans(user_id);
CREATE INDEX idx_loans_status ON loans(status);

-- Function to generate account number
CREATE OR REPLACE FUNCTION generate_account_number()
RETURNS VARCHAR(20) AS $$
DECLARE
    new_number VARCHAR(20);
    number_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate random 10-digit account number
        new_number := LPAD(FLOOR(RANDOM() * 10000000000)::TEXT, 10, '0');
        
        -- Check if number already exists
        SELECT EXISTS(SELECT 1 FROM accounts WHERE account_number = new_number) INTO number_exists;
        
        -- Exit loop if number is unique
        EXIT WHEN NOT number_exists;
    END LOOP;
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert demo data
-- Password for both users is 'demo123'
INSERT INTO users (username, email, password_hash, first_name, last_name) VALUES
('demo', 'demo@bank.com', '$2b$10$nKaMeo4wFIQHdbdOXzzzfus80x3LNh3RD8kXXR2QgSXYyW/Zf0Dde', 'Demo', 'User'),
('john.doe', 'john@example.com', '$2b$10$nKaMeo4wFIQHdbdOXzzzfus80x3LNh3RD8kXXR2QgSXYyW/Zf0Dde', 'John', 'Doe');

-- Insert demo accounts
INSERT INTO accounts (user_id, account_number, account_type, balance) VALUES
(1, '1234567890', 'checking', 5000.00),
(1, '1234567891', 'savings', 10000.00),
(2, '2345678901', 'checking', 2500.00);

-- Insert demo transactions
INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description) VALUES
(1, 'deposit', 1000.00, 5000.00, 'Initial deposit'),
(2, 'deposit', 10000.00, 10000.00, 'Savings account opening'),
(3, 'deposit', 2500.00, 2500.00, 'Initial deposit');

-- Insert demo loan
INSERT INTO loans (user_id, amount, interest_rate, term_months, monthly_payment, status, purpose) VALUES
(1, 50000.00, 5.5, 60, 952.00, 'approved', 'Home improvement');

COMMENT ON TABLE users IS 'Bank customers';
COMMENT ON TABLE accounts IS 'Customer bank accounts';
COMMENT ON TABLE transactions IS 'Account transaction history';
COMMENT ON TABLE loans IS 'Loan applications and active loans';

-- Made with Bob
