"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Card,
  Table,
  Badge,
  Button,
  Spinner,
  Alert,
  Pagination,
  Form,
  Row,
  Col,
  InputGroup,
  FormControl,
  Container,
  Tabs,
  Tab,
} from "react-bootstrap";
import {
  Eye as IconView,
  Pencil as IconEdit,
  CarFront as IconCar,
  Person as IconPerson,
  XCircle,
  CheckCircle,
  Search as IconSearch,
  Filter as IconFilter,
  ArrowClockwise as IconRefresh,
  EyeSlash,
} from "react-bootstrap-icons";
import Link from "next/link";
import { toast } from "sonner";
import { useDebouncedCallback } from 'use-debounce';

const CarList = () => {
  const [allCars, setAllCars] = useState<any[]>([]);
  const [activeCars, setActiveCars] = useState<any[]>([]);
  const [inactiveCars, setInactiveCars] = useState<any[]>([]);
  const [filteredActiveCars, setFilteredActiveCars] = useState<any[]>([]);
  const [filteredInactiveCars, setFilteredInactiveCars] = useState<any[]>([]);
  const [displayedActiveCars, setDisplayedActiveCars] = useState<any[]>([]);
  const [displayedInactiveCars, setDisplayedInactiveCars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCurrentPage, setActiveCurrentPage] = useState(1);
  const [inactiveCurrentPage, setInactiveCurrentPage] = useState(1);
  const [activeTotalPages, setActiveTotalPages] = useState(1);
  const [inactiveTotalPages, setInactiveTotalPages] = useState(1);
  const [activeTotalItems, setActiveTotalItems] = useState(0);
  const [inactiveTotalItems, setInactiveTotalItems] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [selectedCars, setSelectedCars] = useState<number[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [activeKey, setActiveKey] = useState<string>("active");
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [makeFilter, setMakeFilter] = useState<string>("ALL");
  const [yearFilter, setYearFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // Create ref for select all checkbox
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);
  
  // Mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update indeterminate state
  useEffect(() => {
    if (selectAllCheckboxRef.current && displayedActiveCars.length > 0) {
      selectAllCheckboxRef.current.indeterminate = 
        selectedCars.length > 0 && selectedCars.length < displayedActiveCars.length;
    }
  }, [selectedCars, displayedActiveCars.length]);

  // Extract unique makes and years from ALL cars (not filtered)
  const uniqueMakes = useMemo(() => {
    const makes = allCars.map(car => car.make).filter(Boolean);
    return ["ALL", ...Array.from(new Set(makes))];
  }, [allCars]);

  const uniqueYears = useMemo(() => {
    const years = allCars.map(car => car.year).filter(year => year && year > 0);
    const unique = Array.from(new Set(years)).sort((a, b) => b - a);
    return ["ALL", ...unique];
  }, [allCars]);

  // Helper function to get car value
  const getCarValue = useCallback((car: any): number => {
    if (car.currentValue !== null && car.currentValue !== undefined && car.currentValue !== 0) {
      return Number(car.currentValue);
    }
    if (car.purchasePrice !== null && car.purchasePrice !== undefined && car.purchasePrice !== 0) {
      return Number(car.purchasePrice);
    }
    return 0;
  }, []);

  // Fetch all cars from API (without filters)
  const fetchCars = useCallback(async (showSpinner = false) => {
    try {
      if (showSpinner) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      // Fetch ALL cars without any filters initially
      const response = await fetch(`/api/cars?limit=1000`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch cars");
      }
      
      const fetchedCars = data.data || [];
      setAllCars(fetchedCars);
      
      // Separate active and inactive cars
      const active = fetchedCars.filter((car: any) => car.isActive);
      const inactive = fetchedCars.filter((car: any) => !car.isActive);
      
      setActiveCars(active);
      setInactiveCars(inactive);
      setActiveTotalItems(active.length);
      setInactiveTotalItems(inactive.length);
      
    } catch (error: any) {
      setError(error.message || "Failed to load cars");
      toast.error("Failed to load cars");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchStatistics = useCallback(async () => {
    try {
      const response = await fetch("/api/cars/statistics");
      const data = await response.json();
      
      if (response.ok) {
        setStats(data.data || data);
      }
    } catch (error) {
      console.error("Failed to fetch statistics:", error);
    }
  }, []);

  // Calculate total value of active cars
  const calculateTotalValue = useCallback(() => {
    return activeCars.reduce((sum, car) => sum + getCarValue(car), 0);
  }, [activeCars, getCarValue]);

  // Apply filters to active cars
  const applyFiltersToActiveCars = useCallback(() => {
    let result = [...activeCars];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(car => 
        car.registration?.toLowerCase().includes(term) ||
        car.model?.toLowerCase().includes(term) ||
        car.make?.toLowerCase().includes(term)
      );
    }
    
    // Apply status filter
    if (statusFilter !== "ALL") {
      result = result.filter(car => car.status === statusFilter);
    }
    
    // Apply make filter
    if (makeFilter !== "ALL") {
      result = result.filter(car => car.make === makeFilter);
    }
    
    // Apply year filter
    if (yearFilter !== "ALL" && yearFilter !== "undefined") {
      result = result.filter(car => car.year?.toString() === yearFilter);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      // Handle null/undefined values
      if (aValue === null || aValue === undefined) aValue = "";
      if (bValue === null || bValue === undefined) bValue = "";
      
      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
    
    setFilteredActiveCars(result);
    setActiveTotalItems(result.length);
    setActiveTotalPages(Math.ceil(result.length / 40));
    setActiveCurrentPage(1); // Reset to first page when filters change
  }, [activeCars, searchTerm, statusFilter, makeFilter, yearFilter, sortBy, sortOrder]);

  // Apply filters to inactive cars
  const applyFiltersToInactiveCars = useCallback(() => {
    let result = [...inactiveCars];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(car => 
        car.registration?.toLowerCase().includes(term) ||
        car.model?.toLowerCase().includes(term) ||
        car.make?.toLowerCase().includes(term)
      );
    }
    
    // Apply status filter
    if (statusFilter !== "ALL") {
      result = result.filter(car => car.status === statusFilter);
    }
    
    // Apply make filter
    if (makeFilter !== "ALL") {
      result = result.filter(car => car.make === makeFilter);
    }
    
    // Apply year filter
    if (yearFilter !== "ALL" && yearFilter !== "undefined") {
      result = result.filter(car => car.year?.toString() === yearFilter);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      // Handle null/undefined values
      if (aValue === null || aValue === undefined) aValue = "";
      if (bValue === null || bValue === undefined) bValue = "";
      
      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
    
    setFilteredInactiveCars(result);
    setInactiveTotalItems(result.length);
    setInactiveTotalPages(Math.ceil(result.length / 40));
    setInactiveCurrentPage(1);
  }, [inactiveCars, searchTerm, statusFilter, makeFilter, yearFilter, sortBy, sortOrder]);

  // Update displayed cars based on current page
  useEffect(() => {
    const activeStartIndex = (activeCurrentPage - 1) * 40;
    const activeEndIndex = activeStartIndex + 40;
    setDisplayedActiveCars(filteredActiveCars.slice(activeStartIndex, activeEndIndex));
    
    const inactiveStartIndex = (inactiveCurrentPage - 1) * 40;
    const inactiveEndIndex = inactiveStartIndex + 40;
    setDisplayedInactiveCars(filteredInactiveCars.slice(inactiveStartIndex, inactiveEndIndex));
  }, [filteredActiveCars, filteredInactiveCars, activeCurrentPage, inactiveCurrentPage]);

  // Apply filters when any filter criteria changes
  useEffect(() => {
    if (activeCars.length > 0) {
      applyFiltersToActiveCars();
    }
  }, [activeCars, searchTerm, statusFilter, makeFilter, yearFilter, sortBy, sortOrder, applyFiltersToActiveCars]);

  useEffect(() => {
    if (inactiveCars.length > 0) {
      applyFiltersToInactiveCars();
    }
  }, [inactiveCars, searchTerm, statusFilter, makeFilter, yearFilter, sortBy, sortOrder, applyFiltersToInactiveCars]);

  // Initial data fetch
  useEffect(() => {
    fetchCars();
    fetchStatistics();

    const handleCarAdded = () => {
      fetchCars();
      fetchStatistics();
    };

    window.addEventListener('carAdded', handleCarAdded);
    return () => window.removeEventListener('carAdded', handleCarAdded);
  }, [fetchCars, fetchStatistics]);

  // Debounced search
  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearchTerm(value);
  }, 300);

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setMakeFilter("ALL");
    setYearFilter("ALL");
    setSortBy("createdAt");
    setSortOrder("desc");
  };

  // Select/deselect all displayed active cars
  const toggleSelectAll = () => {
    if (selectedCars.length === displayedActiveCars.length) {
      setSelectedCars([]);
    } else {
      const displayedCarIds = displayedActiveCars.map(car => car.id);
      setSelectedCars(displayedCarIds);
    }
  };

  const handleStatusToggle = async (carId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/cars/${carId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update car status");
      }

      toast.success(`Car ${!currentStatus ? "activated" : "deactivated"} successfully`);
      
      // Update the car in local state
      setAllCars(prev => prev.map(car => 
        car.id === carId ? { ...car, isActive: !currentStatus } : car
      ));
      
      // Re-fetch to update separated lists
      fetchCars();
      fetchStatistics();
    } catch (error) {
      toast.error("Failed to update car status");
    }
  };

  // Handle refresh with spin
  const handleRefresh = () => {
    fetchCars(true);
    fetchStatistics();
    toast.info("Refreshing cars...");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "AVAILABLE": return "success";
      case "RENTED": return "primary";
      case "MAINTENANCE": return "warning";
      default: return "secondary";
    }
  };

  // Mobile Card View for Active Cars
  const MobileActiveCarCard = ({ car }: { car: any }) => (
    <Card key={car.id} className="mb-3 shadow-sm border-start border-3 border-success">
      <Card.Body className="p-3">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div>
            <h6 className="mb-0 fw-bold">{car.registration}</h6>
            <small className="text-muted">
              {car.make} {car.model} • {car.year || "N/A"}
            </small>
          </div>
          <Badge bg={getStatusColor(car.status)}>
            {car.status}
          </Badge>
        </div>
        
        <div className="mb-3">
          <div className="d-flex justify-content-between mb-2">
            <small className="text-muted">Driver:</small>
            <small>
              {car.driverprofile ? (
                <span>{car.driverprofile.user.name}</span>
              ) : (
                <span className="text-muted">No driver</span>
              )}
            </small>
          </div>
          <div className="d-flex justify-content-between">
            <small className="text-muted">Value:</small>
            <small>{formatCurrency(getCarValue(car))}</small>
          </div>
        </div>
        
        <div className="d-flex justify-content-end gap-2">
          <Link href={`/cars/${car.id}`} passHref>
            <Button variant="outline-primary" size="sm">
              <IconView size={14} />
            </Button>
          </Link>
        </div>
      </Card.Body>
    </Card>
  );

  // Mobile Card View for Inactive Cars
  const MobileInactiveCarCard = ({ car }: { car: any }) => (
    <Card key={car.id} className="mb-3 shadow-sm border-start border-3 border-secondary">
      <Card.Body className="p-3">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div>
            <h6 className="mb-0 fw-bold">{car.registration}</h6>
            <small className="text-muted">
              {car.make} {car.model} • {car.year || "N/A"}
            </small>
          </div>
          <Badge bg="secondary">
            {car.status || "INACTIVE"}
          </Badge>
        </div>
        
        <div className="mb-3">
          <div className="d-flex justify-content-between mb-2">
            <small className="text-muted">Driver:</small>
            <small>
              {car.driverprofile ? (
                <span>{car.driverprofile.user.name}</span>
              ) : (
                <span className="text-muted">No driver</span>
              )}
            </small>
          </div>
          <div className="d-flex justify-content-between">
            <small className="text-muted">Value:</small>
            <small>{formatCurrency(getCarValue(car))}</small>
          </div>
        </div>
        
        <div className="d-flex justify-content-end gap-2">
          <Link href={`/cars/${car.id}`} passHref>
            <Button variant="outline-primary" size="sm">
              <IconView size={14} />
            </Button>
          </Link>
          {/* <Button
            variant="outline-success"
            size="sm"
            onClick={() => handleStatusToggle(car.id, car.isActive)}
            title="Activate"
          >
            <CheckCircle size={14} />
          </Button> */}
        </div>
      </Card.Body>
    </Card>
  );

  if (loading && allCars.length === 0) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="warning" />
        <p className="mt-3">Loading cars...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error</Alert.Heading>
        <p>{error}</p>
        <Button variant="outline-danger" onClick={() => fetchCars()}>
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <Container fluid className="px-3 px-md-4 py-3">
      {/* Mobile Header */}
      {isMobile && (
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h4 className="mb-0">Cars</h4>
              <small className="text-muted">
                {activeKey === "active" 
                  ? `${filteredActiveCars.length} active` 
                  : `${filteredInactiveCars.length} inactive`}
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
                <IconRefresh size={16} />
              )}
            </Button>
          </div>

          {/* Mobile Search & Filter */}
          <div className="mb-3">
            <InputGroup size="sm" className="mb-2">
              <InputGroup.Text>
                <IconSearch size={16} />
              </InputGroup.Text>
              <FormControl
                placeholder="Search cars..."
                onChange={(e) => debouncedSearch(e.target.value)}
                defaultValue={searchTerm}
              />
              {searchTerm && (
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                >
                  ×
                </Button>
              )}
            </InputGroup>
            
            <div className="d-flex gap-2">
              <Form.Select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                size="sm"
              >
                <option value="ALL">All Status</option>
                <option value="AVAILABLE">Available</option>
                <option value="RENTED">Rented</option>
                <option value="MAINTENANCE">Maintenance</option>
              </Form.Select>
              
              <Form.Select 
                value={makeFilter}
                onChange={(e) => setMakeFilter(e.target.value)}
                disabled={uniqueMakes.length <= 1}
                size="sm"
              >
                {uniqueMakes.slice(0, 3).map((make) => (
                  <option key={make} value={make}>
                    {make === "ALL" ? "All" : make.length > 8 ? `${make.slice(0, 8)}...` : make}
                  </option>
                ))}
              </Form.Select>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Header */}
      {!isMobile && (
        <div className="mb-4">
          <h2 className="mb-1">Cars</h2>
          <p className="text-muted mb-3">
            Manage all cars in the system
          </p>
        </div>
      )}

      {/* Statistics Cards */}
      <Row className="g-3 mb-4">
        <Col xs={6} md={3}>
          <Card className="text-center h-100">
            <Card.Body className="p-3">
              <IconCar size={20} className="text-primary mb-2" />
              <h5 className="mb-1">{activeCars.length}</h5>
              <p className="text-muted mb-0 small">Active Cars</p>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="text-center h-100">
            <Card.Body className="p-3">
              <Badge bg="success" className="mb-2 d-inline-block px-2 py-1">
                {activeCars.filter(c => c.status === "AVAILABLE").length}
              </Badge>
              <h5 className="mb-1">Available</h5>
              <p className="text-muted mb-0 small">Ready to rent</p>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="text-center h-100">
            <Card.Body className="p-3">
              <Badge bg="primary" className="mb-2 d-inline-block px-2 py-1">
                {activeCars.filter(c => c.status === "RENTED").length}
              </Badge>
              <h5 className="mb-1">Rented</h5>
              <p className="text-muted mb-0 small">Currently rented</p>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="text-center h-100">
            <Card.Body className="p-3">
              <EyeSlash size={20} className="text-secondary mb-2" />
              <h5 className="mb-1">{inactiveCars.length}</h5>
              <p className="text-muted mb-0 small">Inactive Cars</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Search and Filter Bar - Desktop Only */}
      {!isMobile && (
        <Card className="mb-4">
          <Card.Body>
            <Row className="g-3">
              <Col md={6} lg={4}>
                <InputGroup>
                  <InputGroup.Text>
                    <IconSearch />
                  </InputGroup.Text>
                  <FormControl
                    placeholder="Search registration, model, make..."
                    onChange={(e) => debouncedSearch(e.target.value)}
                    defaultValue={searchTerm}
                  />
                </InputGroup>
              </Col>
              
              <Col xs={6} md={3} lg={2}>
                <Form.Select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Status</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="RENTED">Rented</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </Form.Select>
              </Col>
              
              <Col xs={6} md={3} lg={2}>
                <Form.Select 
                  value={makeFilter}
                  onChange={(e) => setMakeFilter(e.target.value)}
                  disabled={uniqueMakes.length <= 1}
                >
                  {uniqueMakes.map((make) => (
                    <option key={make} value={make}>
                      {make === "ALL" ? "All Makes" : make}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              
              <Col xs={6} md={3} lg={2}>
                <Form.Select 
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  disabled={uniqueYears.length <= 1}
                >
                  {uniqueYears.map((year) => (
                    <option key={year} value={year}>
                      {year === "ALL" ? "All Years" : year}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              
              <Col xs={6} md={3} lg={2}>
                <Form.Select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="createdAt">Newest First</option>
                  <option value="registration">Registration</option>
                  <option value="year">Year</option>
                  <option value="purchasePrice">Price</option>
                </Form.Select>
              </Col>
              
              <Col xs={12} md={6} lg={6} className="d-flex gap-2 mt-2 mt-lg-0">
                <Button 
                  variant="outline-secondary" 
                  onClick={clearFilters}
                  className="d-flex align-items-center"
                >
                  <IconFilter className="me-1" />
                  Clear Filters
                </Button>
                
                <Button 
                  variant="outline-primary" 
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
                    <>
                      <IconRefresh className="me-1" />
                      Refresh
                    </>
                  )}
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* Tabs for Mobile and Desktop */}
      <Tabs
        activeKey={activeKey}
        onSelect={(k) => setActiveKey(k || "active")}
        className="mb-4"
        fill={isMobile}
      >
        {/* Active Cars Tab */}
        <Tab
          eventKey="active"
          title={
            <div className="d-flex align-items-center">
              <IconCar className="me-1" size={14} />
              <span>Active ({filteredActiveCars.length})</span>
            </div>
          }
        >
          {isMobile ? (
            // Mobile Active Cars View
            <div>
              {displayedActiveCars.length === 0 && !loading ? (
                <Card className="text-center py-5">
                  <IconCar size={48} className="text-muted mb-3" />
                  <h5>No active cars found</h5>
                  <p className="text-muted mb-3">
                    {searchTerm || statusFilter !== "ALL" || makeFilter !== "ALL" 
                      ? "Try adjusting your filters" 
                      : "Add your first car"}
                  </p>
                  {searchTerm || statusFilter !== "ALL" || makeFilter !== "ALL" ? (
                    <Button variant="outline-primary" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  ) : (
                    <Link href="/cars/add">
                      <Button variant="primary">Add New Car</Button>
                    </Link>
                  )}
                </Card>
              ) : (
                <>
                  {displayedActiveCars.map((car) => (
                    <MobileActiveCarCard key={car.id} car={car} />
                  ))}
                </>
              )}

              {/* Mobile Pagination - Active Cars */}
              {activeTotalPages > 1 && (
                <div className="mt-3 d-flex justify-content-center">
                  <Pagination size="sm" className="mb-0">
                    <Pagination.Prev
                      disabled={activeCurrentPage === 1}
                      onClick={() => setActiveCurrentPage(activeCurrentPage - 1)}
                    />
                    {[...Array(Math.min(3, activeTotalPages))].map((_, i) => {
                      let pageNum;
                      if (activeTotalPages <= 3) {
                        pageNum = i + 1;
                      } else if (activeCurrentPage <= 2) {
                        pageNum = i + 1;
                      } else if (activeCurrentPage >= activeTotalPages - 1) {
                        pageNum = activeTotalPages - 2 + i;
                      } else {
                        pageNum = activeCurrentPage - 1 + i;
                      }

                      return (
                        <Pagination.Item
                          key={pageNum}
                          active={pageNum === activeCurrentPage}
                          onClick={() => setActiveCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Pagination.Item>
                      );
                    })}
                    <Pagination.Next
                      disabled={activeCurrentPage === activeTotalPages}
                      onClick={() => setActiveCurrentPage(activeCurrentPage + 1)}
                    />
                  </Pagination>
                </div>
              )}
            </div>
          ) : (
            // Desktop Active Cars View
            <Card>
              <Card.Header className="bg-white border-bottom">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="mb-0">Active Cars ({filteredActiveCars.length})</h5>
                    {searchTerm && (
                      <small className="text-muted">
                        Showing results for "{searchTerm}"
                      </small>
                    )}
                  </div>
                </div>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: "50px" }}>
                          <Form.Check
                            type="checkbox"
                            ref={selectAllCheckboxRef}
                            onChange={toggleSelectAll}
                            checked={selectedCars.length === displayedActiveCars.length && displayedActiveCars.length > 0}
                          />
                        </th>
                        <th>Registration</th>
                        <th>Model</th>
                        <th>Make</th>
                        <th>Year</th>
                        <th>Status</th>
                        <th>Driver</th>
                        <th>Value</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedActiveCars.map((car: any) => (
                        <tr key={car.id}>
                          <td>
                            <Form.Check
                              type="checkbox"
                              checked={selectedCars.includes(car.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCars([...selectedCars, car.id]);
                                } else {
                                  setSelectedCars(selectedCars.filter(id => id !== car.id));
                                }
                              }}
                            />
                          </td>
                          <td>
                            <strong>{car.registration}</strong>
                          </td>
                          <td>{car.model}</td>
                          <td>{car.make}</td>
                          <td>{car.year || "N/A"}</td>
                          <td>
                            <Badge bg={getStatusColor(car.status)}>
                              {car.status}
                            </Badge>
                          </td>
                          <td>
                            {car.driverprofile ? (
                              <div className="d-flex align-items-center">
                                <IconPerson size={14} className="me-2 text-muted" />
                                <span>{car.driverprofile.user.name}</span>
                              </div>
                            ) : (
                              <span className="text-muted">No driver</span>
                            )}
                          </td>
                          <td>{formatCurrency(getCarValue(car))}</td>
                          <td>
                            <div className="d-flex gap-1">
                              <Link href={`/cars/${car.id}`} passHref>
                                <Button variant="outline-primary" size="sm">
                                  <IconView size={14} />
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
                
                {displayedActiveCars.length === 0 && !loading && (
                  <div className="text-center py-5">
                    <IconCar size={48} className="text-muted mb-3" />
                    <h5>No active cars found</h5>
                    <p className="text-muted mb-3">
                      {searchTerm || statusFilter !== "ALL" || makeFilter !== "ALL" || yearFilter !== "ALL" 
                        ? "Try adjusting your filters or search term" 
                        : "Add your first car to get started"}
                    </p>
                    {searchTerm || statusFilter !== "ALL" || makeFilter !== "ALL" || yearFilter !== "ALL" ? (
                      <Button variant="outline-primary" onClick={clearFilters}>
                        Clear Filters
                      </Button>
                    ) : (
                      <Link href="/cars/add">
                        <Button variant="primary">Add New Car</Button>
                      </Link>
                    )}
                  </div>
                )}
              </Card.Body>
              
              {/* Pagination - Active Cars */}
              {activeTotalPages > 1 && (
                <Card.Footer className="d-flex justify-content-center">
                  <Pagination className="mb-0">
                    <Pagination.Prev
                      disabled={activeCurrentPage === 1}
                      onClick={() => setActiveCurrentPage(activeCurrentPage - 1)}
                    />
                    {[...Array(Math.min(5, activeTotalPages))].map((_, i) => {
                      let pageNum;
                      if (activeTotalPages <= 5) {
                        pageNum = i + 1;
                      } else if (activeCurrentPage <= 3) {
                        pageNum = i + 1;
                      } else if (activeCurrentPage >= activeTotalPages - 2) {
                        pageNum = activeTotalPages - 4 + i;
                      } else {
                        pageNum = activeCurrentPage - 2 + i;
                      }

                      return (
                        <Pagination.Item
                          key={pageNum}
                          active={pageNum === activeCurrentPage}
                          onClick={() => setActiveCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Pagination.Item>
                      );
                    })}
                    <Pagination.Next
                      disabled={activeCurrentPage === activeTotalPages}
                      onClick={() => setActiveCurrentPage(activeCurrentPage + 1)}
                    />
                  </Pagination>
                </Card.Footer>
              )}
            </Card>
          )}
        </Tab>

        {/* Inactive Cars Tab */}
        <Tab
          eventKey="inactive"
          title={
            <div className="d-flex align-items-center">
              <EyeSlash className="me-1" size={14} />
              <span>Inactive ({filteredInactiveCars.length})</span>
            </div>
          }
        >
          {isMobile ? (
            // Mobile Inactive Cars View
            <div>
              {displayedInactiveCars.length === 0 ? (
                <Card className="text-center py-5">
                  <EyeSlash size={48} className="text-muted mb-3" />
                  <h5>No inactive cars</h5>
                  <p className="text-muted mb-0">
                    All cars are currently active
                  </p>
                </Card>
              ) : (
                <>
                  {displayedInactiveCars.map((car) => (
                    <MobileInactiveCarCard key={car.id} car={car} />
                  ))}
                </>
              )}

              {/* Mobile Pagination - Inactive Cars */}
              {inactiveTotalPages > 1 && (
                <div className="mt-3 d-flex justify-content-center">
                  <Pagination size="sm" className="mb-0">
                    <Pagination.Prev
                      disabled={inactiveCurrentPage === 1}
                      onClick={() => setInactiveCurrentPage(inactiveCurrentPage - 1)}
                    />
                    {[...Array(Math.min(3, inactiveTotalPages))].map((_, i) => {
                      let pageNum;
                      if (inactiveTotalPages <= 3) {
                        pageNum = i + 1;
                      } else if (inactiveCurrentPage <= 2) {
                        pageNum = i + 1;
                      } else if (inactiveCurrentPage >= inactiveTotalPages - 1) {
                        pageNum = inactiveTotalPages - 2 + i;
                      } else {
                        pageNum = inactiveCurrentPage - 1 + i;
                      }

                      return (
                        <Pagination.Item
                          key={pageNum}
                          active={pageNum === inactiveCurrentPage}
                          onClick={() => setInactiveCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Pagination.Item>
                      );
                    })}
                    <Pagination.Next
                      disabled={inactiveCurrentPage === inactiveTotalPages}
                      onClick={() => setInactiveCurrentPage(inactiveCurrentPage + 1)}
                    />
                  </Pagination>
                </div>
              )}
            </div>
          ) : (
            // Desktop Inactive Cars View
            <Card>
              <Card.Header className="bg-white border-bottom">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="mb-0">Inactive Cars ({filteredInactiveCars.length})</h5>
                    {searchTerm && (
                      <small className="text-muted">
                        Showing results for "{searchTerm}"
                      </small>
                    )}
                  </div>
                </div>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: "50px" }}></th>
                        <th>Registration</th>
                        <th>Model</th>
                        <th>Make</th>
                        <th>Year</th>
                        <th>Status</th>
                        <th>Driver</th>
                        <th>Value</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedInactiveCars.map((car: any) => (
                        <tr key={car.id}>
                          <td></td>
                          <td>
                            <strong>{car.registration}</strong>
                          </td>
                          <td>{car.model}</td>
                          <td>{car.make}</td>
                          <td>{car.year || "N/A"}</td>
                          <td>
                            <Badge bg="secondary">
                              {car.status || "INACTIVE"}
                            </Badge>
                          </td>
                          <td>
                            {car.driverprofile ? (
                              <div className="d-flex align-items-center">
                                <IconPerson size={14} className="me-2 text-muted" />
                                <span>{car.driverprofile.user.name}</span>
                              </div>
                            ) : (
                              <span className="text-muted">No driver</span>
                            )}
                          </td>
                          <td>{formatCurrency(getCarValue(car))}</td>
                          <td>
                            <div className="d-flex gap-1">
                              <Link href={`/cars/${car.id}`} passHref>
                                <Button variant="outline-primary" size="sm">
                                  <IconView size={14} />
                                </Button>
                              </Link>
                              {/* <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() => handleStatusToggle(car.id, car.isActive)}
                                title="Activate"
                              >
                                <CheckCircle size={14} />
                              </Button> */}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
                
                {displayedInactiveCars.length === 0 && (
                  <div className="text-center py-5">
                    <EyeSlash size={48} className="text-muted mb-3" />
                    <h5>No inactive cars</h5>
                    <p className="text-muted mb-0">
                      All cars are currently active
                    </p>
                  </div>
                )}
              </Card.Body>
              
              {/* Pagination - Inactive Cars */}
              {inactiveTotalPages > 1 && (
                <Card.Footer className="d-flex justify-content-center">
                  <Pagination className="mb-0">
                    <Pagination.Prev
                      disabled={inactiveCurrentPage === 1}
                      onClick={() => setInactiveCurrentPage(inactiveCurrentPage - 1)}
                    />
                    {[...Array(Math.min(5, inactiveTotalPages))].map((_, i) => {
                      let pageNum;
                      if (inactiveTotalPages <= 5) {
                        pageNum = i + 1;
                      } else if (inactiveCurrentPage <= 3) {
                        pageNum = i + 1;
                      } else if (inactiveCurrentPage >= inactiveTotalPages - 2) {
                        pageNum = inactiveTotalPages - 4 + i;
                      } else {
                        pageNum = inactiveCurrentPage - 2 + i;
                      }

                      return (
                        <Pagination.Item
                          key={pageNum}
                          active={pageNum === inactiveCurrentPage}
                          onClick={() => setInactiveCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Pagination.Item>
                      );
                    })}
                    <Pagination.Next
                      disabled={inactiveCurrentPage === inactiveTotalPages}
                      onClick={() => setInactiveCurrentPage(inactiveCurrentPage + 1)}
                    />
                  </Pagination>
                </Card.Footer>
              )}
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
            <IconRefresh size={20} />
          )}
        </Button>
      )}
    </Container>
  );
};

export default CarList;