"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Row,
  Col,
  Card,
  Button,
  Badge,
  Tab,
  Nav,
  Table,
  Spinner,
  Alert,
  Modal,
  Form,
  Image,
} from "react-bootstrap";
import {
  ArrowLeft as IconBack,
  CarFront as IconCar,
  FileText as IconFileText,
  CashStack as IconPayment,
  Shield as IconInsurance,
  Wrench as IconMaintenance,
  Upload as IconUpload,
  X as IconX,
  Eye as IconEye,
  Clock as IconClock,
  CheckCircle as IconCheck,
  XCircle as IconXCircle,
  Hourglass as IconHourglass,
  Calendar as IconCalendar,
  Speedometer2 as IconMileage,
} from "react-bootstrap-icons";
import { toast } from "sonner";
import Confetti from "react-confetti";
import useWindowSize from "react-use/lib/useWindowSize";

// Helper component for responsive tables
const ResponsiveTable = ({
  data,
  columns,
  renderMobileCard,
  emptyMessage = "No data found"
}: any) => {
  return (
    <>
      {/* Desktop Table View */}
      <div className="d-none d-md-block table-responsive">
        <Table hover className="mb-0">
          <thead className="table-light">
            <tr>
              {columns.map((col: any, index: number) => (
                <th key={index} className={col.hideOnMobile ? "d-none d-md-table-cell" : ""}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((item: any, rowIndex: number) => (
                <tr key={rowIndex}>
                  {columns.map((col: any, colIndex: number) => (
                    <td
                      key={colIndex}
                      className={col.hideOnMobile ? "d-none d-md-table-cell" : ""}
                    >
                      {col.render ? col.render(item) : item[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="text-center py-4">
                  <div className="text-muted">{emptyMessage}</div>
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="d-md-none">
        {data.length > 0 ? (
          <div className="row row-cols-1 g-3">
            {data.map((item: any, index: number) => (
              <div key={index} className="col">
                <Card className="shadow-sm border">
                  <Card.Body className="p-3">
                    {renderMobileCard(item)}
                  </Card.Body>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <Alert variant="info" className="m-0">
            {emptyMessage}
          </Alert>
        )}
      </div>
    </>
  );
};

const CarDetail = () => {
  const router = useRouter();

  const [car, setCar] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState("details");

  // New Request Modal states
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    mileage: "",
    description: "",
    amount: "",
    garageName: "",
    garageContact: "",
    notes: "",
  });
  const [quotationFile, setQuotationFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Request Details Modal
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showRequestDetails, setShowRequestDetails] = useState(false);

  // Confetti state
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);
  const { width, height } = useWindowSize();

  useEffect(() => {
    fetchCarDetails();
  }, []);

  const fetchCarDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      setImageError(false);

      // FIXED: Use correct API endpoint - /api/driver-portal/cars (plural)
      const response = await fetch(`/api/driver-portal/cars`);

      if (!response.ok) {
        // Handle different error scenarios
        if (response.status === 401) {
          throw new Error("Please log in to view your car details");
        } else if (response.status === 404) {
          const errorData = await response.json();
          if (errorData.errorCode === 'NO_CAR_ASSIGNED') {
            throw new Error("No car assigned to you. Please contact admin.");
          } else if (errorData.errorCode === 'DRIVER_PROFILE_NOT_FOUND') {
            throw new Error("Driver profile not found. Please contact admin.");
          }
          throw new Error(errorData.error || "Car not found");
        } else if (response.status === 500) {
          throw new Error("Server error. Please try again later.");
        }
        throw new Error(`Failed to load car details: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to load car details");
      }

      if (data.data) {
        const formattedCar = {
          ...data.data,
          agreement: data.data.agreements || [],
          document: data.data.documents || [],
          weeklypayment: data.data.weeklyPayments || [],
          insurance: data.data.insurance ? [data.data.insurance] : [],
          maintenancerequest: data.data.maintenanceRequests || [],
          statistics: data.data.statistics || {
            activeAgreements: 0,
            totalPayments: 0,
            totalMaintenance: 0
          }
        };

        setCar(formattedCar);
      } else {
        setCar(null);
      }
    } catch (error: any) {
      console.error("Error fetching car details:", error);
      setError(error.message || "Failed to load car");
      toast.error(error.message || "Failed to load car details");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getAvatarUrl = (avatarPath: string | null) => {
    if (!avatarPath) {
      return null;
    }

    if (avatarPath.startsWith('data:') || avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath;
    }

    if (avatarPath.startsWith('/uploads/')) {
      const cleanPath = avatarPath.substring(1);
      return `/api/upload/${cleanPath}`;
    }

    if (avatarPath.startsWith('/api/')) {
      return avatarPath;
    }

    return `/api/image/${avatarPath}`;
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setImageError(true);
    e.currentTarget.style.display = 'none';
  };

  const handleImageLoad = () => {
    setImageError(false);
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge bg="warning" className="px-2 py-1"><IconClock size={12} className="me-1" /> PENDING</Badge>;
      case 'APPROVED':
        return <Badge bg="primary" className="px-2 py-1"><IconCheck size={12} className="me-1" /> APPROVED</Badge>;
      case 'IN_PROGRESS':
        return <Badge bg="info" className="px-2 py-1"><IconHourglass size={12} className="me-1" /> IN PROGRESS</Badge>;
      case 'COMPLETED':
        return <Badge bg="success" className="px-2 py-1"><IconCheck size={12} className="me-1" /> COMPLETED</Badge>;
      case 'PAID':
        return <Badge bg="success" className="px-2 py-1">PAID</Badge>;
      case 'REJECTED':
        return <Badge bg="danger" className="px-2 py-1"><IconXCircle size={12} className="me-1" /> REJECTED</Badge>;
      case 'CANCELLED':
        return <Badge bg="secondary" className="px-2 py-1">CANCELLED</Badge>;
      default:
        return <Badge bg="secondary" className="px-2 py-1">{status}</Badge>;
    }
  };

  // Maintenance Request Functions
  const handleMaintenanceRequest = () => {
    setShowModal(true);
    setFormData({
      title: "",
      mileage: "",
      description: "",
      amount: "",
      garageName: "",
      garageContact: "",
      notes: "",
    });
    setQuotationFile(null);
    setPreviewUrl(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast.error("Invalid file type. Please upload JPEG, PNG, or WebP files.");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size exceeds 5MB limit.");
        return;
      }

      setQuotationFile(file);

      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const removeFile = () => {
    setQuotationFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
  };

  const triggerConfetti = () => {
    setConfettiKey(prev => prev + 1);
    const audio = new Audio("/notifications/success.wav");

    setShowConfetti(true);
    setTimeout(() => {
      setShowConfetti(false);
    }, 9000);
  };

  const handleSubmitMaintenanceRequest = async () => {
    try {
      // Fix: Check if mileage is valid (not empty and greater than 0)
      const mileageNum = Number(formData.mileage);
      if (!formData.mileage || mileageNum <= 0 || isNaN(mileageNum)) {
        toast.error("Please enter a valid mileage (greater than 0)");
        return;
      }

      if (!formData.title.trim()) {
        toast.error("Please enter a title for the maintenance request");
        return;
      }

      if (!formData.description.trim()) {
        toast.error("Please describe the maintenance issue");
        return;
      }

      const amountValue = parseFloat(formData.amount);
      if (!formData.amount || isNaN(amountValue) || amountValue < 0) {
        toast.error("Please enter a valid amount");
        return;
      }

      setSubmitting(true);

      let fileUrl = null;
      let documentData = null;

      if (quotationFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', quotationFile);
        uploadFormData.append('folder', 'quotations');

        const uploadResponse = await fetch('/api/upload/car-image', {
          method: 'POST',
          body: uploadFormData,
        });

        const uploadResult = await uploadResponse.json();

        if (!uploadResult.success) {
          const audio = new Audio("/notifications/error.wav");
          audio.play().catch(() => {});
          throw new Error(uploadResult.message || 'Failed to upload file');
        }

        fileUrl = uploadResult.url;

        documentData = {
          fileName: uploadResult.filename || quotationFile.name,
          fileUrl: fileUrl,
          fileSize: quotationFile.size,
          mimeType: quotationFile.type,
        };
      }

      const maintenanceData = {
        title: formData.title,
        description: formData.description,
        mileage: mileageNum,
        amount: amountValue,
        estimatedAmount: amountValue,
        garageName: formData.garageName || null,
        garageContact: formData.garageContact || null,
        notes: formData.notes || null,
        document: documentData,
      };

      const response = await fetch('/api/driver-portal/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          carId: car?.id,
          ...maintenanceData
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const audio = new Audio("/notifications/error.wav");
        audio.play().catch(() => {});
        throw new Error(result.error || 'Failed to create maintenance request');
      }

      toast.success("Maintenance request submitted successfully!");
      triggerConfetti();

      handleCloseModal();

      setTimeout(() => {
        fetchCarDetails();
      }, 1000);

      // Reset form with empty values
      setFormData({
        title: "",
        mileage: "",
        description: "",
        amount: "",
        garageName: "",
        garageContact: "",
        notes: "",
      });
      setQuotationFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }

    } catch (error: any) {
      const audio = new Audio("/notifications/error.wav");
      audio.play().catch(() => {});
      console.error('Error submitting maintenance request:', error);
      toast.error(error.message || "Failed to submit maintenance request");
    } finally {
      setSubmitting(false);
    }
  };

  // View maintenance request details
  const viewRequestDetails = (request: any) => {
    setSelectedRequest(request);
    setShowRequestDetails(true);
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-2">Loading car details...</p>
      </div>
    );
  }

  if (error || !car) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error</Alert.Heading>
        <p>{error || "Car not found"}</p>
        <div className="d-flex gap-2 mt-3">
          <Button variant="primary" onClick={fetchCarDetails}>
            Try Again
          </Button>
        </div>
      </Alert>
    );
  }

  const avatarUrl = getAvatarUrl(car.avatar);
  const hasAvatar = car.avatar && !imageError;

  return (
    <>
      {/* Confetti Effect */}
      {showConfetti && (
        <Confetti
          key={confettiKey}
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={600}
          gravity={0.1}
          colors={['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7']}
          style={{ position: 'fixed', zIndex: 9999 }}
        />
      )}

      <div className="container-fluid">
        {/* Header */}
        <div className="mb-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3 gap-2">

          </div>

          <h2 className="text-center text-md-start">{car.registration} - {car.make} {car.model}</h2>
          <p className="text-muted text-center text-md-start">My Assigned Car</p>
        </div>

        {/* Tabs Navigation */}
        <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k || "details")}>
          <Row>
            <Col>
              <div className="mb-4" style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'var(--bs-body-bg, #fff)', paddingTop: '4px' }}>
                <Nav variant="tabs" className="flex-nowrap overflow-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                  <Nav.Item>
                    <Nav.Link eventKey="details" className="text-nowrap px-3">
                      <IconCar className="me-1 d-none d-md-inline" />
                      Profile Details
                    </Nav.Link>
                  </Nav.Item>

                  <Nav.Item>
                    <Nav.Link eventKey="maintenance" className="text-nowrap px-3">
                      <IconMaintenance className="me-1 d-none d-md-inline" />
                      Maintenance ({car.maintenancerequest?.length || 0})
                    </Nav.Link>
                  </Nav.Item>
                </Nav>
              </div>

              <Tab.Content>
                {/* Car Details Tab */}
                <Tab.Pane eventKey="details">
                  <Row>
                    <Col md={8}>
                      <Card className="mb-4">
                        <Card.Header className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
                          <h5 className="mb-0">Car Information</h5>
                          {car.status === "RENTED" && (
                            <Button
                              variant="warning"
                              onClick={handleMaintenanceRequest}
                              className="d-none d-md-flex align-items-center mt-2 mt-md-0"
                              size="sm"
                            >
                              <IconMaintenance className="me-2" />
                              Request Maintenance
                            </Button>
                          )}
                        </Card.Header>
                        <Card.Body>
                          <Row className="align-items-start">
                            {/* Car Avatar */}
                            <Col xs={12} md={4} className="mb-3 text-center">
                              <div
                                className="rounded position-relative mx-auto"
                                style={{
                                  width: '180px',
                                  height: '135px',
                                  border: '3px solid #0d6efd',
                                  backgroundColor: '#f8f9fa',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  overflow: 'hidden',
                                  marginBottom: '15px'
                                }}
                              >
                                {hasAvatar && avatarUrl ? (
                                  <img
                                    src={avatarUrl}
                                    alt={`${car.make} ${car.model} ${car.registration}`}
                                    className="w-100 h-100"
                                    style={{
                                      objectFit: 'cover',
                                      objectPosition: 'center'
                                    }}
                                    onError={handleImageError}
                                    onLoad={handleImageLoad}
                                  />
                                ) : (
                                  <div className="d-flex flex-column align-items-center justify-content-center h-100 w-100">
                                    <IconCar size={50} className="text-secondary mb-2" />
                                    <span className="text-muted small">No Photo</span>
                                  </div>
                                )}
                              </div>
                              <p className="mb-0 fw-bold">{car.registration}</p>
                              <p className="text-muted small">{car.make} {car.model}</p>

                              {/* Mobile Maintenance Button */}
                              {car.status === "RENTED" && (
                                <Button
                                  variant="outline-warning"
                                  onClick={handleMaintenanceRequest}
                                  className="d-flex align-items-center justify-content-center w-100 mt-2 d-md-none"
                                  size="sm"
                                >
                                  <IconMaintenance className="me-2" />
                                  Request Maintenance
                                </Button>
                              )}
                            </Col>

                            {/* Car Details */}
                            <Col xs={12} md={8}>
                              <Row>
                                <Col xs={12} sm={6} className="mb-3">
                                  <strong>Registration:</strong>
                                  <div className="mt-1">
                                    <Badge bg="info">{car.registration}</Badge>
                                  </div>
                                </Col>
                                <Col xs={12} sm={6} className="mb-3">
                                  <strong>Make & Model:</strong>
                                  <div className="mt-1">{car.make} {car.model}</div>
                                </Col>
                                <Col xs={12} sm={6} className="mb-3">
                                  <strong>Year:</strong>
                                  <div className="mt-1">{car.year || "N/A"}</div>
                                </Col>
                                <Col xs={12} sm={6} className="mb-3">
                                  <strong>Color:</strong>
                                  <div className="mt-1">{car.color || "N/A"}</div>
                                </Col>
                                <Col xs={12} sm={6} className="mb-3">
                                  <strong>Status:</strong>
                                  <div className="mt-1">
                                    <Badge bg={
                                      car.status === "AVAILABLE" ? "success" :
                                        car.status === "RENTED" ? "primary" :
                                          car.status === "MAINTENANCE" ? "warning" : "secondary"
                                    }>
                                      {car.status}
                                    </Badge>
                                  </div>
                                </Col>
                                <Col xs={12} sm={6} className="mb-3">
                                  <strong>Active:</strong>
                                  <div className="mt-1">
                                    <Badge bg={car.isActive ? "success" : "danger"}>
                                      {car.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                  </div>
                                </Col>
                              </Row>
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col xs={12} md={4}>
                      {/* Statistics Card */}
                      <Card className="mb-4">
                        <Card.Header>
                          <h5 className="mb-0">Car Statistics</h5>
                        </Card.Header>
                        <Card.Body>
                          <div className="d-flex flex-column gap-3">
                            <div className="d-flex align-items-center">
                              <IconFileText className="text-primary me-3" size={24} />
                              <div>
                                <div className="fw-bold">{car.statistics?.activeAgreements || 0}</div>
                                <small className="text-muted">Active Agreements</small>
                              </div>
                            </div>

                            <div className="d-flex align-items-center">
                              <IconMaintenance className="text-warning me-3" size={24} />
                              <div>
                                <div className="fw-bold">{car.statistics?.totalMaintenance || 0}</div>
                                <small className="text-muted">Maintenance Requests</small>
                              </div>
                            </div>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </Tab.Pane>

                {/* Maintenance Requests Tab - Now Responsive */}
                <Tab.Pane eventKey="maintenance">
                  <Card>
                    <Card.Header className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
                      <h5 className="mb-0">Maintenance Requests ({car.maintenancerequest?.length || 0})</h5>
                      {car.status === "RENTED" && (
                        <Button
                          variant="outline-primary"
                          onClick={handleMaintenanceRequest}
                          className="d-flex align-items-center"
                          size="sm"
                        >
                          <IconMaintenance className="me-2" />
                          New Request
                        </Button>
                      )}
                    </Card.Header>
                    <Card.Body className="p-0">
                      <ResponsiveTable
                        data={car.maintenancerequest || []}
                        emptyMessage={
                          <Alert variant="info" className="m-3">
                            <div className="text-center py-3">
                              <IconMaintenance size={48} className="text-info mb-3 opacity-50" />
                              <h5>No Maintenance Requests</h5>
                              <p className="text-muted mb-3">
                                You haven't submitted any maintenance requests for this vehicle.
                              </p>
                              {car.status === "RENTED" && (
                                <Button variant="primary" onClick={handleMaintenanceRequest}>
                                  <IconMaintenance className="me-2" />
                                  Submit Your First Request
                                </Button>
                              )}
                            </div>
                          </Alert>
                        }
                        columns={[
                          {
                            header: "Mileage",
                            accessor: "mileage",
                            render: (item: any) => (
                              <div className="d-flex align-items-center gap-1">
                                <IconMileage size={14} className="text-secondary" />
                                <span className="fw-semibold">
                                  {item.mileage ? `${item.mileage.toLocaleString()} mi` : "N/A"}
                                </span>
                              </div>
                            )
                          },
                          {
                            header: "Title",
                            accessor: "title",
                            render: (item: any) => (
                              <div className="text-truncate" style={{ maxWidth: "150px" }}>
                                {item.title}
                              </div>
                            )
                          },
                          {
                            header: "Description",
                            accessor: "description",
                            hideOnMobile: true,
                            render: (item: any) => (
                              <div className="text-truncate" style={{ maxWidth: "200px" }}>
                                {item.description}
                              </div>
                            )
                          },
                          {
                            header: "Amount",
                            accessor: "amount",
                            render: (item: any) => formatCurrency(item.amount)
                          },
                          {
                            header: "Status",
                            accessor: "status",
                            render: (item: any) => getStatusBadge(item.status)
                          },
                          {
                            header: "Created",
                            accessor: "createdAt",
                            render: (item: any) => formatDate(item.createdAt)
                          },
                          {
                            header: "Actions",
                            accessor: "id",
                            render: (item: any) => (
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => viewRequestDetails(item)}
                              >
                                <IconEye size={14} />
                              </Button>
                            )
                          }
                        ]}
                        renderMobileCard={(item: any) => (
                          <div className="d-flex flex-column gap-2">
                            <div className="d-flex justify-content-between align-items-start">
                              <div>
                                <h6 className="mb-1">{item.title}</h6>
                                <div className="small text-muted mb-2">
                                  {formatDate(item.createdAt)}
                                </div>
                              </div>
                            </div>

                            <div className="d-flex justify-content-between align-items-center">
                              <span className="text-muted small">
                                <IconMileage size={12} className="me-1" />
                                Mileage:
                              </span>
                              <span className="fw-bold">
                                {item.mileage ? `${item.mileage.toLocaleString()} mi` : "N/A"}
                              </span>
                            </div>

                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <span className="fw-bold">{formatCurrency(item.amount)}</span>
                              {getStatusBadge(item.status)}
                            </div>

                            <div className="small text-muted mb-2">
                              {item.description.length > 100
                                ? `${item.description.substring(0, 100)}...`
                                : item.description}
                            </div>

                            <div className="d-flex justify-content-end">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => viewRequestDetails(item)}
                              >
                                <IconEye size={14} /> View Details
                              </Button>
                            </div>
                          </div>
                        )}
                      />
                    </Card.Body>
                  </Card>
                </Tab.Pane>
              </Tab.Content>
            </Col>
          </Row>
        </Tab.Container>
      </div>

      {/* Maintenance Request Details Modal - Updated to show mileage */}
      <Modal show={showRequestDetails} onHide={() => setShowRequestDetails(false)} size="lg" centered>
        {selectedRequest && (
          <>
            <Modal.Header closeButton>
              <Modal.Title>Maintenance Request Details</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Row className="mb-3">
                <Col xs={6}>
                  <h6 className="text-muted mb-1">TITLE</h6>
                  <p className="fw-bold">{selectedRequest.title}</p>
                </Col>
                <Col xs={6}>
                  <h6 className="text-muted mb-1">STATUS</h6>
                  <div>{getStatusBadge(selectedRequest.status)}</div>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col xs={12}>
                  <h6 className="text-muted mb-1">DESCRIPTION</h6>
                  <p>{selectedRequest.description}</p>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col xs={6}>
                  <h6 className="text-muted mb-1">MILEAGE</h6>
                  <p className="fw-bold">
                    {selectedRequest.mileage ? `${selectedRequest.mileage.toLocaleString()} miles` : "N/A"}
                  </p>
                </Col>
                <Col xs={6}>
                  <h6 className="text-muted mb-1">AMOUNT REQUESTED</h6>
                  <p className="fw-bold fs-4 text-primary">{formatCurrency(selectedRequest.amount)}</p>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col xs={6}>
                  <h6 className="text-muted mb-1">SUBMITTED ON</h6>
                  <p>{formatDateTime(selectedRequest.createdAt)}</p>
                </Col>
              </Row>

              {selectedRequest.completedAt && (
                <Row className="mb-3">
                  <Col xs={6}>
                    <h6 className="text-muted mb-1">COMPLETED ON</h6>
                    <p>{formatDateTime(selectedRequest.completedAt)}</p>
                  </Col>
                </Row>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowRequestDetails(false)}>
                Close
              </Button>
            </Modal.Footer>
          </>
        )}
      </Modal>

      {/* New Maintenance Request Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Request Maintenance</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Vehicle</Form.Label>
              <Form.Control
                type="text"
                value={`${car.registration} - ${car.make} ${car.model}`}
                disabled
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Mileage*</Form.Label>
              <Form.Control
                type="number"
                name="mileage"
                value={formData.mileage}
                onChange={handleInputChange}
                placeholder="Your Car Mileage"
                required
                min="1"
              />
              <Form.Text className="text-muted">
                Enter the current mileage of your vehicle
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Title *</Form.Label>
              <Form.Control
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Brake pads replacement, Engine oil change"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description *</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the issue in detail..."
                required
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Estimated Amount (GBP) *</Form.Label>
                  <div className="input-group">
                    <span className="input-group-text">£</span>
                    <Form.Control
                      type="number"
                      step="0.01"
                      min="0"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Garage Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="garageName"
                    value={formData.garageName}
                    onChange={handleInputChange}
                    placeholder="Optional"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Garage Contact</Form.Label>
                  <Form.Control
                    type="text"
                    name="garageContact"
                    value={formData.garageContact}
                    onChange={handleInputChange}
                    placeholder="Optional"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Quotation / Picture</Form.Label>
              <div className="border rounded p-3 text-center">
                {previewUrl ? (
                  <div className="position-relative">
                    <Image
                      src={previewUrl}
                      alt="Quotation preview"
                      fluid
                      className="mb-2 rounded"
                      style={{ maxHeight: '200px' }}
                    />
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={removeFile}
                      className="position-absolute top-0 end-0 m-1"
                    >
                      <IconX size={16} />
                    </Button>
                    <p className="small text-muted mb-0">
                      {quotationFile?.name} ({(quotationFile?.size! / 1024).toFixed(2)} KB)
                    </p>
                  </div>
                ) : quotationFile ? (
                  <div className="position-relative">
                    <div className="p-3 border rounded bg-light mb-2">
                      <IconFileText size={48} className="text-secondary mb-2" />
                      <p className="mb-0 fw-bold">{quotationFile.name}</p>
                      <p className="small text-muted mb-0">
                        {(quotationFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={removeFile}
                      className="position-absolute top-0 end-0 m-1"
                    >
                      <IconX size={16} />
                    </Button>
                  </div>
                ) : (
                  <>
                    <IconUpload size={48} className="text-secondary mb-2" />
                    <p className="text-muted mb-2">
                      Upload quotation or picture (JPG, PNG, WebP, max 5MB)
                    </p>
                    <Form.Control
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={handleFileChange}
                    />
                  </>
                )}
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Additional Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Any additional information..."
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="warning"
            onClick={handleSubmitMaintenanceRequest}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default CarDetail;