// components/agreements/AgreementList.tsx - RESPONSIVE VERSION
"use client";

import { useState, useEffect } from 'react';
import { 
  Row, 
  Col, 
  Nav, 
  Tab, 
  Badge, 
  Spinner, 
  Card,
  Button,
  Form,
  Container
} from 'react-bootstrap';
import { 
  List as IconList,
  Clock,
  CheckCircle,
  XCircle,
  ArrowClockwise
} from 'react-bootstrap-icons';
import AgreementTable from './AgreementTable';
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
  signedAt: string | null;
}

const AgreementList = () => {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [counts, setCounts] = useState({
    all: 0,
    pending: 0,
    signed: 0,
    expired: 0
  });
  const [refreshing, setRefreshing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchAgreements();
  }, []);

  const fetchAgreements = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/driver-portal/agreements');
      const data = await response.json();
      const agreementsData = data.agreements || [];
      
      // FILTER OUT DRAFT AGREEMENTS COMPLETELY
      const nonDraftAgreements = agreementsData.filter((a: Agreement) => 
        a.status !== 'DRAFT'
      );
      
      setAgreements(nonDraftAgreements);
      
      // Calculate counts - NO DRAFTS
      const allCount = nonDraftAgreements.length;
      const pendingCount = nonDraftAgreements.filter((a: Agreement) => 
        a.status === 'PENDING_SIGNATURE'
      ).length;
      const signedCount = nonDraftAgreements.filter((a: Agreement) => 
        a.status === 'SIGNED'
      ).length;
      const expiredCount = nonDraftAgreements.filter((a: Agreement) => 
        a.status === 'EXPIRED'
      ).length;
      
      setCounts({
        all: allCount,
        pending: pendingCount,
        signed: signedCount,
        expired: expiredCount
      });
      
    } catch (error) {
      console.error('Error fetching agreements:', error);
      toast.error('Failed to load agreements');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchAgreements();
    toast.info('Refreshing agreements...');
  };

  const filteredAgreements = () => {
    switch (activeTab) {
      case 'pending':
        return agreements.filter(a => a.status === 'PENDING_SIGNATURE');
      case 'signed':
        return agreements.filter(a => a.status === 'SIGNED');
      case 'expired':
        return agreements.filter(a => a.status === 'EXPIRED');
      default:
        return agreements; // Already filtered out DRAFTS
    }
  };

  // Refresh agreements when tab changes or when agreements are updated
  useEffect(() => {
    const handleAgreementUpdate = () => {
      fetchAgreements();
    };
    
    window.addEventListener('agreementUpdated', handleAgreementUpdate);
    
    return () => {
      window.removeEventListener('agreementUpdated', handleAgreementUpdate);
    };
  }, []);

  if (loading) {
    return (
      <Container className="py-4 py-md-5">
        <div className="text-center py-4">
          <Spinner animation="border" />
          <p className="mt-2">Loading agreements...</p>
        </div>
      </Container>
    );
  }

  return (
    <>
      <Container fluid="lg" className="px-3 px-md-4">
        <Row>
          <Col xs={12}>
            <div className="mb-4 mb-md-5">
              <Tab.Container activeKey={activeTab}>
                {/* Mobile: Card with Dropdown */}
                <Card className="d-block d-md-none mb-4 shadow-sm border">
                  <Card.Body className="p-3">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="mb-0 fw-bold">Agreements</h5>
                      <Badge bg="light" text="dark" className="fs-6">
                        {counts.all}
                      </Badge>
                    </div>
                    
                    <Form.Select 
                      value={activeTab}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setActiveTab(e.target.value)}
                      className="w-100"
                    >
                      <option value="all">
                        All Agreements ({counts.all})
                      </option>
                      <option value="pending">
                        Pending Signature ({counts.pending})
                      </option>
                      <option value="signed">
                        Signed ({counts.signed})
                      </option>
                      <option value="expired">
                        Expired ({counts.expired})
                      </option>
                    </Form.Select>
                    
                    {/* Mobile Info */}
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <small className="text-muted">
                        Showing {filteredAgreements().length} agreements
                      </small>
                      {activeTab === 'pending' && (
                        <small className="text-muted">
                          (Sent agreements only)
                        </small>
                      )}
                    </div>
                  </Card.Body>
                </Card>

                {/* Desktop Tabs */}
                <div className="d-none d-md-flex align-items-center mb-4">
                  <Nav 
                    className="nav-lb-tab border-dashed border-bottom"
                    id="pills-tab"
                  >
                    <Nav.Item>
                      <Nav.Link
                        eventKey="all"
                        onClick={() => setActiveTab('all')}
                        active={activeTab === 'all'}
                      >
                        <div className="d-flex align-items-center gap-2 lh-1">
                          <span>
                            All Agreements
                            <Badge bg="gray-200" text="gray-600" className="rounded-circle ms-1">
                              {counts.all}
                            </Badge>
                          </span>
                        </div>
                      </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                      <Nav.Link
                        eventKey="pending"
                        onClick={() => setActiveTab('pending')}
                        active={activeTab === 'pending'}
                      >
                        <div className="d-flex align-items-center gap-2 lh-1">
                          <span>
                            Pending Signature
                            <Badge bg="warning" text="dark" className="rounded-circle ms-1">
                              {counts.pending}
                            </Badge>
                          </span>
                        </div>
                      </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                      <Nav.Link
                        eventKey="signed"
                        onClick={() => setActiveTab('signed')}
                        active={activeTab === 'signed'}
                      >
                        <div className="d-flex align-items-center gap-2 lh-1">
                          <span>
                            Signed
                            <Badge bg="success" text="white" className="rounded-circle ms-1">
                              {counts.signed}
                            </Badge>
                          </span>
                        </div>
                      </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                      <Nav.Link
                        eventKey="expired"
                        onClick={() => setActiveTab('expired')}
                        active={activeTab === 'expired'}
                      >
                        <div className="d-flex align-items-center gap-2 lh-1">
                          <span>
                            Expired
                            <Badge bg="danger" text="white" className="rounded-circle ms-1">
                              {counts.expired}
                            </Badge>
                          </span>
                        </div>
                      </Nav.Link>
                    </Nav.Item>
                  </Nav>
                </div>

                <Tab.Content>
                  <Tab.Pane eventKey={activeTab}>
                    <div className="mt-3 mt-md-0">
                      <AgreementTable
                        agreements={filteredAgreements()}
                        onRefresh={fetchAgreements}
                      />
                    </div>
                  </Tab.Pane>
                </Tab.Content>
              </Tab.Container>
            </div>
          </Col>
        </Row>
      </Container>

      {/* Mobile Floating Refresh Button - Only on mobile */}
      {isMobile && (
        <Button
          variant="warning"
          size="lg"
          className="rounded-circle shadow-lg d-block d-md-none"
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            position: 'fixed',
            bottom: '83px',
            right: '24px',
            width: '40px',
            height: '40px',
            zIndex: 1050,
            padding: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {refreshing ? (
            <Spinner
              animation="border"
              size="sm"
              style={{
                width: '20px',
                height: '20px',
                borderWidth: '2px'
              }}
            />
          ) : (
            <ArrowClockwise size={20} />
          )}
        </Button>
      )}

      {/* Add padding to body for mobile only */}
      <style jsx global>{`
        @media (max-width: 767.98px) {
          body {
            padding-bottom: 80px !important;
          }
        }
      `}</style>
    </>
  );
};

export default AgreementList;