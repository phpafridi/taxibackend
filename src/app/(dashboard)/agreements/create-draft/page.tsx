"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Card,
  Form,
  Button,
  Alert,
  Row,
  Col,
  Spinner,
  Table
} from 'react-bootstrap';
import { FileText, Save, ArrowLeft } from 'react-bootstrap-icons';
import { toast } from 'sonner';
import Confetti from 'react-confetti';

interface Driver {
  id: number;
  name: string;
  address?: string;
  postcode?: string;
  licenseNumber?: string;
  phone?: string;
  email?: string;
  dob?: string;
}

interface Vehicle {
  id: number;
  registration: string;
  make: string;
  model: string;
  year?: string;
  bodyType?: string;
  weeklyRate?: number;
  depositAmount?: number;
}

export default function CreateDraftAgreementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [isClient, setIsClient] = useState(false);

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [formData, setFormData] = useState({
    type: 'HIRE_AGREEMENT',
    title: '',
    driverId: '',
    vehicleId: '',

    // Customer Details
    fullName: '',
    dob: '',
    address: '',
    postcode: '',
    licenseNumber: '',
    licenseExpiry: '',
    phone: '',
    email: '',

    // Vehicle Details
    vehicleMake: '',
    vehicleModel: '',
    registration: '',
    bodyType: '',
    weeklyRate: '',
    depositAmount: '',

    // Hire Period
    dateOut: '',
    dueDateIn: '',
    dateIn: '',

    // Damage/Inspection - Checkbox states
    damageOut: '',
    damageOutMajorDamage: false,
    damageOutDent: false,
    damageOutScratch: false,
    damageOutMissing: false,
    damageOutChip: false,
    
    damageIn: '',
    damageInMajorDamage: false,
    damageInDent: false,
    damageInScratch: false,
    damageInMissing: false,
    damageInChip: false,

    // Terms Acceptance
    printName: '',
    acceptDate: '',

    // Terms and conditions
    terms: `
1. I accept full responsibility and agree to pay on demand for:
   (i) any additional damage whatsoever,
   (ii) any policy excess applicable up to £15,000.00,
   (iii) any fuel required,
   (iv) valeting charge as required.

2. INSPECTION
   I confirm the vehicle has been inspected and any damage or defects are accurately recorded.
   I agree to pay the insurance excess for every damage, theft or third-party claim.

3. EXCESSIVE WEAR AND TEAR
   The following constitutes excessive wear and tear:
   • Cracked or damaged glass
   • Dented or damaged body panels or paint
   • Missing equipment or accessories
   • Tyres with less than 3mm tread
   • Interior damage (seats, dashboard, trim)
   • Mechanical damage affecting safety

4. EVENT OF DEFAULT & RETURN
   Failure to make payment, misrepresentation, seizure, theft or non-return of the vehicle
   constitutes default. The hirer shall be liable for all outstanding amounts, recovery costs,
   and legal fees.
    `
  });

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

  // Fetch drivers
  useEffect(() => {
    const fetchDrivers = async () => {
      setLoadingDrivers(true);
      try {
        const response = await fetch('/api/drivers/hire-driver');

        if (!response.ok) {
          throw new Error(`Failed to fetch drivers: ${response.status}`);
        }

        const driversData = await response.json();

        // Transform API response to match Driver interface
        const driverOptions = driversData.map((driver: any) => {
          return {
            id: driver.id, // User ID
            name: driver.name || `Driver ${driver.id}`,
            dob: driver.driverProfile?.dateOfBirth ? new Date(driver.driverProfile.dateOfBirth).toLocaleDateString('en-GB') : '',
            address: driver.driverProfile?.address || '',
            postcode: driver.driverProfile?.postcode || '',
            licenseNumber: driver.driverProfile?.licenseNumber || '',
            licenseExpiry: driver.driverProfile?.licenseExpiry || '',
            phone: driver.phone || '',
            email: driver.email || '',
          };
        });

        setDrivers(driverOptions);
      } catch (error) {
        console.error('Error fetching drivers:', error);
        toast.error('Failed to load drivers. Please try again.');
      } finally {
        setLoadingDrivers(false);
      }
    };

    fetchDrivers();
  }, []);

  // Fetch vehicles
  useEffect(() => {
    const fetchVehicles = async () => {
      setLoadingVehicles(true);
      try {
        const response = await fetch('/api/cars/hire-cars');
        const data = await response.json();

        if (data.success && data.data) {
          const vehicleOptions = data.data.map((car: any) => ({
            id: car.id,
            registration: car.registration,
            make: car.make,
            model: car.model,
            year: car.year,
            bodyType: car.bodyType,
            weeklyRate: car.weeklyRate || 0,
            depositAmount: car.depositAmount || 0,
          }));
          setVehicles(vehicleOptions);
        }
      } catch (error) {
        console.error('Failed to fetch vehicles:', error);
        toast.error('Failed to load vehicles');
      } finally {
        setLoadingVehicles(false);
      }
    };

    fetchVehicles();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prevData => ({
        ...prevData,
        [name]: checked
      }));
    } else {
      setFormData(prevData => {
        const updatedData = { ...prevData, [name]: value };

        if (name === 'driverId' && value) {
          const selectedDriver = drivers.find(driver => driver.id === parseInt(value));
          if (selectedDriver) {
            return {
              ...updatedData,
              fullName: selectedDriver.name || '',
              dob: selectedDriver.dob || '',
              address: selectedDriver.address || '',
              postcode: selectedDriver.postcode || '',
              licenseNumber: selectedDriver.licenseNumber || '',
              phone: selectedDriver.phone || '',
              email: selectedDriver.email || '',
              printName: selectedDriver.name || '',
              title: prevData.title || `Hire Agreement - ${selectedDriver.name}`
            };
          }
        }

        if (name === 'vehicleId' && value) {
          const selectedVehicle = vehicles.find(vehicle => vehicle.id === parseInt(value));
          if (selectedVehicle) {
            return {
              ...updatedData,
              vehicleMake: selectedVehicle.make || '',
              vehicleModel: selectedVehicle.model || '',
              registration: selectedVehicle.registration || '',
              bodyType: selectedVehicle.bodyType || '',
              weeklyRate: selectedVehicle.weeklyRate?.toString() || '',
              depositAmount: selectedVehicle.depositAmount?.toString() || '',
            };
          }
        }

        return updatedData;
      });
    }
  };

  const generateAgreementContent = () => {
    // Generate checkbox summary for damage out
    const damageOutCheckboxes = [];
    if (formData.damageOutMajorDamage) damageOutCheckboxes.push('Major Damage');
    if (formData.damageOutDent) damageOutCheckboxes.push('Dent');
    if (formData.damageOutScratch) damageOutCheckboxes.push('Scratch');
    if (formData.damageOutMissing) damageOutCheckboxes.push('Missing');
    if (formData.damageOutChip) damageOutCheckboxes.push('Chip');
    
    // Generate checkbox summary for damage in
    const damageInCheckboxes = [];
    if (formData.damageInMajorDamage) damageInCheckboxes.push('Major Damage');
    if (formData.damageInDent) damageInCheckboxes.push('Dent');
    if (formData.damageInScratch) damageInCheckboxes.push('Scratch');
    if (formData.damageInMissing) damageInCheckboxes.push('Missing');
    if (formData.damageInChip) damageInCheckboxes.push('Chip');
    
    const damageOutSummary = damageOutCheckboxes.length > 0 
      ? `Damage types: ${damageOutCheckboxes.join(', ')}. ${formData.damageOut}`
      : formData.damageOut || 'None noted';
      
    const damageInSummary = damageInCheckboxes.length > 0
      ? `Damage types: ${damageInCheckboxes.join(', ')}. ${formData.damageIn}`
      : formData.damageIn || 'To be completed';

    return `HIRE AGREEMENT
Non Regulated – 12 Months

CONTACT DETAILS
Phone: 07904388925
Email: rsprivatehireltd@gmail.com

1. CUSTOMER DETAILS
   Full Name: ${formData.fullName}
   Date of Birth: ${formData.dob}
   Address: ${formData.address}
   Postcode: ${formData.postcode}
   Phone: ${formData.phone}
   Email: ${formData.email}
   Driver's License Number: ${formData.licenseNumber}
   License Expiry Date: ${formData.licenseExpiry}

2. VEHICLE RATES & DETAILS
   Vehicle Make: ${formData.vehicleMake}
   Vehicle Model: ${formData.vehicleModel}
   Registration: ${formData.registration}
   Type of Body: ${formData.bodyType}
   Weekly Rate: £${formData.weeklyRate}
   Deposit: £${formData.depositAmount}

3. HIRE PERIOD
   Date Out: ${formData.dateOut}
   Date In: ${formData.dateIn}
   Due Date In: ${formData.dueDateIn}

4. VEHICLE CONDITION – OUT
   Damage/Defects noted at check-out: ${damageOutSummary}

5. VEHICLE CONDITION – IN
   Damage/Defects noted at check-in: ${damageInSummary}

6. ACCEPTANCE OF TERMS & CONDITIONS
   I, ${formData.printName}, accept all terms and conditions as outlined in this agreement.
   
   Date: ${formData.acceptDate}
    `;
  };

  const playSuccessSound = () => {
    try {
      const audio = new Audio("/notifications/success.wav");
      audio.play().catch((err) => console.log("Audio play error:", err));
    } catch (error) {
      console.log("Sound file not found or error playing sound");
    }
  };

  const playErrorSound = () => {
    try {
      const audio = new Audio("/notifications/error.wav");
      audio.play().catch((err) => console.log("Audio play error:", err));
    } catch (error) {
      console.log("Sound file not found or error playing sound");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    setShowConfetti(false);

    if (!formData.driverId || !formData.vehicleId) {
      toast.error("Please select both a driver and a vehicle");
      playErrorSound();
      setLoading(false);
      return;
    }

    const agreementContent = generateAgreementContent();

    const payload = {
      type: formData.type,
      title: formData.title || `Hire Agreement - ${formData.fullName || 'Draft'}`,
      content: agreementContent,
      terms: formData.terms,
      weeklyRate: formData.weeklyRate || null,
      depositAmount: formData.depositAmount || null,
      driverId: formData.driverId,
      vehicleId: formData.vehicleId,
      startDate: formData.acceptDate,
      endDate: formData.dueDateIn,
      dateIn: formData.dateIn || null,
      // Damage checkboxes
      damageOut: formData.damageOut,
      damageOutMajorDamage: formData.damageOutMajorDamage,
      damageOutDent: formData.damageOutDent,
      damageOutScratch: formData.damageOutScratch,
      damageOutMissing: formData.damageOutMissing,
      damageOutChip: formData.damageOutChip,
      
      damageIn: formData.damageIn,
      damageInMajorDamage: formData.damageInMajorDamage,
      damageInDent: formData.damageInDent,
      damageInScratch: formData.damageInScratch,
      damageInMissing: formData.damageInMissing,
      damageInChip: formData.damageInChip,
    };

    try {
      const response = await fetch('/api/agreements/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('✅ Draft agreement created successfully!', {
          duration: 5000,
          description: `Agreement "${formData.title}" has been saved as draft.`,
        });

        playSuccessSound();
        setSuccess(true);
        setShowConfetti(true);

        // Stop confetti after 5 seconds
        setTimeout(() => {
          setShowConfetti(false);
        }, 5000);

        // Reset form after 1 second
        setTimeout(() => {
          setFormData({
            type: 'HIRE_AGREEMENT',
            title: '',
            driverId: '',
            vehicleId: '',
            fullName: '',
            dob: '',
            address: '',
            postcode: '',
            licenseNumber: '',
            licenseExpiry: '',
            phone: '',
            email: '',
            vehicleMake: '',
            vehicleModel: '',
            registration: '',
            bodyType: '',
            weeklyRate: '',
            depositAmount: '',
            dateOut: '',
            dueDateIn: '',
            dateIn: '',
            damageOut: '',
            damageOutMajorDamage: false,
            damageOutDent: false,
            damageOutScratch: false,
            damageOutMissing: false,
            damageOutChip: false,
            damageIn: '',
            damageInMajorDamage: false,
            damageInDent: false,
            damageInScratch: false,
            damageInMissing: false,
            damageInChip: false,
            printName: '',
            acceptDate: '',
            terms: formData.terms // Keep the terms
          });

          // Redirect to agreements list after 4 seconds
          setTimeout(() => {
            router.push('/agreements');
          }, 4000);
        }, 1000);
      } else {
        const errorMsg = data.error || data.details || '❌ Failed to create draft agreement';
        toast.error(errorMsg);
        playErrorSound();
        setError(errorMsg);
      }
    } catch (err: any) {
      console.error('Error:', err);
      const errorMsg = '❌ An error occurred. Please try again.';
      toast.error(errorMsg);
      playErrorSound();
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showConfetti && isClient && windowSize.width > 0 && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 9999, pointerEvents: 'none' }}>
          <Confetti
            width={windowSize.width}
            height={windowSize.height}
            recycle={false}
            numberOfPieces={300}
            gravity={0.15}
            colors={['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']}
            wind={0.05}
            onConfettiComplete={() => setShowConfetti(false)}
          />
        </div>
      )}

      <Container className="py-4" style={{ position: 'relative', zIndex: 1 }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <Button
              variant="outline-secondary"
              onClick={() => router.push('/agreements')}
              className="mb-2"
              disabled={loading || success}
            >
              <ArrowLeft className="me-2" />
              Back to Agreements
            </Button>
            <h1 className="h3 mb-0">
              <FileText className="me-2" />
              Create Hire Agreement
            </h1>
            <p className="text-muted mb-0">Fill in the form below to create a new hire agreement</p>
          </div>
        </div>

        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" className="mb-4">
            <Alert.Heading>🎉 Agreement Created Successfully!</Alert.Heading>
            <p>
              Your draft agreement "<strong>{formData.title}</strong>" has been created.
              You will be redirected to the agreements list in a moment...
            </p>
            <div className="d-flex align-items-center mt-2">
              <Spinner animation="grow" size="sm" variant="warning" className="me-2" />
              <span>Preparing to redirect...</span>
            </div>
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Card className="mb-4 shadow">
            <Card.Header className="bg-dark text-warning">
              <h5 className="mb-0 text-warning">Agreement Details</h5>
            </Card.Header>
            <Card.Body>
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Agreement Title *</Form.Label>
                    <Form.Control
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="e.g., Hire Agreement for John Smith"
                      required
                      disabled={loading || success}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Agreement Type *</Form.Label>
                    <Form.Select
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      required
                      disabled
                    >
                      <option value="HIRE_AGREEMENT">Hire Agreement</option>
                      <option value="INSURANCE_CERTIFICATE">Insurance Certificate</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* CUSTOMER DETAILS SECTION */}
          <Card className="mb-4 shadow">
            <Card.Header className="bg-light">
              <h5 className="mb-0">1. Customer Details</h5>
            </Card.Header>
            <Card.Body>
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Select Driver *</Form.Label>
                    <Form.Select
                      name="driverId"
                      value={formData.driverId}
                      onChange={handleChange}
                      required
                      disabled={loading || loadingDrivers || success}
                    >
                      <option value="">Select a driver...</option>
                      {loadingDrivers ? (
                        <option disabled>Loading drivers...</option>
                      ) : drivers.length === 0 ? (
                        <option disabled>No drivers found</option>
                      ) : (
                        drivers.map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.name} {driver.licenseNumber ? `(${driver.licenseNumber})` : ''}
                          </option>
                        ))
                      )}
                    </Form.Select>
                    {loadingDrivers && (
                      <Form.Text className="text-muted">
                        <Spinner animation="border" size="sm" className="me-2" />
                        Loading drivers...
                      </Form.Text>
                    )}
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Full Name *</Form.Label>
                    <Form.Control
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="John Smith"
                      required
                      disabled={loading || success}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Phone</Form.Label>
                    <Form.Control
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+44 1234 567890"
                      disabled={loading || success}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="john@example.com"
                      disabled={loading || success}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Date of Birth</Form.Label>
                    <Form.Control
                      type="text"
                      name="dob"
                      value={formData.dob}
                      onChange={handleChange}
                      placeholder="DD/MM/YYYY"
                      disabled={loading || success}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={8}>
                  <Form.Group>
                    <Form.Label>Address</Form.Label>
                    <Form.Control
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="123 Street Name, City"
                      disabled={loading || success}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Postcode</Form.Label>
                    <Form.Control
                      type="text"
                      name="postcode"
                      value={formData.postcode}
                      onChange={handleChange}
                      placeholder="AB12 3CD"
                      disabled={loading || success}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Driver's License Number</Form.Label>
                    <Form.Control
                      type="text"
                      name="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={handleChange}
                      placeholder="SMITH123456AB9CD"
                      disabled={loading || success}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* VEHICLE DETAILS SECTION */}
          <Card className="mb-4 shadow">
            <Card.Header className="bg-light">
              <h5 className="mb-0">2. Vehicle Rates & Details</h5>
            </Card.Header>
            <Card.Body>
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Select Vehicle *</Form.Label>
                    <Form.Select
                      name="vehicleId"
                      value={formData.vehicleId}
                      onChange={handleChange}
                      required
                      disabled={loading || loadingVehicles || success}
                    >
                      <option value="">Select a vehicle...</option>
                      {loadingVehicles ? (
                        <option disabled>Loading vehicles...</option>
                      ) : vehicles.length === 0 ? (
                        <option disabled>No vehicles found</option>
                      ) : (
                        vehicles.map((vehicle) => (
                          <option key={vehicle.id} value={vehicle.id}>
                            {vehicle.registration} - {vehicle.make} {vehicle.model}
                          </option>
                        ))
                      )}
                    </Form.Select>
                    {loadingVehicles && (
                      <Form.Text className="text-muted">
                        <Spinner animation="border" size="sm" className="me-2" />
                        Loading vehicles...
                      </Form.Text>
                    )}
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Registration *</Form.Label>
                    <Form.Control
                      type="text"
                      name="registration"
                      value={formData.registration}
                      onChange={handleChange}
                      placeholder="AB12 CDE"
                      required
                      disabled={loading || success}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Vehicle Make *</Form.Label>
                    <Form.Control
                      type="text"
                      name="vehicleMake"
                      value={formData.vehicleMake}
                      onChange={handleChange}
                      placeholder="Toyota"
                      required
                      disabled={loading || success}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Vehicle Model *</Form.Label>
                    <Form.Control
                      type="text"
                      name="vehicleModel"
                      value={formData.vehicleModel}
                      onChange={handleChange}
                      placeholder="Prius"
                      required
                      disabled={loading || success}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Type of Body</Form.Label>
                    <Form.Control
                      type="text"
                      name="bodyType"
                      value={formData.bodyType}
                      onChange={handleChange}
                      placeholder="Saloon"
                      disabled={loading || success}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Weekly Rate (£) *</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.01"
                      name="weeklyRate"
                      value={formData.weeklyRate}
                      onChange={handleChange}
                      placeholder="150.00"
                      required
                      disabled={loading || success}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Deposit Amount (£)</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.01"
                      name="depositAmount"
                      value={formData.depositAmount}
                      onChange={handleChange}
                      placeholder="300.00"
                      disabled={loading || success}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* HIRE PERIOD SECTION */}
          <Card className="mb-4 shadow">
            <Card.Header className="bg-light">
              <h5 className="mb-0">3. Hire Period</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Date Out *</Form.Label>
                    <Form.Control
                      type="date"
                      name="dateOut"
                      value={formData.dateOut}
                      onChange={handleChange}
                      required
                      disabled={loading || success}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Due Date In*</Form.Label>
                    <Form.Control
                      type="date"
                      name="dueDateIn"
                      required
                      value={formData.dueDateIn}
                      onChange={handleChange}
                      disabled={loading || success}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Date In</Form.Label>
                    <Form.Control
                      type="date"
                      name="dateIn"
                      value={formData.dateIn}
                      onChange={handleChange}
                      disabled={loading || success}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* VEHICLE CONDITION SECTION */}
          <Card className="mb-4 shadow">
            <Card.Header className="bg-light">
              <h5 className="mb-0">4. Vehicle Condition</h5>
            </Card.Header>
            <Card.Body>
              <p className="small text-muted mb-3">
                KEY: Major Damage · Dent · Scratch · Missing · Chip
              </p>

              <Row className="mb-3">
                <Col md={6}>
                  <div className="mb-3">
                    <h6 className="fw-bold">Check-Out Damage</h6>
                    
                    {/* Checkboxes for Check-Out */}
                    <div className="border p-3 mb-3 bg-light rounded">
                      <div className="row">
                        <Col md={6}>
                          <Form.Check
                            type="checkbox"
                            id="damageOutMajorDamage"
                            name="damageOutMajorDamage"
                            label="Major Damage"
                            checked={formData.damageOutMajorDamage}
                            onChange={handleChange}
                            disabled={loading || success}
                            className="mb-2"
                          />
                          <Form.Check
                            type="checkbox"
                            id="damageOutDent"
                            name="damageOutDent"
                            label="Dent"
                            checked={formData.damageOutDent}
                            onChange={handleChange}
                            disabled={loading || success}
                            className="mb-2"
                          />
                          <Form.Check
                            type="checkbox"
                            id="damageOutScratch"
                            name="damageOutScratch"
                            label="Scratch"
                            checked={formData.damageOutScratch}
                            onChange={handleChange}
                            disabled={loading || success}
                            className="mb-2"
                          />
                        </Col>
                        <Col md={6}>
                          <Form.Check
                            type="checkbox"
                            id="damageOutMissing"
                            name="damageOutMissing"
                            label="Missing"
                            checked={formData.damageOutMissing}
                            onChange={handleChange}
                            disabled={loading || success}
                            className="mb-2"
                          />
                          <Form.Check
                            type="checkbox"
                            id="damageOutChip"
                            name="damageOutChip"
                            label="Chip"
                            checked={formData.damageOutChip}
                            onChange={handleChange}
                            disabled={loading || success}
                            className="mb-2"
                          />
                        </Col>
                      </div>
                    </div>
                    
                    {/* Text area for Check-Out */}
                    <Form.Group>
                      <Form.Label>Detailed Notes (Check-Out)</Form.Label>
                      <Form.Control
                        as="textarea"
                        name="damageOut"
                        value={formData.damageOut}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Note any existing damage with details..."
                        disabled={loading || success}
                      />
                    </Form.Group>
                  </div>
                </Col>
                
                <Col md={6}>
                  <div className="mb-3">
                    <h6 className="fw-bold">Check-In Damage</h6>
                    
                    {/* Checkboxes for Check-In */}
                    <div className="border p-3 mb-3 bg-light rounded">
                      <div className="row">
                        <Col md={6}>
                          <Form.Check
                            type="checkbox"
                            id="damageInMajorDamage"
                            name="damageInMajorDamage"
                            label="Major Damage"
                            checked={formData.damageInMajorDamage}
                            onChange={handleChange}
                            disabled={loading || success}
                            className="mb-2"
                          />
                          <Form.Check
                            type="checkbox"
                            id="damageInDent"
                            name="damageInDent"
                            label="Dent"
                            checked={formData.damageInDent}
                            onChange={handleChange}
                            disabled={loading || success}
                            className="mb-2"
                          />
                          <Form.Check
                            type="checkbox"
                            id="damageInScratch"
                            name="damageInScratch"
                            label="Scratch"
                            checked={formData.damageInScratch}
                            onChange={handleChange}
                            disabled={loading || success}
                            className="mb-2"
                          />
                        </Col>
                        <Col md={6}>
                          <Form.Check
                            type="checkbox"
                            id="damageInMissing"
                            name="damageInMissing"
                            label="Missing"
                            checked={formData.damageInMissing}
                            onChange={handleChange}
                            disabled={loading || success}
                            className="mb-2"
                          />
                          <Form.Check
                            type="checkbox"
                            id="damageInChip"
                            name="damageInChip"
                            label="Chip"
                            checked={formData.damageInChip}
                            onChange={handleChange}
                            disabled={loading || success}
                            className="mb-2"
                          />
                        </Col>
                      </div>
                    </div>
                    
                    {/* Text area for Check-In */}
                    <Form.Group>
                      <Form.Label>Detailed Notes (Check-In)</Form.Label>
                      <Form.Control
                        as="textarea"
                        name="damageIn"
                        value={formData.damageIn}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Note any new damage with details..."
                        disabled={loading || success}
                      />
                    </Form.Group>
                  </div>
                </Col>
              </Row>

              {/* Summary Table */}
              <Table bordered size="sm" className="mt-3">
                <thead>
                  <tr>
                    <th>Damage Type</th>
                    <th>Check-Out</th>
                    <th>Check-In</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Major Damage</td>
                    <td>{formData.damageOutMajorDamage ? '✓' : '✗'}</td>
                    <td>{formData.damageInMajorDamage ? '✓' : '✗'}</td>
                  </tr>
                  <tr>
                    <td>Dent</td>
                    <td>{formData.damageOutDent ? '✓' : '✗'}</td>
                    <td>{formData.damageInDent ? '✓' : '✗'}</td>
                  </tr>
                  <tr>
                    <td>Scratch</td>
                    <td>{formData.damageOutScratch ? '✓' : '✗'}</td>
                    <td>{formData.damageInScratch ? '✓' : '✗'}</td>
                  </tr>
                  <tr>
                    <td>Missing</td>
                    <td>{formData.damageOutMissing ? '✓' : '✗'}</td>
                    <td>{formData.damageInMissing ? '✓' : '✗'}</td>
                  </tr>
                  <tr>
                    <td>Chip</td>
                    <td>{formData.damageOutChip ? '✓' : '✗'}</td>
                    <td>{formData.damageInChip ? '✓' : '✗'}</td>
                  </tr>
                  <tr>
                    <td>Detailed Notes</td>
                    <td>{formData.damageOut || 'None'}</td>
                    <td>{formData.damageIn || 'None'}</td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          {/* ACCEPTANCE SECTION */}
          <Card className="mb-4 shadow">
            <Card.Header className="bg-light">
              <h5 className="mb-0">5. Acceptance of Terms & Conditions</h5>
            </Card.Header>
            <Card.Body>
              <Alert variant="info" className="small">
                <p className="mb-2">
                  <strong>I accept full responsibility and agree to pay on demand for:</strong>
                </p>
                <ul className="mb-0">
                  <li>(i) any additional damage whatsoever</li>
                  <li>(ii) any policy excess applicable up to £15,000.00</li>
                  <li>(iii) any fuel required</li>
                  <li>(iv) valeting charge as required</li>
                </ul>
              </Alert>

              <Row>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Print Name</Form.Label>
                    <Form.Control
                      type="text"
                      name="printName"
                      value={formData.printName}
                      onChange={handleChange}
                      placeholder="John Smith"
                      disabled={loading || success}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Date*</Form.Label>
                    <Form.Control
                      type="date"
                      name="acceptDate"
                      value={formData.acceptDate}
                      required
                      onChange={handleChange}
                      disabled={loading || success}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Signature</Form.Label>
                    <div className="border rounded p-3 bg-light text-center">
                      <small className="text-muted">Signature will be collected electronically when assigned to driver</small>
                    </div>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* PREVIEW CARD */}
          <Card className="mb-4 border-info">
            <Card.Header className="bg-info text-white">
              <h5 className="mb-0">Preview Generated Agreement</h5>
            </Card.Header>
            <Card.Body>
              <div className="border p-3 bg-light" style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '12px' }}>
                {generateAgreementContent()}
              </div>
              <Form.Text className="text-muted mt-2">
                This preview shows how the agreement will look. The full terms and conditions will be included.
              </Form.Text>
            </Card.Body>
          </Card>

          {/* ACTION BUTTONS */}
          <div className="d-flex justify-content-between border-top pt-4">
            <Button
              variant="outline-secondary"
              onClick={() => router.push('/agreements')}
              disabled={loading || success}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              disabled={loading || success || !formData.driverId || !formData.vehicleId}
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Creating Agreement...
                </>
              ) : success ? (
                <>
                  <Spinner animation="grow" size="sm" variant="light" className="me-2" />
                  Success! Redirecting...
                </>
              ) : (
                <>
                  <Save className="me-2" />
                  Create Draft Agreement
                </>
              )}
            </Button>
          </div>
        </Form>

        <Alert variant="info" className="mt-4">
          <h5>💡 How This Works:</h5>
          <ol className="mb-0 mt-2">
            <li><strong>Select a driver</strong> from dropdown - it will auto-fill customer details</li>
            <li><strong>Select a vehicle</strong> from dropdown - it will auto-fill vehicle details</li>
            <li>Fill in hire period and vehicle condition</li>
            <li>Click "Create Draft Agreement" to save as draft</li>
            <li>Go to Agreements list → find your draft</li>
            <li>Driver receives the agreement for electronic signature</li>
            <li>Once signed, agreement becomes active</li>
          </ol>
        </Alert>
      </Container>
    </>
  );
}