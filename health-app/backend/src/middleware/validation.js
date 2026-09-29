// Validate appointment scheduling
export const validateAppointment = (req, res, next) => {
  const { appointment_type, provider_id, appointment_date } = req.body;

  if (!appointment_type) {
    return res.status(400).json({ error: 'Appointment type is required' });
  }

  if (!provider_id || isNaN(provider_id)) {
    return res.status(400).json({ error: 'Valid provider ID is required' });
  }

  if (!appointment_date) {
    return res.status(400).json({ error: 'Appointment date is required' });
  }

  const appointmentDateTime = new Date(appointment_date);
  if (isNaN(appointmentDateTime.getTime())) {
    return res.status(400).json({ error: 'Invalid appointment date format' });
  }

  // Check if appointment date (day) is in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const apptDay = new Date(appointmentDateTime);
  apptDay.setHours(0, 0, 0, 0);
  if (apptDay < today) {
    return res.status(400).json({ error: 'Appointment date cannot be in the past' });
  }

  next();
};

// Validate medical record creation/update
export const validateMedicalRecord = (req, res, next) => {
  const { record_type, blood_type } = req.body;

  if (record_type && !['general', 'specialist'].includes(record_type)) {
    return res.status(400).json({
      error: 'Record type must be either "general" or "specialist"'
    });
  }

  if (blood_type) {
    const validBloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    if (!validBloodTypes.includes(blood_type)) {
      return res.status(400).json({
        error: `Blood type must be one of: ${validBloodTypes.join(', ')}`
      });
    }
  }

  next();
};

// Validate insurance claim submission
export const validateInsuranceClaim = (req, res, next) => {
  const { patient_id, claim_amount, claim_type, service_date, provider_id } = req.body;

  if (!patient_id || isNaN(patient_id)) {
    return res.status(400).json({ error: 'Valid patient ID is required' });
  }

  if (!claim_amount || isNaN(claim_amount)) {
    return res.status(400).json({ error: 'Valid claim amount is required' });
  }

  if (parseFloat(claim_amount) <= 0) {
    return res.status(400).json({ error: 'Claim amount must be greater than 0' });
  }

  if (parseFloat(claim_amount) > 1000000) {
    return res.status(400).json({ error: 'Claim amount exceeds maximum limit of $1,000,000' });
  }

  if (!claim_type || claim_type.trim().length < 3) {
    return res.status(400).json({ error: 'Claim type is required' });
  }

  if (!service_date) {
    return res.status(400).json({ error: 'Service date is required' });
  }

  const serviceDateTime = new Date(service_date);
  if (isNaN(serviceDateTime.getTime())) {
    return res.status(400).json({ error: 'Invalid service date format' });
  }

  // Service date cannot be in the future
  if (serviceDateTime > new Date()) {
    return res.status(400).json({ error: 'Service date cannot be in the future' });
  }

  if (!provider_id || isNaN(provider_id)) {
    return res.status(400).json({ error: 'Valid provider ID is required' });
  }

  next();
};

// Validate patient registration
export const validateRegistration = (req, res, next) => {
  const { username, email, password, first_name, last_name, date_of_birth, phone } = req.body;

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

  // Optional but validate if provided
  if (date_of_birth) {
    const dob = new Date(date_of_birth);
    if (isNaN(dob.getTime())) {
      return res.status(400).json({ error: 'Invalid date of birth format' });
    }

    // Check if patient is at least 1 year old
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (dob > oneYearAgo) {
      return res.status(400).json({ error: 'Patient must be at least 1 year old' });
    }

    // Check if date of birth is not in the future
    if (dob > new Date()) {
      return res.status(400).json({ error: 'Date of birth cannot be in the future' });
    }
  }

  if (phone && phone.length < 10) {
    return res.status(400).json({ error: 'Phone number must be at least 10 digits' });
  }

  next();
};

// Validate diagnosis code format (ICD-10)
export const validateDiagnosisCode = (req, res, next) => {
  const { diagnosis_code } = req.body;

  if (diagnosis_code) {
    // Basic ICD-10 format validation (simplified)
    const icd10Pattern = /^[A-Z][0-9]{2}(\.[0-9]{1,4})?$/;
    if (!icd10Pattern.test(diagnosis_code)) {
      return res.status(400).json({
        error: 'Invalid diagnosis code format. Expected ICD-10 format (e.g., Z00.00)'
      });
    }
  }

  next();
};

// Validate procedure code format (CPT)
export const validateProcedureCode = (req, res, next) => {
  const { procedure_code } = req.body;

  if (procedure_code) {
    // Basic CPT format validation (5 digits)
    const cptPattern = /^[0-9]{5}$/;
    if (!cptPattern.test(procedure_code)) {
      return res.status(400).json({
        error: 'Invalid procedure code format. Expected 5-digit CPT code'
      });
    }
  }

  next();
};

// Legacy exports for backward compatibility (kept for existing routes)
export const validateDeposit = validateAppointment;
export const validateWithdrawal = validateMedicalRecord;
export const validateLoanRequest = validateInsuranceClaim;

// Made with Bob
