import { useState } from 'react';
import {
  Modal,
  Button,
  InlineNotification,
  Stack,
  Tile,
  Tag
} from '@carbon/react';
import { Checkmark, Close } from '@carbon/icons-react';
import { loansAPI } from '../services/api';

export default function LoanDetails({ loan, onClose, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleApprove = async () => {
    setLoading(true);
    setError('');
    try {
      await loansAPI.approve(loan.id);
      setSuccess('Loan approved successfully!');
      setTimeout(() => {
        onUpdate();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve loan');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    setError('');
    try {
      await loansAPI.reject(loan.id);
      setSuccess('Loan rejected successfully!');
      setTimeout(() => {
        onUpdate();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject loan');
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (status) => {
    const tagTypes = {
      pending: 'yellow',
      approved: 'green',
      rejected: 'red',
      active: 'blue',
      paid: 'gray',
    };
    return tagTypes[status] || 'gray';
  };

  const totalPayment = loan.monthly_payment * loan.term_months;
  const totalInterest = totalPayment - loan.amount;

  return (
    <Modal
      open
      modalHeading="Loan Details"
      passiveModal
      onRequestClose={onClose}
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

        <div>
          <Tag type={getStatusTag(loan.status)} size="md">
            {loan.status.toUpperCase()}
          </Tag>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1.5rem'
        }}>
          <div>
            <p style={{ 
              fontSize: '0.875rem', 
              color: 'var(--cds-text-secondary)',
              marginBottom: '0.25rem'
            }}>
              Loan Amount
            </p>
            <p style={{ 
              fontSize: '1.5rem', 
              fontWeight: 600,
              color: 'var(--cds-link-primary)'
            }}>
              {formatCurrency(loan.amount)}
            </p>
          </div>

          <div>
            <p style={{ 
              fontSize: '0.875rem', 
              color: 'var(--cds-text-secondary)',
              marginBottom: '0.25rem'
            }}>
              Interest Rate
            </p>
            <p style={{ fontSize: '1.5rem', fontWeight: 600 }}>
              {loan.interest_rate}%
            </p>
          </div>

          <div>
            <p style={{ 
              fontSize: '0.875rem', 
              color: 'var(--cds-text-secondary)',
              marginBottom: '0.25rem'
            }}>
              Monthly Payment
            </p>
            <p style={{ 
              fontSize: '1.5rem', 
              fontWeight: 600,
              color: 'var(--cds-support-success)'
            }}>
              {formatCurrency(loan.monthly_payment)}
            </p>
          </div>
        </div>

        <Tile style={{ background: 'var(--cds-layer-01)' }}>
          <Stack gap={4}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--cds-text-secondary)' }}>Loan Term:</span>
              <strong>{loan.term_months} months ({Math.floor(loan.term_months / 12)} years)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--cds-text-secondary)' }}>Total Interest:</span>
              <strong style={{ color: 'var(--cds-support-error)' }}>
                {formatCurrency(totalInterest)}
              </strong>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              paddingTop: '0.75rem',
              borderTop: '2px solid var(--cds-border-subtle)'
            }}>
              <span style={{ color: 'var(--cds-text-secondary)' }}>Total Payment:</span>
              <strong style={{ fontSize: '1.125rem' }}>
                {formatCurrency(totalPayment)}
              </strong>
            </div>
          </Stack>
        </Tile>

        {loan.purpose && (
          <div>
            <p style={{ 
              fontSize: '0.875rem', 
              color: 'var(--cds-text-secondary)',
              marginBottom: '0.5rem',
              fontWeight: 600
            }}>
              Purpose
            </p>
            <Tile style={{ background: 'var(--cds-layer-01)' }}>
              {loan.purpose}
            </Tile>
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          fontSize: '0.875rem'
        }}>
          <div>
            <p style={{ color: 'var(--cds-text-secondary)' }}>Requested:</p>
            <p style={{ fontWeight: 500 }}>{formatDate(loan.requested_at)}</p>
          </div>
          {loan.approved_at && (
            <div>
              <p style={{ color: 'var(--cds-text-secondary)' }}>Approved:</p>
              <p style={{ fontWeight: 500 }}>{formatDate(loan.approved_at)}</p>
            </div>
          )}
          {loan.approved_by && (
            <div>
              <p style={{ color: 'var(--cds-text-secondary)' }}>Approved By:</p>
              <p style={{ fontWeight: 500 }}>{loan.approved_by}</p>
            </div>
          )}
        </div>

        {loan.status === 'pending' && (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button
              kind="primary"
              size="md"
              renderIcon={Checkmark}
              onClick={handleApprove}
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? 'Processing...' : 'Approve Loan'}
            </Button>
            <Button
              kind="danger"
              size="md"
              renderIcon={Close}
              onClick={handleReject}
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? 'Processing...' : 'Cancel Request'}
            </Button>
          </div>
        )}
      </Stack>
    </Modal>
  );
}

// Made with Bob
