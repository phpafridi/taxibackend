// components/agreements/DraftsAgreementsList.jsx
"use client";

import { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Button, Badge, Spinner } from 'react-bootstrap';
import TanstackTable from "../table/TanstackTable";
import { agreementsColumns } from "./AgreementsColumnDefinitions"; // FIXED PATH

// Define TypeScript interfaces
interface User {
  name: string;
  email: string;
  phone?: string;
}

interface DriverProfile {
  id: number;
  user_driverprofile_userIdTouser?: User;
}

interface Car {
  registration: string;
  model: string;
  make: string;
}

interface Agreement {
  id: number;
  type: 'HIRE_AGREEMENT' | 'INSURANCE_CERTIFICATE';
  title: string;
  content: string;
  status: 'DRAFT' | 'PENDING_SIGNATURE' | 'SIGNED' | 'EXPIRED' | 'TERMINATED' | 'CANCELLED';
  driverId?: number;
  carId?: number;
  driverprofile?: DriverProfile;
  car?: Car;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  agreements: Agreement[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function DraftsAgreementsList() {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("DRAFT");

  // Fetch agreements
  useEffect(() => {
    fetchAgreements();
  }, [statusFilter]);

  const fetchAgreements = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      
      const response = await fetch(`/api/agreements?${params.toString()}`);
      const data: ApiResponse = await response.json();
      
      if (response.ok) {
        setAgreements(data.agreements || []);
      } else {
        console.error("Failed to fetch agreements");
      }
    } catch (error) {
      console.error("Error fetching agreements:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle assigning agreement
  const handleAssign = (agreementId: number) => {
    window.location.href = `/agreements/${agreementId}/assign`;
  };

  // Create custom columns with assign button for drafts
  const draftColumns = [
    ...agreementsColumns,
    {
      id: "assign",
      header: "Actions",
      cell: ({ row }: { row: { original: any } }) => {
        const agreement = row.original.originalData as Agreement;
        
        if (agreement?.status === 'DRAFT') {
          return (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleAssign(agreement.id)}
            >
              Assign to Driver
            </Button>
          );
        }
        
        if (agreement?.status === 'PENDING_SIGNATURE') {
          return (
            <Badge bg="warning" className="px-3 py-2">
              Awaiting Signature
            </Badge>
          );
        }
        
        return null;
      },
    },
  ];

  // Filter agreements
  const filteredAgreements = agreements.filter((agreement: Agreement) => {
    if (!searchQuery) return true;
    
    const driverName = agreement.driverprofile?.user_driverprofile_userIdTouser?.name || "";
    const title = agreement.title || "";
    
    return (
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driverName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Map data for table
  const tableData = filteredAgreements.map((agreement: Agreement) => ({
    id: agreement.id,
    title: agreement.title,
    driver: agreement.driverprofile?.user_driverprofile_userIdTouser?.name || "Not Assigned",
    email: agreement.driverprofile?.user_driverprofile_userIdTouser?.email || "N/A",
    type: agreement.type?.replace("_", " ") || "N/A",
    status: agreement.status,
    startDate: agreement.startDate 
      ? new Date(agreement.startDate).toLocaleDateString()
      : "Not Set",
    endDate: agreement.endDate 
      ? new Date(agreement.endDate).toLocaleDateString()
      : "Not Set",
    createdAt: new Date(agreement.createdAt).toLocaleDateString(),
    originalData: agreement,
  }));

  return (
    <Card className="card-lg">
      <Card.Header className="border-bottom-0 bg-light">
        <Row className="align-items-center gy-3">
          <Col lg={8}>
            <h5 className="mb-0">Agreements Management</h5>
          </Col>
          <Col lg={4} className="text-lg-end">
            <Button 
              variant="primary"
              onClick={() => window.location.href = '/agreements/create-draft'}
            >
              + Create Draft Agreement
            </Button>
          </Col>
        </Row>
        
        <Row className="mt-4 gy-2">
          <Col lg={5}>
            <Form.Control
              type="search"
              className="listjs-search"
              placeholder="Search agreements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Col>
          <Col lg={3}>
            <Form.Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_SIGNATURE">Pending Signature</option>
              <option value="SIGNED">Signed</option>
              <option value="EXPIRED">Expired</option>
            </Form.Select>
          </Col>
          <Col lg={2}>
            <Button
              variant="outline-secondary"
              onClick={fetchAgreements}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </Col>
        </Row>
      </Card.Header>
      
      <Card.Body>
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" />
            <p className="mt-3">Loading agreements...</p>
          </div>
        ) : tableData.length === 0 ? (
          <div className="text-center py-5">
            <p className="text-muted mb-3">No agreements found</p>
            {statusFilter === "DRAFT" && (
              <Button 
                variant="primary"
                onClick={() => window.location.href = '/agreements/create-draft'}
              >
                Create Your First Draft Agreement
              </Button>
            )}
          </div>
        ) : (
          <TanstackTable 
            data={tableData} 
            columns={draftColumns} 
            pagination={true}
          />
        )}
      </Card.Body>
      
      <Card.Footer className="bg-light border-top-0">
        <div className="d-flex justify-content-between align-items-center">
          <small className="text-muted">
            Showing {filteredAgreements.length} of {agreements.length} agreements
          </small>
          <div>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => window.location.href = '/agreements/create-draft'}
            >
              Create New Draft
            </Button>
          </div>
        </div>
      </Card.Footer>
    </Card>
  );
}