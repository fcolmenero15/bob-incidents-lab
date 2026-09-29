import { useState, useEffect } from 'react';
import {
  Modal,
  DataTable,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Tag,
  InlineNotification,
  SkeletonText,
  Stack,
  Tile
} from '@carbon/react';
import { accountsAPI } from '../services/api';

export default function AccountStatement({ account, onClose }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const response = await accountsAPI.getTransactions(account.id, { limit: 50 });
      setTransactions(response.data.transactions);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load transactions');
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const headers = [
    { key: 'date', header: 'Date' },
    { key: 'type', header: 'Type' },
    { key: 'description', header: 'Description' },
    { key: 'amount', header: 'Amount' },
    { key: 'balance', header: 'Balance' },
  ];

  const rows = transactions.map((transaction) => ({
    id: transaction.id,
    date: formatDate(transaction.created_at),
    type: (
      <Tag
        type={transaction.transaction_type === 'deposit' ? 'green' : 'red'}
        size="sm"
      >
        {transaction.transaction_type}
      </Tag>
    ),
    description: transaction.description || '-',
    amount: (
      <span className={
        transaction.transaction_type === 'deposit'
          ? 'transaction-amount-positive'
          : 'transaction-amount-negative'
      }>
        {transaction.transaction_type === 'deposit' ? '+' : '-'}
        {formatCurrency(transaction.amount)}
      </span>
    ),
    balance: formatCurrency(transaction.balance_after),
  }));

  return (
    <Modal
      open
      modalHeading="Account Statement"
      modalLabel={`Account: ${account.account_number}`}
      passiveModal
      onRequestClose={onClose}
      size="lg"
    >
      <Stack gap={6}>
        <Tile className="account-summary">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}>
            <div>
              <p style={{ 
                fontSize: '0.875rem', 
                color: 'var(--cds-text-secondary)',
                marginBottom: '0.25rem'
              }}>
                Account Type
              </p>
              <p style={{ 
                fontSize: '1.25rem', 
                fontWeight: 600,
                textTransform: 'capitalize'
              }}>
                {account.account_type}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ 
                fontSize: '0.875rem', 
                color: 'var(--cds-text-secondary)',
                marginBottom: '0.25rem'
              }}>
                Current Balance
              </p>
              <p style={{ 
                fontSize: '1.5rem', 
                fontWeight: 600,
                color: 'var(--cds-support-success)'
              }}>
                {formatCurrency(account.balance)}
              </p>
            </div>
          </div>
        </Tile>

        {error && (
          <InlineNotification
            kind="error"
            title="Error"
            subtitle={error}
            hideCloseButton
            lowContrast
          />
        )}

        {loading ? (
          <SkeletonText paragraph lineCount={5} />
        ) : transactions.length === 0 ? (
          <Tile>
            <p>No transactions found.</p>
          </Tile>
        ) : (
          <DataTable rows={rows} headers={headers}>
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
                        {row.cells.map((cell) => (
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
      </Stack>
    </Modal>
  );
}

// Made with Bob
