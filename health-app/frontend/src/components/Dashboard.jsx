import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Column,
  Button,
  Tile,
  DataTable,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Tag,
  Header,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
  SkeletonText,
  Stack
} from '@carbon/react';
import { Power, Add, Medication, Calendar, TrashCan } from '@carbon/icons-react';
import { loansAPI, accountsAPI } from '../services/api';
import ScheduleAppointment from './ScheduleAppointment';
import InsuranceClaimSubmit from './InsuranceClaimSubmit';
import InsuranceClaimDetails from './InsuranceClaimDetails';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [insuranceClaims, setInsuranceClaims] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }
    try {
      setUser(JSON.parse(userData));
    } catch {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      navigate('/login');
      return;
    }
    loadData();
  }, [navigate]);

  const loadData = async () => {
    try {
      const [claimsRes, recordsRes] = await Promise.all([
        loansAPI.getAll(),
        accountsAPI.getAll(),
      ]);
      setInsuranceClaims(claimsRes.data.insurance_claims || []);

      // Load appointments for each medical record
      const records = recordsRes.data.medical_records || [];
      const apptArrays = await Promise.all(
        records.map(r => accountsAPI.getAppointments(r.id).then(res => res.data.appointments || []).catch(() => []))
      );
      setAppointments(apptArrays.flat()
        .filter(a => a.status !== 'cancelled')
        .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date)));
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const openModal = (modal, claim = null) => {
    setSelectedClaim(claim);
    setActiveModal(modal);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedClaim(null);
    loadData();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusTag = (status) => {
    const tagTypes = {
      pending: 'warm-gray',
      approved: 'green',
      rejected: 'red',
      active: 'blue',
      paid: 'teal',
    };
    return tagTypes[status] || 'gray';
  };

  const getAppointmentStatusTag = (status) => {
    const tagTypes = {
      scheduled: 'blue',
      completed: 'green',
      cancelled: 'red',
      'no-show': 'warm-gray',
    };
    return tagTypes[status] || 'gray';
  };

  const handleCancelAppointment = async (appt) => {
    try {
      await accountsAPI.updateAppointment(appt.medical_record_id, appt.id, { status: 'cancelled' });
      loadData();
    } catch (err) {
      console.error('Failed to cancel appointment:', err);
    }
  };

  const apptHeaders = [
    { key: 'appointment_date', header: 'Date' },
    { key: 'appointment_type', header: 'Type' },
    { key: 'provider_id', header: 'Provider' },
    { key: 'duration_minutes', header: 'Duration' },
    { key: 'status', header: 'Status' },
    { key: 'notes', header: 'Notes' },
    { key: 'actions', header: '' },
  ];

  const apptRows = appointments.map((appt) => ({
    id: String(appt.id),
    appointment_date: new Date(appt.appointment_date).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    }),
    appointment_type: appt.appointment_type?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    provider_id: appt.provider_name || `Provider #${appt.provider_id}`,
    duration_minutes: `${appt.duration_minutes} min`,
    status: (
      <Tag type={getAppointmentStatusTag(appt.status)} size="sm">
        {appt.status}
      </Tag>
    ),
    notes: appt.notes || '—',
    actions: appt.status === 'scheduled' ? (
      <Button
        kind="ghost"
        size="sm"
        renderIcon={TrashCan}
        iconDescription="Cancel appointment"
        hasIconOnly
        onClick={(e) => { e.stopPropagation(); handleCancelAppointment(appt); }}
      />
    ) : null,
    _appt: appt,
  }));

  const claimHeaders = [
    { key: 'claim_amount', header: 'Claim Amount' },
    { key: 'claim_type', header: 'Type' },
    { key: 'provider_name', header: 'Provider' },
    { key: 'service_date', header: 'Service Date' },
    { key: 'status', header: 'Status' },
    { key: 'submitted_at', header: 'Submitted' },
  ];

  const claimRows = insuranceClaims.map((claim) => ({
    id: String(claim.id),
    claim_amount: formatCurrency(claim.amount || claim.claim_amount),
    claim_type: claim.claim_type || 'N/A',
    provider_name: claim.provider_name || 'N/A',
    service_date: claim.service_date ? formatDate(claim.service_date) : 'N/A',
    status: (
      <Tag type={getStatusTag(claim.status)} size="sm">
        {claim.status}
      </Tag>
    ),
    submitted_at: formatDate(claim.requested_at || claim.submitted_at),
    _claim: claim,
  }));

  if (loading) {
    return (
      <div className="healthcare-app">
        <Header aria-label="Healthcare Portal">
          <HeaderName prefix="">Healthcare Portal</HeaderName>
        </Header>
        <Grid fullWidth style={{ padding: '2rem' }}>
          <Column sm={4} md={8} lg={16}>
            <SkeletonText heading />
            <SkeletonText paragraph lineCount={3} />
          </Column>
        </Grid>
      </div>
    );
  }

  return (
    <div className="healthcare-app">
      <Header aria-label="Healthcare Portal" className="healthcare-header">
        <HeaderName prefix="">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Medication size={20} />
            <span>Healthcare Portal</span>
          </div>
        </HeaderName>
        <HeaderGlobalBar>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            paddingRight: '1rem'
          }}>
            <span style={{ color: 'var(--cds-text-secondary)', whiteSpace: 'nowrap' }}>
              Welcome, {user?.first_name}!
            </span>
            <HeaderGlobalAction
              aria-label="Logout"
              tooltipAlignment="end"
              onClick={handleLogout}
            >
              <Power size={20} />
            </HeaderGlobalAction>
          </div>
        </HeaderGlobalBar>
      </Header>

      <Grid fullWidth style={{ padding: '2rem', marginTop: '2rem' }}>
        {/* Quick Actions Section */}
        <Column sm={4} md={8} lg={16}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h3>Insurance Provider Dashboard</h3>
            <Button
              kind="primary"
              size="lg"
              renderIcon={Calendar}
              onClick={() => openModal('appointment')}
            >
              Schedule Appointment
            </Button>
          </div>
        </Column>

        {/* Appointments Section */}
        <Column sm={4} md={8} lg={16} style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>My Appointments</h3>
          </div>
        </Column>

        <Column sm={4} md={8} lg={16}>
          {appointments.length === 0 ? (
            <Tile style={{ marginBottom: '2rem' }}>
              <p>No appointments found. Schedule an appointment to get started!</p>
            </Tile>
          ) : (
            <div style={{ marginBottom: '2rem' }}>
              <DataTable rows={apptRows} headers={apptHeaders}>
                {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
                  <TableContainer>
                    <Table {...getTableProps()}>
                      <TableHead>
                        <TableRow>
                          {headers.map((header) => (
                            <TableHeader {...getHeaderProps({ header })} key={header.key}>
                              {header.header}
                            </TableHeader>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.map((row) => (
                          <TableRow {...getRowProps({ row })} key={row.id}>
                            {row.cells.filter(c => c.info.header !== '_appt').map((cell) => (
                              <TableCell key={cell.id}>{cell.value}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </DataTable>
            </div>
          )}
        </Column>

        {/* Insurance Claims Section */}
        <Column sm={4} md={8} lg={16} style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>My Insurance Claims</h3>
            <Button
              kind="primary"
              size="md"
              renderIcon={Add}
              onClick={() => openModal('submitClaim')}
            >
              Submit Claim
            </Button>
          </div>
        </Column>

        <Column sm={4} md={8} lg={16}>
          {insuranceClaims.length === 0 ? (
            <Tile>
              <p>No insurance claims found. Submit a claim to get started!</p>
            </Tile>
          ) : (
            <DataTable rows={claimRows} headers={claimHeaders}>
              {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
                <TableContainer>
                  <Table {...getTableProps()}>
                    <TableHead>
                      <TableRow>
                        {headers.map((header) => (
                          <TableHeader {...getHeaderProps({ header })} key={header.key}>
                            {header.header}
                          </TableHeader>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((row) => {
                        const claim = claimRows.find(cr => cr.id === row.id)?._claim;
                        return (
                          <TableRow
                            {...getRowProps({ row })}
                            key={row.id}
                            onClick={() => openModal('claimDetails', claim)}
                            style={{ cursor: 'pointer' }}
                          >
                            {row.cells.filter(cell => cell.info.header !== '_claim').map((cell) => (
                              <TableCell key={cell.id}>{cell.value}</TableCell>
                            ))}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </DataTable>
          )}
        </Column>
      </Grid>

      {/* Modals */}
      {activeModal === 'appointment' && (
        <ScheduleAppointment onClose={closeModal} />
      )}
      {activeModal === 'submitClaim' && (
        <InsuranceClaimSubmit onClose={closeModal} />
      )}
      {activeModal === 'claimDetails' && (
        <InsuranceClaimDetails claim={selectedClaim} onClose={closeModal} onUpdate={loadData} />
      )}
    </div>
  );
}

// Made with Bob