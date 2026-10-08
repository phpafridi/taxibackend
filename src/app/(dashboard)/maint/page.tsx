// app/admin/maintenance/pending/page.tsx
'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Row,
  Col,
  Card,
  Button,
  Badge,
  Spinner,
  Alert,
  Modal,
  Form,
  InputGroup,
  Image,
  Carousel,
  OverlayTrigger,
  Tooltip,
} from "react-bootstrap";
import {
  Search as IconSearch,
  CarFront as IconCar,
  Person as IconPerson,
  Calendar as IconCalendar,
  FileText as IconFile,
  Eye as IconView,
  Download as IconDownload,
  CheckCircle as IconApprove,
  XCircle as IconReject,
  FileEarmarkImage as IconImageFile,
  X as IconClose,
  ChevronLeft as IconChevronLeft,
  ChevronRight as IconChevronRight,
  ZoomIn as IconZoomIn,
  ArrowClockwise as IconRefresh,
} from "react-bootstrap-icons";
import { toast } from "sonner";
import Confetti from "react-confetti";

// Based on your API response and Prisma schema
interface MaintenanceDocument {
  id: number;
  type: string;
  name: string;          // Display name
  fileName: string;      // Actual filename
  fileUrl: string;       // URL to file
  fileSize?: number;
  mimeType?: string;
  createdAt: string;     // This is "uploadedAt"
}

interface MaintenanceRequest {
  id: number;
  title: string;
  description: string;
  amount: number;
  createdAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'PAID' | 'CANCELLED';
  car: {
    registration: string;
    model: string;
    make: string;
    year: number;
  };
  driverprofile: {
    user_driverprofile_userIdTouser: {
      name: string;
      email: string;
      phone: string;
    };
  };
  document: MaintenanceDocument[];
}

