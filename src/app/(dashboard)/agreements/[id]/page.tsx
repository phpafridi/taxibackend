"use client";

import { useState, useEffect } from 'react';
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
  Stack,
  Form
} from 'react-bootstrap';
import {
  FileText,
  Calendar,
  CurrencyPound,
  Person,
  CarFront,
  ShieldCheck,
  Phone,
  Envelope,
  House,
  FileEarmarkText,
  Printer,
  Send,
  Pencil,
  ArrowLeft,
  Trash,
  Download,
  Share,
  CheckCircle,
  Clock,
  Save
} from 'react-bootstrap-icons';
import { toast } from 'sonner';
import Confetti from 'react-confetti';

import {
  formatDate,
  calculateDaysRemaining,
  getExpiryBadgeColor
} from "../../../../../lib/dateUtils";

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
  // Check-in fields from your schema
  dateIn: string | null;
  damageInMajorDamage: boolean | null;
  damageInDent: boolean | null;
  damageInScratch: boolean | null;
  damageInMissing: boolean | null;
  damageInChip: boolean | null;
  damageInNotes: string | null;

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Signature view states
  const [showSignatureView, setShowSignatureView] = useState(false);

  // Confetti states
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [isClient, setIsClient] = useState(false);

  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    dateIn: '',
    damageInMajorDamage: false,
    damageInDent: false,
    damageInScratch: false,
    damageInMissing: false,
    damageInChip: false,
    damageInNotes: '',
  });

  // Get the ID from params
  const id = params?.id as string;

  useEffect(() => {
    setIsClient(true);

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    if (id && id !== 'undefined' && id !== 'null') {
      fetchAgreement(id);
    } else {
      setError('No valid agreement ID provided');
      setLoading(false);
    }

    return () => window.removeEventListener("resize", handleResize);
  }, [id]);

  // Play sound function
  const playSound = (soundType: 'success' | 'error') => {
    if (typeof window !== 'undefined') {
      try {
        const audio = new Audio(`/notifications/${soundType}.wav`);
        audio.volume = 0.7;

      } catch (error) {
        console.log("Sound file not found or error playing sound:", error);
      }
    }
  };

  // Show confetti effect
  const showConfettiEffect = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 5000);
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
          console.log('Component: Raw error:', text);
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
      console.error('Component: Fetch error:', err);
      setError(err.message || 'Failed to load agreement');
      setAgreement(null);
      playSound('error');
    } finally {
      setLoading(false);
    }
  };

  // Open edit modal and populate with current data
  const handleOpenEditModal = () => {
    if (!agreement) return;

    setEditFormData({
      dateIn: agreement.dateIn ? new Date(agreement.dateIn).toISOString().split('T')[0] : '',
      damageInMajorDamage: agreement.damageInMajorDamage || false,
      damageInDent: agreement.damageInDent || false,
      damageInScratch: agreement.damageInScratch || false,
      damageInMissing: agreement.damageInMissing || false,
      damageInChip: agreement.damageInChip || false,
      damageInNotes: agreement.damageInNotes || '',
    });
    setShowEditModal(true);
  };

  // Handle edit form changes
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setEditFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setEditFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle edit form submission
  const handleEditSubmit = async () => {
    if (!id || !agreement) return;

    try {
      setEditing(true);

      const payload = {
        dateIn: editFormData.dateIn || null,
        damageInMajorDamage: editFormData.damageInMajorDamage,
        damageInDent: editFormData.damageInDent,
        damageInScratch: editFormData.damageInScratch,
        damageInMissing: editFormData.damageInMissing,
        damageInChip: editFormData.damageInChip,
        damageInNotes: editFormData.damageInNotes,
      };

      const response = await fetch(`/api/agreements/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Check-in details updated successfully!');
        playSound('success');
        setShowEditModal(false);
        fetchAgreement(id); // Refresh agreement data
      } else {
        throw new Error(data.error || 'Failed to update check-in details');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update check-in details');
      playSound('error');
      console.error('Error updating check-in:', error);
    } finally {
      setEditing(false);
    }
  };

  const handleTerminateAgreement = async () => {
    console.log('🚀 Terminate clicked - ID:', id);
    console.log('🚀 Agreement data:', agreement);

    if (!id) {
      toast.error('Agreement ID is missing');
      return;
    }

    const parsedId = parseInt(id);
    console.log('🚀 Parsed ID:', parsedId);

    if (isNaN(parsedId)) {
      toast.error(`Invalid agreement ID: ${id}`);
      return;
    }

    const agreementType = agreement?.type === 'HIRE_AGREEMENT' ? 'Hire Agreement' : 'Insurance Certificate';
    const carInfo = agreement?.car ? ` (Car: ${agreement.car.registration})` : '';

    const confirmMessage = `🚨 ARE YOU SURE YOU WANT TO TERMINATE?\n\n` +
      `Agreement: "${agreement?.title}"${carInfo}\n` +
      `Type: ${agreementType}\n\n` +
      `This will:\n` +
      `1. Mark agreement as TERMINATED\n` +
      `2. Set agreement as inactive\n` +
      `3. Send notifications to admin & driver\n` +
      `4. ONLY release car/driver if NO OTHER active agreements exist\n\n` +
      `This action cannot be undone!`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      toast.loading('Terminating agreement...');

      const apiUrl = `/api/agreements/${parsedId}/terminate`;
      console.log('🚀 Calling API:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
      });

      console.log('🚀 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('🚀 Error data:', errorData);
        throw new Error(errorData.error || 'Failed to terminate agreement');
      }

      const data = await response.json();
      console.log('🚀 Success data:', data);

      if (data.success) {
        toast.dismiss();
        toast.success('✅ Agreement terminated successfully!');
        playSound('success');
        fetchAgreement(id);
      } else {
        throw new Error(data.error || 'Failed to terminate agreement');
      }
    } catch (err: any) {
      toast.dismiss();
      toast.error(`❌ ${err.message}`);
      playSound('error');
      console.error('🚀 Termination error:', err);
    }
  };

  const handleRefresh = () => {
    if (id) {
      fetchAgreement(id);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const response = await fetch(`/api/agreements/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete agreement');
      }

      const data = await response.json();

      if (data.success) {
        setShowDeleteModal(false);
        toast.success('Agreement deleted successfully');
        playSound('success');
        router.push('/agreements');
      } else {
        throw new Error(data.error || 'Failed to delete agreement');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete agreement');
      playSound('error');
    } finally {
      setDeleting(false);
    }
  };

  const handleShare = () => {
    if (agreement?.driver?.email) {
      const subject = encodeURIComponent(agreement.title);
      const body = encodeURIComponent(`Please review and sign the agreement at: ${window.location.href}`);
      window.open(`mailto:${agreement.driver.email}?subject=${subject}&body=${body}`);
      toast.success('Email client opened for sharing agreement');
      playSound('success');
    } else {
      toast.error('Driver email not available for sharing');
      playSound('error');
    }
  };

  const handleSendAgreement = async () => {
    try {
      toast.loading('Sending agreement...');

      const response = await fetch(`/api/agreements/${id}/send`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send agreement');
      }

      const data = await response.json();

      if (data.success) {
        toast.dismiss();
        toast.success('Agreement sent successfully!');
        playSound('success');
        showConfettiEffect();
        fetchAgreement(id);
      } else {
        throw new Error(data.error || 'Failed to send agreement');
      }
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || 'Failed to send agreement');
      playSound('error');
    }
  };

  // Helper function to format Decimal values
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
      case 'TERMINATED':
        return <Badge bg="dark">TERMINATED</Badge>;
      case 'CANCELLED':
        return <Badge bg="danger">CANCELLED</Badge>;
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
        return 'Insurance Certificate / Use Agreement';
      default:
        return agreement?.type?.replace('_', ' ') || 'Agreement';
    }
  };

  // Check if agreement is active (isActive = true/1)
  const isAgreementActive = agreement?.isActive === true;

  // Check if it's a hire agreement and show edit button for check-in
  const isHireAgreement = agreement?.type === 'HIRE_AGREEMENT';
  const isInsuranceCertificate = agreement?.type === 'INSURANCE_CERTIFICATE';

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
        <p className="mt-3">Loading agreement...</p>
        <p className="text-muted small">ID: {id}</p>
      </Container>
    );
  }

  if (error || !agreement) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Agreement</Alert.Heading>
          <p>{error || 'Agreement not found'}</p>
          <div className="d-flex flex-wrap gap-2 mt-3">
            <Button variant="outline-danger" onClick={() => router.push('/agreements')}>
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

  const handleDownloadReadOnlyPDF = async () => {
    try {
      toast.loading('Creating non-editable PDF...');

      const response = await fetch(`/api/agreements/${id}/generate-pdf`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `READ_ONLY_${agreement?.title.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.dismiss();
      toast.success('Non-editable PDF downloaded ✓');
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

  return (
    <>
      {/* Confetti Effect */}
      {showConfetti && isClient && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={200}
          gravity={0.1}
          colors={['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']}
        />
      )}

      <Container className="py-4 py-md-5">
        {/* Header */}
        <Row className="mb-4">
          <Col>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3">
              <div className="w-100">
                <Button
                  variant="outline-secondary"
                  onClick={() => router.push('/agreements')}
                  className="mb-3"
                  size="sm"
                >
                  <ArrowLeft className="me-2" />
                  Back
                </Button>
                <h1 className="h3 h2-md mb-2 text-break">
                  {getTypeIcon()}
                  {agreement.title}
                </h1>
                {agreement.endDate && (
                  <Badge
                    bg={getExpiryBadgeColor(agreement.endDate)}
                    className={`text-nowrap d-inline-flex align-items-center gap-1 mt-1`}
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.5rem'
                    }}
                  >
                    <Calendar
                      size={12}
                      className={'me-1'}
                      style={{ marginTop: '-1px' }}
                    />
                    <span>
                      {calculateDaysRemaining(agreement.endDate)}
                    </span>
                  </Badge>
                )}

                <Stack direction="horizontal" gap={2} className="flex-wrap">
                  {getStatusBadge(agreement.status)}
                  <Badge bg={isHireAgreement ? "primary" : "info"}>
                    {getTypeLabel()}
                  </Badge>

                  <span className="text-muted small">
                    Created: {new Date(agreement.createdAt).toLocaleDateString()}
                  </span>
                </Stack>
              </div>

              <div className="d-flex flex-wrap gap-2 align-self-stretch align-self-md-end">
                {isHireAgreement ? (
                  <Button
                    variant="outline-success"
                    onClick={handleDownloadReadOnlyPDF}
                    size="sm"
                    title="Download Non-editable PDF"
                  >
                    <Download className="me-1" />
                    <span className="d-none d-md-inline">Download PDF</span>
                  </Button>
                ) : (
                  <Button
                    variant="outline-info"
                    onClick={handleDownloadInsurancePDF}
                    size="sm"
                    title="Download Insurance Certificate"
                  >
                    <ShieldCheck className="me-1" />
                    <span className="d-none d-md-inline">Download Certificate</span>
                  </Button>
                )}
                {agreement.driver && (
                  <Button variant="outline-info" onClick={handleShare} size="sm">
                    <Share className="me-1" />
                    <span className="d-none d-md-inline">Share</span>
                  </Button>
                )}
              </div>
            </div>
          </Col>
        </Row>

        {/* Check-in Information Section - Only for Hire Agreements */}
        {isHireAgreement && (
          <Row className="mb-4">
            <Col>
              <Card>
                <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 fs-6 d-flex align-items-center">
                    <Calendar className="me-2" />
                    Check-in Information
                    {agreement.dateIn && (
                      <Badge bg="light" text="dark" className="ms-2 small">
                        {new Date(agreement.dateIn).toLocaleDateString()}
                      </Badge>
                    )}
                    {!agreement.dateIn && (
                      <Badge bg="secondary" className="ms-2 small">
                        Not recorded
                      </Badge>
                    )}
                  </h5>
                  <div className="d-flex gap-2 align-items-center">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={handleOpenEditModal}
                    >
                      <Pencil className="me-1" />
                      Edit Check-in
                    </Button>
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0"
                      onClick={(e) => {
                        const target = e.currentTarget;
                        const cardBody = document.getElementById('checkin-details');
                        if (cardBody) {
                          const isHidden = cardBody.style.display === 'none';
                          cardBody.style.display = isHidden ? 'block' : 'none';
                          // Rotate chevron icon
                          const svg = target.querySelector('svg');
                          if (svg) {
                            svg.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
                          }
                        }
                      }}
                      style={{ transition: 'transform 0.2s' }}
                    >
                      <svg
                        width="16"
                        height="16"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                        style={{ transition: 'transform 0.2s' }}
                      >
                        <path
                          fillRule="evenodd"
                          d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"
                        />
                      </svg>
                    </Button>
                  </div>
                </Card.Header>
                <Card.Body
                  id="checkin-details"
                  style={{ display: 'none' }}
                >
                  <Row>
                    <Col md={4}>
                      <p className="mb-2">
                        <strong>Date In:</strong><br />
                        {agreement.dateIn ? new Date(agreement.dateIn).toLocaleDateString() : 'Not recorded'}
                      </p>
                    </Col>
                    <Col md={8}>
                      <div className="mb-2">
                        <strong>Damage Check-in:</strong>
                        <div className="d-flex flex-wrap gap-3 mt-2">
                          {agreement.damageInMajorDamage && <Badge bg="danger">Major Damage</Badge>}
                          {agreement.damageInDent && <Badge bg="warning" text="dark">Dent</Badge>}
                          {agreement.damageInScratch && <Badge bg="info">Scratch</Badge>}
                          {agreement.damageInMissing && <Badge bg="secondary">Missing</Badge>}
                          {agreement.damageInChip && <Badge bg="light" text="dark">Chip</Badge>}
                          {!agreement.damageInMajorDamage &&
                            !agreement.damageInDent &&
                            !agreement.damageInScratch &&
                            !agreement.damageInMissing &&
                            !agreement.damageInChip && (
                              <Badge bg="success">No Damage</Badge>
                            )}
                        </div>
                      </div>
                      {agreement.damageInNotes && (
                        <div className="mt-2">
                          <strong>Notes:</strong>
                          <p className="mb-0 text-muted small">{agreement.damageInNotes}</p>
                        </div>
                      )}
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}
        {/* Status Cards */}
        <Row className="mb-4 g-3">
          {isHireAgreement ? (
            <>
              {/* HIRE AGREEMENT CARDS */}
              <Col xs={12} sm={6} md={3}>
                <Card className="h-100">
                  <Card.Body className="text-center">
                    <Person size={24} className="text-primary mb-2" />
                    <h6 className="mb-2">Driver</h6>
                    {agreement.driver ? (
                      <>
                        <h5 className="mb-1 fs-6">{agreement.driver.name}</h5>
                        <p className="text-muted small mb-0 text-truncate" title={agreement.driver.email}>
                          {agreement.driver.email}
                        </p>
                        {agreement.driver.phone && (
                          <p className="text-muted small mb-0">{agreement.driver.phone}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-muted small">Not assigned</p>
                    )}
                  </Card.Body>
                </Card>
              </Col>

              <Col xs={12} sm={6} md={3}>
                <Card className="h-100">
                  <Card.Body className="text-center">
                    <CarFront size={24} className="text-success mb-2" />
                    <h6 className="mb-2">Vehicle</h6>
                    {agreement.car ? (
                      <>
                        <h5 className="mb-1 fs-6">{agreement.car.make} {agreement.car.model}</h5>
                        <p className="text-muted small mb-0">{agreement.car.registration}</p>
                      </>
                    ) : (
                      <p className="text-muted small">Not assigned</p>
                    )}
                  </Card.Body>
                </Card>
              </Col>

              <Col xs={12} sm={6} md={3}>
                <Card className="h-100">
                  <Card.Body className="text-center">
                    <CurrencyPound size={24} className="text-warning mb-2" />
                    <h6 className="mb-2">Financial</h6>
                    <p className="mb-1 small">
                      Weekly: <strong>£{formatDecimal(agreement.weeklyRate)}</strong>
                    </p>
                    <p className="mb-0 small">
                      Deposit: <strong>£{formatDecimal(agreement.depositAmount)}</strong>
                    </p>
                  </Card.Body>
                </Card>
              </Col>

              <Col xs={12} sm={6} md={3}>
                <Card className="h-100">
                  <Card.Body className="text-center">
                    <Calendar size={24} className="text-info mb-2" />
                    <h6 className="mb-2">Dates</h6>
                    {agreement.startDate ? (
                      <>
                        <p className="mb-1 small">
                          Start: <strong>{new Date(agreement.startDate).toLocaleDateString()}</strong>
                        </p>
                        <p className="mb-1 small">
                          End: <strong>{agreement.endDate ? new Date(agreement.endDate).toLocaleDateString() : 'Open'}</strong>
                        </p>
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
                      </>
                    ) : (
                      <p className="text-muted small">Dates not set</p>
                    )}
                    {agreement.signedAt && (
                      <p className="mb-0 small">
                        Signed: {new Date(agreement.signedAt).toLocaleDateString()}
                      </p>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </>
          ) : (
            <>
              {/* INSURANCE CERTIFICATE CARDS */}
              <Col xs={12} md={4}>
                <Card className="h-100">
                  <Card.Body className="text-center">
                    <House size={24} className="text-primary mb-2" />
                    <h6 className="mb-2">Company Details</h6>
                    {agreement.createdByUser ? (
                      <>
                        <h5 className="mb-1 fs-6">{agreement.createdByUser.name}</h5>
                        <p className="text-muted small mb-0 text-truncate" title={agreement.createdByUser.email}>
                          {agreement.createdByUser.email}
                        </p>
                      </>
                    ) : (
                      <p className="text-muted small">Company information</p>
                    )}
                    <div className="mt-2">
                      <Phone size={14} className="me-1" />
                      <span className="small">07984650186</span>
                    </div>
                    <div>
                      <Envelope size={14} className="me-1" />
                      <span className="small text-truncate d-block" title="atanveer@hotmail.co.uk">
                        atanveer@hotmail.co.uk
                      </span>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col xs={12} sm={6} md={4}>
                <Card className="h-100">
                  <Card.Body className="text-center">
                    <Person size={24} className="text-success mb-2" />
                    <h6 className="mb-2">Authorized Driver</h6>
                    {agreement.driver ? (
                      <>
                        <h5 className="mb-1 fs-6">{agreement.driver.name}</h5>
                        <p className="text-muted small mb-0 text-truncate" title={agreement.driver.email}>
                          {agreement.driver.email}
                        </p>
                        {agreement.driver.phone && (
                          <p className="text-muted small mb-0">
                            <Phone size={12} className="me-1" />
                            {agreement.driver.phone}
                          </p>
                        )}
                        {agreement.signedByName && (
                          <p className="mt-2 mb-0 small">
                            Signed by: <strong>{agreement.signedByName}</strong>
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-muted small">Driver not assigned</p>
                    )}
                  </Card.Body>
                </Card>
              </Col>

              <Col xs={12} sm={6} md={4}>
                <Card className="h-100">
                  <Card.Body className="text-center">
                    <CarFront size={24} className="text-warning mb-2" />
                    <h6 className="mb-2">Authorized Vehicle</h6>
                    {agreement.car ? (
                      <>
                        <h5 className="mb-1 fs-6">{agreement.car.make} {agreement.car.model}</h5>
                        <p className="text-muted small mb-0">Reg: {agreement.car.registration}</p>
                        {agreement.startDate && (
                          <p className="mb-1 small">
                            Valid from: <strong>{new Date(agreement.startDate).toLocaleDateString()}</strong>
                          </p>
                        )}
                        {agreement.endDate && (
                          <>
                            <p className="mb-0 small">
                              Valid until: <strong>{new Date(agreement.endDate).toLocaleDateString()}</strong>
                            </p>
                            <div className="mt-1">
                              <Badge
                                bg={getExpiryBadgeColor(agreement.endDate)}
                                className="text-nowrap"
                              >
                                {calculateDaysRemaining(agreement.endDate)}
                              </Badge>
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <p className="text-muted small">Vehicle not assigned</p>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </>
          )}
        </Row>

        {/* Additional Info for Insurance Certificate */}
        {isInsuranceCertificate && agreement.insurance && (
          <Row className="mb-4">
            <Col md={12}>
              <Card>
                <Card.Header className="bg-light">
                  <h5 className="mb-0 fs-6">Insurance Details</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col xs={12} md={4}>
                      <p className="mb-1 small">
                        <strong>Provider:</strong> {agreement.insurance.provider}
                      </p>
                    </Col>
                    <Col xs={12} md={4}>
                      <p className="mb-1 small">
                        <strong>Policy Number:</strong> {agreement.insurance.policyNumber}
                      </p>
                    </Col>
                    <Col xs={12} md={4}>
                      <p className="mb-1 small">
                        <strong>Coverage:</strong> Private Hire & Delivery Services
                      </p>
                    </Col>
                  </Row>
                  <Alert variant="info" className="mt-3 mb-0 small">
                    <strong>Authorized Use:</strong> This certificate authorizes the use of the vehicle for ALL private hire appointments,
                    including Uber trips and food/delivery services through the Uber and bolt platform.
                  </Alert>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {/* Agreement Content WITH SIGNATURE AT THE END */}
        <Row>
          <Col lg={agreement.terms ? (isHireAgreement ? 8 : 12) : 12}>
            <Card className="mb-4">
              <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fs-6">
                  {isHireAgreement ? 'Agreement Content' : 'Certificate Content'}
                </h5>
                <Badge bg="light" text="dark" className="fs-6">
                  {isHireAgreement ? 'Hire Terms' : 'Authorization Document'}
                </Badge>
              </Card.Header>
              <Card.Body>
                <div className="agreement-content" style={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: isHireAgreement ? 'inherit' : 'monospace',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}>
                  {agreement.content || 'No content provided.'}

                  {/* SIGNATURE LINE AT THE END OF THE CONTENT */}
                  <div className="mt-4 pt-3">
                    <h6 className="mb-3 text-center fs-6">SIGNATURE</h6>

                    {agreement.status === 'SIGNED' && agreement.signatureData ? (
                      <div className="text-center">
                        <div className="border border-dark p-3 d-inline-block" style={{ minWidth: '250px', maxWidth: '100%' }}>
                          <img
                            src={agreement.signatureData}
                            alt="Signature"
                            className="img-fluid"
                            style={{
                              maxHeight: '80px',
                              maxWidth: '100%',
                              objectFit: 'contain'
                            }}
                          />
                          <hr className="my-2" />
                          <p className="mb-0 small">
                            <strong>{agreement.signedByName || 'Driver'}</strong><br />
                            <small>Date: {agreement.signedAt ? new Date(agreement.signedAt).toLocaleDateString() : new Date().toLocaleDateString()}</small>
                          </p>
                        </div>
                      </div>
                    ) : agreement.status === 'PENDING_SIGNATURE' ? (
                      <div className="text-center">
                        <div className="border border-dark p-3 d-inline-block" style={{ minWidth: '250px', maxWidth: '100%' }}>
                          <div className="border-dashed border-2 p-2" style={{
                            height: '70px',
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
                            <small>Date: {new Date().toLocaleDateString()}</small>
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="border border-dark p-3 d-inline-block" style={{ minWidth: '250px', maxWidth: '100%' }}>
                          <div className="p-2" style={{ height: '70px' }}>
                            <div className="h-100 d-flex align-items-center justify-content-center">
                              <span className="text-muted small">No signature required</span>
                            </div>
                          </div>
                          <hr className="my-2" />
                          <p className="mb-0 small">
                            <small>Agreement status: {agreement.status}</small>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          {isHireAgreement && agreement.terms && (
            <Col lg={4}>
              <Card>
                <Card.Header className="bg-white">
                  <h5 className="mb-0 fs-6">Terms & Conditions</h5>
                </Card.Header>
                <Card.Body>
                  <div style={{
                    whiteSpace: 'pre-wrap',
                    fontSize: '12px',
                    maxHeight: '400px',
                    overflowY: 'auto'
                  }}>
                    {agreement.terms}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          )}
        </Row>

        {/* SIGNATURE SECTION - SHOWS IN MAIN VIEW */}
        {agreement.status === 'SIGNED' && agreement.signatureData && (
          <Row className="mt-4">
            <Col lg={12}>
              <Card>
                <Card.Header className="bg-white">
                  <h5 className="mb-0 fs-6">
                    <FileEarmarkText className="me-2 text-primary" />
                    Signature Area
                  </h5>
                </Card.Header>
                <Card.Body>
                  <div className="text-center">
                    <div className="mb-3">
                      <h6 className="mb-2 fs-6">Signed Signature:</h6>
                      <div className="border rounded p-3 bg-light d-inline-block" style={{ maxWidth: '100%' }}>
                        <img
                          src={agreement.signatureData}
                          alt="Signature"
                          className="img-fluid"
                          style={{
                            maxHeight: '120px',
                            maxWidth: '100%',
                            objectFit: 'contain'
                          }}
                        />
                      </div>
                    </div>

                    <Row className="text-start g-3">
                      <div className="col-12 col-md-6">
                        <Card className="h-100">
                          <Card.Body>
                            <h6 className="mb-2 fs-6">Signature Details:</h6>
                            <p className="mb-2">
                              <strong>Signed by:</strong><br />
                              <span className="text-primary fs-6">{agreement.signedByName || 'Unknown'}</span>
                            </p>
                            <p className="mb-2">
                              <strong>Date:</strong><br />
                              <span className="text-primary small">
                                {agreement.signedAt ? new Date(agreement.signedAt).toLocaleString() : 'N/A'}
                              </span>
                            </p>
                            <p className="mb-0">
                              <strong>Status:</strong><br />
                              <Badge bg="success" className="mt-1">SIGNED</Badge>
                            </p>
                          </Card.Body>
                        </Card>
                      </div>

                      <div className="col-12 col-md-6">
                        <Card className="h-100">
                          <Card.Body>
                            <h6 className="mb-2 fs-6">Actions:</h6>
                            <div className="d-flex flex-column gap-2">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => {
                                  if (agreement.signatureData) {
                                    const link = document.createElement('a');
                                    link.href = agreement.signatureData;
                                    link.download = `signature_agreement_${agreement.id}.png`;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    toast.success('Signature downloaded!');
                                  }
                                }}
                              >
                                <Download className="me-2" />
                                Download Signature
                              </Button>

                              <Button
                                variant="outline-info"
                                size="sm"
                                onClick={() => setShowSignatureView(true)}
                              >
                                <FileEarmarkText className="me-2" />
                                View Full Signature
                              </Button>

                              {agreement.status === 'SIGNED' && (
                                <Button
                                  variant="outline-danger"
                                  onClick={handleTerminateAgreement}
                                  size="sm"
                                >
                                  <FileEarmarkText className="me-2" />
                                  TERMINATE AGREEMENT
                                </Button>
                              )}
                            </div>
                          </Card.Body>
                        </Card>
                      </div>
                    </Row>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {/* Action Buttons */}
        <Row className="mt-4">
          <Col>
            <div className="d-flex flex-wrap gap-2">
              {/* Send Agreement Button - Show only when status is DRAFT and agreement is not active */}
              {agreement.status === 'DRAFT' && (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSendAgreement}
                    className="flex-grow-1 flex-sm-grow-0"
                  >
                    <Send className="me-2" />
                    {agreement.type === 'HIRE_AGREEMENT' ? 'Send For Sign' : 'Send For Sign'}
                  </Button>

                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => setShowDeleteModal(true)}
                    className="flex-grow-1 flex-sm-grow-0"
                  >
                    <Trash className="me-2" />
                    Delete
                  </Button>
                </>
              )}

              {agreement.status === 'PENDING_SIGNATURE' && agreement.driver && (
                <>
                  <Button
                    variant="secondary"
                    disabled
                    size="sm"
                    className="d-flex align-items-center flex-grow-1 flex-sm-grow-0"
                  >
                    <Clock className="me-2" />
                    Waiting for Sign
                  </Button>
                </>
              )}

              {agreement.status === 'SIGNED' && agreement.signatureData && (
                <>
                  <Button
                    variant="outline-success"
                    size="sm"
                    onClick={() => setShowSignatureView(true)}
                    className="flex-grow-1 flex-sm-grow-0"
                  >
                    <FileEarmarkText className="me-2" />
                    View Signature
                  </Button>

                  {isHireAgreement && (
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={handleOpenEditModal}
                      className="flex-grow-1 flex-sm-grow-0"
                    >
                      <Pencil className="me-2" />
                      Edit Check-in
                    </Button>
                  )}
                </>
              )}

              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => router.push('/agreements')}
                className="flex-grow-1 flex-sm-grow-0"
              >
                <ArrowLeft className="me-2" />
                Back to List
              </Button>
            </div>
          </Col>
        </Row>

        {/* Footer Info */}
        <Row className="mt-4">
          <Col>
            <Alert variant="light" className="border small">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
                <div>
                  <h6 className="mb-1 fs-6">Document Information</h6>
                  <p className="mb-0 text-muted">
                    {isHireAgreement
                      ? 'Hire Agreement ID: ' + agreement.id
                      : 'Certificate ID: ' + agreement.id
                    } • Created by: {agreement.createdByUser?.name || 'System'}
                    {isAgreementActive && (
                      <span className="ms-2 text-warning">
                        • <strong>Sent for signing</strong>
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-md-end">
                  <p className="mb-0 text-muted">
                    Updated: {new Date(agreement.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Alert>
          </Col>
        </Row>
      </Container>

      {/* Full Signature View Modal */}
      <Modal show={showSignatureView} onHide={() => setShowSignatureView(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Signature Full View</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {agreement?.signatureData ? (
            <div className="text-center">
              <div className="mb-4">
                <h6>Signature Preview:</h6>
                <div className="border rounded p-3 bg-light">
                  <img
                    src={agreement.signatureData}
                    alt="Signature"
                    className="img-fluid"
                    style={{
                      maxHeight: '200px',
                      maxWidth: '100%',
                      objectFit: 'contain'
                    }}
                  />
                </div>
              </div>

              <div className="text-start">
                <Alert variant="info">
                  <Row>
                    <div className="col-md-6">
                      <p className="mb-2 small">
                        <strong>Agreement:</strong><br />
                        {agreement.title}
                      </p>
                      <p className="mb-2 small">
                        <strong>Signed by:</strong><br />
                        <span className="text-primary">{agreement.signedByName || 'Unknown'}</span>
                      </p>
                    </div>
                    <div className="col-md-6">
                      <p className="mb-2 small">
                        <strong>Signature Date:</strong><br />
                        <span className="text-primary">
                          {agreement.signedAt ? new Date(agreement.signedAt).toLocaleString() : 'N/A'}
                        </span>
                      </p>
                      <p className="mb-2 small">
                        <strong>Data Size:</strong><br />
                        {agreement.signatureData.length} characters
                      </p>
                    </div>
                  </Row>
                </Alert>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <Alert variant="warning">
                <h5 className="fs-6">No Signature Available</h5>
                <p className="mb-0 small">
                  This agreement doesn't have a signature image stored.
                </p>
              </Alert>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSignatureView(false)} size="sm">
            Close
          </Button>

          {agreement?.signatureData && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const link = document.createElement('a');
                link.href = agreement.signatureData!;
                link.download = `signature_agreement_${agreement.id}_full.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success('Signature downloaded!');
              }}
            >
              <Download className="me-2" />
              Download Signature
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Edit Check-in Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Check-in Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Date In *</Form.Label>
                  <Form.Control
                    type="date"
                    name="dateIn"
                    value={editFormData.dateIn}
                    onChange={handleEditChange}
                    required
                  />
                  <Form.Text className="text-muted">
                    Enter the actual check-in date
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col>
                <Form.Label className="fw-bold">Damage Check-in</Form.Label>
                <p className="text-muted small mb-3">Check all that apply:</p>
                <div className="border p-3 rounded">
                  <Row>
                    <Col md={6}>
                      <Form.Check
                        type="checkbox"
                        id="damageInMajorDamage"
                        name="damageInMajorDamage"
                        label="Major Damage"
                        checked={editFormData.damageInMajorDamage}
                        onChange={handleEditChange}
                        className="mb-3"
                      />
                      <Form.Check
                        type="checkbox"
                        id="damageInDent"
                        name="damageInDent"
                        label="Dent"
                        checked={editFormData.damageInDent}
                        onChange={handleEditChange}
                        className="mb-3"
                      />
                      <Form.Check
                        type="checkbox"
                        id="damageInScratch"
                        name="damageInScratch"
                        label="Scratch"
                        checked={editFormData.damageInScratch}
                        onChange={handleEditChange}
                        className="mb-3"
                      />
                    </Col>
                    <Col md={6}>
                      <Form.Check
                        type="checkbox"
                        id="damageInMissing"
                        name="damageInMissing"
                        label="Missing"
                        checked={editFormData.damageInMissing}
                        onChange={handleEditChange}
                        className="mb-3"
                      />
                      <Form.Check
                        type="checkbox"
                        id="damageInChip"
                        name="damageInChip"
                        label="Chip"
                        checked={editFormData.damageInChip}
                        onChange={handleEditChange}
                        className="mb-3"
                      />
                    </Col>
                  </Row>
                </div>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col>
                <Form.Group>
                  <Form.Label>Damage Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    name="damageInNotes"
                    value={editFormData.damageInNotes}
                    onChange={handleEditChange}
                    rows={4}
                    placeholder="Enter detailed notes about the vehicle condition at check-in..."
                  />
                  <Form.Text className="text-muted">
                    Describe any damage, location, severity, etc.
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Alert variant="info" className="small">
              <strong>Note:</strong> This will update the check-in details for this hire agreement.
              Make sure to record accurate information for vehicle condition tracking.
            </Alert>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)} disabled={editing}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleEditSubmit} disabled={editing}>
            {editing ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="me-2" />
                Save Changes
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-6">Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="small">Are you sure you want to delete this agreement?</p>
          <p className="text-danger small">
            <strong>Warning:</strong> This action cannot be undone. Signed agreements cannot be deleted.
          </p>
          <p className="small">
            Agreement: <strong>{agreement?.title}</strong>
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={deleting} size="sm">
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting} size="sm">
            {deleting ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Deleting...
              </>
            ) : (
              <>
                <Trash className="me-2" />
                Delete Agreement
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}