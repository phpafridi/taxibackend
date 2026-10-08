"use client";

import { useState, useEffect, useRef } from 'react';
import SignaturePad from '@/components/driver-portal/SignaturePad';
import { useRouter, useParams } from 'next/navigation';
import {
  Container,
  Card,
  Row,
  Col,
  Button,
  Badge,
  Spinner,
  Alert,
  Modal,
  Accordion
} from 'react-bootstrap';
import {
  FileText,
  Calendar,
  CurrencyPound,
  Person,
  CarFront,
  ShieldCheck,
  FileEarmarkText,
  ArrowLeft,
  Trash,
  CheckCircle,
  Clock,
  Pencil,
  Phone,
  Envelope,
  House,
  Download
} from 'react-bootstrap-icons';
import { toast } from 'sonner';
import Confetti from 'react-confetti';
import {
  formatDate,
  calculateDaysRemaining,
  getExpiryBadgeColor
} from "../../../../../../lib/dateUtils";

interface Agreement {
  id: number;
  title: string;
  type: string;
  status: string;
  content: string;
  terms: string | null;
  weeklyRate: any;
  depositAmount: any;
  depositPaid: boolean;
  startDate: string | null;
  endDate: string | null;
  signedAt: string | null;
  signedByName: string | null;
  signatureData: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;

  driver: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
  } | null;

  car: {
    id: number;
    make: string;
    model: string;
    registration: string;
  } | null;

  insurance: {
    id: number;
    policyNumber: string;
    provider: string;
  } | null;

  createdByUser: {
    name: string;
    email: string;
  };
}

