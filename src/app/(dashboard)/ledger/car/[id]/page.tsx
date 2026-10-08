// app/dashboard/ledger/car/[id]/page.tsx
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
} from "react-bootstrap";
import {
  ArrowLeft,
  CarFront,
  Download,
  Printer,
  FileText,
} from "react-bootstrap-icons";
import Link from "next/link";
import { toast } from "sonner";

export default function CarLedgerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const carId = params.id;
  
  const [car, setCar] = useState<any>(null);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCarLedger = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ledger/car/${carId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch car ledger");
      }
      
      setCar(data.data.car);
      setLedgerEntries(data.data.ledger || []);
    } catch (error: any) {
      setError(error.message || "Failed to load car ledger");
      toast.error("Failed to load car ledger");
    } finally {
      setLoading(false);
    }
  }, [carId]);

  useEffect(() => {
    if (carId) {
      fetchCarLedger();
    }
  }, [carId, fetchCarLedger]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="warning" />
        <p className="mt-3">Loading car ledger...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error</Alert.Heading>
        <p>{error}</p>
        <Button variant="outline-danger" onClick={fetchCarLedger}>
          Retry
        </Button>
        <Button variant="outline-secondary" className="ms-2" onClick={() => router.back()}>
          <ArrowLeft className="me-1" />
          Go Back
        </Button>
      </Alert>
    );
  }

  if (!car) {
    return (
      <Alert variant="warning">
        <Alert.Heading>Car Not Found</Alert.Heading>
        <p>The requested car ledger could not be found.</p>
        <Button variant="outline-secondary" onClick={() => router.back()}>
          <ArrowLeft className="me-1" />
          Go Back
        </Button>
      </Alert>
    );
  }

  const totalCredit = ledgerEntries
    .filter(l => l.direction === 'CREDIT')
    .reduce((sum, l) => sum + (l.amount || 0), 0);

  const totalDebit = ledgerEntries
    .filter(l => l.direction === 'DEBIT')
    .reduce((sum, l) => sum + (l.amount || 0), 0);

  const netBalance = totalCredit - totalDebit;

  return (
    <div>
      {/* Breadcrumb */}
      <Breadcrumb className="mb-4">
        <Breadcrumb.Item linkAs={Link} linkProps={{ href: "/dashboard" }}>
          Dashboard
        </Breadcrumb.Item>
        <Breadcrumb.Item linkAs={Link} linkProps={{ href: "/ledger" }}>
          Ledger Overview
        </Breadcrumb.Item>
        <Breadcrumb.Item active>
          {car.registration} Ledger
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
                Year: {car.year || 'N/A'} • Status: <Badge bg="info">{car.status}</Badge>
              </p>
            </div>
          </div>
        </Col>
        <Col xs="auto">
          <div className="d-flex gap-2">
            <Button variant="outline-primary" onClick={() => window.print()}>
              <Printer className="me-2" />
              Print
            </Button>
            <Button variant="outline-success">
              <Download className="me-2" />
              Export
            </Button>
            <Button variant="outline-secondary" onClick={() => router.back()}>
              <ArrowLeft className="me-2" />
              Back
            </Button>
          </div>
        </Col>
      </Row>

      {/* Summary Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center h-100">
            <Card.Body className="p-3">
              <h6 className="mb-2">Total Income</h6>
              <h4 className="text-success mb-0">{formatCurrency(totalCredit)}</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100">
            <Card.Body className="p-3">
              <h6 className="mb-2">Total Expenses</h6>
              <h4 className="text-danger mb-0">{formatCurrency(totalDebit)}</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100">
            <Card.Body className="p-3">
              <h6 className="mb-2">Net Balance</h6>
              <h4 className={netBalance >= 0 ? 'text-primary' : 'text-warning'}>{formatCurrency(netBalance)}</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100">
            <Card.Body className="p-3">
              <h6 className="mb-2">Transactions</h6>
              <h4 className="mb-0">{ledgerEntries.length}</h4>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Ledger Table */}
      <Card>
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Transaction History</h5>
            <Badge bg={car.isActive ? "success" : "danger"}>
              {car.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </Card.Header>
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
                {ledgerEntries.map((entry: any) => (
                  <tr key={entry.id}>
                    <td>{formatDate(entry.createdAt)}</td>
                    <td>
                      <Badge bg={entry.direction === 'CREDIT' ? 'success' : 'danger'}>
                        {entry.direction}
                      </Badge>
                    </td>
                    <td>
                      <Badge bg="info" className="text-white">
                        {entry.category.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td>{entry.description}</td>
                    <td>
                      {entry.driverprofile?.user ? (
                        <div>{entry.driverprofile.user.name}</div>
                      ) : (
                        <span className="text-muted">N/A</span>
                      )}
                    </td>
                    <td className={`fw-bold ${entry.direction === 'CREDIT' ? 'text-success' : 'text-danger'}`}>
                      {entry.direction === 'CREDIT' ? '+' : '-'}{formatCurrency(entry.amount)}
                    </td>
                    <td>
                      <div className="small">
                        After: {formatCurrency(entry.balanceAfter || 0)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          
          {ledgerEntries.length === 0 && (
            <div className="text-center py-5">
              <FileText size={48} className="text-muted mb-3" />
              <h5>No transactions found</h5>
              <p className="text-muted">This car has no ledger entries yet.</p>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}