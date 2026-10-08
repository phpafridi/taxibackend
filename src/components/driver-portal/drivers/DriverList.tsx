"use client";

import { useState, useEffect } from "react";
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
  Spinner
} from "react-bootstrap";
import { 
  Search as IconSearch, 
  ThreeDotsVertical as IconMore,
  Eye as IconView,
  Pencil as IconEdit,
  Trash as IconDelete,
  CheckCircle as IconActive,
  XCircle as IconInactive
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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");

  // Fetch drivers
  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/drivers");
      if (!response.ok) {
        throw new Error("Failed to fetch drivers");
      }
      const data = await response.json();
      setDrivers(data);
    } catch (error) {
      console.error("Error fetching drivers:", error);
      toast.error("Failed to load drivers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  // Listen for driver added event
  useEffect(() => {
    const handleDriverAdded = () => {
      fetchDrivers();
    };

    window.addEventListener('driverAdded', handleDriverAdded);
    return () => window.removeEventListener('driverAdded', handleDriverAdded);
  }, []);

  // Filter drivers based on search and status
  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = 
      driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (driver.phone && driver.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (driver.driverProfile?.licenseNumber && 
       driver.driverProfile.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = 
      filterActive === "all" ||
      (filterActive === "active" && driver.isActive && driver.driverProfile?.isActive) ||
      (filterActive === "inactive" && (!driver.isActive || !driver.driverProfile?.isActive));

    return matchesSearch && matchesStatus;
  });

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
      fetchDrivers(); // Refresh the list
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
      fetchDrivers(); // Refresh the list
    } catch (error) {
      console.error("Error deleting driver:", error);
      toast.error("Failed to delete driver");
    }
  };

  return (
    <Row>
      <Col lg={12}>
        <Card>
          <Card.Header className="bg-white border-bottom">
            <Row className="align-items-center">
              <Col md={6}>
                <h4 className="mb-0">Drivers ({filteredDrivers.length})</h4>
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
                  </InputGroup>

                  {/* Filter */}
                  <Dropdown>
                    <Dropdown.Toggle variant="outline-secondary">
                      Status: {filterActive === "all" ? "All" : filterActive === "active" ? "Active" : "Inactive"}
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      <Dropdown.Item onClick={() => setFilterActive("all")}>
                        All Drivers
                      </Dropdown.Item>
                      <Dropdown.Item onClick={() => setFilterActive("active")}>
                        Active Only
                      </Dropdown.Item>
                      <Dropdown.Item onClick={() => setFilterActive("inactive")}>
                        Inactive Only
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
              </Col>
            </Row>
          </Card.Header>

          <Card.Body>
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="warning" />
                <p className="mt-2">Loading drivers...</p>
              </div>
            ) : filteredDrivers.length === 0 ? (
              <div className="text-center py-5">
                <p className="text-muted">No drivers found</p>
                {searchTerm && (
                  <Button 
                    variant="link" 
                    onClick={() => setSearchTerm("")}
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
                    {filteredDrivers.map((driver) => (
                      <tr key={driver.id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="avatar avatar-sm">
                              <div className="avatar-initial bg-primary rounded-circle">
                                {driver.name.charAt(0).toUpperCase()}
                              </div>
                            </div>
                            <div className="ms-3">
                              <h6 className="mb-0">{driver.name}</h6>
                              <small className="text-muted">ID: {driver.id}</small>
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
                            bg={driver.isActive && driver.driverProfile?.isActive ? "success" : "danger"}
                            className="cursor-pointer"
                            onClick={() => handleStatusToggle(driver.id, driver.isActive)}
                          >
                            {driver.isActive && driver.driverProfile?.isActive ? (
                              <>
                                <IconActive size={14} className="me-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <IconInactive size={14} className="me-1" />
                                Inactive
                              </>
                            )}
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
                          <Dropdown align="end">
                            <Dropdown.Toggle variant="link" className="text-dark">
                              <IconMore size={18} />
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                              <Dropdown.Item as={Link} href={`/drivers/${driver.id}`}>
                                <IconView size={16} className="me-2" />
                                View Details
                              </Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>

          <Card.Footer className="bg-white border-top">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                Showing <strong>{filteredDrivers.length}</strong> of{" "}
                <strong>{drivers.length}</strong> drivers
              </div>
              <div className="d-flex gap-2">
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  disabled={loading}
                  onClick={fetchDrivers}
                >
                  Refresh
                </Button>
              </div>
            </div>
          </Card.Footer>
        </Card>
      </Col>
    </Row>
  );
};

export default PublishedDriverList;