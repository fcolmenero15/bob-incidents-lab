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
import { Logout, Add, Money, ArrowDown, ArrowUp, Document } from '@carbon/icons-react';
import { accountsAPI, loansAPI } from '../services/api';
import Deposit from './Deposit';
import Withdraw from './Withdraw';
import LoanRequest from './LoanRequest';
import AccountStatement from './AccountStatement';
import LoanDetails from './LoanDetails';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loans, setLoans] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }
    setUser(JSON.parse(userData));
    loadData();
  }, [navigate]);

  const loadData = async () => {
    try {
      const [accountsRes, loansRes] = await Promise.all([
        accountsAPI.getAll(),
        loansAPI.getAll(),
      ]);
      setAccounts(accountsRes.data.accounts);
      setLoans(loansRes.data.loans);
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

  const openModal = (modal, account = null, loan = null) => {
    setSelectedAccount(account);
    setSelectedLoan(loan);
    setActiveModal(modal);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedAccount(null);
    setSelectedLoan(null);
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
      pending: 'yellow',
      approved: 'green',
      rejected: 'red',
      active: 'blue',
    };
    return tagTypes[status] || 'gray';
  };

  const loanHeaders = [
    { key: 'amount', header: 'Amount' },
    { key: 'interest_rate', header: 'Interest Rate' },
    { key: 'term', header: 'Term' },
    { key: 'monthly_payment', header: 'Monthly Payment' },
    { key: 'status', header: 'Status' },
    { key: 'requested_at', header: 'Requested' },
  ];

  const loanRows = loans.map((loan) => ({
    id: loan.id,
    amount: formatCurrency(loan.amount),
    interest_rate: `${loan.interest_rate}%`,
    term: `${loan.term_months} months`,
    monthly_payment: formatCurrency(loan.monthly_payment),
    status: (
      <Tag type={getStatusTag(loan.status)} size="sm">
        {loan.status}
      </Tag>
    ),
    requested_at: formatDate(loan.requested_at),
    _loan: loan,
  }));

  if (loading) {
    return (
      <div className="bank-app">
        <Header aria-label="Bank Simulator">
          <HeaderName prefix="">Bank Simulator</HeaderName>
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
    <div className="bank-app">
      <Header aria-label="Bank Simulator" className="bank-header">
        <HeaderName prefix="">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Money size={20} />
            <span>Bank Simulator</span>
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
              <Logout size={20} />
            </HeaderGlobalAction>
          </div>
        </HeaderGlobalBar>
      </Header>

      <Grid fullWidth style={{ padding: '2rem', marginTop: '2rem' }}>
        {/* Accounts Section */}
        <Column sm={4} md={8} lg={16}>
          <h3 style={{ marginBottom: '1rem' }}>My Accounts</h3>
        </Column>

        {accounts.length === 0 ? (
          <Column sm={4} md={8} lg={16}>
            <Tile>
              <p>No accounts found.</p>
            </Tile>
          </Column>
        ) : (
          accounts.map((account) => (
            <Column key={account.id} sm={4} md={4} lg={8}>
              <Tile className="account-tile">
                <Stack gap={4}>
                  <div>
                    <p style={{ 
                      fontSize: '0.875rem', 
                      color: 'var(--cds-text-secondary)',
                      textTransform: 'uppercase',
                      fontWeight: 600
                    }}>
                      {account.account_type}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>
                      {account.account_number}
                    </p>
                  </div>

                  <div className="account-balance">
                    {formatCurrency(account.balance)}
                  </div>

                  <div className="account-actions">
                    <Button
                      kind="tertiary"
                      size="sm"
                      renderIcon={ArrowUp}
                      onClick={() => openModal('deposit', account)}
                      style={{ flex: 1 }}
                    >
                      Deposit
                    </Button>
                    <Button
                      kind="tertiary"
                      size="sm"
                      renderIcon={ArrowDown}
                      onClick={() => openModal('withdraw', account)}
                      style={{ flex: 1 }}
                    >
                      Withdraw
                    </Button>
                    <Button
                      kind="ghost"
                      size="sm"
                      renderIcon={Document}
                      onClick={() => openModal('statement', account)}
                      style={{ flex: 1 }}
                    >
                      Statement
                    </Button>
                  </div>
                </Stack>
              </Tile>
            </Column>
          ))
        )}

        {/* Loans Section */}
        <Column sm={4} md={8} lg={16} style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>My Loans</h3>
            <Button
              kind="primary"
              size="md"
              renderIcon={Add}
              onClick={() => openModal('loan')}
            >
              Request Loan
            </Button>
          </div>
        </Column>

        <Column sm={4} md={8} lg={16}>
          {loans.length === 0 ? (
            <Tile>
              <p>No loans found. Request a loan to get started!</p>
            </Tile>
          ) : (
            <DataTable rows={loanRows} headers={loanHeaders}>
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
                        <TableRow
                          {...getRowProps({ row })}
                          key={row.id}
                          onClick={() => openModal('loanDetails', null, row.cells.find(c => c.info.header === '_loan')?.value || loans.find(l => l.id === row.id))}
                          style={{ cursor: 'pointer' }}
                        >
                          {row.cells.filter(cell => cell.info.header !== '_loan').map((cell) => (
                            <TableCell key={cell.id}>{cell.value}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </DataTable>
          )}
        </Column>
      </Grid>

      {/* Modals */}
      {activeModal === 'deposit' && (
        <Deposit account={selectedAccount} onClose={closeModal} />
      )}
      {activeModal === 'withdraw' && (
        <Withdraw account={selectedAccount} onClose={closeModal} />
      )}
      {activeModal === 'loan' && (
        <LoanRequest onClose={closeModal} />
      )}
      {activeModal === 'statement' && (
        <AccountStatement account={selectedAccount} onClose={closeModal} />
      )}
      {activeModal === 'loanDetails' && (
        <LoanDetails loan={selectedLoan} onClose={closeModal} onUpdate={loadData} />
      )}
    </div>
  );
}

// Made with Bob
