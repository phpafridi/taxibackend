"use client";

import { useState, useEffect, useRef } from "react";
import { Row, Col, Button, Modal, Form } from "react-bootstrap";
import { Plus as IconPlus, Camera as IconCamera, X as IconX, Crop as IconCrop, Check as IconCheck } from "react-bootstrap-icons";
import Flex from "../common/Flex";
import DasherBreadcrumb from "../common/DasherBreadcrumb";
import { toast } from "sonner";
import Confetti from "react-confetti";
import Image from "next/image";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";

const DriverListHeader = () => {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const cropperRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isClient, setIsClient] = useState(false);

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
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const openModal = () => {
    setFormErrors({});
    setImagePreview(null);
    setOriginalImage(null);
    setImageFile(null);
    setCroppedImage(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setFormErrors({});
    setImagePreview(null);
    setOriginalImage(null);
    setImageFile(null);
    setCroppedImage(null);
    setShowModal(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a valid image (JPEG, PNG, WebP)");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const imageUrl = reader.result as string;
      setOriginalImage(imageUrl);
      setImagePreview(imageUrl);
      // Open crop modal
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    setOriginalImage(null);
    setImageFile(null);
    setCroppedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Crop image function
  const getCroppedImage = () => {
    if (cropperRef.current && cropperRef.current.cropper) {
      const croppedCanvas = cropperRef.current.cropper.getCroppedCanvas();
      if (croppedCanvas) {
        const croppedImageUrl = croppedCanvas.toDataURL('image/jpeg', 0.9);
        setCroppedImage(croppedImageUrl);
        setImagePreview(croppedImageUrl);
        setShowCropModal(false);
        toast.success("Image cropped successfully");
      }
    }
  };

  // Cancel crop and use original image
  const cancelCrop = () => {
    setImagePreview(originalImage);
    setShowCropModal(false);
    toast.info("Using original image");
  };

  const uploadImageToServer = async (file: File): Promise<string | null> => {
    try {
      setIsUploadingImage(true);
      toast.info("Uploading driver photo...");

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'drivers'); // Save to drivers folder

      const response = await fetch('/api/upload/car-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.url) {
        toast.success("Photo uploaded successfully!");
        return data.url; // Returns something like "/uploads/drivers/filename.jpg"
      } else {
        toast.error(data.message || "Failed to upload photo");
        return null;
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      toast.error("Failed to upload photo");
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const validateForm = (formData: FormData) => {
    const errors: Record<string, string> = {};
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const licenseExpiry = formData.get("licenseExpiry") as string;
    const driverNumberLicenseExpiry = formData.get("driverNumber_licenseExpiry") as string;

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.email = "Please enter a valid email address";
    }

    // Phone validation
    // if (phone && !/^[\d\s\-\+\(\)]{10,20}$/.test(phone.replace(/\s/g, ''))) {
    //   errors.phone = "Please enter a valid phone number";
    // }

    // License expiry validation
    if (licenseExpiry) {
      const expiryDate = new Date(licenseExpiry);
      const today = new Date();
      if (expiryDate < today) {
        errors.licenseExpiry = "License expiry date cannot be in the past";
      }
    }

    // Driver Number License expiry validation
    if (driverNumberLicenseExpiry) {
      const expiryDate = new Date(driverNumberLicenseExpiry);
      const today = new Date();
      if (expiryDate < today) {
        errors.driverNumberLicenseExpiry = "Driver number license expiry date cannot be in the past";
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

    let avatarUrl = null;

    // Upload image first if exists
    if (imageFile && imagePreview) {
      // Convert cropped image back to file if cropped
      let fileToUpload = imageFile;
      if (croppedImage) {
        // Convert data URL to blob
        const response = await fetch(croppedImage);
        const blob = await response.blob();
        fileToUpload = new File([blob], imageFile.name, { type: 'image/jpeg' });
      }
      
      avatarUrl = await uploadImageToServer(fileToUpload);
      if (!avatarUrl) {
        setLoading(false);
        return;
      }
    }

    const payload = {
      name: formData.get("fullName") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      avatar: avatarUrl, // Add avatar URL
      isActive: formData.get("userStatus") === "active",

      // Driver profile fields
      weeklyAmount: 0,
      licenseNumber: formData.get("licenseNumber") as string,
      driverNumber_licenseNumber: formData.get("driverNumber_licenseNumber") as string,
      driverNumber_licenseExpiry: formData.get("driverNumber_licenseExpiry") as string,
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
      removeImage(); // Clear image preview
      const audio = new Audio("/notifications/success.wav");

      toast.success(data.message || "Driver added successfully");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
      closeModal();

      // Refresh driver list
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
            {/* DRIVER PHOTO */}
            <div className="mb-4">
              <h6 className="mb-3">
                <IconCamera className="me-2" />
                Driver Photo
              </h6>

              <div className="text-center mb-3">
                <div
                  className={`border-2 border-dashed rounded-3 p-4 ${imagePreview ? 'border-primary' : 'border-gray-300'} cursor-pointer`}
                  onClick={triggerFileInput}
                  style={{ minHeight: '150px' }}
                >
                  {imagePreview ? (
                    <div className="position-relative">
                      <div className="position-relative" style={{ width: '120px', height: '120px', margin: '0 auto' }}>
                        <Image
                          src={imagePreview}
                          alt="Driver preview"
                          fill
                          className="object-cover rounded-circle"
                          sizes="120px"
                        />
                      </div>
                      <Button
                        variant="danger"
                        size="sm"
                        className="position-absolute top-0 end-0 mt-2 me-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage();
                        }}
                      >
                        <IconX size={16} />
                      </Button>
                      <Button
                        variant="info"
                        size="sm"
                        className="position-absolute top-0 start-0 mt-2 ms-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (originalImage) {
                            setShowCropModal(true);
                          }
                        }}
                        title="Crop Image"
                      >
                        <IconCrop size={16} />
                      </Button>
                    </div>
                  ) : (
                    <div className="d-flex flex-column align-items-center justify-content-center h-100">
                      <div className="bg-light rounded-circle p-3 mb-3">
                        <IconCamera size={32} className="text-muted" />
                      </div>
                      <p className="text-muted mb-1">Click to upload driver photo</p>
                      <p className="text-muted small">JPEG, PNG or WebP (Max 5MB)</p>
                    </div>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  className="d-none"
                />

                <div className="mt-2">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={triggerFileInput}
                    disabled={isUploadingImage}
                  >
                    {imagePreview ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                  {imagePreview && (
                    <>
                      <Button
                        variant="outline-info"
                        size="sm"
                        className="ms-2"
                        onClick={() => setShowCropModal(true)}
                        disabled={isUploadingImage || !originalImage}
                      >
                        <IconCrop className="me-1" />
                        Crop
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        className="ms-2"
                        onClick={removeImage}
                        disabled={isUploadingImage}
                      >
                        Remove
                      </Button>
                    </>
                  )}
                  {isUploadingImage && (
                    <div className="mt-2">
                      <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                      <span className="text-muted small">Uploading photo...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

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
                  <Form.Label>License Number</Form.Label>
                  <Form.Control name="licenseNumber" maxLength={50} />
                </Form.Group>
              </Col>

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
            </Row>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Driver Number/license Number</Form.Label>
                  <Form.Control name="driverNumber_licenseNumber" maxLength={50} />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Driver Number/license Number Expiry Date</Form.Label>
                  <Form.Control
                    type="date"
                    name="driverNumber_licenseExpiry"
                    isInvalid={!!formErrors.driverNumberLicenseExpiry}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.driverNumberLicenseExpiry}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

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
              <Button type="submit" variant="warning" disabled={loading || isUploadingImage}>
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Saving...
                  </>
                ) : isUploadingImage ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Uploading Photo...
                  </>
                ) : (
                  "Add Driver"
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* CROP IMAGE MODAL */}
      <Modal show={showCropModal} onHide={cancelCrop} centered size="xl">
        <Modal.Header closeButton>
          <Modal.Title>
            <IconCrop className="me-2" />
            Crop Photo
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {originalImage && (
            <div style={{ maxHeight: '500px', overflow: 'auto' }}>
              <Cropper
                src={originalImage}
                style={{ height: '400px', width: '100%' }}
                initialAspectRatio={1} // Square aspect ratio for profile photos
                guides={true}
                ref={cropperRef}
                viewMode={1}
                minCropBoxHeight={100}
                minCropBoxWidth={100}
                background={false}
                responsive={true}
                autoCropArea={1}
                checkOrientation={false}
                cropBoxMovable={true}
                cropBoxResizable={true}
                toggleDragModeOnDblclick={true}
              />
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cancelCrop}>
            Cancel
          </Button>
          <Button variant="primary" onClick={getCroppedImage}>
            <IconCheck className="me-2" />
            Apply Crop
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default DriverListHeader;