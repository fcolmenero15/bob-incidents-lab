import { useState } from 'react';
import {
  Modal,
  TextInput,
  TextArea,
  InlineNotification,
  Stack
} from '@carbon/react';
import { accountsAPI } from '../services/api';

export default function Withdraw({ account, onClose }) {
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await accountsAPI.withdraw(account.id, {
        amount: parseFloat(formData.amount),
        description: formData.description,
      });
      setSuccess('Withdrawal successful!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Withdrawal failed');
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
      modalHeading="Withdraw Funds"
      modalLabel={`Account: ${account.account_number}`}
      primaryButtonText={loading ? 'Processing...' : 'Withdraw'}
      secondaryButtonText="Cancel"
      onRequestClose={onClose}
      onRequestSubmit={handleSubmit}
      primaryButtonDisabled={loading || !formData.amount}
      danger
      size="sm"
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

        <div style={{
          padding: '1rem',
          background: 'var(--cds-layer-01)',
          borderRadius: '4px'
        }}>
          <Stack gap={2}>
            <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>
              Available Balance
            </p>
            <p style={{ fontSize: '1.5rem', fontWeight: 600 }}>
              {formatCurrency(account.balance)}
            </p>
          </Stack>
        </div>

        <TextInput
          id="amount"
          name="amount"
          labelText="Withdrawal Amount"
          placeholder="0.00"
          type="number"
          value={formData.amount}
          onChange={handleChange}
          min="0.01"
          max={account.balance}
          step="0.01"
          required
          autoFocus
          helperText={`Maximum: ${formatCurrency(account.balance)}`}
        />

        <TextArea
          id="description"
          name="description"
          labelText="Description (Optional)"
          placeholder="Add a note about this withdrawal"
          value={formData.description}
          onChange={handleChange}
          rows={3}
        />
      </Stack>
    </Modal>
  );
}

// Made with Bob
