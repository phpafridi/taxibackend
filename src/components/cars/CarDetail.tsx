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
  Form,
  InputGroup,
} from "react-bootstrap";
import {
  ArrowLeft as IconBack,
  CarFront as IconCar,
  Person as IconPerson,
  Calendar as IconCalendar,
  CashStack as IconPayment,
  Wrench as IconMaintenance,
  Shield as IconInsurance,
  FileText as IconFileText,
  CheckCircle as IconActive,
  XCircle as IconInactive,
  Pencil as IconEdit,
  Eye as IconView,
  Download as IconDownload,
  Upload as IconUpload,
  Camera as IconCamera,
  X as IconX,
  Speedometer2 as IconMileage,
  Crop as IconCrop,
  Check as IconCheck,
  Plus as IconPlus,
  Clock as IconClock,
  ShieldCheck as IconShieldCheck,
  ClockHistory as IconRenewal,
} from "react-bootstrap-icons";
import { toast } from "sonner";
import Link from "next/link";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";

interface Car {
  id: number;
  registration: string;
  model: string;
  make: string;
  year: number | null;
  color: string | null;
  avatar: string | null;
  purchasePrice: number;
  purchaseDate: string | null;
  currentValue: number | null;
  isActive: boolean;
  status: string;
  driverProfileId: number | null;
  createdAt: string;
  updatedAt: string;

  driverprofile?: {
    id: number;
    userId: number;
    user: {
      id: number;
      name: string;
      email: string;
      phone: string | null;
      avatar: string | null;
      isActive: boolean;
    };
  } | null;

  agreement: Array<{
    id: number;
    type: string;
    title: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    signedAt: string | null;
    driver: {
      id: number;
      name: string;
      email: string;
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
    certificateNo: string | null;
    startDate: string;
    endDate: string;
    renewalDate: string | null;
    yearlyCost: number | null;
    monthlyCharge: number | null;
    excessAmount: number | null;
    coverageType: string | null;
    notes: string | null;
    isActive: boolean;
    isExpired: boolean;
    driver: {
      id: number;
      name: string;
    } | null;
  }>;

  ledger: Array<{
    id: number;
    amount: number;
    direction: string;
    category: string;
    description: string | null;
    paymentDate: string | null;
    status: string | null;
    paymentMethod: string | null;
    createdAt: string;
    driver: {
      id: number;
      name: string;
    } | null;
  }>;

  maintenancerequest: Array<{
    id: number;
    title: string;
    description: string;
    amount: number;
    mileage: number | null;
    status: string;
    createdAt: string;
    driver: {
      id: number;
      name: string;
    } | null;
  }>;

  statistics: {
    totalAgreements: number;
    activeAgreements: number;
    totalInsurance: number;
    totalPayments: number;
    totalMaintenance: number;
    totalDocuments: number;
  };
}

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
  const params = useParams();
  const carId = params?.id as string;

  const [car, setCar] = useState<Car | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [imageError, setImageError] = useState(false);

  // Edit modal states with cropper
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
  
  // Insurance modal states
  const [showAddInsuranceModal, setShowAddInsuranceModal] = useState(false);
  const [insuranceLoading, setInsuranceLoading] = useState(false);
  const [insuranceFormData, setInsuranceFormData] = useState({
    provider: "",
    policyNo: "",
    certificateNo: "",
    startDate: "",
    endDate: "",
    renewalDate: "",
    yearlyCost: "",
    monthlyCharge: "",
    excessAmount: "",
    coverageType: "",
    notes: "",
    isActive: true,
  });
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropperRef = useRef<any>(null);

  useEffect(() => {
    if (carId) {
      fetchCarDetails();
    } else {
      setLoading(false);
      setError("Car ID not found in URL");
    }
  }, [carId]);

  const fetchCarDetails = async () => {
    if (!carId) return;

    try {
      setLoading(true);
      setError(null);
      setImageError(false);

      const response = await fetch(`/api/cars/${carId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch car details");
      }

      setCar(data.data || data);
    } catch (error: any) {
      console.error("Error fetching car details:", error);
      setError(error.message || "Failed to load car details");
      toast.error("Failed to load car details");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    if (!car) return;

    setEditFormData({
      registration: car.registration,
      model: car.model,
      make: car.make,
      year: car.year,
      color: car.color,
      purchasePrice: car.purchasePrice,
      purchaseDate: car.purchaseDate ? car.purchaseDate.split('T')[0] : '',
      currentValue: car.currentValue,
      status: car.status,
      isActive: car.isActive,
    });

    setAvatarPreview(null);
    setCroppedImage(null);
    setCroppedImageFile(null);
    setOriginalImage(null);
    setRemoveExistingAvatar(false);
    setUploadProgress(0);
    setShowEditModal(true);
  };

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

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload JPEG, PNG, or WebP images only.');
      return;
    }

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

    if (car?.avatar) {
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

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'cars');

      if (car?.avatar && car.avatar.startsWith('/uploads/cars/')) {
        formData.append('oldAvatar', car.avatar);
      }

      const response = await fetch('/api/upload/car-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload image');
      }

      return data.url;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

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

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!car || !editFormData) return;

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
      } else if (removeExistingAvatar && car.avatar) {
        // Delete existing image without uploading new one
        try {
          await deleteImage(car.avatar);
        } catch (error) {
          console.error('Error deleting old image:', error);
        }
      }

      const updateData: any = { ...editFormData };

      if (avatarUrl) {
        updateData.avatar = avatarUrl;
      } else if (removeExistingAvatar && car.avatar) {
        updateData.avatar = null;
      }

      Object.keys(updateData).forEach(key => {
        if (updateData[key] === '') {
          updateData[key] = null;
        }
      });

      const filteredUpdateData: Record<string, any> = {};
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== null && updateData[key] !== undefined) {
          filteredUpdateData[key] = updateData[key];
        }
      });

      const response = await fetch(`/api/cars/${car.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filteredUpdateData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update car');
      }

      setUploadProgress(100);
      toast.success('Car updated successfully');
      setShowEditModal(false);

      setTimeout(() => {
        fetchCarDetails();
      }, 500);

    } catch (error: any) {
      console.error('Error updating car:', error);
      toast.error(error.message || 'Failed to update car');
    } finally {
      setEditLoading(false);
      setUploadProgress(0);
    }
  };

  // Insurance form handlers
  const handleInsuranceInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    setInsuranceFormData((prev) => ({
      ...prev,
      [name]: type === 'number' || type === 'text' && name.includes('Cost') || name.includes('Charge') || name.includes('Amount')
        ? (value === '' ? '' : value)
        : value,
    }));
  };

