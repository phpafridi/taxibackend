// components/agreements/AgreementTable.tsx - UPDATED RESPONSIVE VERSION
"use client";

import { useState } from 'react';
import {
  Table,
  Button,
  Badge,
  Card,
  Form,
  InputGroup,
  Dropdown,
} from 'react-bootstrap';
import {
  Eye,
  Send,
  FileText,
  ShieldCheck,
  Calendar,
  Person,
  CarFront,
  Clock,
  Search,
  Filter,
  ThreeDotsVertical
} from 'react-bootstrap-icons';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Agreement {
  id: number;
  title: string;
  type: string;
  status: string;
  isActive: boolean;
  driverprofile?: {
    user_driverprofile_userIdTouser?: {
      name: string;
    };
  };
  car?: {
    registration: string;
  };
  createdAt: string;
  signedAt?: string | null;
}

interface AgreementTableProps {
  agreements: Agreement[];
  onRefresh?: () => void;
}

const AgreementTable = ({ agreements, onRefresh }: AgreementTableProps) => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile on mount
  useState(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth < 768);
    }
  });

  const getStatusBadge = (agreement: Agreement) => {
    if (agreement.isActive && agreement.status === 'DRAFT') {
      return (
        <Badge bg="warning" className="d-flex align-items-center gap-1">
          <Clock size={10} />
          Sent for Sign
        </Badge>
      );
    }
    
    switch (agreement.status) {
      case 'DRAFT':
        return <Badge bg="secondary">DRAFT</Badge>;
      case 'PENDING_SIGNATURE':
        return <Badge bg="warning">PENDING</Badge>;
      case 'SIGNED':
        return <Badge bg="success">SIGNED</Badge>;
      case 'EXPIRED':
        return <Badge bg="danger">EXPIRED</Badge>;
      case 'TERMINATED':
        return <Badge bg="dark">TERMINATED</Badge>;
      case 'CANCELLED':
        return <Badge bg="danger">CANCELLED</Badge>;
      default:
        return <Badge bg="light">UNKNOWN</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'HIRE_AGREEMENT':
        return <FileText className="text-primary" size={16} />;
      case 'INSURANCE_CERTIFICATE':
        return <ShieldCheck className="text-info" size={16} />;
      default:
        return <FileText className="text-secondary" size={16} />;
    }
  };

  const filteredAgreements = agreements.filter(agreement => {
    const matchesSearch = 
      agreement.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agreement.driverprofile?.user_driverprofile_userIdTouser?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agreement.car?.registration?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = selectedType === 'ALL' || agreement.type === selectedType;
    
    return matchesSearch && matchesType;
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (agreements.length === 0) {
    return (
      <Card>
        <Card.Body className="text-center py-5">
          <FileText size={48} className="text-muted mb-3" />
          <h5>No agreements found</h5>
          <p className="text-muted">
            {selectedType !== 'ALL' || searchTerm 
              ? 'Try changing your filters' 
              : 'No agreements available'
            }
          </p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Header className="bg-white">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
          <h5 className="mb-0">Agreements ({filteredAgreements.length})</h5>
          
          <div className="d-flex flex-wrap gap-2 w-100 w-md-auto">
            {/* Search - full width on mobile, fixed width on desktop */}
            <InputGroup className="flex-grow-1" style={{ maxWidth: isMobile ? '100%' : '250px' }}>
              <InputGroup.Text>
                <Search size={14} />
              </InputGroup.Text>
              <Form.Control
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
            
            {/* Filter dropdown - full width on mobile */}
            <Form.Select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-100 w-md-auto"
              style={{ maxWidth: isMobile ? '100%' : '150px' }}
            >
              <option value="ALL">All Types</option>
              <option value="HIRE_AGREEMENT">Hire Agreement</option>
              <option value="INSURANCE_CERTIFICATE">Insurance Certificate</option>
            </Form.Select>
          </div>
        </div>
      </Card.Header>
      
      <Card.Body className="p-0">
        {/* Desktop Table */}
        <div className="d-none d-md-block table-responsive">
          <Table hover className="mb-0">
            <thead className="table-light">
              <tr>
                <th>Agreement</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAgreements.map((agreement) => (
                <tr key={agreement.id}>
                  <td>
                    <div className="d-flex align-items-center">
                      {getTypeIcon(agreement.type)}
                      <div className="ms-2">
                        <div className="fw-bold">{agreement.title}</div>
                        <small className="text-muted">
                          {agreement.type === 'HIRE_AGREEMENT' 
                            ? 'Hire Agreement' 
                            : 'Insurance Certificate'}
                        </small>
                      </div>
                    </div>
                  </td>
                  
                  <td>
                    {getStatusBadge(agreement)}
                  </td>
                  <td>
                    <div className="d-flex align-items-center">
                      <Calendar className="me-1" size={12} />
                      {formatDate(agreement.createdAt)}
                    </div>
                    {agreement.signedAt && (
                      <small className="text-success d-block">
                        Signed: {formatDate(agreement.signedAt)}
                      </small>
                    )}
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => router.push(`/driver-portal/agreements/${agreement.id}`)}
                        title="View Details"
                      >
                        <Eye className="me-1" />
                        View
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="d-md-none">
          {filteredAgreements.length > 0 ? (
            <div className="p-3">
              {filteredAgreements.map((agreement) => (
                <Card key={agreement.id} className="mb-3 shadow-sm border">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="d-flex align-items-center">
                        {getTypeIcon(agreement.type)}
                        <div className="ms-2">
                          <h6 className="mb-0 fw-bold">{agreement.title}</h6>
                          <small className="text-muted">
                            {agreement.type === 'HIRE_AGREEMENT' 
                              ? 'Hire Agreement' 
                              : 'Insurance Certificate'}
                          </small>
                        </div>
                      </div>
                      {getStatusBadge(agreement)}
                    </div>
                    

                    
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div className="d-flex align-items-center text-muted small">
                        <Calendar className="me-1" size={12} />
                        <span>Created: {formatDate(agreement.createdAt)}</span>
                      </div>
                    </div>
                    
                    <div className="d-flex gap-2">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="flex-grow-1"
                        onClick={() => router.push(`/driver-portal/agreements/${agreement.id}`)}
                      >
                        <Eye className="me-1" />
                        View Details
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center">
              <Search size={48} className="text-muted mb-3" />
              <p className="text-muted">No agreements match your search</p>
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default AgreementTable;