export default function AgreementDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signing, setSigning] = useState(false);
  const [showSignatureView, setShowSignatureView] = useState(false);

  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  const id = params?.id as string;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    if (id && id !== 'undefined' && id !== 'null') {
      fetchAgreement(id);
    } else {
      setError('No valid agreement ID provided');
      setLoading(false);
    }

    return () => window.removeEventListener("resize", checkMobile);
  }, [id]);

  const playSound = (soundType: 'success' | 'error') => {
    if (typeof window !== 'undefined') {
      try {
        const audio = new Audio(`/notifications/${soundType}.wav`);
        audio.volume = 0.7;

      } catch (error) {

      }
    }
  };

  const showConfettiEffect = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 5000);
  };

  // Download PDF functions
  const handleDownloadReadOnlyPDF = async () => {
    try {
      toast.loading('Creating PDF...');

      const response = await fetch(`/api/agreements/${id}/generate-pdf`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${agreement?.title.replace(/\s+/g, '_')}_${agreement?.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.dismiss();
      toast.success('PDF downloaded successfully!');
      playSound('success');

    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message || 'Failed to download PDF');
      playSound('error');
      console.error(error);
    }
  };

  const handleDownloadInsurancePDF = async () => {
    try {
      toast.loading('Creating Insurance Certificate...');

      const response = await fetch(`/api/agreements/${id}/generate-insurance-pdf`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate Insurance Certificate');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `INSURANCE_CERTIFICATE_${agreement?.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.dismiss();
      toast.success('Insurance Certificate downloaded ✓');
      playSound('success');

    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message || 'Failed to download Insurance Certificate');
      playSound('error');
      console.error(error);
    }
  };

  const fetchAgreement = async (agreementId: string) => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/agreements/${agreementId}`);

      if (!response.ok) {
        let errorMessage = `Failed to fetch agreement (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          const text = await response.text();
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Invalid response format');
      }

      if (!data.agreement) {
        throw new Error('Agreement not found in response');
      }

      setAgreement(data.agreement);
    } catch (err: any) {
      setError(err.message || 'Failed to load agreement');
      setAgreement(null);
      playSound('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignatureSave = async (signatureData: string) => {
    try {
      setSigning(true);

      const response = await fetch(`/api/agreements/${id}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signatureData: signatureData,
          signedByName: agreement?.driver?.name || 'Driver',
          signedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save signature');
      }

      const data = await response.json();

      if (data.success) {
        toast.success('Agreement signed successfully!');
        playSound('success');
        showConfettiEffect();
        setShowSignatureModal(false);
        fetchAgreement(id);
      } else {
        throw new Error(data.error || 'Failed to save signature');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save signature');
      playSound('error');
    } finally {
      setSigning(false);
    }
  };

  const handleRefresh = () => {
    if (id) fetchAgreement(id);
  };

  const formatDecimal = (value: any): string => {
    if (!value) return '0.00';

    if (typeof value === 'object' && value !== null) {
      if (typeof value.toNumber === 'function') {
        return value.toNumber().toFixed(2);
      } else if (typeof value.toString === 'function') {
        return parseFloat(value.toString()).toFixed(2);
      }
    }

    const num = parseFloat(value);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Badge bg="secondary">DRAFT</Badge>;
      case 'PENDING_SIGNATURE':
        return <Badge bg="warning">PENDING SIGNATURE</Badge>;
      case 'SIGNED':
        return <Badge bg="success">SIGNED</Badge>;
      case 'EXPIRED':
        return <Badge bg="danger">EXPIRED</Badge>;
      default:
        return <Badge bg="light">UNKNOWN</Badge>;
    }
  };

  const getTypeIcon = () => {
    switch (agreement?.type) {
      case 'HIRE_AGREEMENT':
        return <FileText className="text-primary me-2" size={24} />;
      case 'INSURANCE_CERTIFICATE':
        return <ShieldCheck className="text-info me-2" size={24} />;
      default:
        return <FileText className="text-secondary me-2" size={24} />;
    }
  };

  const getTypeLabel = () => {
    switch (agreement?.type) {
      case 'HIRE_AGREEMENT':
        return 'Hire Agreement';
      case 'INSURANCE_CERTIFICATE':
        return 'Insurance Certificate';
      default:
        return agreement?.type?.replace('_', ' ') || 'Agreement';
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
        <p className="mt-3">Loading agreement...</p>
      </Container>
    );
  }

  if (error || !agreement) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Agreement</Alert.Heading>
          <p>{error || 'Agreement not found'}</p>
          <div className="d-flex gap-2 mt-3 flex-wrap">
            <Button variant="outline-danger" onClick={() => router.push('/driver-portal/agreements')}>
              <ArrowLeft className="me-2" />
              Back to Agreements
            </Button>
            {id && (
              <Button variant="outline-primary" onClick={handleRefresh}>
                Try Again
              </Button>
            )}
          </div>
        </Alert>
      </Container>
    );
  }

  const isHireAgreement = agreement.type === 'HIRE_AGREEMENT';
  const isInsuranceCertificate = agreement.type === 'INSURANCE_CERTIFICATE';

  return (
    <>
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={200}
          gravity={0.1}
        />
      )}

      <Container className="py-3 py-md-5">
        {/* Header - Mobile Responsive */}
        <Row className="mb-4">
          <Col>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mb-4">
              <div className="flex-grow-1">
                <Button
                  variant="outline-secondary"
                  onClick={() => router.push('/driver-portal/agreements')}
                  className="mb-3"
                  size={isMobile ? "sm" : undefined}
                >
                  <ArrowLeft className="me-2" />
                  Back
                </Button>
                <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center gap-2 mb-2">
                  <h1 className={`${isMobile ? 'h3' : 'h2'} mb-0 d-flex align-items-center`}>
                    {getTypeIcon()}
                    <span className="d-inline-block text-truncate" style={{ maxWidth: isMobile ? '200px' : 'none' }}>
                      {agreement.title}
                    </span>
                    {agreement.endDate && (
                      <Badge
                        bg={getExpiryBadgeColor(agreement.endDate)}
                        className={`text-nowrap d-inline-flex align-items-center gap-1 ${isMobile ? 'mt-1' : ''}`}
                        style={{
                          fontSize: isMobile ? '0.75rem' : '0.875rem',
                          padding: isMobile ? '0.25rem 0.5rem' : '0.35rem 0.75rem'
                        }}
                      >
                        <Calendar
                          size={isMobile ? 12 : 14}
                          className={isMobile ? 'me-1' : 'me-1'}
                          style={{ marginTop: '-1px' }}
                        />
                        <span>
                          {calculateDaysRemaining(agreement.endDate)}
                        </span>
                      </Badge>
                    )}
                  </h1>
                  {/* Show download button only when status is SIGNED */}
                  {agreement.status === 'SIGNED' && (
                    <div className="d-flex gap-2 align-items-center">
                      {isHireAgreement ? (
                        <Button
                          variant="outline-success"
                          onClick={handleDownloadReadOnlyPDF}
                          size={isMobile ? "sm" : "sm"}
                          title="Download PDF"
                          className="flex-shrink-0"
                        >
                          <Download className="me-1" />
                          {!isMobile && <span>PDF</span>}
                        </Button>
                      ) : (
                        <Button
                          variant="outline-info"
                          onClick={handleDownloadInsurancePDF}
                          size={isMobile ? "sm" : "sm"}
                          title="Download Insurance Certificate"
                          className="flex-shrink-0"
                        >
                          <ShieldCheck className="me-1" />
                          {!isMobile && <span>PDF Certificate</span>}
                        </Button>
                      )}
                    </div>

                  )}
                </div>
                <div className="d-flex flex-wrap gap-2 align-items-center">
                  {getStatusBadge(agreement.status)}
                  <Badge bg={isHireAgreement ? "primary" : "info"} className="text-nowrap">
                    {getTypeLabel()}
                  </Badge>
                  <span className="text-muted small d-none d-md-inline">
                    {agreement.endDate && (
                      <div className="mt-1">
                        <Badge
                          bg={getExpiryBadgeColor(agreement.endDate)}
                          className="text-nowrap"
                        >
                          {calculateDaysRemaining(agreement.endDate)}
                        </Badge>
                      </div>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </Col>
        </Row>

        {/* Mobile Accordion for Info Cards */}
        {isMobile ? (
          <Accordion className="mb-4" defaultActiveKey="0">
            <Accordion.Item eventKey="0">
              <Accordion.Header>
                <div className="d-flex align-items-center gap-2">
                  <Person size={16} />
                  <span>Agreement Details</span>
                </div>
              </Accordion.Header>
              <Accordion.Body className="p-0">
                <Row className="g-2 p-2">
                  {isHireAgreement ? (
                    <>
                      <Col xs={12}>
                        <Card>
                          <Card.Body>
                            <div className="d-flex align-items-center gap-2 mb-2">
                              <Person className="text-primary" size={20} />
                              <strong>Driver</strong>
                            </div>
                            {agreement.driver ? (
                              <>
                                <p className="mb-1">{agreement.driver.name}</p>
                                <p className="text-muted small mb-0">{agreement.driver.email}</p>
                              </>
                            ) : (
                              <p className="text-muted small">Not assigned</p>
                            )}
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col xs={12}>
                        <Card>
                          <Card.Body>
                            <div className="d-flex align-items-center gap-2 mb-2">
                              <CarFront className="text-success" size={20} />
                              <strong>Vehicle</strong>
                            </div>
                            {agreement.car ? (
                              <>
                                <p className="mb-1">{agreement.car.make} {agreement.car.model}</p>
                                <p className="text-muted small mb-0">{agreement.car.registration}</p>
                              </>
                            ) : (
                              <p className="text-muted small">Not assigned</p>
                            )}
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col xs={12}>
                        <Card>
                          <Card.Body>
                            <div className="d-flex align-items-center gap-2 mb-2">
                              <CurrencyPound className="text-warning" size={20} />
                              <strong>Financial</strong>
                            </div>
                            <p className="mb-1">
                              Weekly: <strong>£{formatDecimal(agreement.weeklyRate)}</strong>
                            </p>
                            <p className="mb-0">
                              Deposit: <strong>£{formatDecimal(agreement.depositAmount)}</strong>
                            </p>
                          </Card.Body>
                        </Card>
                      </Col>
                    </>
                  ) : (
                    <>
                      <Col xs={12}>
                        <Card>
                          <Card.Body>
                            <div className="d-flex align-items-center gap-2 mb-2">
                              <Person className="text-primary" size={20} />
                              <strong>Driver</strong>
                            </div>
                            {agreement.driver ? (
                              <>
                                <p className="mb-1">{agreement.driver.name}</p>
                                <p className="text-muted small mb-0">{agreement.driver.email}</p>
                              </>
                            ) : (
                              <p className="text-muted small">Not assigned</p>
                            )}
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col xs={12}>
                        <Card>
                          <Card.Body>
                            <div className="d-flex align-items-center gap-2 mb-2">
                              <CarFront className="text-success" size={20} />
                              <strong>Vehicle</strong>
                            </div>
                            {agreement.car ? (
                              <>
                                <p className="mb-1">{agreement.car.make} {agreement.car.model}</p>
                                <p className="text-muted small mb-0">{agreement.car.registration}</p>
                              </>
                            ) : (
                              <p className="text-muted small">Not assigned</p>
                            )}
                          </Card.Body>
                        </Card>
                      </Col>
                    </>
                  )}
                </Row>
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
        ) : (
          /* Desktop Cards */
          <Row className="mb-4">
            {isHireAgreement ? (
              <>
                <Col md={3} className="mb-3 mb-md-0">
                  <Card className="h-100">
                    <Card.Body className="text-center">
                      <Person size={24} className="text-primary mb-2" />
                      <h6>Driver</h6>
                      {agreement.driver ? (
                        <>
                          <h5 className="mb-1">{agreement.driver.name}</h5>
                          <p className="text-muted small mb-0">{agreement.driver.email}</p>
                        </>
                      ) : (
                        <p className="text-muted">Not assigned</p>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3} className="mb-3 mb-md-0">
                  <Card className="h-100">
                    <Card.Body className="text-center">
                      <CarFront size={24} className="text-success mb-2" />
                      <h6>Vehicle</h6>
                      {agreement.car ? (
                        <>
                          <h5 className="mb-1">{agreement.car.make} {agreement.car.model}</h5>
                          <p className="text-muted small mb-0">{agreement.car.registration}</p>
                        </>
                      ) : (
                        <p className="text-muted">Not assigned</p>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3} className="mb-3 mb-md-0">
                  <Card className="h-100">
                    <Card.Body className="text-center">
                      <CurrencyPound size={24} className="text-warning mb-2" />
                      <h6>Financial</h6>
                      <p className="mb-1">
                        Weekly: <strong>£{formatDecimal(agreement.weeklyRate)}</strong>
                      </p>
                      <p className="mb-0">
                        Deposit: <strong>£{formatDecimal(agreement.depositAmount)}</strong>
                      </p>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3} className="mb-3 mb-md-0">
                  <Card className="h-100">
                    <Card.Body className="text-center">
                      <Calendar size={24} className="text-info mb-2" />
                      <h6>Dates</h6>
                      {agreement.startDate ? (
                        <>
                          <p className="mb-1">
                            Start: <strong>{new Date(agreement.startDate).toLocaleDateString()}</strong>
                          </p>
                          <p className="mb-0">
                            End: <strong>{agreement.endDate ? new Date(agreement.endDate).toLocaleDateString() : 'Open'}</strong>
                          </p>

                        </>
                      ) : (
                        <p className="text-muted">Dates not set</p>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </>
            ) : (
              <>
                <Col md={4} className="mb-3 mb-md-0">
                  <Card className="h-100">
                    <Card.Body className="text-center">
                      <House size={24} className="text-primary mb-2" />
                      <h6>Company</h6>
                      {agreement.createdByUser && (
                        <>
                          <p className="mb-1">{agreement.createdByUser.name}</p>
                          <p className="text-muted small mb-0">{agreement.createdByUser.email}</p>
                        </>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4} className="mb-3 mb-md-0">
                  <Card className="h-100">
                    <Card.Body className="text-center">
                      <Person size={24} className="text-success mb-2" />
                      <h6>Driver</h6>
                      {agreement.driver ? (
                        <>
                          <p className="mb-1">{agreement.driver.name}</p>
                          <p className="text-muted small mb-0">{agreement.driver.email}</p>
                        </>
                      ) : (
                        <p className="text-muted">Not assigned</p>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4} className="mb-3 mb-md-0">
                  <Card className="h-100">
                    <Card.Body className="text-center">
                      <CarFront size={24} className="text-warning mb-2" />
                      <h6>Vehicle</h6>
                      {agreement.car ? (
                        <>
                          <p className="mb-1">{agreement.car.make} {agreement.car.model}</p>
                          <p className="text-muted small mb-0">{agreement.car.registration}</p>
                        </>
                      ) : (
                        <p className="text-muted">Not assigned</p>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </>
            )}
          </Row>
        )}

        {/* Agreement Content */}
        <Row>
          <Col lg={isHireAgreement && agreement.terms ? 8 : 12}>
            <Card className="mb-4">
              <Card.Header className="bg-white">
                <h5 className="mb-0">
                  {isHireAgreement ? 'Agreement Content' : 'Certificate Content'}
                </h5>
              </Card.Header>
              <Card.Body>
                <div
                  className="agreement-content"
                  style={{
                    whiteSpace: 'pre-wrap',
                    fontSize: isMobile ? '14px' : 'inherit',
                    lineHeight: '1.6',
                    maxHeight: isMobile ? '300px' : '500px',
                    overflowY: 'auto',
                    padding: isMobile ? '10px' : '20px'
                  }}
                >
                  {agreement.content || 'No content provided.'}

                  {/* Signature Line */}
                  <div className="mt-4 pt-3">
                    <h6 className="mb-3 text-center">SIGNATURE</h6>

                    {agreement.status === 'SIGNED' && agreement.signatureData ? (
                      <div className="text-center">
                        <div className="border border-dark p-3 d-inline-block" style={{
                          minWidth: isMobile ? '250px' : '300px',
                          maxWidth: '100%'
                        }}>
                          <img
                            src={agreement.signatureData}
                            alt="Signature"
                            className="img-fluid"
                            style={{
                              maxHeight: isMobile ? '60px' : '100px',
                              maxWidth: '100%'
                            }}
                          />
                          <hr className="my-2" />
                          <p className="mb-0 small">
                            <strong>{agreement.signedByName || 'Driver'}</strong><br />
                            <span className="text-muted">
                              Date: {agreement.signedAt ? new Date(agreement.signedAt).toLocaleDateString() : new Date().toLocaleDateString()}
                            </span>
                          </p>
                        </div>
                      </div>
                    ) : agreement.status === 'PENDING_SIGNATURE' ? (
                      <div className="text-center">
                        <div className="border border-dark p-3 d-inline-block" style={{
                          minWidth: isMobile ? '250px' : '300px',
                          maxWidth: '100%'
                        }}>
                          <div className="border-dashed p-2" style={{
                            height: isMobile ? '50px' : '80px',
                            borderStyle: 'dashed',
                            borderColor: '#666'
                          }}>
                            <div className="h-100 d-flex align-items-center justify-content-center">
                              <span className="text-muted fst-italic small">Signature required</span>
                            </div>
                          </div>
                          <hr className="my-2" />
                          <p className="mb-0 small">
                            <strong>{agreement.driver?.name || 'Driver'}</strong><br />
                            <span className="text-muted">Date: {new Date().toLocaleDateString()}</span>
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          {isHireAgreement && agreement.terms && (
            <Col lg={4}>
              <Card className="mb-4">
                <Card.Header className="bg-white">
                  <h5 className="mb-0">Terms & Conditions</h5>
                </Card.Header>
                <Card.Body>
                  <div style={{
                    whiteSpace: 'pre-wrap',
                    fontSize: isMobile ? '12px' : '13px',
                    maxHeight: isMobile ? '200px' : '500px',
                    overflowY: 'auto'
                  }}>
                    {agreement.terms}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          )}
        </Row>

        {/* Action Buttons - Mobile Responsive */}
        <Row className="mt-4">
          <Col>
            <div className="d-flex flex-wrap gap-2 justify-content-center justify-content-md-start">
              {/* PDF Download Buttons - Show only when status is SIGNED */}
              {agreement.status === 'SIGNED' && (
                <>
                  {isHireAgreement ? (
                    <Button
                      variant="outline-success"
                      onClick={handleDownloadReadOnlyPDF}
                      size={isMobile ? "sm" : undefined}
                      className="flex-grow-1 flex-md-grow-0"
                    >
                      <Download className="me-2" />
                      {isMobile ? 'PDF' : 'Download PDF'}
                    </Button>
                  ) : (
                    <Button
                      variant="outline-info"
                      onClick={handleDownloadInsurancePDF}
                      size={isMobile ? "sm" : undefined}
                      className="flex-grow-1 flex-md-grow-0"
                    >
                      <ShieldCheck className="me-2" />
                      {isMobile ? 'Certificate' : 'Download Certificate'}
                    </Button>
                  )}
                </>
              )}

              {/* Sign Agreement Button - Show for PENDING_SIGNATURE status */}
              {agreement.status === 'PENDING_SIGNATURE' && (
                <Button
                  variant="warning"
                  onClick={() => setShowSignatureModal(true)}
                  disabled={signing}
                  size={isMobile ? "sm" : undefined}
                  className="flex-grow-1 flex-md-grow-0"
                >
                  {signing ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Signing...
                    </>
                  ) : (
                    <>
                      <Pencil className="me-2" />
                      {isMobile ? 'Sign' : 'Sign Agreement'}
                    </>
                  )}
                </Button>
              )}

              {agreement.status === 'PENDING_SIGNATURE' && (
                <Button
                  variant="secondary"
                  disabled
                  size={isMobile ? "sm" : undefined}
                  className="flex-grow-1 flex-md-grow-0"
                >
                  <Clock className="me-2" />
                  {isMobile ? 'Pending' : 'Pending Signature'}
                </Button>
              )}

              {agreement.status === 'SIGNED' && agreement.signatureData && (
                <Button
                  variant="outline-success"
                  onClick={() => setShowSignatureView(true)}
                  size={isMobile ? "sm" : undefined}
                  className="flex-grow-1 flex-md-grow-0"
                >
                  <FileEarmarkText className="me-2" />
                  {isMobile ? 'View Sig' : 'View Signature'}
                </Button>
              )}

              <Button
                variant="outline-secondary"
                onClick={() => router.push('/driver-portal/agreements')}
                size={isMobile ? "sm" : undefined}
                className="flex-grow-1 flex-md-grow-0"
              >
                <ArrowLeft className="me-2" />
                {isMobile ? 'Back' : 'Back to List'}
              </Button>
            </div>
          </Col>
        </Row>

        {/* Footer Info */}
        <Row className="mt-4">
          <Col>
            <Alert variant="light" className="border small">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
                <div className="text-center text-md-start">
                  <strong>Document Information</strong><br />
                  <span className="text-muted">
                    {isHireAgreement ? 'Hire Agreement' : 'Certificate'} ID: {agreement.id}
                  </span>
                </div>
                <div className="text-center text-md-end">
                  <span className="text-muted">
                    Updated: {new Date(agreement.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Alert>
          </Col>
        </Row>
      </Container>

      {/* Signature Pad Modal */}
      <SignaturePad
        show={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onSave={handleSignatureSave}
      />

      {/* Full Signature View Modal */}
      <Modal show={showSignatureView} onHide={() => setShowSignatureView(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Signature</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {agreement.signatureData ? (
            <div className="text-center">
              <div className="mb-4">
                <h6>Signature:</h6>
                <div className="border rounded p-3 bg-light">
                  <img
                    src={agreement.signatureData}
                    alt="Signature"
                    className="img-fluid"
                    style={{
                      maxHeight: '200px',
                      maxWidth: '100%'
                    }}
                  />
                </div>
              </div>

              <Alert variant="info">
                <div className="row">
                  <div className="col-md-6">
                    <p className="mb-2">
                      <strong>Agreement:</strong><br />
                      <span className="text-truncate d-inline-block" style={{ maxWidth: '200px' }}>
                        {agreement.title}
                      </span>
                    </p>
                    <p className="mb-2">
                      <strong>Signed by:</strong><br />
                      <span className="text-primary">{agreement.signedByName || 'Unknown'}</span>
                    </p>
                  </div>
                  <div className="col-md-6">
                    <p className="mb-2">
                      <strong>Date:</strong><br />
                      <span className="text-primary">
                        {agreement.signedAt ? new Date(agreement.signedAt).toLocaleString() : 'N/A'}
                      </span>
                    </p>
                  </div>
                </div>
              </Alert>
            </div>
          ) : (
            <Alert variant="warning">
              <h5>No Signature Available</h5>
              <p>This agreement doesn't have a signature image stored.</p>
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSignatureView(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}