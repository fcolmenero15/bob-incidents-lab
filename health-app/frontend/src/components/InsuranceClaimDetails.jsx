import { useState } from 'react';
import {
  Modal,
  Button,
  InlineNotification,
  Stack,
  Tile,
  Tag,
  TextArea
} from '@carbon/react';
import { Checkmark, Close } from '@carbon/icons-react';
import { loansAPI } from '../services/api';

export default function InsuranceClaimDetails({ claim, onClose, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  // Guard against null claim
  if (!claim) {
    return null;
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatServiceDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleApprove = async () => {
    setLoading(true);
    setError('');
    try {
      await loansAPI.approveClaim(claim.id);
      setSuccess('Insurance claim approved successfully!');
      setTimeout(() => {
        onUpdate();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve claim');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await loansAPI.rejectClaim(claim.id, { reason: rejectionReason });
      setSuccess('Insurance claim rejected');
      setTimeout(() => {
        onUpdate();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject claim');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    setLoading(true);
    setError('');
    try {
      await loansAPI.markClaimPaid(claim.id);
      setSuccess('Claim marked as paid!');
      setTimeout(() => {
        onUpdate();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to mark claim as paid');
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (status) => {
    const tagTypes = {
      pending: 'yellow',
      approved: 'green',
      rejected: 'red',
      processing: 'blue',
      paid: 'gray',
      appealed: 'purple',
    };
    return tagTypes[status] || 'gray';
  };

  const calculateCoverage = () => {
    const claimAmount = parseFloat(claim.claim_amount);
    const coveragePercent = parseFloat(claim.coverage_percentage);
    const copay = parseFloat(claim.copay_amount || 0);
    const deductible = parseFloat(claim.deductible_amount || 0);
    
    const coveredAmount = (claimAmount * coveragePercent) / 100;
    const insurancePays = Math.max(0, coveredAmount - copay - deductible);
    const patientPays = claimAmount - insurancePays;
    
    return {
      insurancePays,
      patientPays,
    };
  };

  const coverage = calculateCoverage();

  return (
    <Modal
      open
      modalHeading="Insurance Claim Details"
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
          <Tag type={getStatusTag(claim.status)} size="md">
            {claim.status.toUpperCase()}
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
              Claim Amount
            </p>
            <p style={{ 
              fontSize: '1.5rem', 
              fontWeight: 600,
              color: 'var(--cds-link-primary)'
            }}>
              {formatCurrency(claim.claim_amount)}
            </p>
          </div>

          <div>
            <p style={{ 
              fontSize: '0.875rem', 
              color: 'var(--cds-text-secondary)',
              marginBottom: '0.25rem'
            }}>
              Coverage
            </p>
            <p style={{ fontSize: '1.5rem', fontWeight: 600 }}>
              {claim.coverage_percentage}%
            </p>
          </div>

          <div>
            <p style={{ 
              fontSize: '0.875rem', 
              color: 'var(--cds-text-secondary)',
              marginBottom: '0.25rem'
            }}>
              Insurance Pays
            </p>
            <p style={{ 
              fontSize: '1.5rem', 
              fontWeight: 600,
              color: 'var(--cds-support-success)'
            }}>
              {formatCurrency(coverage.insurancePays)}
            </p>
          </div>
        </div>

        <Tile style={{ background: 'var(--cds-layer-01)' }}>
          <Stack gap={4}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--cds-text-secondary)' }}>Claim Type:</span>
              <strong>{claim.claim_type}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--cds-text-secondary)' }}>Service Date:</span>
              <strong>{formatServiceDate(claim.service_date)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--cds-text-secondary)' }}>Provider:</span>
              <strong>{claim.provider_name}</strong>
            </div>
            {claim.diagnosis_code && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--cds-text-secondary)' }}>Diagnosis Code:</span>
                <strong>{claim.diagnosis_code}</strong>
              </div>
            )}
            {claim.procedure_code && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--cds-text-secondary)' }}>Procedure Code:</span>
                <strong>{claim.procedure_code}</strong>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--cds-text-secondary)' }}>Copay:</span>
              <strong>{formatCurrency(claim.copay_amount || 0)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--cds-text-secondary)' }}>Deductible:</span>
              <strong>{formatCurrency(claim.deductible_amount || 0)}</strong>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              paddingTop: '0.75rem',
              borderTop: '2px solid var(--cds-border-subtle)'
            }}>
              <span style={{ color: 'var(--cds-text-secondary)' }}>Patient Responsibility:</span>
              <strong style={{ fontSize: '1.125rem', color: 'var(--cds-support-error)' }}>
                {formatCurrency(coverage.patientPays)}
              </strong>
            </div>
          </Stack>
        </Tile>

        {claim.notes && (
          <div>
            <p style={{ 
              fontSize: '0.875rem', 
              color: 'var(--cds-text-secondary)',
              marginBottom: '0.5rem',
              fontWeight: 600
            }}>
              Notes
            </p>
            <Tile style={{ background: 'var(--cds-layer-01)' }}>
              {claim.notes}
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
            <p style={{ color: 'var(--cds-text-secondary)' }}>Submitted:</p>
            <p style={{ fontWeight: 500 }}>{formatDate(claim.submitted_at)}</p>
          </div>
          {claim.processed_at && (
            <div>
              <p style={{ color: 'var(--cds-text-secondary)' }}>Processed:</p>
              <p style={{ fontWeight: 500 }}>{formatDate(claim.processed_at)}</p>
            </div>
          )}
          {claim.processed_by && (
            <div>
              <p style={{ color: 'var(--cds-text-secondary)' }}>Processed By:</p>
              <p style={{ fontWeight: 500 }}>{claim.processed_by}</p>
            </div>
          )}
        </div>

        {claim.status === 'pending' && !showRejectForm && (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button
              kind="primary"
              size="md"
              renderIcon={Checkmark}
              onClick={handleApprove}
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? 'Processing...' : 'Approve Claim'}
            </Button>
            <Button
              kind="danger"
              size="md"
              renderIcon={Close}
              onClick={() => setShowRejectForm(true)}
              disabled={loading}
              style={{ flex: 1 }}
            >
              Reject Claim
            </Button>
          </div>
        )}

        {claim.status === 'pending' && showRejectForm && (
          <Stack gap={4}>
            <TextArea
              id="rejection_reason"
              labelText="Rejection Reason *"
              placeholder="Provide a reason for rejecting this claim"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              required
            />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button
                kind="danger"
                size="md"
                onClick={handleReject}
                disabled={loading || !rejectionReason.trim()}
                style={{ flex: 1 }}
              >
                {loading ? 'Processing...' : 'Confirm Rejection'}
              </Button>
              <Button
                kind="secondary"
                size="md"
                onClick={() => {
                  setShowRejectForm(false);
                  setRejectionReason('');
                }}
                disabled={loading}
                style={{ flex: 1 }}
              >
                Cancel
              </Button>
            </div>
          </Stack>
        )}

        {claim.status === 'approved' && (
          <Button
            kind="primary"
            size="md"
            onClick={handleMarkPaid}
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Processing...' : 'Mark as Paid'}
          </Button>
        )}
      </Stack>
    </Modal>
  );
}

// Made with Bob