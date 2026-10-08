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
} from "react-bootstrap";
import {
  ArrowLeft as IconBack,
  Person as IconPerson,
  Telephone as IconPhone,
  Envelope as IconEmail,
  GeoAlt as IconAddress,
  CardChecklist as IconLicense,
  Calendar as IconCalendar,
  CarFront as IconCar,
  FileText as IconFileText,
  CashStack as IconPayment,
  CheckCircle as IconActive,
  XCircle as IconInactive,
  ShieldCheck as IconVerified,
  Eye as IconView,
} from "react-bootstrap-icons";
import { toast } from "sonner";
import Link from "next/link";
import {
  formatDate,
  calculateDaysRemaining,
  getExpiryBadgeColor
} from "../../../../lib/dateUtils";

interface Driver {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  driverprofile: {
    id: number;
    licenseNumber: string | null;
    licenseExpiry: string | null;
    driverNumber_licenseNumber: string | null;
    driverNumber_licenseExpiry: string | null;
    address: string | null;
    postcode: string | null;
    emergencyContact: string | null;
    emergencyPhone: string | null;
    dateOfBirth: string | null;
    weeklyAmount: number;
    depositPaid: number;
    isActive: boolean;
    isVerified: boolean;
    verifiedAt: string | null;
    agreementSigned: boolean;
    agreementSignedAt: string | null;
    createdAt: string;
    updatedAt: string;
    car: Array<{
      id: number;
      registration: string;
      model: string;
      make: string;
      year: number | null;
      color: string | null;
      status: string;
      avatar: string | null;
    }>;
    agreement: Array<{
      id: number;
      title: string;
      type: string;
      status: string;
      signedAt: string | null;
      startDate: string | null;
      endDate: string | null;
      car: {
        registration: string;
        model: string;
        make: string;
      } | null;
    }>;
  } | null;
  statistics: {
    totalWeeklyPayments: number;
    activeAgreements: number;
    pendingPayments: number;
    totalCars: number;
    totalDocuments: number;
  };
}

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
                <th key={index}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((item: any, rowIndex: number) => (
                <tr key={rowIndex}>
                  {columns.map((col: any, colIndex: number) => (
                    <td key={colIndex}>
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

const DriverDetail = () => {
  const router = useRouter();

  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    fetchDriverDetails();
  }, []);

  const fetchDriverDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      setImageError(false);

      const response = await fetch(`/api/driver-portal/profile`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch your profile");
      }

      setDriver(data.data || data);
    } catch (error: any) {
      console.error("Error fetching driver details:", error);
      setError(error.message || "Failed to load your profile");
      toast.error("Failed to load your profile");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!driver) return;

    try {
      const response = await fetch(`/api/driver-portal/profile/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !driver.isActive }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      toast.success(`Profile ${!driver.isActive ? "activated" : "deactivated"} successfully`);
      fetchDriverDetails();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(amount);
  };

  const getAvatarUrl = (avatarPath: string | null) => {
    if (!avatarPath) return null;

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

    if (avatarPath.startsWith('uploads/')) {
      return `/api/upload/${avatarPath}`;
    }

    return `/api/image/${avatarPath}`;
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setImageError(true);
    e.currentTarget.style.display = 'none';
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="warning" />
        <p className="mt-3">Loading your profile...</p>
      </div>
    );
  }

  if (error || !driver) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error</Alert.Heading>
        <p>{error || "Failed to load your profile"}</p>
        <Button variant="outline-danger" onClick={() => router.push("/driver-portal/dashboard")}>
          <IconBack className="me-2" />
          Back to Dashboard
        </Button>
      </Alert>
    );
  }

  const driverProfile = driver.driverprofile;
  const avatarUrl = getAvatarUrl(driver.avatar);
  const hasAvatar = driver.avatar && !imageError;

  return (
    <div className="container-fluid px-3 px-md-4 px-lg-5">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
            <div className="flex-grow-1">
              <h2 className="mb-0 fs-4 fs-md-3">My Driver Profile</h2>
              <p className="text-muted mb-0">Welcome, {driver.name}</p>
            </div>
          </div>
        </Col>
      </Row>

      {/* Profile Section */}
      <Row className="mb-4">
        <Col lg={4} className="mb-4 mb-lg-0">
          <Card className="h-100">
            <Card.Body className="text-center d-flex flex-column align-items-center justify-content-center p-4">
              <div
                className="rounded-circle position-relative mb-3"
                style={{
                  width: '200px',
                  height: '200px',
                  border: '4px solid #0d6efd',
                  backgroundColor: '#f8f9fa',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}
              >
                {hasAvatar && avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={`${driver.name}'s profile photo`}
                    className="w-100 h-100"
                    style={{
                      objectFit: 'cover',
                      objectPosition: 'center'
                    }}
                    onError={handleImageError}
                  />
                ) : (
                  <div className="d-flex flex-column align-items-center justify-content-center h-100 w-100">
                    <IconPerson size={80} className="text-secondary mb-2" />
                    <span className="text-muted small">No Photo</span>
                  </div>
                )}
              </div>

              <h4 className="mb-1">{driver.name}</h4>
              <p className="text-muted mb-3">{driver.email}</p>

              <div className="d-flex flex-wrap gap-2 justify-content-center mb-3">
                <Badge bg={driver.isActive ? "success" : "danger"} className="px-3 py-2">
                  {driver.isActive ? "Active" : "Inactive"}
                </Badge>

                {driverProfile?.isVerified && (
                  <Badge bg="success" className="px-3 py-2">
                    <IconVerified size={14} className="me-1" />
                    Verified
                  </Badge>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={8}>
          <Row className="g-3 mb-4">
            <Col xs={6} md={3}>
              <Card className="h-100 text-center">
                <Card.Body className="p-3">
                  <IconCar size={20} className="text-primary mb-2" />
                  <h5 className="mb-1 fs-6">{driver.statistics.totalCars}</h5>
                  <p className="text-muted mb-0 small">Assigned Cars</p>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={6} md={3}>
              <Card className="h-100 text-center">
                <Card.Body className="p-3">
                  <IconFileText size={20} className="text-info mb-2" />
                  <h5 className="mb-1 fs-6">{driver.statistics.activeAgreements}</h5>
                  <p className="text-muted mb-0 small">Active Agreements</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card className="mb-3">
            <Card.Header>
              <h5 className="mb-0">Contact Information</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6} className="mb-3">
                  <small className="text-muted d-block">Phone Number</small>
                  <p className="mb-0 d-flex align-items-center">
                    <IconPhone size={14} className="me-2" />
                    {driver.phone || "Not provided"}
                  </p>
                </Col>
                <Col md={6} className="mb-3">
                  <small className="text-muted d-block">Email Address</small>
                  <p className="mb-0 d-flex align-items-center">
                    <IconEmail size={14} className="me-2" />
                    {driver.email}
                  </p>
                </Col>
                <Col md={6} className="mb-3">
                  <small className="text-muted d-block">Member Since</small>
                  <p className="mb-0 d-flex align-items-center">
                    <IconCalendar size={14} className="me-2" />
                    {formatDate(driver.createdAt)}
                  </p>
                </Col>
                <Col md={6} className="mb-3">
                  <small className="text-muted d-block">Last Updated</small>
                  <p className="mb-0">{formatDate(driver.updatedAt)}</p>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Tabs Section */}
      <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k || "profile")}>
        <Row>
          <Col>
            <div className="mb-4" style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'var(--bs-body-bg, #fff)', paddingTop: '4px' }}>
              <Nav variant="tabs" className="flex-nowrap overflow-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                <Nav.Item>
                  <Nav.Link eventKey="profile" className="text-nowrap px-3">
                    <IconPerson className="me-1 d-none d-md-inline" />
                    Profile Details
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="cars" className="text-nowrap px-3">
                    <IconCar className="me-1 d-none d-md-inline" />
                    Cars ({driverProfile?.car.length || 0})
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="agreements" className="text-nowrap px-3">
                    <IconFileText className="me-1 d-none d-md-inline" />
                    Agreements ({driverProfile?.agreement.length || 0})
                  </Nav.Link>
                </Nav.Item>
              </Nav>
            </div>

            <Tab.Content>
              {/* Profile Details Tab */}
              <Tab.Pane eventKey="profile">
                <Row>
                  {driverProfile && (
                    <Col lg={8}>
                      <Card>
                        <Card.Header>
                          <h5 className="mb-0">Driver Information</h5>
                        </Card.Header>
                        <Card.Body>
                          <Row>
                            <Col xs={12} md={6} className="mb-3">
                              <small className="text-muted d-block">License Number</small>
                              <p className="mb-0 d-flex align-items-center">
                                <IconLicense size={14} className="me-2" />
                                {driverProfile.licenseNumber || "Not provided"}
                              </p>
                            </Col>
                            <Col xs={12} md={6} className="mb-3">
                              <small className="text-muted d-block">License Expiry</small>
                              <p className="mb-0 d-flex align-items-center">
                                <IconCalendar size={14} className="me-2" />
                                {formatDate(driverProfile.licenseExpiry)}
                              </p>
                              {driverProfile.licenseExpiry && (
                                <div className="mt-1">
                                  <Badge
                                    bg={getExpiryBadgeColor(driverProfile.licenseExpiry)}
                                    className="text-nowrap"
                                  >
                                    {calculateDaysRemaining(driverProfile.licenseExpiry)}
                                  </Badge>
                                </div>
                              )}
                            </Col>
                            <Col xs={12} md={6} className="mb-3">
                              <small className="text-muted d-block">Driver Number/License</small>
                              <p className="mb-0 d-flex align-items-center">
                                <IconLicense size={14} className="me-2" />
                                {driverProfile.driverNumber_licenseNumber || "Not provided"}
                              </p>
                            </Col>
                            <Col xs={12} md={6} className="mb-3">
                              <small className="text-muted d-block">Driver License Expiry</small>
                              <p className="mb-0 d-flex align-items-center">
                                <IconCalendar size={14} className="me-2" />
                                {formatDate(driverProfile.driverNumber_licenseExpiry)}
                              </p>
                              {driverProfile.driverNumber_licenseExpiry && (
                                <div className="mt-1">
                                  <Badge
                                    bg={getExpiryBadgeColor(driverProfile.driverNumber_licenseExpiry)}
                                    className="text-nowrap"
                                  >
                                    {calculateDaysRemaining(driverProfile.driverNumber_licenseExpiry)}
                                  </Badge>
                                </div>
                              )}
                            </Col>
                            <Col xs={12} className="mb-3">
                              <small className="text-muted d-block">Address</small>
                              <p className="mb-0 d-flex align-items-center">
                                <IconAddress size={14} className="me-2 align-self-start" />
                                {driverProfile.address || "Not provided"}
                              </p>
                            </Col>
                            <Col xs={12} md={6} className="mb-3">
                              <small className="text-muted d-block">Postcode</small>
                              <p className="mb-0">{driverProfile.postcode || "Not provided"}</p>
                            </Col>
                            <Col xs={12} md={6} className="mb-3">
                              <small className="text-muted d-block">Weekly Amount</small>
                              <p className="mb-0">{formatCurrency(driverProfile.weeklyAmount)}</p>
                            </Col>
                            <Col xs={12} md={6} className="mb-3">
                              <small className="text-muted d-block">Deposit Paid</small>
                              <p className="mb-0">{formatCurrency(driverProfile.depositPaid)}</p>
                            </Col>
                            <Col xs={12} md={6} className="mb-3">
                              <small className="text-muted d-block">Emergency Contact</small>
                              <p className="mb-0">{driverProfile.emergencyContact || "Not provided"}</p>
                            </Col>
                            <Col xs={12} md={6} className="mb-3">
                              <small className="text-muted d-block">Emergency Phone</small>
                              <p className="mb-0">{driverProfile.emergencyPhone || "Not provided"}</p>
                            </Col>
                            <Col xs={12} md={6} className="mb-3">
                              <small className="text-muted d-block">Date of Birth</small>
                              <p className="mb-0">{formatDate(driverProfile.dateOfBirth)}</p>
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>
                    </Col>
                  )}
                </Row>
              </Tab.Pane>

              {/* Cars Tab - Responsive */}
              <Tab.Pane eventKey="cars">
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">Assigned Cars ({driverProfile?.car.length || 0})</h5>
                  </Card.Header>
                  <Card.Body className="p-0">
                    <ResponsiveTable
                      data={driverProfile?.car || []}
                      emptyMessage="No cars assigned to you."
                      columns={[
                        {
                          header: "Registration",
                          accessor: "registration",
                          render: (item: any) => <strong>{item.registration}</strong>
                        },
                        {
                          header: "Model",
                          accessor: "model",
                          render: (item: any) => item.model
                        },
                        {
                          header: "Make",
                          accessor: "make",
                          render: (item: any) => item.make
                        },
                        {
                          header: "Year",
                          accessor: "year",
                          render: (item: any) => item.year || "N/A"
                        },
                        {
                          header: "Status",
                          accessor: "status",
                          render: (item: any) => (
                            <Badge
                              bg={
                                item.status === "AVAILABLE"
                                  ? "success"
                                  : item.status === "RENTED"
                                    ? "primary"
                                    : "warning"
                              }
                              className="text-nowrap"
                            >
                              {item.status}
                            </Badge>
                          )
                        },
                        {
                          header: "Actions",
                          accessor: "id",
                          render: (item: any) => (
                            <Link href={`/driver-portal/car`} passHref>
                              <Button variant="outline-primary" size="sm">
                                <IconView size={14} />
                              </Button>
                            </Link>
                          )
                        }
                      ]}
                      renderMobileCard={(item: any) => (
                        <div className="d-flex flex-column gap-2">
                          <div>
                            <h6 className="mb-1">{item.registration}</h6>
                            <div className="small text-muted mb-2">
                              {item.make} {item.model} • {item.year || "N/A"}
                            </div>
                            <Badge
                              bg={
                                item.status === "AVAILABLE"
                                  ? "success"
                                  : item.status === "RENTED"
                                    ? "primary"
                                    : "warning"
                              }
                            >
                              {item.status}
                            </Badge>
                          </div>
                          <div className="d-flex justify-content-end">
                            <Link href={`/driver-portal/car`} passHref>
                              <Button variant="outline-primary" size="sm">
                                <IconView size={14} /> View
                              </Button>
                            </Link>
                          </div>
                        </div>
                      )}
                    />
                  </Card.Body>
                </Card>
              </Tab.Pane>

              {/* Agreements Tab - Responsive */}
              <Tab.Pane eventKey="agreements">
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">Agreements ({driverProfile?.agreement.length || 0})</h5>
                  </Card.Header>
                  <Card.Body className="p-0">
                    <ResponsiveTable
                      data={driverProfile?.agreement || []}
                      emptyMessage="No agreements found."
                      columns={[
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
                          header: "Type",
                          accessor: "type",
                          render: (item: any) => <Badge bg="info">{item.type}</Badge>
                        },
                        {
                          header: "Car",
                          accessor: "car",
                          render: (item: any) => (
                            item.car
                              ? `${item.car.registration}`
                              : "No car"
                          )
                        },
                        {
                          header: "Start Date",
                          accessor: "startDate",
                          render: (item: any) => formatDate(item.startDate)
                        },
                        {
                          header: "Status",
                          accessor: "status",
                          render: (item: any) => (
                            <Badge
                              bg={
                                item.status === "SIGNED"
                                  ? "success"
                                  : item.status === "PENDING_SIGNATURE"
                                    ? "warning"
                                    : "secondary"
                              }
                            >
                              {item.status}
                            </Badge>
                          )
                        },
                        {
                          header: "Actions",
                          accessor: "id",
                          render: (item: any) => (
                            <Link href={`/driver-portal/agreements/${item.id}`} passHref>
                              <Button variant="outline-primary" size="sm">
                                <IconView size={14} />
                              </Button>
                            </Link>
                          )
                        }
                      ]}
                      renderMobileCard={(item: any) => (
                        <div className="d-flex flex-column gap-2">
                          <div>
                            <h6 className="mb-1">{item.title}</h6>
                            <div className="d-flex flex-wrap gap-2 mb-2">
                              <Badge bg="info">{item.type}</Badge>
                              <Badge
                                bg={
                                  item.status === "SIGNED"
                                    ? "success"
                                    : item.status === "PENDING_SIGNATURE"
                                      ? "warning"
                                      : "secondary"
                                }
                              >
                                {item.status}
                              </Badge>
                            </div>
                            <div className="small text-muted mb-2">
                              {item.car ? item.car.registration : "No car assigned"}
                            </div>
                            <div className="small text-muted">
                              {formatDate(item.startDate)} - {formatDate(item.endDate)}
                            </div>
                          </div>
                          <div className="d-flex justify-content-end">
                            <Link href={`/driver-portal/agreements/${item.id}`} passHref>
                              <Button variant="outline-primary" size="sm">
                                <IconView size={14} /> View
                              </Button>
                            </Link>
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
  );
};

export default DriverDetail;