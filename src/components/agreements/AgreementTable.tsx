"use client";

import { useState } from 'react';
import {
  Table,
  Button,
  Badge,
  Card,
  Form,
  InputGroup,
  Container,
  Row,
  Col,
  Stack,
  Collapse
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
  ChevronDown,
  ChevronUp
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
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState<number[]>([]);

  const getStatusBadge = (agreement: Agreement) => {
    if (agreement.isActive && agreement.status === 'DRAFT') {
      return (
        <Badge bg="black" className="d-flex align-items-center gap-1 fs-7">
          <Clock size={10} />
          Draft
        </Badge>
      );
    }
    
    switch (agreement.status) {
      case 'DRAFT':
        return <Badge bg="secondary" className="fs-7">DRAFT</Badge>;
      case 'PENDING_SIGNATURE':
        return <Badge bg="warning" className="fs-7">PENDING</Badge>;
      case 'SIGNED':
        return <Badge bg="success" className="fs-7">SIGNED</Badge>;
      case 'EXPIRED':
        return <Badge bg="danger" className="fs-7">EXPIRED</Badge>;
      case 'TERMINATED':
        return <Badge bg="dark" className="fs-7">TERMINATED</Badge>;
      case 'CANCELLED':
        return <Badge bg="danger" className="fs-7">CANCELLED</Badge>;
      default:
        return <Badge bg="light" className="fs-7">UNKNOWN</Badge>;
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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'HIRE_AGREEMENT':
        return 'Hire Agreement';
      case 'INSURANCE_CERTIFICATE':
        return 'Insurance Certificate';
      default:
        return type?.replace('_', ' ') || 'Agreement';
    }
  };

  const toggleRowExpand = (id: number) => {
    setExpandedRows(prev => 
      prev.includes(id) 
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  const filteredAgreements = agreements.filter(agreement => {
    const matchesSearch = 
      agreement.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agreement.driverprofile?.user_driverprofile_userIdTouser?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agreement.car?.registration?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = selectedType === 'ALL' || agreement.type === selectedType;
    
    return matchesSearch && matchesType;
  });

  const handleSendAgreement = async (agreementId: number) => {
    if (!confirm('Send this agreement for signing?')) {
      return;
    }

    try {
      const response = await fetch(`/api/agreements/${agreementId}/send`, {
        method: 'POST',
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Agreement sent successfully!');
        if (onRefresh) onRefresh();
        window.dispatchEvent(new Event('agreementUpdated'));
      } else {
        throw new Error(data.error || 'Failed to send agreement');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send agreement');
    }
  };

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
        <Card.Body className="text-center py-4 py-md-5">
          <FileText size={40} className="text-muted mb-2 mb-md-3" />
          <h5 className="mb-2">No agreements found</h5>
          <p className="text-muted mb-0">
            {selectedType !== 'ALL' || searchTerm 
              ? 'Try changing your filters' 
              : 'Create your first agreement to get started'
            }
          </p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Container fluid className="px-0">
      {/* Mobile Filter Toggle */}
      <div className="d-md-none mb-3">
        <Button
          variant="outline-secondary"
          className="w-100 d-flex align-items-center justify-content-center gap-2"
          onClick={() => setShowMobileFilters(!showMobileFilters)}
        >
          <Filter size={16} />
          {showMobileFilters ? 'Hide Filters' : 'Show Filters'}
          <Badge bg="primary" className="ms-2">
            {filteredAgreements.length}
          </Badge>
        </Button>
      </div>

      {/* Filters - Mobile & Desktop */}
      <Card className={`mb-3 ${showMobileFilters ? 'd-block' : 'd-none d-md-block'}`}>
        <Card.Body className="p-3">
          <Row className="g-2">
            <Col xs={12} md={6} lg={4}>
              <InputGroup size="sm">
                <InputGroup.Text>
                  <Search size={14} />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Search agreements..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="fs-7"
                />
              </InputGroup>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <Form.Select
                value={selectedType}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedType(e.target.value)}
                size="sm"
                className="fs-7"
              >
                <option value="ALL">All Types</option>
                <option value="HIRE_AGREEMENT">Hire Agreement</option>
                <option value="INSURANCE_CERTIFICATE">Insurance Certificate</option>
              </Form.Select>
            </Col>
            <Col xs={12} md={6} lg={5} className="d-flex align-items-center">
              <small className="text-muted ms-2">
                Showing {filteredAgreements.length} of {agreements.length} agreements
              </small>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Agreement Cards for Mobile */}
      <div className="d-md-none">
        {filteredAgreements.map((agreement) => {
          const isExpanded = expandedRows.includes(agreement.id);
          
          return (
            <Card key={agreement.id} className="mb-3">
              <Card.Body className="p-3">
                {/* Header - Clickable for expand/collapse */}
                <div 
                  className="d-flex justify-content-between align-items-center mb-2"
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggleRowExpand(agreement.id)}
                >
                  <div className="d-flex align-items-center gap-2">
                    {getTypeIcon(agreement.type)}
                    <div className="text-truncate" style={{ maxWidth: '200px' }}>
                      <h6 className="mb-0">{agreement.title}</h6>
                      <small className="text-muted">{getTypeLabel(agreement.type)}</small>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    {getStatusBadge(agreement)}
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* Collapsible Details */}
                <Collapse in={isExpanded}>
                  <div>
                    <Stack gap={2} className="mb-3">
                      {agreement.driverprofile && (
                        <div className="d-flex align-items-center gap-2">
                          <Person size={14} className="text-primary" />
                          <div>
                            <div className="small fw-semibold">Driver</div>
                            <div className="small">
                              {agreement.driverprofile.user_driverprofile_userIdTouser?.name || 'Unknown'}
                            </div>
                          </div>
                        </div>
                      )}
                      {agreement.car && (
                        <div className="d-flex align-items-center gap-2">
                          <CarFront size={14} className="text-success" />
                          <div>
                            <div className="small fw-semibold">Vehicle</div>
                            <div className="small">{agreement.car.registration}</div>
                          </div>
                        </div>
                      )}
                      <div className="d-flex align-items-center gap-2">
                        <Calendar size={14} className="text-info" />
                        <div>
                          <div className="small fw-semibold">Created</div>
                          <div className="small">{formatDate(agreement.createdAt)}</div>
                        </div>
                      </div>
                      {agreement.signedAt && (
                        <div className="d-flex align-items-center gap-2">
                          <Calendar size={14} className="text-success" />
                          <div>
                            <div className="small fw-semibold">Signed</div>
                            <div className="small">{formatDate(agreement.signedAt)}</div>
                          </div>
                        </div>
                      )}
                    </Stack>

                    {/* Actions for Mobile */}
                    <div className="d-flex flex-wrap gap-2 mt-2">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => router.push(`/agreements/${agreement.id}`)}
                        className="flex-grow-1"
                      >
                        <Eye className="me-1" />
                        View Details
                      </Button>
                      
                      {agreement.status === 'DRAFT' && (
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={() => handleSendAgreement(agreement.id)}
                          className="flex-grow-1"
                        >
                          <Send className="me-1" />
                          Send for Sign
                        </Button>
                      )}
                    </div>
                  </div>
                </Collapse>

                {/* Quick Actions (when not expanded) */}
                {!isExpanded && (
                  <div className="d-flex gap-2 mt-2">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/agreements/${agreement.id}`);
                      }}
                      className="flex-grow-1"
                    >
                      View
                    </Button>
                    {agreement.status === 'DRAFT' && (
                      <Button
                        variant="outline-success"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendAgreement(agreement.id);
                        }}
                        className="flex-grow-1"
                      >
                        Send
                      </Button>
                    )}
                  </div>
                )}
              </Card.Body>
            </Card>
          );
        })}
      </div>

      {/* Desktop Table */}
      <Card className="d-none d-md-block">
        <Card.Header className="bg-white d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
          <div className="mb-2 mb-md-0">
            <h5 className="mb-0 fs-5">Agreements ({filteredAgreements.length})</h5>
          </div>
          <div className="d-flex flex-column flex-sm-row gap-2 w-100 w-md-auto">
            <InputGroup style={{ maxWidth: '250px' }}>
              <InputGroup.Text>
                <Search size={14} />
              </InputGroup.Text>
              <Form.Control
                placeholder="Search agreements..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                size="sm"
              />
            </InputGroup>
            <Form.Select
              value={selectedType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedType(e.target.value)}
              style={{ maxWidth: '200px' }}
              size="sm"
            >
              <option value="ALL">All Types</option>
              <option value="HIRE_AGREEMENT">Hire Agreement</option>
              <option value="INSURANCE_CERTIFICATE">Insurance Certificate</option>
            </Form.Select>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Agreement</th>
                  <th>Driver</th>
                  <th>Vehicle</th>
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
                        <div>
                          <div className="fw-bold text-truncate" style={{ maxWidth: '200px' }}>
                            {agreement.title}
                          </div>
                          <small className="text-muted">
                            {getTypeLabel(agreement.type)}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {agreement.driverprofile ? (
                        <div className="d-flex align-items-center">
                          <Person className="text-primary me-1" size={14} />
                          <span className="text-truncate" style={{ maxWidth: '120px' }}>
                            {agreement.driverprofile.user_driverprofile_userIdTouser?.name || 'Unknown'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted small">No driver</span>
                      )}
                    </td>
                    <td>
                      {agreement.car ? (
                        <div className="d-flex align-items-center">
                          <CarFront className="text-success me-1" size={14} />
                          <span>{agreement.car.registration}</span>
                        </div>
                      ) : (
                        <span className="text-muted small">No vehicle</span>
                      )}
                    </td>
                    <td>
                      {getStatusBadge(agreement)}
                      {agreement.isActive && agreement.status === 'DRAFT' && (
                        <small className="d-block text-warning mt-1">
                          (Sent for signing)
                        </small>
                      )}
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                        <Calendar className="me-1" size={12} />
                        <span className="small">{formatDate(agreement.createdAt)}</span>
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
                          onClick={() => router.push(`/agreements/${agreement.id}`)}
                          title="View Details"
                        >
                          <Eye className="me-1" />
                          View
                        </Button>
                        
                        {agreement.status === 'DRAFT' && (
                          <Button
                            variant="outline-success"
                            size="sm"
                            onClick={() => handleSendAgreement(agreement.id)}
                            title="Send for Signature"
                          >
                            <Send className="me-1" />
                            Send
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default AgreementTable;