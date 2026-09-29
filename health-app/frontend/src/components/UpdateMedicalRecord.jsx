import { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  Select,
  SelectItem,
  TextArea,
  InlineNotification,
  Stack,
  Tile
} from '@carbon/react';
import { accountsAPI } from '../services/api';

export default function UpdateMedicalRecord({ medicalRecord, onClose }) {
  const [formData, setFormData] = useState({
    blood_type: '',
    allergies: '',
    chronic_conditions: '',
    current_medications: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Pre-populate form with existing data
    if (medicalRecord) {
      setFormData({
        blood_type: medicalRecord.blood_type || '',
        allergies: medicalRecord.allergies || '',
        chronic_conditions: medicalRecord.chronic_conditions || '',
        current_medications: medicalRecord.current_medications || '',
      });
    }
  }, [medicalRecord]);

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
      await accountsAPI.updateMedicalRecord(medicalRecord.id, formData);
      setSuccess('Medical record updated successfully!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  return (
    <Modal
      open
      modalHeading="Update Medical Record"
      modalLabel={`Record: ${medicalRecord.record_number}`}
      primaryButtonText={loading ? 'Updating...' : 'Update Record'}
      secondaryButtonText="Cancel"
      onRequestClose={onClose}
      onRequestSubmit={handleSubmit}
      primaryButtonDisabled={loading}
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

        <Tile style={{ background: 'var(--cds-layer-01)' }}>
          <Stack gap={3}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--cds-text-secondary)' }}>Record Type:</span>
              <strong style={{ textTransform: 'capitalize' }}>{medicalRecord.record_type}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--cds-text-secondary)' }}>Status:</span>
              <strong style={{ textTransform: 'capitalize' }}>{medicalRecord.status}</strong>
            </div>
          </Stack>
        </Tile>

        <Select
          id="blood_type"
          name="blood_type"
          labelText="Blood Type"
          value={formData.blood_type}
          onChange={handleChange}
        >
          <SelectItem value="" text="Select blood type (optional)" />
          {bloodTypes.map((type) => (
            <SelectItem key={type} value={type} text={type} />
          ))}
        </Select>

        <TextArea
          id="allergies"
          name="allergies"
          labelText="Allergies"
          placeholder="List any known allergies (e.g., Penicillin, Peanuts, Latex)"
          value={formData.allergies}
          onChange={handleChange}
          rows={3}
          helperText="Separate multiple allergies with commas"
        />

        <TextArea
          id="chronic_conditions"
          name="chronic_conditions"
          labelText="Chronic Conditions"
          placeholder="List any chronic health conditions (e.g., Type 2 Diabetes, Hypertension)"
          value={formData.chronic_conditions}
          onChange={handleChange}
          rows={3}
          helperText="Separate multiple conditions with commas"
        />

        <TextArea
          id="current_medications"
          name="current_medications"
          labelText="Current Medications"
          placeholder="List current medications and dosages (e.g., Metformin 500mg twice daily)"
          value={formData.current_medications}
          onChange={handleChange}
          rows={4}
          helperText="Include medication name, dosage, and frequency"
        />

        <Tile light style={{ background: 'var(--cds-layer-accent)', padding: '1rem' }}>
          <Stack gap={2}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>
              ℹ️ Important Information
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>
              Keep your medical record up to date to ensure accurate care. This information is shared with your healthcare providers.
            </p>
          </Stack>
        </Tile>
      </Stack>
    </Modal>
  );
}

// Made with Bob