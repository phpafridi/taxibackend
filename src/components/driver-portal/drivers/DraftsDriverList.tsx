"use client";
//import node modules libraries
import { Row, Col, Card, Form } from "react-bootstrap";
import { useState, useEffect } from "react";

//import custom components
import TanstackTable from "../../table/TanstackTable";
import { agreementsColumns } from "../agreements/AgreementsColumnDefinitions";

// Define types
interface User {
  name: string;
  email: string;
  phone?: string;
}

interface DriverProfile {
  user_driverprofile_userIdTouser: User;
}

interface Agreement {
  id: number;
  type: 'HIRE_AGREEMENT' | 'INSURANCE_CERTIFICATE';
  title: string;
  status: 'DRAFT' | 'PENDING_SIGNATURE' | 'SIGNED' | 'EXPIRED' | 'TERMINATED' | 'CANCELLED';
  driverId: number;
  carId?: number;
  startDate?: string;
  endDate?: string;
  signedAt?: string;
  createdAt: string;
  updatedAt: string;
  driverprofile: DriverProfile;
  car?: {
    registration: string;
    model: string;
    make: string;
  };
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

const DraftsAgreementsList = () => {
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

  // Filter agreements based on search
  const filteredAgreements = agreements.filter((agreement) => {
    if (!agreement.driverprofile?.user_driverprofile_userIdTouser) return false;
    
    const driverName = agreement.driverprofile.user_driverprofile_userIdTouser.name || "";
    const driverEmail = agreement.driverprofile.user_driverprofile_userIdTouser.email || "";
    const agreementTitle = agreement.title || "";
    
    const matchesSearch = searchQuery === "" || 
      agreementTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driverEmail.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  // Map data for table
  const tableData = filteredAgreements.map((agreement) => ({
    id: agreement.id,
    title: agreement.title,
    driver: agreement.driverprofile?.user_driverprofile_userIdTouser?.name || "N/A",
    email: agreement.driverprofile?.user_driverprofile_userIdTouser?.email || "N/A",
    type: agreement.type?.replace("_", " ") || "N/A",
    status: agreement.status?.replace("_", " ") || "N/A",
    startDate: agreement.startDate 
      ? new Date(agreement.startDate).toLocaleDateString()
      : "N/A",
    endDate: agreement.endDate 
      ? new Date(agreement.endDate).toLocaleDateString()
      : "N/A",
    createdAt: new Date(agreement.createdAt).toLocaleDateString(),
    originalData: agreement,
  }));

  return (
    <Card className="card-lg" id="draftAgreementsList">
      <Card.Header className="border-bottom-0">
        <Row className="justify-content-between gy-2">
          <Col lg={4}>
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
              <option value="">All Agreements</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_SIGNATURE">Pending Signature</option>
              <option value="SIGNED">Signed</option>
              <option value="EXPIRED">Expired</option>
              <option value="TERMINATED">Terminated</option>
              <option value="CANCELLED">Cancelled</option>
            </Form.Select>
          </Col>
          <Col lg={2}>
            <Form.Select onChange={(e) => {
              // Sort functionality
              const sortBy = e.target.value;
              if (sortBy === "newest") {
                setAgreements([...agreements].sort((a, b) => 
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                ));
              } else if (sortBy === "oldest") {
                setAgreements([...agreements].sort((a, b) => 
                  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                ));
              } else if (sortBy === "driver") {
                setAgreements([...agreements].sort((a, b) => 
                  (a.driverprofile?.user_driverprofile_userIdTouser?.name || "").localeCompare(
                    b.driverprofile?.user_driverprofile_userIdTouser?.name || ""
                  )
                ));
              }
            }}>
              <option value="">Sort by</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="driver">Driver Name</option>
            </Form.Select>
          </Col>
        </Row>
      </Card.Header>
      <Card.Body>
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Loading drivers...</p>
          </div>
        ) : tableData.length === 0 ? (
          <div className="text-center py-5">
            <p className="text-muted">No agreements found</p>
            {statusFilter === "DRAFT" && (
              <button 
                className="btn btn-primary mt-2"
                onClick={() => window.location.href = "/agreements/create"}
              >
                Create New Agreement
              </button>
            )}
          </div>
        ) : (
          <TanstackTable 
            data={tableData} 
            columns={agreementsColumns} 
            pagination 
          />
        )}
      </Card.Body>
      <Card.Footer className="border-top-0">
        <div className="d-flex justify-content-between align-items-center">
          <small className="text-muted">
            Showing {filteredAgreements.length} of {agreements.length} agreements
          </small>
          <div>
            <button 
              className="btn btn-sm btn-outline-secondary me-2"
              onClick={fetchAgreements}
            >
              Refresh
            </button>
            <button 
              className="btn btn-sm btn-primary"
              onClick={() => window.location.href = "/agreements/create"}
            >
              <i className="fe fe-plus"></i> New Agreement
            </button>
          </div>
        </div>
      </Card.Footer>
    </Card>
  );
};

export default DraftsAgreementsList;