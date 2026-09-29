import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Grid,
  Column,
  TextInput,
  DatePicker,
  DatePickerInput,
  Button,
  InlineNotification,
  Tile,
  Stack
} from '@carbon/react';
import { UserFollow } from '@carbon/icons-react';
import { authAPI } from '../services/api';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    first_name: '',
    last_name: '',
    date_of_birth: '',
    phone: '',
    address: '',
    emergency_contact: '',
    emergency_phone: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleDateChange = (dates) => {
    if (dates && dates.length > 0) {
      setFormData({
        ...formData,
        date_of_birth: dates[0].toISOString().split('T')[0],
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authAPI.register(formData);
      // Auto-login after registration
      const loginResponse = await authAPI.login({
        username: formData.username,
        password: formData.password,
      });
      localStorage.setItem('token', loginResponse.data.token);
      localStorage.setItem('patient', JSON.stringify(loginResponse.data.patient || loginResponse.data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="healthcare-app">
      <Grid fullWidth>
        <Column sm={4} md={8} lg={16}>
          <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
          }}>
            <div style={{ width: '100%', maxWidth: '700px' }}>
              <Tile style={{ padding: '2rem' }}>
                <Stack gap={6}>
                  <div style={{ textAlign: 'center' }}>
                    <UserFollow size={48} style={{ marginBottom: '1rem' }} />
                    <h2 style={{ marginBottom: '0.5rem' }}>Patient Registration</h2>
                    <p style={{ color: 'var(--cds-text-secondary)' }}>
                      Create your healthcare portal account
                    </p>
                  </div>

                  {error && (
                    <InlineNotification
                      kind="error"
                      title="Error"
                      subtitle={error}
                      hideCloseButton
                      lowContrast
                    />
                  )}

                  <form onSubmit={handleSubmit}>
                    <Stack gap={5}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <TextInput
                          id="first_name"
                          name="first_name"
                          labelText="First Name *"
                          placeholder="John"
                          value={formData.first_name}
                          onChange={handleChange}
                          required
                          autoFocus
                        />

                        <TextInput
                          id="last_name"
                          name="last_name"
                          labelText="Last Name *"
                          placeholder="Doe"
                          value={formData.last_name}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <TextInput
                          id="username"
                          name="username"
                          labelText="Username *"
                          placeholder="Choose a username"
                          value={formData.username}
                          onChange={handleChange}
                          required
                        />

                        <TextInput
                          id="email"
                          name="email"
                          type="email"
                          labelText="Email *"
                          placeholder="your.email@example.com"
                          value={formData.email}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <DatePicker
                          datePickerType="single"
                          onChange={handleDateChange}
                          maxDate={new Date().toISOString().split('T')[0]}
                        >
                          <DatePickerInput
                            id="date_of_birth"
                            placeholder="mm/dd/yyyy"
                            labelText="Date of Birth"
                          />
                        </DatePicker>

                        <TextInput
                          id="phone"
                          name="phone"
                          type="tel"
                          labelText="Phone Number"
                          placeholder="555-123-4567"
                          value={formData.phone}
                          onChange={handleChange}
                          helperText="Optional"
                        />
                      </div>

                      <TextInput
                        id="address"
                        name="address"
                        labelText="Address"
                        placeholder="123 Main St, City, State ZIP"
                        value={formData.address}
                        onChange={handleChange}
                        helperText="Optional"
                      />

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <TextInput
                          id="emergency_contact"
                          name="emergency_contact"
                          labelText="Emergency Contact Name"
                          placeholder="Jane Doe"
                          value={formData.emergency_contact}
                          onChange={handleChange}
                          helperText="Optional"
                        />

                        <TextInput
                          id="emergency_phone"
                          name="emergency_phone"
                          type="tel"
                          labelText="Emergency Contact Phone"
                          placeholder="555-987-6543"
                          value={formData.emergency_phone}
                          onChange={handleChange}
                          helperText="Optional"
                        />
                      </div>

                      <TextInput
                        id="password"
                        name="password"
                        type="password"
                        labelText="Password *"
                        placeholder="Choose a secure password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        helperText="Minimum 6 characters"
                      />

                      <Button
                        type="submit"
                        kind="primary"
                        size="lg"
                        disabled={loading}
                        renderIcon={UserFollow}
                        style={{ width: '100%' }}
                      >
                        {loading ? 'Creating Account...' : 'Register as Patient'}
                      </Button>

                      <div style={{ textAlign: 'center', fontSize: '0.875rem' }}>
                        Already have an account?{' '}
                        <Link to="/login" style={{ color: 'var(--cds-link-primary)' }}>
                          Sign in here
                        </Link>
                      </div>
                    </Stack>
                  </form>
                </Stack>
              </Tile>
            </div>
          </div>
        </Column>
      </Grid>
    </div>
  );
}

// Made with Bob