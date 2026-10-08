"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
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
  Dropdown,
  Form,
  InputGroup,
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
  Wrench as IconMaintenance,
  ShieldCheck as IconVerified,
  ShieldX as IconUnverified,
  CheckCircle as IconActive,
  XCircle as IconInactive,
  Pencil as IconEdit,
  Trash as IconDelete,
  Eye as IconView,
  Download as IconDownload,
  ThreeDotsVertical as IconMenu,
  Upload as IconUpload,
  Camera as IconCamera,
  X as IconX,
  Crop as IconCrop,
  Check as IconCheck,
} from "react-bootstrap-icons";
import { toast } from "sonner";
import Link from "next/link";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";

import {
  formatDate,
  calculateDaysRemaining,
  getExpiryBadgeColor
} from "../../../lib/dateUtils";

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
    driverNumber_licenseNumber: string | null; // Added
    driverNumber_licenseExpiry: string | null; // Added
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
    document: Array<{
      id: number;
      type: string;
      name: string;
      fileName: string;
      fileUrl: string;
      createdAt: string;
    }>;
    insurance: Array<{
      id: number;
      provider: string;
      policyNo: string | null;
      startDate: string;
      endDate: string;
      car: {
        registration: string;
        model: string;
      } | null;
    }>;

    maintenancerequest: Array<{
      id: number;
      title: string;
      description: string;
      amount: number;
      status: string;
      createdAt: string;
      car: {
        registration: string;
        model: string;
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

// Helper function for responsive table rendering
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

const DriverDetail = () => {
  const router = useRouter();
  const params = useParams();
  const driverId = params?.id as string;

  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [imageError, setImageError] = useState(false);

  // New states for edit modal with cropper
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);

  // Cropper states
  const [showCropModal, setShowCropModal] = useState(false);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [croppedImageFile, setCroppedImageFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removeExistingAvatar, setRemoveExistingAvatar] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropperRef = useRef<any>(null);

  useEffect(() => {
    if (driverId) {
      fetchDriverDetails();
    } else {
      setLoading(false);
      setError("Driver ID not found in URL");
    }
  }, [driverId]);

  const fetchDriverDetails = async () => {
    if (!driverId) return;

    try {
      setLoading(true);
      setError(null);
      setImageError(false);

      const response = await fetch(`/api/drivers/${driverId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch driver details");
      }


      setDriver(data.data || data);
    } catch (error: any) {
      console.error("Error fetching driver details:", error);
      setError(error.message || "Failed to load driver details");
      toast.error("Failed to load driver details");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!driver) return;

    try {
      const response = await fetch(`/api/drivers/${driver.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !driver.isActive }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      toast.success(`Driver ${!driver.isActive ? "activated" : "deactivated"} successfully`);
      fetchDriverDetails();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!driver) return;

    try {
      const response = await fetch(`/api/drivers/${driver.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete driver");
      }

      toast.success("Driver deleted successfully");
      router.push("/drivers");
    } catch (error) {
      console.error("Error deleting driver:", error);
      toast.error("Failed to delete driver");
    } finally {
      setShowDeleteModal(false);
    }
  };

  // Open edit modal
  const handleEditClick = () => {
    if (!driver || !driver.driverprofile) return;

    // Initialize form data with current driver data
    setEditFormData({
      name: driver.name,
      email: driver.email,
      phone: driver.phone,
      licenseNumber: driver.driverprofile.licenseNumber,
      licenseExpiry: driver.driverprofile.licenseExpiry ? driver.driverprofile.licenseExpiry.split('T')[0] : '',
      driverNumber_licenseNumber: driver.driverprofile.driverNumber_licenseNumber,
      driverNumber_licenseExpiry: driver.driverprofile.driverNumber_licenseExpiry ? driver.driverprofile.driverNumber_licenseExpiry.split('T')[0] : '',
      address: driver.driverprofile.address,
      postcode: driver.driverprofile.postcode,
      emergencyContact: driver.driverprofile.emergencyContact,
      emergencyPhone: driver.driverprofile.emergencyPhone,
      dateOfBirth: driver.driverprofile.dateOfBirth ? driver.driverprofile.dateOfBirth.split('T')[0] : '',
      weeklyAmount: driver.driverprofile.weeklyAmount,
      depositPaid: driver.driverprofile.depositPaid,
      isActive: driver.isActive,
      isVerified: driver.driverprofile.isVerified,
    });

    setAvatarPreview(null);
    setCroppedImage(null);
    setCroppedImageFile(null);
    setOriginalImage(null);
    setRemoveExistingAvatar(false);
    setUploadProgress(0);
    setShowEditModal(true);
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    setEditFormData((prev: any) => ({
      ...prev,
      [name]: type === 'number' ? (value ? parseFloat(value) : null) : value,
    }));
  };

  // Handle file selection for avatar
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload JPEG, PNG, or WebP images only.');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit');
      return;
    }

    setCroppedImageFile(file);
    setRemoveExistingAvatar(false);

    // Create preview URL for cropping
    const reader = new FileReader();
    reader.onloadend = () => {
      const imageUrl = reader.result as string;
      setOriginalImage(imageUrl);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  // Trigger file input click
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  // Remove selected image
  const handleRemoveImage = () => {
    setCroppedImageFile(null);
    setCroppedImage(null);
    setAvatarPreview(null);
    setOriginalImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // If there was an existing avatar, mark it for removal
    if (driver?.avatar) {
      setRemoveExistingAvatar(true);
    }
  };

  // Crop image function
  const getCroppedImage = () => {
    if (cropperRef.current && cropperRef.current.cropper) {
      const croppedCanvas = cropperRef.current.cropper.getCroppedCanvas();
      if (croppedCanvas) {
        const croppedImageUrl = croppedCanvas.toDataURL('image/jpeg', 0.9);
        setCroppedImage(croppedImageUrl);
        setAvatarPreview(croppedImageUrl);
        setShowCropModal(false);
        toast.success("Image cropped successfully");
      }
    }
  };

  // Cancel crop and use original image
  const cancelCrop = () => {
    if (originalImage) {
      setAvatarPreview(originalImage);
    }
    setShowCropModal(false);
    toast.info("Using original image");
  };

  // Upload image to your API
  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'drivers');

      // Pass old avatar path for deletion
      if (driver?.avatar && driver.avatar.startsWith('/uploads/drivers/')) {
        formData.append('oldAvatar', driver.avatar);
      }


      const response = await fetch('/api/upload/car-image', {
        method: 'POST',
        body: formData,
      });

      // Check response
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Failed to upload image (Status: ${response.status})`;

        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch {
          if (errorText) {
            errorMessage = `${errorMessage}: ${errorText.substring(0, 100)}`;
          }
        }

        throw new Error(errorMessage);
      }

      // Parse response
      const responseText = await response.text();
      if (!responseText) {
        throw new Error('Empty response from upload server');
      }

      const data = JSON.parse(responseText);

      if (!data.success) {
        throw new Error(data.message || 'Upload failed');
      }


      return data.url;

    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  // Delete image without uploading new one
  const deleteImage = async (imagePath: string): Promise<void> => {
    try {
      const response = await fetch('/api/upload/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath: imagePath }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete image');
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  };

  // Submit edit form
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driver || !editFormData || !driver.driverprofile) return;

    setEditLoading(true);
    setUploadProgress(0);

    try {
      let avatarUrl = null;

      // Handle image upload if cropped image exists
      if (croppedImage && croppedImageFile) {
        setUploadProgress(30);

        // Convert data URL to blob
        const response = await fetch(croppedImage);
        const blob = await response.blob();
        const fileToUpload = new File([blob], croppedImageFile.name, { type: 'image/jpeg' });

        avatarUrl = await uploadImage(fileToUpload);
        setUploadProgress(70);
      } else if (removeExistingAvatar && driver.avatar) {
        // Delete existing image without uploading new one
        try {
          await deleteImage(driver.avatar);
        } catch (error) {
          console.error('Error deleting old image:', error);
          // Continue anyway
        }
      }

      // Prepare update data
      const updateData: any = {
        ...editFormData,
        driverProfileId: driver.driverprofile.id,
      };

      // Add avatar URL if we have one from new upload
      if (avatarUrl) {
        updateData.avatar = avatarUrl;
      } else if (removeExistingAvatar && driver.avatar) {
        // Mark for removal
        updateData.avatar = null;
      }

      // Convert empty strings to null for optional fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === '') {
          updateData[key] = null;
        }
      });

      // Filter out null values from update data
      const filteredUpdateData: Record<string, any> = {};
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== null && updateData[key] !== undefined) {
          filteredUpdateData[key] = updateData[key];
        }
      });


      // Send update request
      const response = await fetch(`/api/drivers/${driver.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filteredUpdateData),
      });

      // Check if response is OK and has content
      if (!response.ok) {
        // Try to get error message from response
        const errorText = await response.text();
        let errorMessage = `Failed to update driver (Status: ${response.status})`;

        try {
          // Try to parse as JSON
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch {
          // If not JSON, use the text directly
          if (errorText) {
            errorMessage = `${errorMessage}: ${errorText.substring(0, 100)}`;
          }
        }

        throw new Error(errorMessage);
      }

      // Check if response has content before parsing
      const responseText = await response.text();
      if (!responseText) {
        throw new Error('Empty response from server');
      }

      // Parse JSON response
      const data = JSON.parse(responseText);

      setUploadProgress(100);
      toast.success('Driver updated successfully');
      setShowEditModal(false);

      // Refresh driver data after a short delay
      setTimeout(() => {
        fetchDriverDetails();
      }, 500);

    } catch (error: any) {
      console.error('Error updating driver:', error);
      toast.error(error.message || 'Failed to update driver');
    } finally {
      setEditLoading(false);
      setUploadProgress(0);
    }
  };

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

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

  // Function to get avatar URL
  const getAvatarUrl = (avatarPath: string | null) => {
    if (!avatarPath) {

      return null;
    }

    // Mobile-uploaded avatars are stored as base64 data URIs — never rewrite these.
    if (avatarPath.startsWith('data:') || avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath;
    }

    // If path starts with /uploads/, convert to API route
    if (avatarPath.startsWith('/uploads/')) {
      // Remove leading slash
      const cleanPath = avatarPath.substring(1);
      const apiUrl = `/api/upload/${cleanPath}`;

      return apiUrl;
    }

    // If it's already an API route, return as-is
    if (avatarPath.startsWith('/api/')) {
      return avatarPath;
    }

    // For other cases
    return `/api/image/${avatarPath}`;
  };

  // Handle image loading error
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {

    setImageError(true);
    e.currentTarget.style.display = 'none';
  };

  // Handle image load success
  const handleImageLoad = () => {

    setImageError(false);
  };

  if (!driverId) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error</Alert.Heading>
        <p>Driver ID is missing from the URL</p>
        <Button variant="outline-danger" onClick={() => router.push("/drivers")}>
          <IconBack className="me-2" />
          Back to Drivers
        </Button>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="warning" />
        <p className="mt-3">Loading driver details...</p>
      </div>
    );
  }

  if (error || !driver) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error</Alert.Heading>
        <p>{error || "Driver not found"}</p>
        <Button variant="outline-danger" onClick={() => router.push("/drivers")}>
          <IconBack className="me-2" />
          Back to Drivers
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
              <Button
                variant="outline-secondary"
                className="mb-3"
                onClick={() => router.push("/drivers")}
              >
                <IconBack className="me-2" />
                Back
              </Button>
              <h2 className="mb-0 fs-4 fs-md-3">{driver.name}</h2>

            </div>
          </div>
        </Col>
      </Row>

      {/* Avatar Section */}
      <Row className="mb-4">
        <Col lg={4} className="mb-4 mb-lg-0">
          <Card className="h-100">
            <Card.Body className="text-center d-flex flex-column align-items-center justify-content-center p-4">
              {/* Avatar Display - 200x200 rounded with fallback icon */}
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
                    onLoad={handleImageLoad}
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

              <div className="d-grid gap-2 w-100">
                <Button variant="primary" className="w-100" onClick={handleEditClick}>
                  <IconEdit className="me-2" />
                  Edit Driver
                </Button>


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
            <Col xs={6} md={3}>
              <Card className="h-100 text-center">
                <Card.Body className="p-3">
                  <IconFileText size={20} className="text-warning mb-2" />
                  <h5 className="mb-1 fs-6">{driver.statistics.totalDocuments}</h5>
                  <p className="text-muted mb-0 small">Documents</p>
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

                <Nav.Item>
                  <Nav.Link eventKey="documents" className="text-nowrap px-3">
                    <IconFileText className="me-1 d-none d-md-inline" />
                    Documents ({driverProfile?.document.length || 0})
                  </Nav.Link>
                </Nav.Item>
              </Nav>
            </div>

            <Tab.Content>
              <Tab.Pane eventKey="profile">
                <Row>
                  <Col lg={6}>
                    {driverProfile && (
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
                              <small className="text-muted d-block">Driver Number/License Number</small>
                              <p className="mb-0 d-flex align-items-center">
                                <IconLicense size={14} className="me-2" />
                                {driverProfile.driverNumber_licenseNumber || "Not provided"}
                              </p>
                            </Col>
                            <Col xs={12} md={6} className="mb-3">
                              <small className="text-muted d-block">Driver Number/License Expiry</small>
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
                              <p className="mb-0 d-flex align-items-center">
                                <IconCalendar size={14} className="me-2" />
                                {formatDate(driverProfile.dateOfBirth)}
                              </p>
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>
                    )}
                  </Col>
                </Row>
              </Tab.Pane>

              {/* Cars Tab - Now Responsive */}
              <Tab.Pane eventKey="cars">
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">Assigned Cars ({driverProfile?.car.length || 0})</h5>
                  </Card.Header>
                  <Card.Body className="p-0">
                    <ResponsiveTable
                      data={driverProfile?.car || []}
                      emptyMessage="No cars assigned to this driver."
                      columns={[
                        {
                          header: "Registration",
                          accessor: "registration",
                          render: (item: any) => <strong>{item.registration}</strong>
                        },
                        {
                          header: "Model",
                          accessor: "model",
                          hideOnMobile: true,
                          render: (item: any) => item.model
                        },
                        {
                          header: "Make",
                          accessor: "make",
                          hideOnMobile: true,
                          render: (item: any) => item.make
                        },
                        {
                          header: "Year",
                          accessor: "year",
                          hideOnMobile: true,
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
                            <Link href={`/cars/${item.id}`} passHref>
                              <Button variant="outline-primary" size="sm">
                                <IconView size={14} />
                              </Button>
                            </Link>
                          )
                        }
                      ]}
                      renderMobileCard={(item: any) => (
                        <div className="d-flex flex-column gap-2">
                          <div className="d-flex justify-content-between align-items-start">
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
                          </div>

                          <div className="d-flex justify-content-end gap-2 mt-2">
                            <Link href={`/cars/${item.id}`} passHref>
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

              {/* Agreements Tab - Now Responsive */}
              <Tab.Pane eventKey="agreements">
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">Agreements ({driverProfile?.agreement.length || 0})</h5>
                  </Card.Header>
                  <Card.Body className="p-0">
                    <ResponsiveTable
                      data={driverProfile?.agreement || []}
                      emptyMessage="No agreements found for this driver."
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
                          hideOnMobile: true,
                          render: (item: any) => <Badge bg="info">{item.type}</Badge>
                        },
                        {
                          header: "Car",
                          accessor: "car",
                          hideOnMobile: true,
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
                            <Link href={`/agreements/${item.id}`} passHref>
                              <Button variant="outline-primary" size="sm">
                                <IconView size={14} />
                              </Button>
                            </Link>
                          )
                        }
                      ]}
                      renderMobileCard={(item: any) => (
                        <div className="d-flex flex-column gap-2">
                          <div className="d-flex justify-content-between align-items-start">
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
                            </div>
                          </div>

                          <div className="d-flex flex-wrap gap-2 small">
                            <div className="d-flex align-items-center">
                              <IconCar size={12} className="me-1 text-muted" />
                              <span className="text-muted">
                                {item.car ? item.car.registration : "No car assigned"}
                              </span>
                            </div>
                            <div className="d-flex align-items-center">
                              <IconCalendar size={12} className="me-1 text-muted" />
                              <span className="text-muted">
                                {formatDate(item.startDate)} - {formatDate(item.endDate)}
                              </span>
                            </div>
                          </div>

                          <div className="d-flex justify-content-end gap-2 mt-2">
                            <Link href={`/agreements/${item.id}`} passHref>
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


              {/* Documents Tab - Now Responsive */}
              <Tab.Pane eventKey="documents">
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">Documents ({driverProfile?.document.length || 0})</h5>
                  </Card.Header>
                  <Card.Body className="p-0">
                    <ResponsiveTable
                      data={driverProfile?.document || []}
                      emptyMessage="No documents uploaded for this driver."
                      columns={[
                        {
                          header: "Type",
                          accessor: "type",
                          render: (item: any) => <Badge bg="info">{item.type}</Badge>
                        },
                        {
                          header: "Name",
                          accessor: "name",
                          render: (item: any) => (
                            <div className="text-truncate" style={{ maxWidth: "200px" }}>
                              {item.name}
                            </div>
                          )
                        },
                        {
                          header: "Uploaded",
                          accessor: "createdAt",
                          hideOnMobile: true,
                          render: (item: any) => formatDate(item.createdAt)
                        },
                        {
                          header: "Actions",
                          accessor: "fileUrl",
                          render: (item: any) => (
                            <div className="d-flex gap-1">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                as="a"
                                href={item.fileUrl}
                                target="_blank"
                              >
                                <IconView size={14} />
                              </Button>
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                as="a"
                                href={item.fileUrl}
                                download
                              >
                                <IconDownload size={14} />
                              </Button>
                            </div>
                          )
                        }
                      ]}
                      renderMobileCard={(item: any) => (
                        <div className="d-flex flex-column gap-2">
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <Badge bg="info" className="me-2">{item.type}</Badge>
                              <h6 className="mb-1 mt-1">{item.name}</h6>
                              <div className="small text-muted mb-2">
                                Uploaded: {formatDate(item.createdAt)}
                              </div>
                            </div>
                          </div>

                          <div className="d-flex justify-content-end gap-2 mt-2">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              as="a"
                              href={item.fileUrl}
                              target="_blank"
                            >
                              <IconView size={14} /> View
                            </Button>
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              as="a"
                              href={item.fileUrl}
                              download
                            >
                              <IconDownload size={14} /> Download
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

      {/* Edit Driver Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Driver Details</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEditSubmit}>
          <Modal.Body>
            <Row>
              <Col md={4} className="text-center mb-4 mb-md-0">
                <div className="position-relative">
                  <div
                    className="rounded-circle position-relative mb-3 mx-auto cursor-pointer"
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
                    onClick={handleAvatarClick}
                  >
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Preview"
                        className="w-100 h-100"
                        style={{
                          objectFit: 'cover',
                          objectPosition: 'center'
                        }}
                      />
                    ) : driver.avatar && !removeExistingAvatar ? (
                      <img
                        src={getAvatarUrl(driver.avatar) || ''}
                        alt={`${driver.name}'s profile`}
                        className="w-100 h-100"
                        style={{
                          objectFit: 'cover',
                          objectPosition: 'center'
                        }}
                      />
                    ) : (
                      <div className="d-flex flex-column align-items-center justify-content-center h-100 w-100">
                        <IconCamera size={40} className="text-secondary mb-2" />
                        <span className="text-muted small">Click to upload</span>
                      </div>
                    )}

                    {/* Crop and Remove buttons */}
                    {(avatarPreview || (driver.avatar && !removeExistingAvatar)) && (
                      <div className="position-absolute top-0 end-0 m-1 d-flex flex-column gap-1">
                        {originalImage && (
                          <Button
                            variant="info"
                            size="sm"
                            className="rounded-circle"
                            style={{ width: '30px', height: '30px', padding: 0 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (originalImage) {
                                setShowCropModal(true);
                              }
                            }}
                            title="Crop Image"
                          >
                            <IconCrop size={14} />
                          </Button>
                        )}
                        <Button
                          variant="danger"
                          size="sm"
                          className="rounded-circle"
                          style={{ width: '30px', height: '30px', padding: 0 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage();
                          }}
                          title="Remove Image"
                        >
                          <IconX size={14} />
                        </Button>
                      </div>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    className="d-none"
                  />

                  <div className="text-muted small mb-3">
                    Click to upload new photo (max 5MB, JPG/PNG/WebP)
                  </div>

                  {driver.avatar && !removeExistingAvatar && !avatarPreview && (
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={removeExistingAvatar}
                        onChange={(e) => setRemoveExistingAvatar(e.target.checked)}
                        id="removeAvatar"
                      />
                      <label className="form-check-label small" htmlFor="removeAvatar">
                        Remove existing photo
                      </label>
                    </div>
                  )}

                  {/* Upload progress */}
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="mt-2">
                      <div className="progress" style={{ height: '8px' }}>
                        <div
                          className="progress-bar progress-bar-striped progress-bar-animated"
                          role="progressbar"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <small className="text-muted">Uploading... {uploadProgress}%</small>
                    </div>
                  )}
                </div>
              </Col>

              <Col md={8}>
                <Row>
                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Full Name *</Form.Label>
                      <Form.Control
                        type="text"
                        name="name"
                        value={editFormData?.name || ''}
                        onChange={handleInputChange}
                        required
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Email Address *</Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={editFormData?.email || ''}
                        onChange={handleInputChange}
                        required
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Phone Number</Form.Label>
                      <Form.Control
                        type="tel"
                        name="phone"
                        value={editFormData?.phone || ''}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>License Number</Form.Label>
                      <Form.Control
                        type="text"
                        name="licenseNumber"
                        value={editFormData?.licenseNumber || ''}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>License Expiry Date</Form.Label>
                      <Form.Control
                        type="date"
                        name="licenseExpiry"
                        value={editFormData?.licenseExpiry || ''}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Driver Number/License Number</Form.Label>
                      <Form.Control
                        type="text"
                        name="driverNumber_licenseNumber"
                        value={editFormData?.driverNumber_licenseNumber || ''}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Driver Number/License Expiry Date</Form.Label>
                      <Form.Control
                        type="date"
                        name="driverNumber_licenseExpiry"
                        value={editFormData?.driverNumber_licenseExpiry || ''}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Postcode</Form.Label>
                      <Form.Control
                        type="text"
                        name="postcode"
                        value={editFormData?.postcode || ''}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Col>

                  <Col xs={12} className="mb-3">
                    <Form.Group>
                      <Form.Label>Address</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        name="address"
                        value={editFormData?.address || ''}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Emergency Contact Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="emergencyContact"
                        value={editFormData?.emergencyContact || ''}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Emergency Phone</Form.Label>
                      <Form.Control
                        type="tel"
                        name="emergencyPhone"
                        value={editFormData?.emergencyPhone || ''}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Date of Birth</Form.Label>
                      <Form.Control
                        type="date"
                        name="dateOfBirth"
                        value={editFormData?.dateOfBirth || ''}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Weekly Amount (£)</Form.Label>
                      <InputGroup>
                        <InputGroup.Text>£</InputGroup.Text>
                        <Form.Control
                          type="number"
                          name="weeklyAmount"
                          step="0.01"
                          min="0"
                          value={editFormData?.weeklyAmount || ''}
                          onChange={handleInputChange}
                          required
                        />
                      </InputGroup>
                    </Form.Group>
                  </Col>

                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Deposit Paid (£)</Form.Label>
                      <InputGroup>
                        <InputGroup.Text>£</InputGroup.Text>
                        <Form.Control
                          type="number"
                          name="depositPaid"
                          step="0.01"
                          min="0"
                          value={editFormData?.depositPaid || ''}
                          onChange={handleInputChange}
                        />
                      </InputGroup>
                    </Form.Group>
                  </Col>

                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Active Status</Form.Label>
                      <div className="d-flex align-items-center">
                        <Form.Check
                          type="switch"
                          id="isActive"
                          name="isActive"
                          checked={editFormData?.isActive || false}
                          onChange={(e) => setEditFormData((prev: any) => ({
                            ...prev,
                            isActive: e.target.checked
                          }))}
                          label={editFormData?.isActive ? "Active" : "Inactive"}
                        />
                      </div>
                    </Form.Group>
                  </Col>

                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Verified Status</Form.Label>
                      <div className="d-flex align-items-center">
                        <Form.Check
                          type="switch"
                          id="isVerified"
                          name="isVerified"
                          checked={editFormData?.isVerified || false}
                          onChange={(e) => setEditFormData((prev: any) => ({
                            ...prev,
                            isVerified: e.target.checked
                          }))}
                          label={editFormData?.isVerified ? "Verified" : "Not Verified"}
                        />
                      </div>
                    </Form.Group>
                  </Col>
                </Row>
              </Col>
            </Row>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={editLoading}
            >
              {editLoading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </Modal.Footer>
        </Form>
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
    </div>
  );
};

export default DriverDetail;