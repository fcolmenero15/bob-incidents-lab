import { useState } from 'react';
import {
  Modal,
  TextInput,
  Select,
  SelectItem,
  TextArea,
  Button,
  InlineNotification,
  Stack,
  Tile
} from '@carbon/react';
import { Calculator } from '@carbon/icons-react';
import { loansAPI } from '../services/api';

export default function LoanRequest({ onClose }) {
  const [formData, setFormData] = useState({
    amount: '',
    term_months: '60',
    purpose: '',
  });
  const [estimate, setEstimate] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setEstimate(null);
  };

  const handleCalculate = async () => {
    if (!formData.amount || !formData.term_months) {
      setError('Please enter amount and term');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await loansAPI.calculate({
        amount: parseFloat(formData.amount),
        term_months: parseInt(formData.term_months),
      });
      setEstimate(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await loansAPI.request({
        amount: parseFloat(formData.amount),
        term_months: parseInt(formData.term_months),
        purpose: formData.purpose,
      });
      setSuccess('Loan request submitted successfully!');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Loan request failed');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Modal
      open
      modalHeading="Request a Loan"
      primaryButtonText={loading ? 'Submitting...' : 'Submit Request'}
      secondaryButtonText="Cancel"
      onRequestClose={onClose}
      onRequestSubmit={handleSubmit}
      primaryButtonDisabled={loading || !formData.amount || !formData.purpose}
      size="md"
    >
      <Stack gap={6}>
        {error && (
          <InlineNotification
            kind="error"
            title="Error"
            subtitle={error}
            hideCloseButton
            lowContrast
          />
        )}

        {success && (
          <InlineNotification
            kind="success"
            title="Success"
            subtitle={success}
            hideCloseButton
            lowContrast
          />
        )}

        <TextInput
          id="amount"
          name="amount"
          labelText="Loan Amount"
          placeholder="Enter amount"
          type="number"
          value={formData.amount}
          onChange={handleChange}
          min="1000"
          max="500000"
          step="1000"
          required
          autoFocus
          helperText="Maximum: $500,000"
        />

        <Select
          id="term_months"
          name="term_months"
          labelText="Loan Term"
          value={formData.term_months}
          onChange={handleChange}
          required
        >
          <SelectItem value="12" text="12 months (1 year)" />
          <SelectItem value="24" text="24 months (2 years)" />
          <SelectItem value="36" text="36 months (3 years)" />
          <SelectItem value="60" text="60 months (5 years)" />
          <SelectItem value="120" text="120 months (10 years)" />
          <SelectItem value="180" text="180 months (15 years)" />
          <SelectItem value="240" text="240 months (20 years)" />
          <SelectItem value="360" text="360 months (30 years)" />
        </Select>

        <TextArea
          id="purpose"
          name="purpose"
          labelText="Purpose"
          placeholder="Describe the purpose of this loan (minimum 10 characters)"
          value={formData.purpose}
          onChange={handleChange}
          rows={3}
          required
          helperText="Minimum 10 characters"
        />

        <Button
          kind="secondary"
          size="md"
          renderIcon={Calculator}
          onClick={handleCalculate}
          disabled={loading || !formData.amount || !formData.term_months}
          style={{ width: '100%' }}
        >
          Calculate Estimate
        </Button>

        {estimate && (
          <Tile className="loan-estimate">
            <Stack gap={4}>
              <h4>Loan Estimate</h4>
              <div className="loan-estimate-row">
                <span style={{ fontWeight: 600 }}>Loan Amount:</span>
                <span>{formatCurrency(estimate.amount)}</span>
              </div>
              <div className="loan-estimate-row">
                <span style={{ fontWeight: 600 }}>Interest Rate:</span>
                <span>{estimate.interest_rate}%</span>
              </div>
              <div className="loan-estimate-row">
                <span style={{ fontWeight: 600 }}>Monthly Payment:</span>
                <span>{formatCurrency(estimate.monthly_payment)}</span>
              </div>
              <div className="loan-estimate-row">
                <span style={{ fontWeight: 600 }}>Total Interest:</span>
                <span>{formatCurrency(estimate.total_interest)}</span>
              </div>
              <div className="loan-estimate-row" style={{ 
                paddingTop: '0.5rem', 
                borderTop: '2px solid var(--cds-border-subtle)' 
              }}>
                <span style={{ fontWeight: 600 }}>Total Payment:</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(estimate.total_payment)}</span>
              </div>
            </Stack>
          </Tile>
        )}
      </Stack>
    </Modal>
  );
}

// Made with Bob
