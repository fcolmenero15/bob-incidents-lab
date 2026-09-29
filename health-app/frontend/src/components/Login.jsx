import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Grid, 
  Column, 
  TextInput, 
  Button, 
  InlineNotification,
  Tile,
  Stack
} from '@carbon/react';
import { Login as LoginIcon } from '@carbon/icons-react';
import { authAPI } from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(formData);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.patient));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
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
            <div style={{ width: '100%', maxWidth: '400px' }}>
              <Tile style={{ padding: '2rem' }}>
                <Stack gap={6}>
                  <div style={{ textAlign: 'center' }}>
                    <LoginIcon size={48} style={{ marginBottom: '1rem' }} />
                    <h2 style={{ marginBottom: '0.5rem' }}>Healthcare Portal</h2>
                    <p style={{ color: 'var(--cds-text-secondary)' }}>
                      Sign in to access your medical records
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

                  <Tile light style={{ padding: '1rem', background: 'var(--cds-layer-01)' }}>
                    <Stack gap={3}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>Demo Patient Credentials:</p>
                      <div style={{ fontSize: '0.875rem' }}>
                        <div><strong>Username:</strong> demo</div>
                        <div><strong>Password:</strong> demo123</div>
                      </div>
                    </Stack>
                  </Tile>

                  <form onSubmit={handleSubmit}>
                    <Stack gap={5}>
                      <TextInput
                        id="username"
                        name="username"
                        labelText="Username"
                        placeholder="Enter your username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                        autoFocus
                      />

                      <TextInput
                        id="password"
                        name="password"
                        type="password"
                        labelText="Password"
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                      />

                      <Button
                        type="submit"
                        kind="primary"
                        size="lg"
                        disabled={loading}
                        renderIcon={LoginIcon}
                        style={{ width: '100%' }}
                      >
                        {loading ? 'Signing in...' : 'Sign In'}
                      </Button>

                      <div style={{ textAlign: 'center', fontSize: '0.875rem' }}>
                        Don't have an account?{' '}
                        <Link to="/register" style={{ color: 'var(--cds-link-primary)' }}>
                          Register here
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