import { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  Select,
  SelectItem,
  TextArea,
  DatePicker,
  DatePickerInput,
  Button,
  InlineNotification,
  Stack,
  Tile
} from '@carbon/react';
import { Calculator } from '@carbon/icons-react';
import { loansAPI, patientsAPI, providersAPI } from '../services/api';

export default function InsuranceClaimSubmit({ onClose }) {
  const [claimTypes, setClaimTypes] = useState([]);
  const [patients, setPatients] = useState([]);
  const [providers, setProviders] = useState([]);
  const [formData, setFormData] = useState({
    patient_id: '',
    claim_amount: '',
    claim_type: '',
    service_date: '',
    provider_id: '',
    diagnosis_code: '',
    procedure_code: '',
    copay_amount: '0',
    deductible_amount: '0',
    notes: '',
  });
  const [estimate, setEstimate] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingProviders, setLoadingProviders] = useState(true);

  useEffect(() => {
    loadClaimTypes();
    loadPatients();
    loadProviders();
  }, []);

  const loadClaimTypes = async () => {
    try {
      const response = await loansAPI.getClaimTypes();
      setClaimTypes(response.data.claim_types || []);
    } catch (err) {
      console.error('Failed to load claim types:', err);
    }
  };

  const loadPatients = async () => {
    try {
      const response = await patientsAPI.getAll();
      setPatients(response.data.patients || []);
    } catch (err) {
      console.error('Failed to load patients:', err);
      setError('Failed to load patients');
    } finally {
      setLoadingPatients(false);
    }
  };

  const loadProviders = async () => {
    try {
      const response = await providersAPI.getAll({ accepting_patients: 'true' });
      setProviders(response.data.providers || []);
    } catch (err) {
      console.error('Failed to load providers:', err);
      setError('Failed to load providers');
    } finally {
      setLoadingProviders(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setEstimate(null);
  };

  const handleDateChange = (dates) => {
    if (dates && dates.length > 0) {
      setFormData({
        ...formData,
        service_date: dates[0].toISOString().split('T')[0],
      });
      setEstimate(null);
    }
  };

  const handleCalculate = async () => {
    if (!formData.claim_amount || !formData.claim_type) {
      setError('Please enter claim amount and select claim type');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await loansAPI.estimateCoverage({
        claim_amount: parseFloat(formData.claim_amount),
        claim_type: formData.claim_type,
        copay_amount: parseFloat(formData.copay_amount || 0),
        deductible_amount: parseFloat(formData.deductible_amount || 0),
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
      await loansAPI.submitClaim({
        patient_id: parseInt(formData.patient_id),
        claim_amount: parseFloat(formData.claim_amount),
        claim_type: formData.claim_type,
        service_date: formData.service_date,
        provider_id: parseInt(formData.provider_id),
        diagnosis_code: formData.diagnosis_code || undefined,
        procedure_code: formData.procedure_code || undefined,
        copay_amount: parseFloat(formData.copay_amount || 0),
        deductible_amount: parseFloat(formData.deductible_amount || 0),
        notes: formData.notes || undefined,
      });
      setSuccess('Insurance claim submitted successfully!');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Claim submission failed');
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
      modalHeading="Submit Insurance Claim"
      primaryButtonText={loading ? 'Submitting...' : 'Submit Claim'}
      secondaryButtonText="Cancel"
      onRequestClose={onClose}
      onRequestSubmit={handleSubmit}
      primaryButtonDisabled={
        loading ||
        loadingPatients ||
        loadingProviders ||
        !formData.patient_id ||
        !formData.claim_amount ||
        !formData.claim_type ||
        !formData.service_date ||
        !formData.provider_id
      }
      size="lg"
    >
      <Stack gap={6}>
        <Select
          id="patient_id"
          name="patient_id"
          labelText="Select Patient *"
          value={formData.patient_id}
          onChange={handleChange}
          required
          disabled={loadingPatients}
          helperText={loadingPatients ? 'Loading patients...' : 'Select the patient for this claim'}
        >
          <SelectItem value="" text={loadingPatients ? 'Loading...' : 'Select a patient'} />
          {patients.map((patient) => (
            <SelectItem
              key={patient.id}
              value={patient.id.toString()}
              text={`${patient.first_name} ${patient.last_name} - DOB: ${new Date(patient.date_of_birth).toLocaleDateString()}`}
            />
          ))}
        </Select>
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <TextInput
            id="claim_amount"
            name="claim_amount"
            labelText="Claim Amount *"
            placeholder="Enter amount"
            type="number"
            value={formData.claim_amount}
            onChange={handleChange}
            min="0.01"
            step="0.01"
            required
            autoFocus
            helperText="Total cost of service"
          />

          <Select
            id="claim_type"
            name="claim_type"
            labelText="Claim Type *"
            value={formData.claim_type}
            onChange={handleChange}
            required
          >
            <SelectItem value="" text="Select claim type" />
            {claimTypes.map((type) => (
              <SelectItem 
                key={type.type} 
                value={type.type} 
                text={`${type.type} (${type.coverage}% coverage)`} 
              />
            ))}
          </Select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <DatePicker
            datePickerType="single"
            onChange={handleDateChange}
            maxDate={new Date().toISOString().split('T')[0]}
          >
            <DatePickerInput
              id="service_date"
              placeholder="mm/dd/yyyy"
              labelText="Service Date *"
              required
            />
          </DatePicker>

          <Select
            id="provider_id"
            name="provider_id"
            labelText="Healthcare Provider *"
            value={formData.provider_id}
            onChange={handleChange}
            required
            disabled={loadingProviders}
            helperText={loadingProviders ? 'Loading providers...' : 'Select the healthcare provider'}
          >
            <SelectItem value="" text={loadingProviders ? 'Loading...' : 'Select a provider'} />
            {providers.map((provider) => (
              <SelectItem
                key={provider.id}
                value={provider.id.toString()}
                text={`${provider.provider_name} - ${provider.specialty}${provider.facility_name ? ` (${provider.facility_name})` : ''}`}
              />
            ))}
          </Select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <TextInput
            id="diagnosis_code"
            name="diagnosis_code"
            labelText="Diagnosis Code (ICD-10)"
            placeholder="Z00.00"
            value={formData.diagnosis_code}
            onChange={handleChange}
            helperText="Optional: ICD-10 code"
          />

          <TextInput
            id="procedure_code"
            name="procedure_code"
            labelText="Procedure Code (CPT)"
            placeholder="99213"
            value={formData.procedure_code}
            onChange={handleChange}
            helperText="Optional: CPT code"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <TextInput
            id="copay_amount"
            name="copay_amount"
            labelText="Copay Amount"
            placeholder="0.00"
            type="number"
            value={formData.copay_amount}
            onChange={handleChange}
            min="0"
            step="0.01"
            helperText="Your copay amount"
          />

          <TextInput
            id="deductible_amount"
            name="deductible_amount"
            labelText="Deductible Amount"
            placeholder="0.00"
            type="number"
            value={formData.deductible_amount}
            onChange={handleChange}
            min="0"
            step="0.01"
            helperText="Deductible to apply"
          />
        </div>

        <TextArea
          id="notes"
          name="notes"
          labelText="Additional Notes"
          placeholder="Add any additional information about this claim"
          value={formData.notes}
          onChange={handleChange}
          rows={3}
        />

        <Button
          kind="secondary"
          size="md"
          renderIcon={Calculator}
          onClick={handleCalculate}
          disabled={loading || !formData.claim_amount || !formData.claim_type}
          style={{ width: '100%' }}
        >
          Calculate Coverage Estimate
        </Button>

        {estimate && (
          <Tile className="coverage-estimate" style={{ background: 'var(--cds-layer-accent)' }}>
            <Stack gap={4}>
              <h4>Coverage Estimate</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>Claim Amount:</span>
                <span>{formatCurrency(estimate.claim_amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>Coverage Percentage:</span>
                <span>{estimate.coverage_percentage}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>Copay:</span>
                <span>{formatCurrency(estimate.copay_amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>Deductible:</span>
                <span>{formatCurrency(estimate.deductible_amount)}</span>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                paddingTop: '0.5rem',
                borderTop: '2px solid var(--cds-border-subtle)'
              }}>
                <span style={{ fontWeight: 600, color: 'var(--cds-support-success)' }}>
                  Insurance Pays:
                </span>
                <span style={{ fontWeight: 600, color: 'var(--cds-support-success)' }}>
                  {formatCurrency(estimate.estimated_coverage?.insurance_pays || 0)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, color: 'var(--cds-support-error)' }}>
                  You Pay:
                </span>
                <span style={{ fontWeight: 600, color: 'var(--cds-support-error)' }}>
                  {formatCurrency(estimate.estimated_coverage?.patient_pays || 0)}
                </span>
              </div>
            </Stack>
          </Tile>
        )}
      </Stack>
    </Modal>
  );
}

// Made with Bob