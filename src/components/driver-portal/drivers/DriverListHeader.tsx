"use client";

import { useState, useEffect } from "react";
import { Row, Col, Button, Modal, Form } from "react-bootstrap";
import { Plus as IconPlus } from "react-bootstrap-icons";
import Flex from "../../common/Flex";
import DasherBreadcrumb from "../../common/DasherBreadcrumb";
import { toast } from "sonner";
import Confetti from "react-confetti";

const DriverListHeader = () => {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Set window size for confetti
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const openModal = () => {
    setFormErrors({});
    setShowModal(true);
  };
  
  const closeModal = () => {
    setFormErrors({});
    setShowModal(false);
  };

  const validateForm = (formData: FormData) => {
    const errors: Record<string, string> = {};
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const licenseExpiry = formData.get("licenseExpiry") as string;

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.email = "Please enter a valid email address";
    }

    // Phone validation (optional but validate if provided)
    // if (phone && !/^[\d\s\-\+\(\)]{10,20}$/.test(phone.replace(/\s/g, ''))) {
    //   errors.phone = "Please enter a valid phone number";
    // }

    // License expiry validation (if provided)
    if (licenseExpiry) {
      const expiryDate = new Date(licenseExpiry);
      const today = new Date();
      if (expiryDate < today) {
        errors.licenseExpiry = "License expiry date cannot be in the past";
      }
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setFormErrors({});

    const form = e.currentTarget;
    const formData = new FormData(form);

    // Validate form
    const errors = validateForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setLoading(false);
      toast.error("Please fix the errors in the form");
      return;
    }

    const payload = {
      name: formData.get("fullName") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      isActive: formData.get("userStatus") === "active",
      
      // Driver profile fields
      weeklyAmount: 0,
      licenseNumber: formData.get("licenseNumber") as string,
      licenseExpiry: formData.get("licenseExpiry") as string,
      address: formData.get("address") as string,
      postcode: formData.get("postcode") as string,
      emergencyContact: formData.get("emergencyContact") as string,
      emergencyPhone: formData.get("emergencyPhone") as string,
      dateOfBirth: formData.get("dateOfBirth") as string,
      driverIsActive: formData.get("driverStatus") === "active",
    };

    try {
      const res = await fetch("/api/drivers/add-driver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(`Failed to add driver: ${data.message || "Unknown error"}`);
        const audio = new Audio("/notifications/error.wav");
        
        return;
      }

      form.reset();
      const audio = new Audio("/notifications/success.wav");
      
      toast.success(data.message || "Driver added successfully");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
      closeModal();

      // Optional: Refresh the driver list or trigger a callback
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('driverAdded'));
      }

    } catch (error: any) {
      toast.error("Network error. Please try again.");
      console.error("Submission error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {success && isClient && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={200}
        />
      )}
      
      {/* HEADER */}
      <Row>
        <Col lg={12}>
          <Flex
            className="mb-8"
            breakpoint="md"
            justifyContent="between"
            alignItems="center"
          >
            <div>
              <h1 className="mb-3 h2">Drivers List</h1>
              <DasherBreadcrumb />
            </div>

            <Button
              variant="warning"
              className="d-md-flex align-items-center gap-1"
              onClick={openModal}
            >
              <IconPlus size={18} />
              New Driver
            </Button>
          </Flex>
        </Col>
      </Row>

      {/* MODAL */}
      <Modal show={showModal} onHide={closeModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Add New Driver</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form onSubmit={handleSubmit} noValidate>
            {/* USER INFO */}
            <h6 className="mb-3">User Information</h6>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Full Name *</Form.Label>
                  <Form.Control 
                    name="fullName" 
                    required 
                    isInvalid={!!formErrors.fullName}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.fullName}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Email *</Form.Label>
                  <Form.Control 
                    type="email" 
                    name="email" 
                    required
                    isInvalid={!!formErrors.email}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.email}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Phone</Form.Label>
                  <Form.Control 
                    name="phone"
                    isInvalid={!!formErrors.phone}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.phone}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>User Status *</Form.Label>
                  <Form.Select name="userStatus" required>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <hr />

            {/* DRIVER PROFILE */}
            <h6 className="mb-3">Driver Profile</h6>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Driver Status *</Form.Label>
                  <Form.Select name="driverStatus" required>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>License Number</Form.Label>
                  <Form.Control name="licenseNumber" maxLength={50} />
                </Form.Group>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>License Expiry Date</Form.Label>
                  <Form.Control 
                    type="date" 
                    name="licenseExpiry"
                    isInvalid={!!formErrors.licenseExpiry}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.licenseExpiry}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Postcode</Form.Label>
                  <Form.Control name="postcode" maxLength={20} />
                </Form.Group>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Address</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="address"
                    placeholder="Full address"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Emergency Contact Name</Form.Label>
                  <Form.Control name="emergencyContact" maxLength={100} />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Emergency Contact Phone</Form.Label>
                  <Form.Control name="emergencyPhone" maxLength={20} />
                </Form.Group>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Date of Birth</Form.Label>
                  <Form.Control
                    type="date"
                    name="dateOfBirth"
                  />
                </Form.Group>
              </Col>
            </Row>

            <div className="d-grid mt-4">
              <Button type="submit" variant="warning" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Saving...
                  </>
                ) : (
                  "Add Driver"
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default DriverListHeader;