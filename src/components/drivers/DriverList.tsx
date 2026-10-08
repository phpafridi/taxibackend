"use client";

import { useState, useEffect, useRef } from "react";
import {
  Row,
  Col,
  Card,
  Table,
  Button,
  Badge,
  Dropdown,
  Form,
  InputGroup,
  Spinner,
  Container,
  Tabs,
  Tab
} from "react-bootstrap";
import {
  Search as IconSearch,
  ThreeDotsVertical as IconMore,
  Eye as IconView,
  Pencil as IconEdit,
  Trash as IconDelete,
  CheckCircle as IconActive,
  XCircle as IconInactive,
  ArrowClockwise,
  PersonCheck,
  PersonX
} from "react-bootstrap-icons";
import { toast } from "sonner";
import Link from "next/link";

interface Driver {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  driverProfile: {
    licenseNumber: string | null;
    isActive: boolean;
    isVerified: boolean;
  } | null;
}

const PublishedDriverList = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [activeDrivers, setActiveDrivers] = useState<Driver[]>([]);
  const [inactiveDrivers, setInactiveDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [isMobile, setIsMobile] = useState(false);
  const [activeKey, setActiveKey] = useState<string>("active");

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  // Fetch drivers
  const fetchDrivers = async (showSpinner = false) => {
    try {
      if (showSpinner) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch("/api/drivers");
      if (!response.ok) {
        throw new Error("Failed to fetch drivers");
      }
      const data = await response.json();
      setDrivers(data);
      
      // Separate active and inactive drivers
      const active = data.filter((driver: Driver) => 
        driver.isActive && driver.driverProfile?.isActive
      );
      const inactive = data.filter((driver: Driver) => 
        !driver.isActive || !driver.driverProfile?.isActive
      );
      
      setActiveDrivers(active);
      setInactiveDrivers(inactive);
    } catch (error) {
      console.error("Error fetching drivers:", error);
      toast.error("Failed to load drivers");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  // Listen for driver added event
  useEffect(() => {
    const handleDriverAdded = () => {
      fetchDrivers(true);
    };

    window.addEventListener('driverAdded', handleDriverAdded);
    return () => window.removeEventListener('driverAdded', handleDriverAdded);
  }, []);

  // Filter drivers based on search for each tab
  const getFilteredActiveDrivers = () => {
    return activeDrivers.filter(driver => {
      const matchesSearch =
        driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (driver.phone && driver.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (driver.driverProfile?.licenseNumber &&
          driver.driverProfile.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    });
  };

  const getFilteredInactiveDrivers = () => {
    return inactiveDrivers.filter(driver => {
      const matchesSearch =
        driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (driver.phone && driver.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (driver.driverProfile?.licenseNumber &&
          driver.driverProfile.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    });
  };

  const filteredActiveDrivers = getFilteredActiveDrivers();
  const filteredInactiveDrivers = getFilteredInactiveDrivers();

  const handleStatusToggle = async (driverId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/drivers/${driverId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      toast.success(`Driver ${!currentStatus ? "activated" : "deactivated"} successfully`);
      fetchDrivers(true);
      
      // Switch to appropriate tab based on new status
      if (!currentStatus) {
        setActiveKey("active");
      } else {
        setActiveKey("inactive");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (driverId: number, driverName: string) => {
    if (!confirm(`Are you sure you want to delete ${driverName}?`)) return;

    try {
      const response = await fetch(`/api/drivers/${driverId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete driver");
      }

      toast.success("Driver deleted successfully");
      fetchDrivers(true);
    } catch (error) {
      console.error("Error deleting driver:", error);
      toast.error("Failed to delete driver");
    }
  };

  const handleRefresh = () => {
    fetchDrivers(true);
    toast.info("Refreshing drivers...");
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  // Mobile Card View for Active Drivers
  const MobileActiveDriverCard = ({ driver }: { driver: Driver }) => (
    <Card className="mb-3 shadow-sm border-start border-3 border-success">
      <Card.Body className="p-3">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div className="d-flex align-items-center">
            <div className="avatar avatar-sm me-3">
              <div className="avatar-initial bg-success rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                <span className="text-white fw-bold">{driver.name.charAt(0).toUpperCase()}</span>
              </div>
            </div>
            <div>
              <h6 className="mb-0 fw-bold">{driver.name}</h6>
            </div>
          </div>
          <Badge
            bg="success"
            className="cursor-pointer"
            onClick={() => handleStatusToggle(driver.id, driver.isActive)}
          >
            Active
          </Badge>
        </div>

        <div className="mb-3">
          <div className="d-flex align-items-center mb-2">
            <small className="text-muted me-2">Email:</small>
            <small className="text-truncate">{driver.email}</small>
          </div>
          <div className="d-flex align-items-center mb-2">
            <small className="text-muted me-2">Phone:</small>
            <small>{driver.phone || "No phone"}</small>
          </div>
          <div className="d-flex align-items-center">
            <small className="text-muted me-2">License:</small>
            <small>
              {driver.driverProfile?.licenseNumber ? (
                <Badge bg="light" text="dark" className="p-1">
                  {driver.driverProfile.licenseNumber}
                </Badge>
              ) : (
                "Not provided"
              )}
            </small>
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-center">
          <div>
            Verification:
            {driver.driverProfile?.isVerified ? (
              <Badge bg="success" className="ms-2">Verified</Badge>
            ) : (
              <Badge bg="warning" text="dark" className="ms-2">Pending</Badge>
            )}
          </div>
          <div className="d-flex justify-content-end gap-2">
            <Link href={`/drivers/${driver.id}`} passHref>
              <Button variant="outline-primary" size="sm">
                <IconView size={14} />
              </Button>
            </Link>
            {/* <Button
              variant="outline-danger"
              size="sm"
              onClick={() => handleStatusToggle(driver.id, driver.isActive)}
              title="Deactivate"
            >
              <PersonX size={14} />
            </Button> */}
          </div>
        </div>
      </Card.Body>
    </Card>
  );

  // Mobile Card View for Inactive Drivers
  const MobileInactiveDriverCard = ({ driver }: { driver: Driver }) => (
    <Card className="mb-3 shadow-sm border-start border-3 border-danger">
      <Card.Body className="p-3">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div className="d-flex align-items-center">
            <div className="avatar avatar-sm me-3">
              <div className="avatar-initial bg-secondary rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                <span className="text-white fw-bold">{driver.name.charAt(0).toUpperCase()}</span>
              </div>
            </div>
            <div>
              <h6 className="mb-0 fw-bold">{driver.name}</h6>
            </div>
          </div>
          <Badge
            bg="danger"
            className="cursor-pointer"
            onClick={() => handleStatusToggle(driver.id, driver.isActive)}
          >
            Inactive
          </Badge>
        </div>

        <div className="mb-3">
          <div className="d-flex align-items-center mb-2">
            <small className="text-muted me-2">Email:</small>
            <small className="text-truncate">{driver.email}</small>
          </div>
          <div className="d-flex align-items-center mb-2">
            <small className="text-muted me-2">Phone:</small>
            <small>{driver.phone || "No phone"}</small>
          </div>
          <div className="d-flex align-items-center">
            <small className="text-muted me-2">License:</small>
            <small>
              {driver.driverProfile?.licenseNumber ? (
                <Badge bg="light" text="dark" className="p-1">
                  {driver.driverProfile.licenseNumber}
                </Badge>
              ) : (
                "Not provided"
              )}
            </small>
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-center">
          <div>
            Verification:
            {driver.driverProfile?.isVerified ? (
              <Badge bg="success" className="ms-2">Verified</Badge>
            ) : (
              <Badge bg="warning" text="dark" className="ms-2">Pending</Badge>
            )}
          </div>
          <div className="d-flex justify-content-end gap-2">
            <Link href={`/drivers/${driver.id}`} passHref>
              <Button variant="outline-primary" size="sm">
                <IconView size={14} />
              </Button>
            </Link>
            {/* <Button
              variant="outline-success"
              size="sm"
              onClick={() => handleStatusToggle(driver.id, driver.isActive)}
              title="Activate"
            >
              <PersonCheck size={14} />
            </Button> */}
          </div>
        </div>
      </Card.Body>
    </Card>
  );

  return (
    <Container fluid className="px-3 px-md-4 py-3">
      {/* Mobile Header */}
      {isMobile && (
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h4 className="mb-0">Drivers</h4>
              <small className="text-muted">
                {activeKey === "active" 
                  ? `${filteredActiveDrivers.length} active` 
                  : `${filteredInactiveDrivers.length} inactive`}
              </small>
            </div>
            <Button
              variant="outline-warning"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="d-flex align-items-center"
            >
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
                <ArrowClockwise size={16} />
              )}
            </Button>
          </div>

          {/* Mobile Search */}
          <div className="mb-3">
            <InputGroup size="sm" className="mb-2">
              <InputGroup.Text>
                <IconSearch size={16} />
              </InputGroup.Text>
              <Form.Control
                placeholder="Search drivers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={clearSearch}
                >
                  ×
                </Button>
              )}
            </InputGroup>
          </div>
        </div>
      )}

      {/* Desktop Header */}
      {!isMobile && (
        <div className="mb-4">
          <Row className="align-items-center">
            <Col md={6}>
              <h4 className="mb-0">Drivers</h4>
              <p className="text-muted mb-0">Manage your drivers and their profiles</p>
            </Col>
            <Col md={6} className="text-end">
              <div className="d-flex justify-content-end gap-2">
                {/* Search */}
                <InputGroup className="w-auto">
                  <InputGroup.Text>
                    <IconSearch size={18} />
                  </InputGroup.Text>
                  <Form.Control
                    placeholder="Search drivers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <Button
                      variant="outline-secondary"
                      onClick={clearSearch}
                      size="sm"
                    >
                      Clear
                    </Button>
                  )}
                </InputGroup>

                {/* Refresh Button with Spin */}
                <Button
                  variant="outline-warning"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing || loading}
                  className="d-flex align-items-center"
                >
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
                    <>
                      <ArrowClockwise className="me-1" size={16} />
                      Refresh
                    </>
                  )}
                </Button>
              </div>
            </Col>
          </Row>
        </div>
      )}

      {/* Tabs for Mobile and Desktop */}
      <Tabs
        activeKey={activeKey}
        onSelect={(k) => setActiveKey(k || "active")}
        className="mb-4"
        fill={isMobile}
      >
        {/* Active Drivers Tab */}
        <Tab
          eventKey="active"
          title={
            <div className="d-flex align-items-center">
              <PersonCheck className="me-1" size={14} />
              <span>Active ({filteredActiveDrivers.length})</span>
            </div>
          }
        >
          {isMobile ? (
            // Mobile Active Drivers View
            <div>
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="warning" />
                  <p className="mt-2">Loading drivers...</p>
                </div>
              ) : filteredActiveDrivers.length === 0 ? (
                <Card className="text-center py-5">
                  <Card.Body>
                    <PersonCheck size={48} className="text-success mb-3" />
                    <h5>No active drivers found</h5>
                    <p className="text-muted mb-3">
                      {searchTerm ? "Try a different search term" : "No active drivers available"}
                    </p>
                    {searchTerm && (
                      <Button
                        variant="link"
                        onClick={clearSearch}
                        className="text-decoration-none"
                      >
                        Clear search
                      </Button>
                    )}
                  </Card.Body>
                </Card>
              ) : (
                <div>
                  {filteredActiveDrivers.map((driver) => (
                    <MobileActiveDriverCard key={driver.id} driver={driver} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Desktop Active Drivers View
            <Card>
              <Card.Header className="bg-white border-bottom">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="mb-0">Active Drivers ({filteredActiveDrivers.length})</h5>
                    {searchTerm && (
                      <small className="text-muted">
                        Showing results for "{searchTerm}"
                      </small>
                    )}
                  </div>
                </div>
              </Card.Header>
              <Card.Body>
                {loading ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" variant="warning" />
                    <p className="mt-2">Loading drivers...</p>
                  </div>
                ) : filteredActiveDrivers.length === 0 ? (
                  <div className="text-center py-5">
                    <PersonCheck size={48} className="text-success mb-3" />
                    <h5>No active drivers found</h5>
                    <p className="text-muted mb-3">
                      {searchTerm ? "Try a different search term" : "No active drivers available"}
                    </p>
                    {searchTerm && (
                      <Button
                        variant="link"
                        onClick={clearSearch}
                        className="text-decoration-none"
                      >
                        Clear search
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table hover className="text-nowrap">
                      <thead>
                        <tr>
                          <th>Driver</th>
                          <th>Contact</th>
                          <th>License</th>
                          <th>Status</th>
                          <th>Verified</th>
                          <th className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredActiveDrivers.map((driver) => (
                          <tr key={driver.id}>
                            <td>
                              <div className="d-flex align-items-center">
                                <div className="avatar avatar-sm">
                                  <div className="avatar-initial bg-success rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                                    <span className="text-white fw-bold">{driver.name.charAt(0).toUpperCase()}</span>
                                  </div>
                                </div>
                                <div className="ms-3">
                                  <h6 className="mb-0">{driver.name}</h6>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div>
                                <div>{driver.email}</div>
                                <small className="text-muted">{driver.phone || "No phone"}</small>
                              </div>
                            </td>
                            <td>
                              {driver.driverProfile?.licenseNumber ? (
                                <Badge bg="light" text="dark">
                                  {driver.driverProfile.licenseNumber}
                                </Badge>
                              ) : (
                                <span className="text-muted">Not provided</span>
                              )}
                            </td>
                            <td>
                              <Badge
                                bg="success"
                                className="cursor-pointer"
                                onClick={() => handleStatusToggle(driver.id, driver.isActive)}
                              >
                                <IconActive size={14} className="me-1" />
                                Active
                              </Badge>
                            </td>
                            <td>
                              {driver.driverProfile?.isVerified ? (
                                <Badge bg="success">Verified</Badge>
                              ) : (
                                <Badge bg="warning" text="dark">Pending</Badge>
                              )}
                            </td>
                            <td className="text-end">
                              <div className="d-flex gap-1 justify-content-end">
                                <Link href={`/drivers/${driver.id}`} passHref>
                                  <Button variant="outline-primary" size="sm">
                                    <IconView size={14} />
                                  </Button>
                                </Link>
                                {/* <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleStatusToggle(driver.id, driver.isActive)}
                                  title="Deactivate"
                                >
                                  <PersonX size={14} />
                                </Button> */}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card.Body>
            </Card>
          )}
        </Tab>

        {/* Inactive Drivers Tab */}
        <Tab
          eventKey="inactive"
          title={
            <div className="d-flex align-items-center">
              <PersonX className="me-1" size={14} />
              <span>Inactive ({filteredInactiveDrivers.length})</span>
            </div>
          }
        >
          {isMobile ? (
            // Mobile Inactive Drivers View
            <div>
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="warning" />
                  <p className="mt-2">Loading drivers...</p>
                </div>
              ) : filteredInactiveDrivers.length === 0 ? (
                <Card className="text-center py-5">
                  <Card.Body>
                    <PersonX size={48} className="text-secondary mb-3" />
                    <h5>No inactive drivers</h5>
                    <p className="text-muted mb-3">
                      {searchTerm ? "Try a different search term" : "All drivers are active"}
                    </p>
                    {searchTerm && (
                      <Button
                        variant="link"
                        onClick={clearSearch}
                        className="text-decoration-none"
                      >
                        Clear search
                      </Button>
                    )}
                  </Card.Body>
                </Card>
              ) : (
                <div>
                  {filteredInactiveDrivers.map((driver) => (
                    <MobileInactiveDriverCard key={driver.id} driver={driver} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Desktop Inactive Drivers View
            <Card>
              <Card.Header className="bg-white border-bottom">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="mb-0">Inactive Drivers ({filteredInactiveDrivers.length})</h5>
                    {searchTerm && (
                      <small className="text-muted">
                        Showing results for "{searchTerm}"
                      </small>
                    )}
                  </div>
                </div>
              </Card.Header>
              <Card.Body>
                {loading ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" variant="warning" />
                    <p className="mt-2">Loading drivers...</p>
                  </div>
                ) : filteredInactiveDrivers.length === 0 ? (
                  <div className="text-center py-5">
                    <PersonX size={48} className="text-secondary mb-3" />
                    <h5>No inactive drivers</h5>
                    <p className="text-muted mb-3">
                      {searchTerm ? "Try a different search term" : "All drivers are active"}
                    </p>
                    {searchTerm && (
                      <Button
                        variant="link"
                        onClick={clearSearch}
                        className="text-decoration-none"
                      >
                        Clear search
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table hover className="text-nowrap">
                      <thead>
                        <tr>
                          <th>Driver</th>
                          <th>Contact</th>
                          <th>License</th>
                          <th>Status</th>
                          <th>Verified</th>
                          <th className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInactiveDrivers.map((driver) => (
                          <tr key={driver.id}>
                            <td>
                              <div className="d-flex align-items-center">
                                <div className="avatar avatar-sm">
                                  <div className="avatar-initial bg-secondary rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                                    <span className="text-white fw-bold">{driver.name.charAt(0).toUpperCase()}</span>
                                  </div>
                                </div>
                                <div className="ms-3">
                                  <h6 className="mb-0">{driver.name}</h6>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div>
                                <div>{driver.email}</div>
                                <small className="text-muted">{driver.phone || "No phone"}</small>
                              </div>
                            </td>
                            <td>
                              {driver.driverProfile?.licenseNumber ? (
                                <Badge bg="light" text="dark">
                                  {driver.driverProfile.licenseNumber}
                                </Badge>
                              ) : (
                                <span className="text-muted">Not provided</span>
                              )}
                            </td>
                            <td>
                              <Badge
                                bg="danger"
                                className="cursor-pointer"
                                onClick={() => handleStatusToggle(driver.id, driver.isActive)}
                              >
                                <IconInactive size={14} className="me-1" />
                                Inactive
                              </Badge>
                            </td>
                            <td>
                              {driver.driverProfile?.isVerified ? (
                                <Badge bg="success">Verified</Badge>
                              ) : (
                                <Badge bg="warning" text="dark">Pending</Badge>
                              )}
                            </td>
                            <td className="text-end">
                              <div className="d-flex gap-1 justify-content-end">
                                <Link href={`/drivers/${driver.id}`} passHref>
                                  <Button variant="outline-primary" size="sm">
                                    <IconView size={14} />
                                  </Button>
                                </Link>
                                {/* <Button
                                  variant="outline-success"
                                  size="sm"
                                  onClick={() => handleStatusToggle(driver.id, driver.isActive)}
                                  title="Activate"
                                >
                                  <PersonCheck size={14} />
                                </Button> */}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card.Body>
            </Card>
          )}
        </Tab>
      </Tabs>

      {/* Floating Refresh Button for Mobile */}
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
    </Container>
  );
};

export default PublishedDriverList;