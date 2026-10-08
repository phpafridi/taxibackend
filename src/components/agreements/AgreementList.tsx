"use client";

import { useState, useEffect } from 'react';
import { 
  Row, 
  Col, 
  Nav, 
  Tab, 
  Badge, 
  Spinner, 
  Container, 
  Form,
  Button
} from 'react-bootstrap';
import AgreementTable from './AgreementTable';
import { IconReload } from '@tabler/icons-react';
import {toast} from 'sonner';
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
    draft: 0,
    pending: 0,
    signed: 0,
    expired: 0
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAgreements();
  }, []);

  const fetchAgreements = async () => {
    try {
      const response = await fetch('/api/agreements');
      const data = await response.json();
      const agreementsData = data.agreements || [];
      setAgreements(agreementsData);

      // Calculate counts
      const allCount = agreementsData.length;
      const draftCount = agreementsData.filter((a: Agreement) =>
        a.status === 'DRAFT'
      ).length;

      const pendingCount = agreementsData.filter((a: Agreement) =>
        a.status === 'PENDING_SIGNATURE' && a.isActive
      ).length;

      const signedCount = agreementsData.filter((a: Agreement) =>
        a.status === 'SIGNED'
      ).length;

      const expiredCount = agreementsData.filter((a: Agreement) =>
        a.status === 'EXPIRED'
      ).length;

      setCounts({
        all: allCount,
        draft: draftCount,
        pending: pendingCount,
        signed: signedCount,
        expired: expiredCount
      });
    } catch (error) {
      console.error('Error fetching agreements:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefreshClick = () => {
    setRefreshing(true);
    fetchAgreements();
    toast.info("Refreshing Agreements...");
  };

  const filteredAgreements = () => {
    switch (activeTab) {
      case 'expired':
        return agreements.filter(a => a.status === 'EXPIRED');
      case 'draft':
        return agreements.filter(a => a.status === 'DRAFT');
      case 'pending':
        return agreements.filter(a => a.status === 'PENDING_SIGNATURE');
      case 'signed':
        return agreements.filter(a => a.status === 'SIGNED');
      default:
        return agreements;
    }
  };

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
                {/* Mobile: Dropdown, Desktop: Horizontal tabs */}
                <div className="d-block d-md-none mb-3">
                  <h4 className="mb-3">Agreements</h4>
                  <Form.Select 
                    value={activeTab}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setActiveTab(e.target.value)}
                    className="w-100"
                  >
                    <option value="all">
                      All Agreements ({counts.all})
                    </option>
                    <option value="draft">
                      Drafts ({counts.draft})
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
                </div>

                {/* Desktop Tabs */}
                <Nav 
                  className="nav-lb-tab border-dashed border-bottom mb-3 mb-md-4 d-none d-md-flex"
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
                          All
                          <Badge bg="gray-200" text="gray-600" className="rounded-circle ms-1">
                            {counts.all}
                          </Badge>
                        </span>
                      </div>
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link
                      eventKey="draft"
                      onClick={() => setActiveTab('draft')}
                      active={activeTab === 'draft'}
                    >
                      <div className="d-flex align-items-center gap-2 lh-1">
                        <span>
                          Drafts
                          <Badge bg="gray-200" text="gray-600" className="rounded-circle ms-1">
                            {counts.draft}
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
                          Pending
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

      {/* Mobile Refresh Button - Only shown on mobile when there are agreements */}
      {filteredAgreements().length > 0 && (
        <Button
          variant="warning"
          size="lg"
          className="rounded-circle shadow-lg d-block d-md-none"
          onClick={handleRefreshClick}
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
            <IconReload size={20} />
          )}
        </Button>
      )}

      {/* SIMPLE CSS - ADD TO YOUR GLOBAL STYLES */}
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default AgreementList;