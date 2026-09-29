import { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  TextArea,
  Select,
  SelectItem,
  DatePicker,
  DatePickerInput,
  InlineNotification,
  Stack
} from '@carbon/react';
import { accountsAPI, providersAPI } from '../services/api';

export default function ScheduleAppointment({ onClose }) {
  const [formData, setFormData] = useState({
    medical_record_id: '',
    appointment_type: '',
    provider_id: '',
    appointment_date: '',
    duration_minutes: '30',
    notes: '',
  });
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [providers, setProviders] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMedicalRecords, setLoadingMedicalRecords] = useState(true);
  const [loadingProviders, setLoadingProviders] = useState(true);

  useEffect(() => {
    loadMedicalRecords();
    loadProviders();
  }, []);

  const loadMedicalRecords = async () => {
    try {
      const response = await accountsAPI.getAll();
      setMedicalRecords(response.data.medical_records || []);
    } catch (err) {
      console.error('Failed to load medical records:', err);
      setError('Failed to load medical records');
    } finally {
      setLoadingMedicalRecords(false);
    }
  };

  const loadProviders = async () => {
    try {
      const response = await providersAPI.getAll({ accepting_patients: 'true' });
      setProviders(response.data.providers || []);
    } catch (err) {
      console.error('Failed to load healthcare providers:', err);
      setError('Failed to load healthcare providers');
    } finally {
      setLoadingProviders(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleDateChange = (dates) => {
    if (dates && dates.length > 0) {
      // Format date as YYYY-MM-DD HH:MM:SS
      const date = dates[0];
      const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} 09:00:00`;
      setFormData({
        ...formData,
        appointment_date: formattedDate,
      });
    }
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await accountsAPI.scheduleAppointment(formData.medical_record_id, {
        appointment_type: formData.appointment_type,
        provider_id: parseInt(formData.provider_id),
        appointment_date: formData.appointment_date,
        duration_minutes: parseInt(formData.duration_minutes),
        notes: formData.notes || '',
      });
      setSuccess('Appointment scheduled successfully!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to schedule appointment');
    } finally {
      setLoading(false);
    }
  };

  const appointmentTypes = [
    { value: 'general-checkup', label: 'General Checkup' },
    { value: 'specialist-consultation', label: 'Specialist Consultation' },
    { value: 'follow-up', label: 'Follow-up Visit' },
    { value: 'lab-work', label: 'Lab Work' },
    { value: 'imaging', label: 'Imaging (X-ray, MRI, etc.)' },
    { value: 'vaccination', label: 'Vaccination' },
    { value: 'physical-therapy', label: 'Physical Therapy' },
    { value: 'mental-health', label: 'Mental Health Consultation' },
    { value: 'dental', label: 'Dental Appointment' },
    { value: 'other', label: 'Other' },
  ];

  const durations = [
    { value: '15', label: '15 minutes' },
    { value: '30', label: '30 minutes' },
    { value: '45', label: '45 minutes' },
    { value: '60', label: '1 hour' },
    { value: '90', label: '1.5 hours' },
    { value: '120', label: '2 hours' },
  ];

  return (
    <Modal
      open
      modalHeading="Schedule Appointment"
      modalLabel="Insurance Provider - Appointment Scheduling"
      primaryButtonText={loading ? 'Scheduling...' : 'Schedule Appointment'}
      secondaryButtonText="Cancel"
      onRequestClose={onClose}
      onRequestSubmit={handleSubmit}
      primaryButtonDisabled={
        loading ||
        loadingMedicalRecords ||
        loadingProviders ||
        !formData.medical_record_id ||
        !formData.appointment_type ||
        !formData.provider_id ||
        !formData.appointment_date
      }
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

        <Select
          id="medical_record_id"
          name="medical_record_id"
          labelText="Select Medical Record"
          value={formData.medical_record_id}
          onChange={handleChange}
          required
          disabled={loadingMedicalRecords || medicalRecords.length === 0}
          helperText={
            loadingMedicalRecords
              ? 'Loading medical records...'
              : medicalRecords.length === 0
                ? 'No medical records found'
                : 'Select the medical record for this appointment'
          }
        >
          <SelectItem value="" text={loadingMedicalRecords ? 'Loading...' : 'Select a medical record'} />
          {medicalRecords.map((record) => (
            <SelectItem
              key={record.id}
              value={record.id.toString()}
              text={`${record.record_number} - ${record.record_type} (${record.status})`}
            />
          ))}
        </Select>

        <Select
          id="appointment_type"
          name="appointment_type"
          labelText="Appointment Type"
          value={formData.appointment_type}
          onChange={handleChange}
          required
        >
          <SelectItem value="" text="Select appointment type" />
          {appointmentTypes.map((type) => (
            <SelectItem key={type.value} value={type.value} text={type.label} />
          ))}
        </Select>

        <Select
          id="provider_id"
          name="provider_id"
          labelText="Healthcare Provider"
          value={formData.provider_id}
          onChange={handleChange}
          required
          disabled={loadingProviders}
          helperText={loadingProviders ? 'Loading providers...' : 'Select a healthcare provider'}
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

        <DatePicker
          datePickerType="single"
          onChange={handleDateChange}
          minDate={new Date().toISOString().split('T')[0]}
        >
          <DatePickerInput
            id="appointment_date"
            placeholder="mm/dd/yyyy"
            labelText="Appointment Date"
            required
          />
        </DatePicker>

        <Select
          id="duration_minutes"
          name="duration_minutes"
          labelText="Appointment Duration"
          value={formData.duration_minutes}
          onChange={handleChange}
        >
          {durations.map((duration) => (
            <SelectItem key={duration.value} value={duration.value} text={duration.label} />
          ))}
        </Select>

        <TextArea
          id="notes"
          name="notes"
          labelText="Additional Notes (Optional)"
          placeholder="Any specific concerns or information for the provider"
          value={formData.notes}
          onChange={handleChange}
          rows={3}
        />
      </Stack>
    </Modal>
  );
}

// Made with Bob