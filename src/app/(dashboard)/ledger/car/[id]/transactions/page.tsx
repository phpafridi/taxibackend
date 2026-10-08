// app/dashboard/ledger/car/[id]/transactions/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  Table,
  Badge,
  Button,
  Spinner,
  Alert,
  Row,
  Col,
  Breadcrumb,
  Form,
  InputGroup,
  FormControl,
} from "react-bootstrap";
import {
  ArrowLeft,
  CarFront,
  Search as IconSearch,
  Filter as IconFilter,
  ArrowRepeat as IconRefresh,
  Download,
  ArrowRepeat,
} from "react-bootstrap-icons";
import Link from "next/link";
import { toast } from "sonner";
import { useDebouncedCallback } from 'use-debounce';

export default function CarTransactionsPage() {
  const params = useParams();
  const router = useRouter();
  const carId = params.id;
  
  const [car, setCar] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  const fetchCarTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ledger/car/${carId}/transactions`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch car transactions");
      }
      
      setCar(data.data.car);
      setTransactions(data.data.transactions || []);
      setFilteredTransactions(data.data.transactions || []);
    } catch (error: any) {
      setError(error.message || "Failed to load car transactions");
      toast.error("Failed to load car transactions");
    } finally {
      setLoading(false);
    }
  }, [carId]);

  useEffect(() => {
    if (carId) {
      fetchCarTransactions();
    }
  }, [carId, fetchCarTransactions]);

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearchTerm(value);
    applyFilters(value, categoryFilter);
  }, 300);

  const applyFilters = (search: string, category: string) => {
    let result = [...transactions];
    
    if (search) {
      const term = search.toLowerCase();
      result = result.filter(t => 
        t.description?.toLowerCase().includes(term) ||
        t.category?.toLowerCase().includes(term) ||
        t.referenceType?.toLowerCase().includes(term)
      );
    }
    
    if (category !== "ALL") {
      result = result.filter(t => t.category === category);
    }
    
    setFilteredTransactions(result);
  };

  const handleCategoryChange = (category: string) => {
    setCategoryFilter(category);
    applyFilters(searchTerm, category);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("ALL");
    setFilteredTransactions(transactions);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      "CAR_PURCHASE": "Car Purchase",
      "INSURANCE": "Insurance",
      "INSURANCE_DRIVER_PAYMENT": "Insurance Driver Payment",
      "WEEKLY_INCOME": "Weekly Income",
      "MAINTENANCE_EXPENSE": "Maintenance Expense",
      "MAINTENANCE_REIMBURSEMENT": "Maintenance Reimbursement",
      "ADJUSTMENT": "Adjustment",
      "REFUND": "Refund",
      "DEPOSIT": "Deposit",
      "FINE": "Fine",
      "OTHER": "Other",
    };
    return labels[category] || category;
  };

  const uniqueCategories = ["ALL", ...Array.from(new Set(transactions.map(t => t.category).filter(Boolean)))];

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="warning" />
        <p className="mt-3">Loading transactions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error</Alert.Heading>
        <p>{error}</p>
        <Button variant="outline-danger" onClick={fetchCarTransactions}>
          Retry
        </Button>
        <Button variant="outline-secondary" className="ms-2" onClick={() => router.push('/ledger')}>
          <ArrowLeft className="me-1" />
          Back to Ledger
        </Button>
      </Alert>
    );
  }

  if (!car) {
    return (
      <Alert variant="warning">
        <Alert.Heading>Car Not Found</Alert.Heading>
        <p>The requested car could not be found.</p>
        <Button variant="outline-secondary" onClick={() => router.push('/ledger')}>
          <ArrowLeft className="me-1" />
          Back to Ledger
        </Button>
      </Alert>
    );
  }

  const totalCredit = transactions
    .filter(t => t.direction === 'CREDIT')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalDebit = transactions
    .filter(t => t.direction === 'DEBIT')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const netBalance = totalCredit - totalDebit;

  return (
    <div>
      {/* Breadcrumb */}
      <Breadcrumb className="mb-4">
        <Breadcrumb.Item linkAs={Link} linkProps={{ href: "/dashboard" }}>
          Dashboard
        </Breadcrumb.Item>
        <Breadcrumb.Item linkAs={Link} linkProps={{ href: "/ledger" }}>
          Ledger
        </Breadcrumb.Item>
        <Breadcrumb.Item active>
          {car.registration} Transactions
        </Breadcrumb.Item>
      </Breadcrumb>

      {/* Header */}
      <Row className="mb-4 align-items-center">
        <Col>
          <div className="d-flex align-items-center">
            <CarFront size={32} className="text-primary me-3" />
            <div>
              <h2 className="mb-1">{car.registration} - {car.make} {car.model}</h2>
              <p className="text-muted mb-0">
                All Transactions • Total: {transactions.length}
              </p>
            </div>
          </div>
        </Col>
        <Col xs="auto">
          <div className="d-flex gap-2">
            <Button variant="outline-primary" onClick={fetchCarTransactions}>
              <ArrowRepeat  className="me-2" />
              Refresh
            </Button>
            <Button variant="outline-success">
              <Download className="me-2" />
              Export
            </Button>
            <Button variant="outline-secondary" onClick={() => router.push('/ledger')}>
              <ArrowLeft className="me-2" />
              Back
            </Button>
          </div>
        </Col>
      </Row>

      {/* Summary Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center h-100 border-success">
            <Card.Body className="p-3">
              <h6 className="mb-2">Total Income</h6>
              <h4 className="text-success mb-0">{formatCurrency(totalCredit)}</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100 border-danger">
            <Card.Body className="p-3">
              <h6 className="mb-2">Total Expenses</h6>
              <h4 className="text-danger mb-0">{formatCurrency(totalDebit)}</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className={`text-center h-100 border-${netBalance >= 0 ? 'primary' : 'warning'}`}>
            <Card.Body className="p-3">
              <h6 className="mb-2">Net Balance</h6>
              <h4 className={netBalance >= 0 ? 'text-primary' : 'text-warning'}>
                {formatCurrency(netBalance)}
              </h4>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100 border-info">
            <Card.Body className="p-3">
              <h6 className="mb-2">Transactions</h6>
              <h4 className="mb-0">{transactions.length}</h4>
              <div className="small text-muted">
                Showing: {filteredTransactions.length}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col md={6}>
              <InputGroup>
                <InputGroup.Text>
                  <IconSearch />
                </InputGroup.Text>
                <FormControl
                  placeholder="Search description, reference..."
                  value={searchTerm}
                  onChange={(e) => debouncedSearch(e.target.value)}
                />
              </InputGroup>
            </Col>
            
            <Col xs={12} md={4}>
              <Form.Select 
                value={categoryFilter}
                onChange={(e) => handleCategoryChange(e.target.value)}
              >
                {uniqueCategories.map((category) => (
                  <option key={category} value={category}>
                    {category === "ALL" ? "All Categories" : getCategoryLabel(category)}
                  </option>
                ))}
              </Form.Select>
            </Col>
            
            <Col xs={12} md={2}>
              <Button 
                variant="outline-secondary" 
                onClick={clearFilters}
                className="d-flex align-items-center w-100"
                disabled={!searchTerm && categoryFilter === "ALL"}
              >
                <IconFilter className="me-1" />
                Clear Filters
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Transactions Table */}
      <Card>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Driver</th>
                  <th>Amount</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction: any) => (
                  <tr key={transaction.id}>
                    <td>
                      <div>{formatDate(transaction.createdAt)}</div>
                      <small className="text-muted">
                        {transaction.paymentDate ? formatDate(transaction.paymentDate) : ''}
                      </small>
                    </td>
                    <td>
                      <Badge bg={transaction.direction === 'CREDIT' ? 'success' : 'danger'}>
                        {transaction.direction}
                      </Badge>
                    </td>
                    <td>
                      <Badge bg="info" className="text-white">
                        {getCategoryLabel(transaction.category)}
                      </Badge>
                    </td>
                    <td>
                      <div>{transaction.description}</div>
                      {transaction.referenceType && (
                        <small className="text-muted">
                          {transaction.referenceType} {transaction.referenceId ? `#${transaction.referenceId}` : ''}
                        </small>
                      )}
                    </td>
                    <td>
                      {transaction.driverprofile?.user ? (
                        <div>{transaction.driverprofile.user.name}</div>
                      ) : (
                        <span className="text-muted">N/A</span>
                      )}
                    </td>
                    <td className={`fw-bold ${transaction.direction === 'CREDIT' ? 'text-success' : 'text-danger'}`}>
                      {transaction.direction === 'CREDIT' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </td>
                    <td>
                      <div className="small">
                        After: {formatCurrency(transaction.balanceAfter || 0)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          
          {filteredTransactions.length === 0 && (
            <div className="text-center py-5">
              <p className="text-muted mb-3">
                {searchTerm || categoryFilter !== "ALL" 
                  ? "No transactions match your filters" 
                  : "No transactions found for this car"}
              </p>
              {(searchTerm || categoryFilter !== "ALL") && (
                <Button variant="outline-primary" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}