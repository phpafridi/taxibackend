"use client";

import { useState, useEffect, useRef } from "react";
import {
  Button,
  Col,
  Row,
  Form,
  InputGroup,
  Modal,
} from "react-bootstrap";
import {
  Plus as IconPlus,
  Camera as IconCamera,
  X as IconX,
  CarFront as IconCar,
  Crop as IconCrop,
  Check as IconCheck,
} from "react-bootstrap-icons";
import { toast } from "sonner";
import Confetti from "react-confetti";
import Image from "next/image";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";

const CarListHeader = () => {
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
      toast.info("Uploading car image...");

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'cars');

      // Upload to your API endpoint
      const response = await fetch('/api/upload/car-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.url) {
        toast.success("Image uploaded successfully!");
        return data.url; // Returns something like "/uploads/cars/filename.jpg"
      } else {
        toast.error(data.message || "Failed to upload image");
        return null;
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      toast.error("Failed to upload image");
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const validateForm = (formData: FormData) => {
    const errors: Record<string, string> = {};
    const registration = formData.get("registration") as string;
    const purchasePrice = formData.get("purchasePrice") as string;
    const currentValue = formData.get("currentValue") as string;
    const purchaseDate = formData.get("purchaseDate") as string;
    const year = formData.get("year") as string;

    if (!registration || registration.trim().length === 0) {
      errors.registration = "Registration number is required";
    } else if (registration.length > 20) {
      errors.registration = "Registration cannot exceed 20 characters";
    }

    if (!purchasePrice || isNaN(parseFloat(purchasePrice)) || parseFloat(purchasePrice) <= 0) {
      errors.purchasePrice = "Valid purchase price is required";
    }

    if (currentValue && (isNaN(parseFloat(currentValue)) || parseFloat(currentValue) < 0)) {
      errors.currentValue = "Current value must be a positive number";
    }

    if (purchaseDate) {
      const date = new Date(purchaseDate);
      if (isNaN(date.getTime())) {
        errors.purchaseDate = "Invalid purchase date";
      } else if (date > new Date()) {
        errors.purchaseDate = "Purchase date cannot be in the future";
      }
    }

    if (year) {
      const yearNum = parseInt(year);
      const currentYear = new Date().getFullYear();
      if (isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear + 1) {
        errors.year = `Year must be between 1900 and ${currentYear + 1}`;
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
        return; // Stop if image upload fails
      }
    }

    const payload = {
      registration: formData.get("registration") as string,
      model: formData.get("model") as string,
      make: formData.get("make") as string,
      year: formData.get("year") ? parseInt(formData.get("year") as string) : null,
      color: formData.get("color") as string,
      bodyType: formData.get("bodyType") as string, 
      purchasePrice: parseFloat(formData.get("purchasePrice") as string),
      purchaseDate: formData.get("purchaseDate") as string || null,
      currentValue: formData.get("currentValue") ? parseFloat(formData.get("currentValue") as string) : null,
      status: formData.get("status") as string,
      isActive: formData.get("isActive") === "true",
      avatar: avatarUrl, // Add avatar URL to payload
    };

    try {
      const res = await fetch("/api/cars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(`Failed to add car: ${data.message || "Unknown error"}`);
        return;
      }

      form.reset();
      // Play success sound
      try {
        const audio = new Audio("/notifications/success.wav");
        audio.play();
      } catch (err) {
        // Silently fail audio
      }

      toast.success(data.message || "Car added successfully");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
      closeModal();

      // Dispatch event to refresh car list and statistics
      window.dispatchEvent(new Event('carAdded'));

    } catch (error: any) {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();

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

      <Row className="mb-4 align-items-center">
        <Col>
          <h2 className="mb-0">Cars</h2>
          <p className="text-muted mb-0">Manage your car fleet</p>
        </Col>
        <Col xs="auto">
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <Button variant="warning" onClick={openModal}>
              <IconPlus className="me-2" />
              Add Car
            </Button>
          </div>
        </Col>
      </Row>

      {/* ADD CAR MODAL */}
      <Modal show={showModal} onHide={closeModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Add New Car</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form onSubmit={handleSubmit} noValidate>
            {/* CAR IMAGE UPLOAD */}
            <div className="mb-4">
              <h6 className="mb-3">
                <IconCamera className="me-2" />
                Car Image
              </h6>

              <div className="text-center mb-3">
                <div
                  className={`border-2 border-dashed rounded-3 p-4 ${imagePreview ? 'border-primary' : 'border-gray-300'} cursor-pointer`}
                  onClick={triggerFileInput}
                  style={{ minHeight: '200px' }}
                >
                  {imagePreview ? (
                    <div className="position-relative">
                      <div className="position-relative" style={{ width: '100%', height: '180px' }}>
                        <Image
                          src={imagePreview}
                          alt="Car preview"
                          fill
                          className="object-cover rounded-2"
                          sizes="(max-width: 768px) 100vw, 500px"
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
                      <p className="text-muted mb-1">Click to upload car image</p>
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
                    {imagePreview ? 'Change Image' : 'Upload Image'}
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
                      <span className="text-muted small">Uploading image...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* BASIC CAR INFORMATION */}
            <h6 className="mb-3">
              <IconCar className="me-2" />
              Basic Information
            </h6>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Registration Number *</Form.Label>
                  <Form.Control
                    name="registration"
                    required
                    maxLength={20}
                    placeholder="ABC 123"
                    isInvalid={!!formErrors.registration}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.registration}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    Unique registration identifier
                  </Form.Text>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Make *</Form.Label>
                  <Form.Control
                    name="make"
                    required
                    placeholder="e.g., Toyota"
                    isInvalid={!!formErrors.make}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.make}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Model *</Form.Label>
                  <Form.Control
                    name="model"
                    required
                    placeholder="e.g., Camry"
                    isInvalid={!!formErrors.model}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.model}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
  <Form.Label>Year *</Form.Label>
  <Form.Select
    name="year"
    required
    isInvalid={!!formErrors.year}
  >
    <option value="">Select Year</option>
    {Array.from({ length: 2040 - 2005 + 1 }, (_, i) => {
      const year = 2005 + i;
      return (
        <option key={year} value={year}>
          {year}
        </option>
      );
    })}
  </Form.Select>
  <Form.Control.Feedback type="invalid">
    {formErrors.year}
  </Form.Control.Feedback>
</Form.Group>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Body Type</Form.Label>
                  <Form.Control
                    name="bodyType"
                    placeholder="e.g., SUV, SEDAN"
                    maxLength={50}
                  />
                </Form.Group>
              </Col>
            
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Color</Form.Label>
                  <Form.Control
                    name="color"
                    placeholder="e.g., Red, Black"
                    maxLength={50}
                  />
                </Form.Group>
              </Col>
            </Row>

            <hr />

            {/* FINANCIAL INFORMATION */}
            <h6 className="mb-3">Financial Information</h6>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Purchase Price *</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>£</InputGroup.Text>
                    <Form.Control
                      type="number"
                      name="purchasePrice"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      isInvalid={!!formErrors.purchasePrice}
                    />
                  </InputGroup>
                  <Form.Control.Feedback type="invalid">
                    {formErrors.purchasePrice}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Current Market Value</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>£</InputGroup.Text>
                    <Form.Control
                      type="number"
                      name="currentValue"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      isInvalid={!!formErrors.currentValue}
                    />
                  </InputGroup>
                  <Form.Control.Feedback type="invalid">
                    {formErrors.currentValue}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    Leave empty to use purchase price
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Purchase Date</Form.Label>
                  <Form.Control
                    type="date"
                    name="purchaseDate"
                    max={new Date().toISOString().split('T')[0]}
                    isInvalid={!!formErrors.purchaseDate}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.purchaseDate}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <hr />

            {/* STATUS INFORMATION */}
            <h6 className="mb-3">Status Information</h6>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Status *</Form.Label>
                  <Form.Select name="status" required>
                    <option value="AVAILABLE">Available</option>
                    <option value="RENTED">Rented</option>
                    <option value="MAINTENANCE">In Maintenance</option>
                    <option value="INACTIVE">Inactive</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Active Status *</Form.Label>
                  <Form.Select name="isActive" required>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Inactive cars won't appear in available lists
                  </Form.Text>
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
                    Uploading Image...
                  </>
                ) : (
                  "Add Car"
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
            Crop Image
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {originalImage && (
            <div style={{ maxHeight: '500px', overflow: 'auto' }}>
              <Cropper
                src={originalImage}
                style={{ height: '400px', width: '100%' }}
                initialAspectRatio={16 / 9}
                guides={true}
                ref={cropperRef}
                viewMode={1}
                minCropBoxHeight={100}
                minCropBoxWidth={100}
                background={false}
                responsive={true}
                autoCropArea={1}
                checkOrientation={false}
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

export default CarListHeader;