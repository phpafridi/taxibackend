// components/cars/CarList.tsx (Driver Version)
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
} from "react-bootstrap";
import {
  Eye as IconView,
  CarFront as IconCar,
  Person as IconPerson,
  Search as IconSearch,
  Filter as IconFilter,
  ArrowClockwise as IconRefresh,
} from "react-bootstrap-icons";
import Link from "next/link";
import { toast } from "sonner";
import { useDebouncedCallback } from 'use-debounce';

const CarList = () => {
  const [allCars, setAllCars] = useState<any[]>([]); // All driver's cars from API
  const [filteredCars, setFilteredCars] = useState<any[]>([]); // Filtered cars for display
  const [displayedCars, setDisplayedCars] = useState<any[]>([]); // Cars for current page
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [stats, setStats] = useState<any>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [makeFilter, setMakeFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  const ITEMS_PER_PAGE = 10;

  // Extract unique makes from driver's cars
  const uniqueMakes = useMemo(() => {
    const makes = allCars.map(car => car.make).filter(Boolean);
    return ["ALL", ...Array.from(new Set(makes))];
  }, [allCars]);

  // Fetch driver's cars from API
  const fetchCars = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/driver-portal/cars`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch cars");
      }
      
      const fetchedCars = data.data || [];
      setAllCars(fetchedCars);
      setStats(data.stats);
      setTotalItems(fetchedCars.length);
      
    } catch (error: any) {
      setError(error.message || "Failed to load cars");
      toast.error("Failed to load cars");
    } finally {
      setLoading(false);
    }
  }, []);

  // Apply filters to the data
  const applyFilters = useCallback(() => {
    let result = [...allCars];
    
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
    
    // Apply sorting
    result.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (aValue === null || aValue === undefined) aValue = "";
      if (bValue === null || bValue === undefined) bValue = "";
      
      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
    
    setFilteredCars(result);
    setTotalItems(result.length);
    setTotalPages(Math.ceil(result.length / ITEMS_PER_PAGE));
    setCurrentPage(1); // Reset to first page when filters change
  }, [allCars, searchTerm, statusFilter, makeFilter, sortBy, sortOrder]);

  // Update displayed cars based on current page
  useEffect(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    setDisplayedCars(filteredCars.slice(startIndex, endIndex));
  }, [filteredCars, currentPage]);

  // Apply filters when any filter criteria changes
  useEffect(() => {
    if (allCars.length > 0) {
      applyFilters();
    }
  }, [allCars, searchTerm, statusFilter, makeFilter, sortBy, sortOrder, applyFilters]);

  // Initial data fetch
  useEffect(() => {
    fetchCars();

    const handleCarUpdated = () => {
      fetchCars();
    };

    window.addEventListener('carUpdated', handleCarUpdated);
    return () => window.removeEventListener('carUpdated', handleCarUpdated);
  }, [fetchCars]);

  // Debounced search
  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearchTerm(value);
  }, 300);

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setMakeFilter("ALL");
    setSortBy("createdAt");
    setSortOrder("desc");
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
      case "INACTIVE": return "secondary";
      default: return "light";
    }
  };

  if (loading && allCars.length === 0) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="warning" />
        <p className="mt-3">Loading your cars...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error</Alert.Heading>
        <p>{error}</p>
        <Button variant="outline-danger" onClick={fetchCars}>
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h2 className="mb-1">My Cars</h2>
        <p className="text-muted mb-3">
          View and manage all cars assigned to you
        </p>
      </div>

      {/* Statistics Cards - Show only driver stats */}
      {stats && (
        <Row className="g-3 mb-4">
          <Col xs={6} md={3}>
            <Card className="text-center h-100">
              <Card.Body className="p-3">
                <IconCar size={20} className="text-primary mb-2" />
                <h5 className="mb-1">{stats.totalCars}</h5>
                <p className="text-muted mb-0 small">Total Cars</p>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} md={3}>
            <Card className="text-center h-100">
              <Card.Body className="p-3">
                <Badge bg="success" className="mb-2 d-inline-block px-2 py-1">
                  {stats.available}
                </Badge>
                <h5 className="mb-1">Available</h5>
                <p className="text-muted mb-0 small">Ready to use</p>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} md={3}>
            <Card className="text-center h-100">
              <Card.Body className="p-3">
                <Badge bg="primary" className="mb-2 d-inline-block px-2 py-1">
                  {stats.rented}
                </Badge>
                <h5 className="mb-1">In Use</h5>
                <p className="text-muted mb-0 small">Currently assigned</p>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} md={3}>
            <Card className="text-center h-100">
              <Card.Body className="p-3">
                <h5 className="mb-1">{formatCurrency(stats.totalValue)}</h5>
                <p className="text-muted mb-0 small">Total Fleet Value</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Search and Filter Bar */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col md={6} lg={4}>
              <InputGroup>
                <InputGroup.Text>
                  <IconSearch />
                </InputGroup.Text>
                <FormControl
                  placeholder="Search by registration, model, make..."
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
                <option value="RENTED">In Use</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="INACTIVE">Inactive</option>
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
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="createdAt">Newest First</option>
                <option value="registration">Registration</option>
                <option value="year">Year</option>
              </Form.Select>
            </Col>
            
            <Col xs={12} md={6} lg={4} className="d-flex gap-2 mt-2 mt-lg-0">
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
                onClick={fetchCars}
                className="d-flex align-items-center"
              >
                <IconRefresh className="me-1" />
                Refresh
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Results Info */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="mb-0">
            Showing {displayedCars.length} of {totalItems} cars
            {searchTerm || statusFilter !== "ALL" || makeFilter !== "ALL" ? (
              <small className="text-muted ms-2">
                (filtered from {allCars.length})
              </small>
            ) : null}
          </h5>
          {searchTerm || statusFilter !== "ALL" || makeFilter !== "ALL" ? (
            <small className="text-muted">
              Filters:
              {searchTerm && ` Search: "${searchTerm}"`}
              {statusFilter !== "ALL" && ` • Status: ${statusFilter}`}
              {makeFilter !== "ALL" && ` • Make: ${makeFilter}`}
            </small>
          ) : null}
        </div>
        
        <div className="d-flex align-items-center gap-2">
          <span className="text-muted small">
            Page {currentPage} of {totalPages}
          </span>
        </div>
      </div>

      {/* Cars Table */}
      <Card>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Registration</th>
                  <th>Model</th>
                  <th>Make</th>
                  <th>Year</th>
                  <th>Status</th>
                  
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedCars.map((car: any) => (
                  <tr key={car.id}>
                    <td>
                      <strong>{car.registration}</strong>
                    </td>
                    <td>{car.model}</td>
                    <td>{car.make}</td>
                    <td>{car.year || "N/A"}</td>
                    <td>
                      <div className="d-flex flex-column gap-1">
                        <Badge bg={getStatusColor(car.status)}>
                          {car.status}
                        </Badge>
                        <Badge 
                          bg={car.isActive ? "success" : "danger"} 
                          className="text-nowrap"
                          style={{ fontSize: "0.7rem" }}
                        >
                          {car.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </td>
                    
                    <td>
                      <div className="d-flex gap-1">
                        <Link href={`/driver-portal/car/${car.id}`} passHref>
                          <Button variant="outline-primary" size="sm">
                            <IconView size={14} />
                            View
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          
          {displayedCars.length === 0 && !loading && (
            <div className="text-center py-5">
              <IconCar size={48} className="text-muted mb-3" />
              <h5>No cars assigned to you</h5>
              <p className="text-muted mb-3">
                {searchTerm || statusFilter !== "ALL" || makeFilter !== "ALL" 
                  ? "No cars match your search criteria. Try adjusting your filters." 
                  : "You don't have any cars assigned to your account yet."}
              </p>
              {searchTerm || statusFilter !== "ALL" || makeFilter !== "ALL" ? (
                <Button variant="outline-primary" onClick={clearFilters}>
                  Clear Filters
                </Button>
              ) : null}
            </div>
          )}
        </Card.Body>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <Card.Footer className="d-flex justify-content-center">
            <Pagination className="mb-0">
              <Pagination.Prev
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              />
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <Pagination.Item
                    key={pageNum}
                    active={pageNum === currentPage}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Pagination.Item>
                );
              })}
              <Pagination.Next
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              />
            </Pagination>
          </Card.Footer>
        )}
      </Card>
    </div>
  );
};

export default CarList;