const MaintenancePage = () => {
  const router = useRouter();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Image preview states
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedImages, setSelectedImages] = useState<{ url: string, filename: string, displayName: string }[]>([]);

  // Mobile states
  const [isMobile, setIsMobile] = useState(false);

  // Search only
  const [searchTerm, setSearchTerm] = useState('');

  // Confetti state
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  // Check mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchMaintenanceRequests();
  }, []);

  const fetchMaintenanceRequests = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch('/api/driver-portal/maintenance-all');

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        // Transform API data to match our interface
        const transformedData = data.data.map((item: any) => ({
          ...item,
          // Ensure document array exists
          document: item.document || []
        }));

        setRequests(transformedData);
      } else {
        setRequests([]);
      }

    } catch (error: any) {
      console.error("Error:", error);
      setError(error.message || "Failed to load maintenance requests");
      toast.error("Failed to load maintenance requests");
      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    await fetchMaintenanceRequests(true);
    toast.info("Refreshing requests...");
  };

  const handleRefreshClick = () => {
    handleRefresh();
  };

  const handleApprove = async (id: number) => {
    if (!confirm("Are you sure you want to approve this request?")) return;

    try {
      const response = await fetch(`/api/driver-portal/maintenance/${id}/approve`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to approve: ${response.status}`);
      }

      // Show confetti
      setShowConfetti(true);

      toast.success("Request approved successfully 🎉");
      const audio = new Audio("/notifications/success.wav");
      audio.play().catch((err) => console.log("Audio play error:", err));
      // Hide confetti after 3 seconds
      setTimeout(() => {
        setShowConfetti(false);
      }, 6000);

      fetchMaintenanceRequests(true);
    } catch (error: any) {
      const audio = new Audio("/notifications/error.wav");
      audio.play().catch((err) => console.log("Audio play error:", err));
      console.error("Error:", error);
      toast.error(error.message || "Failed to approve request");
    }
  };

  const handleReject = async (id: number) => {
    const rejectionReason = prompt("Please provide a reason for rejection:");

    if (!rejectionReason || rejectionReason.trim() === '') {
      toast.error("Rejection reason is required");
      return;
    }

    if (!confirm(`Are you sure you want to reject this request?\n\nReason: ${rejectionReason}`)) return;

    try {
      const response = await fetch(`/api/driver-portal/maintenance/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rejectionReason }),
      });

      if (!response.ok) {
        throw new Error(`Failed to reject: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        toast.warning(data.message || "Request rejected successfully");
        fetchMaintenanceRequests(true);
      } else {
        throw new Error(data.error || "Failed to reject request");
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Failed to reject request");
    }
  };

  const viewDetails = (request: MaintenanceRequest) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  // Function to open image modal
  const openImageModal = (images: { url: string, filename: string, displayName: string }[], index: number = 0) => {
    setSelectedImages(images);
    setSelectedImageIndex(index);
    setShowImageModal(true);
  };

  // Get image documents from a request
  const getImageDocuments = (documents: MaintenanceDocument[]) => {
    return documents
      .filter(doc => isImageFile(doc.fileName, doc.mimeType))
      .map(doc => ({
        url: getDocumentUrl(doc.fileUrl),
        filename: doc.fileName,
        displayName: doc.name || doc.fileName
      }));
  };

  // Get file icon based on type
  const getFileIcon = (filename: string, mimeType?: string) => {
    if (isImageFile(filename, mimeType)) {
      return <IconImageFile className="text-info" size={isMobile ? 14 : 16} />;
    }

    const ext = filename.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'pdf':
        return <IconFile className="text-danger" size={isMobile ? 14 : 16} />;
      case 'doc':
      case 'docx':
        return <IconFile className="text-primary" size={isMobile ? 14 : 16} />;
      case 'xls':
      case 'xlsx':
        return <IconFile className="text-success" size={isMobile ? 14 : 16} />;
      default:
        return <IconFile className="text-secondary" size={isMobile ? 14 : 16} />;
    }
  };

  // Check if file is an image
  const isImageFile = (filename: string, mimeType?: string) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    const ext = filename.toLowerCase();

    if (mimeType && mimeType.startsWith('image/')) {
      return true;
    }

    return imageExtensions.some(extension => ext.endsWith(extension));
  };

  // Get document URL (convert to API route if needed)
  const getDocumentUrl = (fileUrl: string) => {
    // If it's already a full URL, return as-is
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      return fileUrl;
    }

    // If it's a local path starting with /uploads/, convert to API route
    if (fileUrl.startsWith('/uploads/')) {
      const cleanPath = fileUrl.substring(1); // Remove leading slash
      return `/api/upload/${cleanPath}`;
    }

    // For other local paths
    if (fileUrl.startsWith('/')) {
      return `/api${fileUrl}`;
    }

    return fileUrl;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge bg="warning" className="px-2 py-1 fs-7">PENDING</Badge>;
      case 'APPROVED':
        return <Badge bg="success" className="px-2 py-1 fs-7">APPROVED</Badge>;
      case 'REJECTED':
        return <Badge bg="danger" className="px-2 py-1 fs-7">REJECTED</Badge>;
      case 'IN_PROGRESS':
        return <Badge bg="primary" className="px-2 py-1 fs-7">IN PROGRESS</Badge>;
      case 'COMPLETED':
        return <Badge bg="info" className="px-2 py-1 fs-7">COMPLETED</Badge>;
      case 'PAID':
        return <Badge bg="success" className="px-2 py-1 fs-7">PAID</Badge>;
      default:
        return <Badge bg="secondary" className="px-2 py-1 fs-7">{status}</Badge>;
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = searchTerm === '' ||
      request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.car.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.driverprofile.user_driverprofile_userIdTouser.name.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  // Sort by date (newest first) by default
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (loading) {
    return (
      <div className="container-fluid px-3 px-md-4 px-lg-5 py-5">
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading maintenance requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid px-2 px-md-3 px-lg-4 px-xl-5">
      {/* Confetti Animation */}
      {showConfetti && (
        <Confetti
          width={windowDimensions.width}
          height={windowDimensions.height}
          recycle={false}
          numberOfPieces={300}
          gravity={0.5}
          colors={['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']}
        />
      )}

      {/* Mobile Header */}
      {isMobile && (
        <div className="sticky-top bg-white py-3 mb-3 border-bottom" style={{ zIndex: 1000 }}>
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <h4 className="mb-0 fs-5">Maintenance Requests</h4>
              <small className="text-muted">{sortedRequests.length} requests</small>
            </div>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={handleRefreshClick}
              disabled={refreshing}
              className="px-3"
            >
              {/* SIMPLE WORKING SPIN SOLUTION */}
              {refreshing ? (
                <Spinner 
                  animation="border" 
                  size="sm"
                  style={{ 
                    width: '16px', 
                    height: '16px',
                    borderWidth: '2px'
                  }}
                />
              ) : (
                <IconRefresh size={16} />
              )}
            </Button>
          </div>

          {/* Mobile Search Bar */}
          <div className="mt-3">
            <InputGroup size="sm">
              <InputGroup.Text className="bg-light border-end-0">
                <IconSearch size={14} />
              </InputGroup.Text>
              <Form.Control
                type="search"
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-start-0"
              />
              {searchTerm && (
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className="border-start-0"
                >
                  <IconClose size={14} />
                </Button>
              )}
            </InputGroup>
          </div>
        </div>
      )}

      {/* Desktop Header */}
      {!isMobile && (
        <>
          <Row className="mb-4">
            <Col>
              <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
                <div className="flex-grow-1">
                  <h2 className="mb-1 fs-3">Maintenance Requests</h2>
                  <p className="text-muted mb-0">Review and manage maintenance requests</p>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <Button
                    variant="outline-primary"
                    onClick={handleRefreshClick}
                    disabled={refreshing || loading}
                    size="sm"
                    className="d-flex align-items-center gap-2"
                  >
                    {/* SIMPLE WORKING SPIN SOLUTION */}
                    {refreshing ? (
                      <Spinner 
                        animation="border" 
                        size="sm"
                        style={{ 
                          width: '16px', 
                          height: '16px',
                          borderWidth: '2px'
                        }}
                      />
                    ) : (
                      <IconRefresh size={16} />
                    )}
                    Refresh
                  </Button>
                  <Badge bg="info" className="px-3 py-2 fs-6">
                    {sortedRequests.length} requests
                  </Badge>
                </div>
              </div>
            </Col>
          </Row>

          {/* Desktop Search */}
          <Row className="mb-4">
            <Col md={6} lg={4}>
              <InputGroup size="sm">
                <InputGroup.Text className="bg-light">
                  <IconSearch size={14} />
                </InputGroup.Text>
                <Form.Control
                  type="search"
                  placeholder="Search by title, registration, or driver..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <Button
                    variant="outline-secondary"
                    onClick={() => setSearchTerm('')}
                    size="sm"
                  >
                    <IconClose size={14} />
                  </Button>
                )}
              </InputGroup>
            </Col>
          </Row>
        </>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="warning" className="mb-3">
          <div className="d-flex align-items-start">
            <div className="flex-grow-1">
              <Alert.Heading className="h6 mb-1">API Connection Issue</Alert.Heading>
              <p className="mb-2 small">{error}</p>
              <div className="d-flex gap-2">
                <Button variant="outline-warning" size="sm" onClick={() => fetchMaintenanceRequests()}>
                  Retry
                </Button>
                <Button variant="outline-primary" size="sm" onClick={handleRefreshClick}>
                  {/* SIMPLE WORKING SPIN SOLUTION */}
                  {refreshing ? (
                    <Spinner 
                      animation="border" 
                      size="sm"
                      style={{ 
                        width: '14px', 
                        height: '14px',
                        borderWidth: '1.5px',
                        marginRight: '4px'
                      }}
                    />
                  ) : (
                    <IconRefresh size={14} className="me-1" />
                  )}
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </Alert>
      )}

      {/* Main Content - Simple Card List View */}
      <Row className="g-3 mb-4">
        {sortedRequests.map((request) => {
          const imageDocs = getImageDocuments(request.document);
          const hasImages = imageDocs.length > 0;

          return (
            <Col key={request.id} xs={12} md={6} lg={4}>
              <Card className="h-100 shadow-sm border-0">
                <Card.Header className="bg-light border-bottom py-2 px-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <h6 className="mb-0 text-truncate fs-6">{request.title}</h6>
                    {getStatusBadge(request.status)}
                  </div>
                </Card.Header>

                <Card.Body className="p-3">
                  {/* Image Preview Thumbnail */}
                  {hasImages && (
                    <div className="mb-3">
                      <div className="position-relative">
                        <Image
                          src={imageDocs[0].url}
                          alt={imageDocs[0].filename}
                          fluid
                          rounded
                          className="cursor-pointer"
                          style={{
                            height: '120px',
                            width: '100%',
                            objectFit: 'cover'
                          }}
                          onClick={() => openImageModal(imageDocs, 0)}
                        />
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip>Click to view images ({imageDocs.length})</Tooltip>}
                        >
                          <Badge
                            bg="info"
                            className="position-absolute top-0 end-0 m-1"
                            onClick={() => openImageModal(imageDocs, 0)}
                            style={{ cursor: 'pointer' }}
                          >
                            <IconZoomIn size={10} /> {imageDocs.length}
                          </Badge>
                        </OverlayTrigger>
                      </div>
                      <small className="text-muted d-block mt-1">
                        {imageDocs[0].displayName}
                      </small>
                    </div>
                  )}

                  <div className="mb-3">
                    <p className="small text-muted mb-1">Description</p>
                    <p className="mb-2 small" style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {request.description}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="small text-muted">Amount:</span>
                      <strong className="text-primary fs-6">{formatCurrency(request.amount)}</strong>
                    </div>

                    <div className="d-flex justify-content-between align-items-center">
                      <span className="small text-muted">Vehicle:</span>
                      <span className="small">
                        {request.car.registration}
                      </span>
                    </div>

                    <div className="d-flex justify-content-between align-items-center">
                      <span className="small text-muted">Driver:</span>
                      <span className="small">
                        {request.driverprofile.user_driverprofile_userIdTouser.name}
                      </span>
                    </div>

                    <div className="d-flex justify-content-between align-items-center">
                      <span className="small text-muted">Date:</span>
                      <span className="small">
                        {formatDate(request.createdAt)}
                      </span>
                    </div>

                    {request.document.length > 0 && (
                      <div className="pt-2 border-top">
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="small text-muted">
                            <IconFile size={12} className="me-1" />
                            Documents:
                          </span>
                          <Badge bg="info" pill className="small">
                            {request.document.length}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </Card.Body>

                <Card.Footer className="bg-white border-top-0 pt-0 px-3 pb-3">
                  <div className="d-grid gap-2">
                    {request.status === 'PENDING' && (
                      <>
                        <Button
                          variant="success"
                          size="sm"
                          className="w-100 py-2"
                          onClick={() => handleApprove(request.id)}
                        >
                          <IconApprove size={16} className="me-2" />
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          className="w-100 py-2"
                          onClick={() => handleReject(request.id)}
                        >
                          <IconReject size={16} className="me-2" />
                          Reject
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="w-100 py-2"
                      onClick={() => viewDetails(request)}
                    >
                      <IconView size={16} className="me-2" />
                      View Details
                    </Button>
                  </div>
                </Card.Footer>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* Details Modal */}
      <Modal
        show={showDetailsModal}
        onHide={() => setShowDetailsModal(false)}
        size={isMobile ? undefined : "lg"}
        centered
        fullscreen={isMobile ? "sm-down" : undefined}
      >
        {selectedRequest && (
          <>
            <Modal.Header closeButton className={isMobile ? "py-3" : ""}>
              <Modal.Title className={isMobile ? "fs-5" : ""}>
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <h5 className="mb-0">{selectedRequest.title}</h5>
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                  <small className="text-muted">
                    Submitted: {formatDate(selectedRequest.createdAt)}
                  </small>
                </div>
              </Modal.Title>
            </Modal.Header>
            <Modal.Body className={isMobile ? "p-3" : ""}>
              <div className="mb-4">
                <h6 className="text-muted mb-2 small">DESCRIPTION</h6>
                <p className="mb-0">{selectedRequest.description}</p>
              </div>

              <Row className="g-3 mb-4">
                <Col xs={12} md={6}>
                  <h6 className="text-muted mb-2 small">VEHICLE DETAILS</h6>
                  <Card className="bg-light">
                    <Card.Body className="p-3">
                      <div className="d-flex align-items-center">
                        <IconCar className="me-3 text-primary" size={20} />
                        <div>
                          <strong className="d-block">
                            {selectedRequest.car.make} {selectedRequest.car.model}
                          </strong>
                          <div className="small text-muted">
                            {selectedRequest.car.registration} • {selectedRequest.car.year}
                          </div>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>

                <Col xs={12} md={6}>
                  <h6 className="text-muted mb-2 small">DRIVER INFORMATION</h6>
                  <Card className="bg-light">
                    <Card.Body className="p-3">
                      <div className="d-flex align-items-center mb-2">
                        <div className="bg-primary rounded-circle p-2 me-3">
                          <IconPerson className="text-white" size={18} />
                        </div>
                        <div>
                          <strong className="d-block">{selectedRequest.driverprofile.user_driverprofile_userIdTouser.name}</strong>
                          <div className="small text-muted">
                            {selectedRequest.driverprofile.user_driverprofile_userIdTouser.email}
                          </div>
                        </div>
                      </div>
                      <div className="small text-muted d-flex align-items-center">
                        <IconCalendar size={14} className="me-2" />
                        {selectedRequest.driverprofile.user_driverprofile_userIdTouser.phone || 'Not provided'}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <div className="mb-4">
                <h6 className="text-muted mb-2 small">REQUEST DETAILS</h6>
                <Card className="bg-light">
                  <Card.Body className="p-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-muted">Amount Requested:</span>
                      <strong className={`${isMobile ? 'fs-4' : 'fs-3'} text-primary`}>
                        {formatCurrency(selectedRequest.amount)}
                      </strong>
                    </div>
                    <div className="d-flex align-items-center text-muted small">
                      <IconCalendar size={14} className="me-2" />
                      Submitted: {formatDate(selectedRequest.createdAt)}
                    </div>
                  </Card.Body>
                </Card>
              </div>

              {/* Documents Section with Image Preview */}
              {selectedRequest.document && selectedRequest.document.length > 0 && (
                <div className="mt-4">
                  <h6 className="text-muted mb-3 small">SUPPORTING DOCUMENTS</h6>

                  {/* Image Carousel for Images */}
                  {getImageDocuments(selectedRequest.document).length > 0 && (
                    <div className="mb-4">
                      <h6 className="text-muted mb-3 small">ATTACHED IMAGES</h6>
                      <Carousel
                        indicators={!isMobile}
                        controls={!isMobile}
                        interval={null}
                        className="mb-4"
                      >
                        {getImageDocuments(selectedRequest.document).map((image, index) => (
                          <Carousel.Item key={index}>
                            <div
                              className="d-flex justify-content-center align-items-center"
                              style={{
                                backgroundColor: '#f8f9fa',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                height: isMobile ? '250px' : '350px',
                                cursor: 'pointer'
                              }}
                              onClick={() => openImageModal(getImageDocuments(selectedRequest.document), index)}
                            >
                              <Image
                                src={image.url}
                                alt={image.filename}
                                fluid
                                style={{
                                  maxHeight: '100%',
                                  maxWidth: '100%',
                                  objectFit: 'contain'
                                }}
                              />
                            </div>
                            <Carousel.Caption className="bg-dark bg-opacity-50 rounded p-2">
                              <small className="text-white">{image.displayName}</small>
                            </Carousel.Caption>
                          </Carousel.Item>
                        ))}
                      </Carousel>
                    </div>
                  )}

                  {/* All Documents List */}
                  <h6 className="text-muted mb-3 small">ALL DOCUMENTS ({selectedRequest.document.length})</h6>
                  <Row className="g-3">
                    {selectedRequest.document.map((doc) => {
                      const isImage = isImageFile(doc.fileName, doc.mimeType);

                      return (
                        <Col key={doc.id} xs={12} sm={6} md={4}>
                          <Card className="h-100 border hover-shadow">
                            <Card.Body className="p-3">
                              <div className="d-flex align-items-center mb-2">
                                <div className={`rounded p-2 me-2 ${isImage ? 'bg-info' : 'bg-secondary'}`}>
                                  {getFileIcon(doc.fileName, doc.mimeType)}
                                </div>
                                <div className="flex-grow-1">
                                  <div className="text-truncate small" title={doc.name || doc.fileName}>
                                    <strong>{doc.name || doc.fileName}</strong>
                                  </div>
                                  <div className="text-muted smaller">
                                    {doc.fileName} • {doc.type.replace('_', ' ').toLowerCase()}
                                  </div>
                                </div>
                              </div>
                              <div className="d-flex justify-content-between align-items-center">
                                <small className="text-muted">
                                  {formatFileSize(doc.fileSize)} • {new Date(doc.createdAt).toLocaleDateString()}
                                </small>
                                <div className="d-flex gap-1">
                                  {isImage ? (
                                    <OverlayTrigger
                                      placement="top"
                                      overlay={<Tooltip>Preview Image</Tooltip>}
                                    >
                                      <Button
                                        variant="outline-info"
                                        size="sm"
                                        onClick={() => {
                                          const imageDocs = getImageDocuments(selectedRequest.document);
                                          const imageIndex = imageDocs.findIndex(img => img.filename === doc.fileName);
                                          if (imageIndex >= 0) {
                                            openImageModal(imageDocs, imageIndex);
                                          }
                                        }}
                                      >
                                        <IconZoomIn size={12} />
                                      </Button>
                                    </OverlayTrigger>
                                  ) : null}
                                  <OverlayTrigger
                                    placement="top"
                                    overlay={<Tooltip>Download File</Tooltip>}
                                  >
                                    <Button
                                      variant="outline-primary"
                                      size="sm"
                                      href={getDocumentUrl(doc.fileUrl)}
                                      target="_blank"
                                    >
                                      <IconDownload size={12} />
                                    </Button>
                                  </OverlayTrigger>
                                </div>
                              </div>
                            </Card.Body>
                          </Card>
                        </Col>
                      );
                    })}
                  </Row>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer className={isMobile ? "p-3" : ""}>
              <div className={`w-100 ${isMobile ? 'd-grid gap-2' : 'd-flex justify-content-between'}`}>
                <Button
                  variant="secondary"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </Button>
                {selectedRequest.status === 'PENDING' && (
                  <>
                    <Button
                      variant="danger"
                      onClick={() => {
                        setShowDetailsModal(false);
                        handleReject(selectedRequest.id);
                      }}
                    >
                      <IconReject className="me-2" />
                      Reject
                    </Button>
                    <Button
                      variant="success"
                      onClick={() => {
                        setShowDetailsModal(false);
                        handleApprove(selectedRequest.id);
                      }}
                    >
                      <IconApprove className="me-2" />
                      Approve
                    </Button>
                  </>
                )}
              </div>
            </Modal.Footer>
          </>
        )}
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        show={showImageModal}
        onHide={() => setShowImageModal(false)}
        size="xl"
        centered
        fullscreen={isMobile ? "sm-down" : undefined}
      >
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="small">
            {selectedImages[selectedImageIndex]?.displayName || selectedImages[selectedImageIndex]?.filename || 'Image Preview'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center p-0">
          <div style={{
            backgroundColor: '#000',
            minHeight: isMobile ? '60vh' : '70vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {selectedImages.length > 0 && (
              <Image
                src={selectedImages[selectedImageIndex]?.url}
                alt={selectedImages[selectedImageIndex]?.displayName || selectedImages[selectedImageIndex]?.filename}
                fluid
                style={{
                  maxHeight: isMobile ? '60vh' : '70vh',
                  maxWidth: '100%',
                  objectFit: 'contain'
                }}
              />
            )}
          </div>

          {/* Image Navigation */}
          {selectedImages.length > 1 && (
            <div className="d-flex justify-content-center align-items-center p-3">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => setSelectedImageIndex(prev =>
                  prev > 0 ? prev - 1 : selectedImages.length - 1
                )}
                className="me-3"
              >
                <IconChevronLeft />
              </Button>

              <span className="small text-muted">
                {selectedImageIndex + 1} of {selectedImages.length}
              </span>

              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => setSelectedImageIndex(prev =>
                  prev < selectedImages.length - 1 ? prev + 1 : 0
                )}
                className="ms-3"
              >
                <IconChevronRight />
              </Button>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0">
          <div className={`w-100 ${isMobile ? 'd-grid gap-2' : 'd-flex justify-content-between align-items-center'}`}>
            <div className={isMobile ? 'd-grid' : 'd-flex align-items-center'}>
              <Button
                variant="outline-primary"
                href={selectedImages[selectedImageIndex]?.url}
                target="_blank"
                size={isMobile ? "sm" : undefined}
                className={isMobile ? "mb-1" : ""}
              >
                <IconDownload className="me-2" />
                Download
              </Button>
              <small className="text-muted ms-2">
                {selectedImages[selectedImageIndex]?.filename}
              </small>
            </div>
            <Button
              variant="secondary"
              onClick={() => setShowImageModal(false)}
              size={isMobile ? "sm" : undefined}
            >
              Close
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* Empty State */}
      {sortedRequests.length === 0 && !error && !loading && (
        <div className="text-center py-5">
          <div className="py-4">
            <IconFile size={48} className="text-info mb-3 opacity-50" />
            <h5 className="mb-2">No maintenance requests found</h5>
            <p className="text-muted mb-3">All requests have been processed or no requests match your search.</p>
            <div className="d-flex gap-2 justify-content-center">
              <Button
                variant="outline-primary"
                onClick={() => setSearchTerm('')}
                size={isMobile ? "sm" : undefined}
              >
                Clear Search
              </Button>
              <Button
                variant="primary"
                onClick={handleRefreshClick}
                size={isMobile ? "sm" : undefined}
              >
                {/* SIMPLE WORKING SPIN SOLUTION */}
                {refreshing ? (
                  <Spinner 
                    animation="border" 
                    size="sm"
                    style={{ 
                      width: '16px', 
                      height: '16px',
                      borderWidth: '2px',
                      marginRight: '8px'
                    }}
                  />
                ) : (
                  <IconRefresh className="me-2" />
                )}
                Refresh
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Refresh floating button for mobile */}
      {isMobile && sortedRequests.length > 0 && (
        <div className="position-fixed  end-0 m-3" style={{ zIndex: 1000, bottom: '80px' }}>
          <Button
            variant="warning"
            size="sm"
            className="rounded-circle shadow-lg p-3"
            onClick={handleRefreshClick}
            disabled={refreshing}
            style={{ width: '45px', height: '45px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {/* SIMPLE WORKING SPIN SOLUTION */}
            {refreshing ? (
              <Spinner 
                animation="border" 
                size="sm"
                style={{ 
                  width: '24px', 
                  height: '24px',
                  borderWidth: '3px'
                }}
              />
            ) : (
              <IconRefresh size={24} />
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default MaintenancePage;