  const handleInsuranceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!carId) {
      toast.error("Car ID is missing");
      return;
    }

    setInsuranceLoading(true);

    try {
      // Prepare data
      const insuranceData = {
        ...insuranceFormData,
        carId: parseInt(carId),
        startDate: new Date(insuranceFormData.startDate).toISOString(),
        endDate: new Date(insuranceFormData.endDate).toISOString(),
        renewalDate: insuranceFormData.renewalDate ? new Date(insuranceFormData.renewalDate).toISOString() : null,
        yearlyCost: insuranceFormData.yearlyCost ? parseFloat(insuranceFormData.yearlyCost) : null,
        monthlyCharge: insuranceFormData.monthlyCharge ? parseFloat(insuranceFormData.monthlyCharge) : null,
        excessAmount: insuranceFormData.excessAmount ? parseFloat(insuranceFormData.excessAmount) : null,
        isActive: insuranceFormData.isActive,
        isExpired: new Date(insuranceFormData.endDate) < new Date(),
      };

      // Remove empty string values
      Object.keys(insuranceData).forEach(key => {
        if (insuranceData[key as keyof typeof insuranceData] === '') {
          delete insuranceData[key as keyof typeof insuranceData];
        }
      });

      const response = await fetch('/api/insurance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(insuranceData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add insurance policy');
      }

      toast.success('Insurance policy added successfully');
      setShowAddInsuranceModal(false);
      
      // Reset form
      setInsuranceFormData({
        provider: "",
        policyNo: "",
        certificateNo: "",
        startDate: "",
        endDate: "",
        renewalDate: "",
        yearlyCost: "",
        monthlyCharge: "",
        excessAmount: "",
        coverageType: "",
        notes: "",
        isActive: true,
      });

      // Refresh car details
      fetchCarDetails();

    } catch (error: any) {
      console.error('Error adding insurance:', error);
      toast.error(error.message || 'Failed to add insurance policy');
    } finally {
      setInsuranceLoading(false);
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

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "N/A";
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(amount);
  };

  const formatMileage = (mileage: number | null) => {
    if (!mileage) return "N/A";
    return mileage.toLocaleString() + " miles";
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "AVAILABLE": return "success";
      case "RENTED": return "primary";
      case "MAINTENANCE": return "warning";
      case "INACTIVE": return "secondary";
      default: return "light";
    }
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

  const formatCategory = (category: string) => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // UPDATED: Correct insurance status badge logic
  const getInsuranceStatusBadge = (insurance: any) => {
    const endDate = new Date(insurance.endDate);
    const today = new Date();
    
    // First check isActive from database
    if (!insurance.isActive) {
      return <Badge bg="secondary">Inactive</Badge>;
    }
    
    // Then check isExpired from database
    if (insurance.isExpired) {
      return <Badge bg="danger">Expired</Badge>;
    }
    
    // Additional safety check: if end date has passed
    if (endDate < today) {
      return <Badge bg="danger">Expired</Badge>;
    }
    
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry <= 30) {
      return <Badge bg="warning">Expiring Soon</Badge>;
    }
    
    return <Badge bg="success">Active</Badge>;
  };

  if (!carId) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error</Alert.Heading>
        <p>Car ID is missing from the URL</p>
        <Button variant="outline-danger" onClick={() => router.push("/cars")}>
          <IconBack className="me-2" />
          Back to Cars
        </Button>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="warning" />
        <p className="mt-3">Loading car details...</p>
      </div>
    );
  }

  if (error || !car) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error</Alert.Heading>
        <p>{error || "Car not found"}</p>
        <Button variant="outline-danger" onClick={() => router.push("/cars")}>
          <IconBack className="me-2" />
          Back to Cars
        </Button>
      </Alert>
    );
  }

  const avatarUrl = getAvatarUrl(car.avatar);
  const hasAvatar = car.avatar && !imageError;

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
                onClick={() => router.push("/cars")}
              >
                <IconBack className="me-2" />
                Back
              </Button>
              <h2 className="mb-0 fs-4 fs-md-3">{car.registration} - {car.make} {car.model}</h2>
              <p className="text-muted mb-0">Car ID: {car.id}</p>
            </div>
          </div>
        </Col>
      </Row>

      {/* Avatar Section */}
      <Row className="mb-4">
        <Col lg={4} className="mb-4 mb-lg-0">
          <Card className="h-100">
            <Card.Body className="text-center d-flex flex-column align-items-center justify-content-center p-4">
              <div
                className="rounded position-relative mb-3"
                style={{
                  width: '200px',
                  height: '150px',
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
                    <IconCar size={60} className="text-secondary mb-2" />
                    <span className="text-muted small">No Photo</span>
                  </div>
                )}
              </div>

              <h4 className="mb-1">{car.registration}</h4>
              <p className="text-muted mb-3">{car.make} {car.model}</p>

              <div className="d-flex flex-wrap gap-2 justify-content-center mb-3">
                <Badge bg={getStatusBadgeColor(car.status)} className="px-3 py-2">
                  {car.status}
                </Badge>

                <Badge bg={car.isActive ? "success" : "danger"} className="px-3 py-2">
                  {car.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div className="d-grid gap-2 w-100">
                <Button variant="primary" className="w-100" onClick={handleEditClick}>
                  <IconEdit className="me-2" />
                  Edit Car Details
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
                  <IconFileText size={20} className="text-primary mb-2" />
                  <h5 className="mb-1 fs-6">{car.statistics.activeAgreements}</h5>
                  <p className="text-muted mb-0 small">Active Agreements</p>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} md={3}>
              <Card className="h-100 text-center">
                <Card.Body className="p-3">
                  <IconPayment size={20} className="text-success mb-2" />
                  <h5 className="mb-1 fs-6">{formatCurrency(car.statistics.totalPayments)}</h5>
                  <p className="text-muted mb-0 small">Total Income</p>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} md={3}>
              <Card className="h-100 text-center">
                <Card.Body className="p-3">
                  <IconMaintenance size={20} className="text-danger mb-2" />
                  <h5 className="mb-1 fs-6">{formatCurrency(car.statistics.totalMaintenance)}</h5>
                  <p className="text-muted mb-0 small">Total Maintenance</p>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} md={3}>
              <Card className="h-100 text-center">
                <Card.Body className="p-3">
                  <IconInsurance size={20} className="text-info mb-2" />
                  <h5 className="mb-1 fs-6">{car.statistics.totalInsurance}</h5>
                  <p className="text-muted mb-0 small">Insurance Policies</p>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} md={3}>
              <Card className="h-100 text-center">
                <Card.Body className="p-3">
                  <IconFileText size={20} className="text-secondary mb-2" />
                  <h5 className="mb-1 fs-6">{car.statistics.totalDocuments}</h5>
                  <p className="text-muted mb-0 small">Documents</p>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} md={3}>
              <Card className="h-100 text-center">
                <Card.Body className="p-3">
                  <IconFileText size={20} className="text-warning mb-2" />
                  <h5 className="mb-1 fs-6">{car.statistics.totalAgreements}</h5>
                  <p className="text-muted mb-0 small">Total Agreements</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card className="mb-3">
            <Card.Header>
              <h5 className="mb-0">Car Information</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6} className="mb-3">
                  <small className="text-muted d-block">Registration</small>
                  <p className="mb-0">
                    <Badge bg="info" className="me-2">
                      {car.registration}
                    </Badge>
                  </p>
                </Col>
                <Col md={6} className="mb-3">
                  <small className="text-muted d-block">Make & Model</small>
                  <p className="mb-0">{car.make} {car.model}</p>
                </Col>
                <Col md={6} className="mb-3">
                  <small className="text-muted d-block">Year</small>
                  <p className="mb-0">{car.year || "N/A"}</p>
                </Col>
                <Col md={6} className="mb-3">
                  <small className="text-muted d-block">Color</small>
                  <p className="mb-0">{car.color || "N/A"}</p>
                </Col>
                <Col md={6} className="mb-3">
                  <small className="text-muted d-block">Status</small>
                  <p className="mb-0">
                    <Badge bg={getStatusBadgeColor(car.status)}>
                      {car.status}
                    </Badge>
                  </p>
                </Col>
                <Col md={6} className="mb-3">
                  <small className="text-muted d-block">Purchase Price</small>
                  <p className="mb-0">{formatCurrency(car.purchasePrice)}</p>
                </Col>
                <Col md={6} className="mb-3">
                  <small className="text-muted d-block">Purchase Date</small>
                  <p className="mb-0">{formatDate(car.purchaseDate)}</p>
                </Col>
                <Col md={6} className="mb-3">
                  <small className="text-muted d-block">Added On</small>
                  <p className="mb-0">{formatDate(car.createdAt)}</p>
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
                    <IconCar className="me-1 d-none d-md-inline" />
                    Profile Details
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="driver" className="text-nowrap px-3">
                    <IconPerson className="me-1 d-none d-md-inline" />
                    Driver {car.driverprofile ? "(Assigned)" : ""}
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="agreements" className="text-nowrap px-3">
                    <IconFileText className="me-1 d-none d-md-inline" />
                    Agreements ({car.agreement.length})
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="payments" className="text-nowrap px-3">
                    <IconPayment className="me-1 d-none d-md-inline" />
                    Financial Records ({car.ledger.length})
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="insurance" className="text-nowrap px-3">
                    <IconInsurance className="me-1 d-none d-md-inline" />
                    Insurance ({car.insurance.length})
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="maintenance" className="text-nowrap px-3">
                    <IconMaintenance className="me-1 d-none d-md-inline" />
                    Maintenance ({car.maintenancerequest.length})
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="documents" className="text-nowrap px-3">
                    <IconFileText className="me-1 d-none d-md-inline" />
                    Documents ({car.document.length})
                  </Nav.Link>
                </Nav.Item>
              </Nav>
            </div>

            <Tab.Content>
              {/* Profile Tab */}
              <Tab.Pane eventKey="profile">
                <Row>
                  <Col lg={12}>
                    <Card className="mb-3">
                      <Card.Header>
                        <h5 className="mb-0">Car Details</h5>
                      </Card.Header>
                      <Card.Body>
                        <Row>
                          <Col xs={12} md={6} className="mb-3">
                            <small className="text-muted d-block">Registration</small>
                            <p className="mb-0">
                              <Badge bg="info" className="me-2">
                                {car.registration}
                              </Badge>
                            </p>
                          </Col>
                          <Col xs={12} md={6} className="mb-3">
                            <small className="text-muted d-block">Make & Model</small>
                            <p className="mb-0">{car.make} {car.model}</p>
                          </Col>
                          <Col xs={12} md={6} className="mb-3">
                            <small className="text-muted d-block">Year</small>
                            <p className="mb-0">{car.year || "N/A"}</p>
                          </Col>
                          <Col xs={12} md={6} className="mb-3">
                            <small className="text-muted d-block">Color</small>
                            <p className="mb-0">{car.color || "N/A"}</p>
                          </Col>
                          <Col xs={12} md={6} className="mb-3">
                            <small className="text-muted d-block">Current Status</small>
                            <p className="mb-0">
                              <Badge bg={getStatusBadgeColor(car.status)}>
                                {car.status}
                              </Badge>
                            </p>
                          </Col>
                          <Col xs={12} md={6} className="mb-3">
                            <small className="text-muted d-block">Active Status</small>
                            <p className="mb-0">
                              <Badge bg={car.isActive ? "success" : "danger"}>
                                {car.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </p>
                          </Col>
                          <Col xs={12} md={6} className="mb-3">
                            <small className="text-muted d-block">Purchase Price</small>
                            <p className="mb-0">{formatCurrency(car.purchasePrice)}</p>
                          </Col>
                          <Col xs={12} md={6} className="mb-3">
                            <small className="text-muted d-block">Current Value</small>
                            <p className="mb-0">{formatCurrency(car.currentValue || car.purchasePrice)}</p>
                          </Col>
                          <Col xs={12} md={6} className="mb-3">
                            <small className="text-muted d-block">Purchase Date</small>
                            <p className="mb-0">{formatDate(car.purchaseDate)}</p>
                          </Col>
                          <Col xs={12} md={6} className="mb-3">
                            <small className="text-muted d-block">Added On</small>
                            <p className="mb-0">{formatDate(car.createdAt)}</p>
                          </Col>
                          <Col xs={12} md={6} className="mb-3">
                            <small className="text-muted d-block">Last Updated</small>
                            <p className="mb-0">{formatDate(car.updatedAt)}</p>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </Tab.Pane>

              {/* Driver Tab */}
              <Tab.Pane eventKey="driver">
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">Assigned Driver</h5>
                  </Card.Header>
                  <Card.Body>
                    {car.driverprofile ? (
                      <Row>
                        <Col xs={12} md={6} className="mb-3">
                          <small className="text-muted d-block">Driver Name</small>
                          <p className="mb-0 d-flex align-items-center">
                            <IconPerson size={14} className="me-2" />
                            {car.driverprofile.user.name}
                          </p>
                        </Col>
                        <Col xs={12} md={6} className="mb-3">
                          <small className="text-muted d-block">Driver Email</small>
                          <p className="mb-0">{car.driverprofile.user.email}</p>
                        </Col>
                        <Col xs={12} md={6} className="mb-3">
                          <small className="text-muted d-block">Driver Phone</small>
                          <p className="mb-0">{car.driverprofile.user.phone || "N/A"}</p>
                        </Col>
                        <Col xs={12} md={6} className="mb-3">
                          <small className="text-muted d-block">Driver Status</small>
                          <p className="mb-0">
                            <Badge bg={car.driverprofile.user.isActive ? "success" : "danger"}>
                              {car.driverprofile.user.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </p>
                        </Col>
                        <Col xs={12}>
                          <div className="mt-3">
                            <Link href={`/drivers/${car.driverprofile.user.id}`} passHref>
                              <Button variant="outline-primary" size="sm">
                                <IconView className="me-2" />
                                View Driver Profile
                              </Button>
                            </Link>
                          </div>
                        </Col>
                      </Row>
                    ) : (
                      <Alert variant="info" className="m-0">
                        No driver assigned to this car.
                      </Alert>
                    )}
                  </Card.Body>
                </Card>
              </Tab.Pane>

              {/* Agreements Tab */}
              <Tab.Pane eventKey="agreements">
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">Agreements ({car.agreement.length})</h5>
                  </Card.Header>
                  <Card.Body className="p-0">
                    <ResponsiveTable
                      data={car.agreement}
                      emptyMessage="No agreements found for this car."
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
                          header: "Driver",
                          accessor: "driver",
                          render: (item: any) => (
                            item.driver ? (
                              <div className="text-truncate" style={{ maxWidth: "120px" }}>
                                {item.driver.name}
                              </div>
                            ) : (
                              <span className="text-muted">No driver</span>
                            )
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
                              <Badge bg="info" className="me-2">{item.type}</Badge>
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

                          <div className="d-flex flex-wrap gap-2 small">
                            <div className="d-flex align-items-center">
                              <IconPerson size={12} className="me-1 text-muted" />
                              <span className="text-muted">
                                {item.driver ? item.driver.name : "No driver"}
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

              {/* Payments Tab */}
              <Tab.Pane eventKey="payments">
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">Financial Records ({car.ledger.length})</h5>
                  </Card.Header>
                  <Card.Body className="p-0">
                    <ResponsiveTable
                      data={car.ledger}
                      emptyMessage="No financial records found for this car."
                      columns={[
                        {
                          header: "Date",
                          accessor: "paymentDate",
                          render: (item: any) => (
                            <div className="small">
                              {formatDate(item.paymentDate) || formatDate(item.createdAt)}
                            </div>
                          )
                        },
                        {
                          header: "Category",
                          accessor: "category",
                          render: (item: any) => (
                            <Badge bg="info">
                              {formatCategory(item.category)}
                            </Badge>
                          )
                        },
                        {
                          header: "Type",
                          accessor: "direction",
                          hideOnMobile: true,
                          render: (item: any) => (
                            <Badge bg={item.direction === "CREDIT" ? "success" : "danger"}>
                              {item.direction}
                            </Badge>
                          )
                        },
                        {
                          header: "Driver",
                          accessor: "driver",
                          hideOnMobile: true,
                          render: (item: any) => (
                            item.driver ? item.driver.name : "No driver"
                          )
                        },
                        {
                          header: "Amount",
                          accessor: "amount",
                          render: (item: any) => (
                            <div className={`fw-bold ${item.direction === "CREDIT" ? "text-success" : "text-danger"}`}>
                              {item.direction === "CREDIT" ? "+" : "-"}{formatCurrency(item.amount)}
                            </div>
                          )
                        },
                        {
                          header: "Status",
                          accessor: "status",
                          render: (item: any) => (
                            <Badge
                              bg={
                                item.status === "ACCEPT"
                                  ? "success"
                                  : item.status === "PENDING"
                                    ? "warning"
                                    : "danger"
                              }
                            >
                              {item.direction === 'CREDIT' ? item.status : ""}
                            </Badge>
                          )
                        }
                      ]}
                      renderMobileCard={(item: any) => (
                        <div className="d-flex flex-column gap-2">
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <h6 className="mb-1">
                                {formatDate(item.paymentDate) || formatDate(item.createdAt)}
                              </h6>
                              <div className="d-flex align-items-center mb-2">
                                <Badge bg="info" className="me-2">
                                  {formatCategory(item.category)}
                                </Badge>
                                <Badge bg={item.direction === "CREDIT" ? "success" : "danger"}>
                                  {item.direction}
                                </Badge>
                              </div>
                              <div className={`fw-bold ${item.direction === "CREDIT" ? "text-success" : "text-danger"}`}>
                                {item.direction === "CREDIT" ? "+" : "-"}{formatCurrency(item.amount)}
                              </div>
                            </div>
                          </div>

                          <div className="d-flex flex-wrap gap-2 small">
                            <div className="d-flex align-items-center">
                              <IconPerson size={12} className="me-1 text-muted" />
                              <span className="text-muted">
                                {item.driver ? item.driver.name : "No driver"}
                              </span>
                            </div>
                            {item.description && (
                              <div className="text-muted small">
                                {item.description}
                              </div>
                            )}
                          </div>

                          <div className="d-flex justify-content-between align-items-center mt-2">
                            <Badge
                              bg={
                                item.status === "ACCEPT"
                                  ? "success"
                                  : item.status === "PENDING"
                                    ? "warning"
                                    : "danger"
                              }
                            >
                              {item.direction === 'CREDIT' ? item.status : ""}
                            </Badge>

                          </div>
                        </div>
                      )}
                    />
                  </Card.Body>
                </Card>
              </Tab.Pane>

              {/* Insurance Tab - UPDATED */}
              <Tab.Pane eventKey="insurance">
                <Card>
                  <Card.Header className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
                    <h5 className="mb-0">Insurance Policies ({car.insurance.length})</h5>
                    <div className="d-flex gap-2 w-100 w-md-auto">
                      <Button 
                        variant="success" 
                        size="sm"
                        onClick={() => setShowAddInsuranceModal(true)}
                        className="flex-grow-1 flex-md-grow-0"
                      >
                        <IconPlus className="me-1" />
                        <span className="d-none d-md-inline">Add Insurance</span>
                        <span className="d-md-none">Add</span>
                      </Button>
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        onClick={fetchCarDetails}
                        className="flex-grow-1 flex-md-grow-0"
                      >
                        <span className="d-none d-md-inline">Refresh</span>
                        <span className="d-md-none">⟳</span>
                      </Button>
                    </div>
                  </Card.Header>
                  <Card.Body className="p-0">
                    <ResponsiveTable
                      data={car.insurance}
                      emptyMessage="No insurance policies found for this car."
                      columns={[
                        {
                          header: "Provider",
                          accessor: "provider",
                          render: (item: any) => (
                            <div className="d-flex align-items-center">
                              <IconShieldCheck className="me-2 text-primary" />
                              <div>
                                <div className="fw-medium">{item.provider}</div>
                                {item.policyNo && (
                                  <div className="small text-muted">{item.policyNo}</div>
                                )}
                              </div>
                            </div>
                          )
                        },
                        {
                          header: "Policy No",
                          accessor: "policyNo",
                          hideOnMobile: true,
                          render: (item: any) => item.policyNo || "N/A"
                        },
                        {
                          header: "Renewal Date",
                          accessor: "renewalDate",
                          hideOnMobile: true,
                          render: (item: any) => (
                            <div className="d-flex align-items-center">
                              <IconRenewal size={12} className="me-1 text-muted" />
                              {formatDate(item.renewalDate)}
                            </div>
                          )
                        },
                        {
                          header: "Status",
                          accessor: "status",
                          render: (item: any) => getInsuranceStatusBadge(item)
                        },
                        {
                          header: "Coverage Period",
                          accessor: "startDate",
                          hideOnMobile: true,
                          render: (item: any) => (
                            <div className="small">
                              {formatDate(item.startDate)} - {formatDate(item.endDate)}
                            </div>
                          )
                        },
                        {
                          header: "Annual",
                          accessor: "yearlyCost",
                          render: (item: any) => formatCurrency(item.yearlyCost)
                        },
                        {
                          header: "Monthly",
                          accessor: "monthlyCharge",
                          hideOnMobile: true,
                          render: (item: any) => formatCurrency(item.monthlyCharge)
                        },
                        {
                          header: "Excess",
                          accessor: "excessAmount",
                          hideOnMobile: true,
                          render: (item: any) => formatCurrency(item.excessAmount)
                        }
                      ]}
                      renderMobileCard={(item: any) => (
                        <div className="d-flex flex-column gap-2">
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <div className="d-flex align-items-center mb-1">
                                <IconShieldCheck size={14} className="me-2 text-primary" />
                                <h6 className="mb-0">{item.provider}</h6>
                              </div>
                              {item.policyNo && (
                                <div className="small text-muted mb-1">Policy: {item.policyNo}</div>
                              )}
                              {item.renewalDate && (
                                <div className="d-flex align-items-center small text-muted mb-1">
                                  <IconRenewal size={12} className="me-1" />
                                  Renewal: {formatDate(item.renewalDate)}
                                </div>
                              )}
                              <div className="mb-2">
                                {getInsuranceStatusBadge(item)}
                              </div>
                              
                              {/* Cost breakdown for mobile */}
                              <div className="d-flex flex-wrap gap-3 mb-2">
                                <div>
                                  <div className="small text-muted">Annual</div>
                                  <div className="fw-bold">{formatCurrency(item.yearlyCost)}</div>
                                </div>
                                <div>
                                  <div className="small text-muted">Monthly</div>
                                  <div className="fw-bold">{formatCurrency(item.monthlyCharge)}</div>
                                </div>
                                <div>
                                  <div className="small text-muted">Excess</div>
                                  <div className="fw-bold">{formatCurrency(item.excessAmount)}</div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="d-flex flex-wrap gap-2 small">
                            <div className="d-flex align-items-center">
                              <IconCalendar size={12} className="me-1 text-muted" />
                              <span className="text-muted">
                                {formatDate(item.startDate)} - {formatDate(item.endDate)}
                              </span>
                            </div>
                          </div>

                          {/* Add Insurance button on mobile */}
                          <div className="d-flex justify-content-end gap-2 mt-2">
                            <Button 
                              variant="success" 
                              size="sm"
                              onClick={() => setShowAddInsuranceModal(true)}
                            >
                              <IconPlus className="me-1" />
                              Add New
                            </Button>
                          </div>
                        </div>
                      )}
                    />
                  </Card.Body>
                </Card>
              </Tab.Pane>

              {/* Maintenance Tab */}
              <Tab.Pane eventKey="maintenance">
                <Card>
                  <Card.Header className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Maintenance Requests ({car.maintenancerequest.length})</h5>
                    <Badge bg="info" className="px-3 py-2">
                      <IconMileage className="me-1" />
                      Mileage Display Enabled
                    </Badge>
                  </Card.Header>
                  <Card.Body className="p-0">
                    <ResponsiveTable
                      data={car.maintenancerequest}
                      emptyMessage="No maintenance requests found for this car."
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
                          header: "Amount",
                          accessor: "amount",
                          render: (item: any) => formatCurrency(item.amount)
                        },
                        {
                          header: "Mileage",
                          accessor: "mileage",
                          render: (item: any) => (
                            item.mileage ? (
                              <Badge bg="secondary" className="px-3">
                                <IconMileage size={10} className="me-1" />
                                {item.mileage.toLocaleString()} miles
                              </Badge>
                            ) : (
                              <span className="text-muted small">N/A</span>
                            )
                          )
                        },
                        {
                          header: "Status",
                          accessor: "status",
                          render: (item: any) => (
                            <Badge
                              bg={
                                item.status === "COMPLETED"
                                  ? "success"
                                  : item.status === "APPROVED"
                                    ? "primary"
                                    : item.status === "PENDING"
                                      ? "warning"
                                      : "danger"
                              }
                            >
                              {item.status}
                            </Badge>
                          )
                        },
                        {
                          header: "Created",
                          accessor: "createdAt",
                          hideOnMobile: true,
                          render: (item: any) => formatDate(item.createdAt)
                        },
                        {
                          header: "Actions",
                          accessor: "id",
                          render: (item: any) => (
                            <Link href={`/maintenance/${item.id}`} passHref>
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
                              <div className="d-flex align-items-center flex-wrap gap-2 mb-2">
                                <span className="fw-bold me-2">{formatCurrency(item.amount)}</span>
                                {item.mileage && (
                                  <Badge bg="secondary" className="px-2 py-1">
                                    <IconMileage size={10} className="me-1" />
                                    {item.mileage.toLocaleString()} miles
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="d-flex flex-wrap gap-2 small">
                            <div className="d-flex align-items-center">
                              <IconCalendar size={12} className="me-1 text-muted" />
                              <span className="text-muted">
                                {formatDate(item.createdAt)}
                              </span>
                            </div>
                            <div className="d-flex align-items-center">
                              <IconPerson size={12} className="me-1 text-muted" />
                              <span className="text-muted">
                                {item.driver ? item.driver.name : "No driver"}
                              </span>
                            </div>
                          </div>

                          <div className="d-flex justify-content-between align-items-center mt-2">
                            <Badge
                              bg={
                                item.status === "COMPLETED"
                                  ? "success"
                                  : item.status === "APPROVED"
                                    ? "primary"
                                    : item.status === "PENDING"
                                      ? "warning"
                                      : "danger"
                              }
                            >
                              {item.status}
                            </Badge>
                            <Link href={`/maintenance/${item.id}`} passHref>
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

              {/* Documents Tab */}
              <Tab.Pane eventKey="documents">
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">Documents ({car.document.length})</h5>
                  </Card.Header>
                  <Card.Body className="p-0">
                    <ResponsiveTable
                      data={car.document}
                      emptyMessage="No documents uploaded for this car."
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

      {/* Edit Car Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Car Details</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEditSubmit}>
          <Modal.Body>
            <Row>
              <Col md={4} className="text-center mb-4 mb-md-0">
                <div className="position-relative">
                  <div
                    className="rounded position-relative mb-3 mx-auto cursor-pointer"
                    style={{
                      width: '200px',
                      height: '150px',
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
                    ) : car.avatar && !removeExistingAvatar ? (
                      <img
                        src={getAvatarUrl(car.avatar) || ''}
                        alt={`${car.make} ${car.model}`}
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
                    {(avatarPreview || (car.avatar && !removeExistingAvatar)) && (
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

                  {car.avatar && !removeExistingAvatar && !avatarPreview && (
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
                      <Form.Label>Registration Number *</Form.Label>
                      <Form.Control
                        type="text"
                        name="registration"
                        value={editFormData?.registration || ''}
                        onChange={handleInputChange}
                        required
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Make *</Form.Label>
                      <Form.Control
                        type="text"
                        name="make"
                        value={editFormData?.make || ''}
                        onChange={handleInputChange}
                        required
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Model *</Form.Label>
                      <Form.Control
                        type="text"
                        name="model"
                        value={editFormData?.model || ''}
                        onChange={handleInputChange}
                        required
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Year</Form.Label>
                      <Form.Control
                        type="number"
                        name="year"
                        min="1900"
                        max={new Date().getFullYear() + 1}
                        value={editFormData?.year || ''}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Color</Form.Label>
                      <Form.Control
                        type="text"
                        name="color"
                        value={editFormData?.color || ''}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Status</Form.Label>
                      <Form.Select
                        name="status"
                        value={editFormData?.status || ''}
                        onChange={handleInputChange}
                      >
                        <option value="AVAILABLE">Available</option>
                        <option value="RENTED">Rented</option>
                        <option value="MAINTENANCE">Maintenance</option>
                        <option value="SOLD">SOLD</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Purchase Price (£)</Form.Label>
                      <InputGroup>
                        <InputGroup.Text>£</InputGroup.Text>
                        <Form.Control
                          type="number"
                          name="purchasePrice"
                          step="0.01"
                          min="0"
                          value={editFormData?.purchasePrice || ''}
                          onChange={handleInputChange}
                          required
                        />
                      </InputGroup>
                    </Form.Group>
                  </Col>

                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Current Value (£)</Form.Label>
                      <InputGroup>
                        <InputGroup.Text>£</InputGroup.Text>
                        <Form.Control
                          type="number"
                          name="currentValue"
                          step="0.01"
                          min="0"
                          value={editFormData?.currentValue || ''}
                          onChange={handleInputChange}
                        />
                      </InputGroup>
                    </Form.Group>
                  </Col>

                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Purchase Date</Form.Label>
                      <Form.Control
                        type="date"
                        name="purchaseDate"
                        value={editFormData?.purchaseDate || ''}
                        onChange={handleInputChange}
                      />
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
            Crop Car Image
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {originalImage && (
            <div style={{ maxHeight: '500px', overflow: 'auto' }}>
              <Cropper
                src={originalImage}
                style={{ height: '400px', width: '100%' }}
                initialAspectRatio={4/3}
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

      {/* ADD INSURANCE MODAL */}
      <Modal 
        show={showAddInsuranceModal} 
        onHide={() => setShowAddInsuranceModal(false)} 
        size="lg" 
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <IconShieldCheck className="me-2" />
            Add New Insurance Policy
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleInsuranceSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Insurance Provider *</Form.Label>
                  <Form.Control
                    type="text"
                    name="provider"
                    value={insuranceFormData.provider}
                    onChange={handleInsuranceInputChange}
                    placeholder="e.g., Aviva, Admiral, Direct Line"
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Policy Number</Form.Label>
                  <Form.Control
                    type="text"
                    name="policyNo"
                    value={insuranceFormData.policyNo}
                    onChange={handleInsuranceInputChange}
                    placeholder="e.g., POL12345678"
                  />
                </Form.Group>
              </Col>

              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Certificate Number</Form.Label>
                  <Form.Control
                    type="text"
                    name="certificateNo"
                    value={insuranceFormData.certificateNo}
                    onChange={handleInsuranceInputChange}
                    placeholder="Certificate number"
                  />
                </Form.Group>
              </Col>

              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Coverage Type</Form.Label>
                  <Form.Control
                    type="text"
                    name="coverageType"
                    value={insuranceFormData.coverageType}
                    onChange={handleInsuranceInputChange}
                    placeholder="e.g., Comprehensive, Third Party"
                  />
                </Form.Group>
              </Col>

              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Start Date *</Form.Label>
                  <Form.Control
                    type="date"
                    name="startDate"
                    value={insuranceFormData.startDate}
                    onChange={handleInsuranceInputChange}
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>End Date *</Form.Label>
                  <Form.Control
                    type="date"
                    name="endDate"
                    value={insuranceFormData.endDate}
                    onChange={handleInsuranceInputChange}
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Renewal Date</Form.Label>
                  <Form.Control
                    type="date"
                    name="renewalDate"
                    value={insuranceFormData.renewalDate}
                    onChange={handleInsuranceInputChange}
                  />
                </Form.Group>
              </Col>

              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Excess Amount (£)</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>£</InputGroup.Text>
                    <Form.Control
                      type="number"
                      name="excessAmount"
                      step="0.01"
                      min="0"
                      value={insuranceFormData.excessAmount}
                      onChange={handleInsuranceInputChange}
                      placeholder="0.00"
                    />
                  </InputGroup>
                </Form.Group>
              </Col>

              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Yearly Cost (£)</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>£</InputGroup.Text>
                    <Form.Control
                      type="number"
                      name="yearlyCost"
                      step="0.01"
                      min="0"
                      value={insuranceFormData.yearlyCost}
                      onChange={handleInsuranceInputChange}
                      placeholder="Annual premium"
                    />
                  </InputGroup>
                </Form.Group>
              </Col>

              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Monthly Charge (£)</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>£</InputGroup.Text>
                    <Form.Control
                      type="number"
                      name="monthlyCharge"
                      step="0.01"
                      min="0"
                      value={insuranceFormData.monthlyCharge}
                      onChange={handleInsuranceInputChange}
                      placeholder="Monthly installment"
                    />
                  </InputGroup>
                </Form.Group>
              </Col>

              <Col xs={12} className="mb-3">
                <Form.Group>
                  <Form.Label>Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    name="notes"
                    value={insuranceFormData.notes}
                    onChange={handleInsuranceInputChange}
                    placeholder="Additional notes about this insurance policy"
                    rows={3}
                  />
                </Form.Group>
              </Col>

              <Col xs={12}>
                <Form.Group>
                  <div className="d-flex align-items-center">
                    <Form.Check
                      type="switch"
                      id="isActive"
                      name="isActive"
                      checked={insuranceFormData.isActive}
                      onChange={(e) => setInsuranceFormData(prev => ({
                        ...prev,
                        isActive: e.target.checked
                      }))}
                      label="Active Policy"
                    />
                    <div className="ms-3">
                      <Badge bg={insuranceFormData.isActive ? "success" : "secondary"}>
                        {insuranceFormData.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAddInsuranceModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={insuranceLoading}
            >
              {insuranceLoading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Adding...
                </>
              ) : (
                <>
                  <IconPlus className="me-2" />
                  Add Insurance Policy
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default CarDetail;