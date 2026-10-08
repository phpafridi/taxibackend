// app/agreements/create-insurance/page.tsx
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
  Spinner
} from 'react-bootstrap';
import { FileCheck, Save, ArrowLeft } from 'react-bootstrap-icons';
import { toast } from 'sonner';
import Confetti from 'react-confetti';

interface Driver {
  id: number;
  name: string;
  dob?: string;
  address?: string;
  postcode?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  phone?: string;
  email?: string;
}

interface Vehicle {
  id: number;
  registration: string;
  make: string;
  model: string;
  year?: string;
  bodyType?: string;
}

export default function CreateInsuranceCertificatePage() {
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
    type: 'INSURANCE_CERTIFICATE',
    title: '',
    driverId: '',  // NEW: For driver dropdown
    vehicleId: '', // NEW: For vehicle dropdown
    date: new Date().toISOString().split('T')[0],
    insuranceNumber: '',
    hireStart: '',
    hireEnd: '',
    insuranceCertificate: 'Insurance Certificate / Use Agreement',
    contactPhone: '07984650186',
    contactEmail: 'atanveer@hotmail.co.uk',
    vehicleMake: '',
    vehicleModel: '',
    registration: '',
    driverName: '',
    licenseNumber: '',
    printName: '',
    terms: `To Whom it May Concern,

We confirm that the below vehicle can be used for the carriage of passengers
for hire and reward by prior appointment (private hire), also food and parcel deliveries.

We authorise and give permission to the following individual to use the vehicle
for ALL private hire appointments, including any trips taken through
the Uber and Bolt platform, also food and delivery services operated through the Uber and Bolt platform.

Regards,`
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
        const response = await fetch('/api/drivers/insurance-driver');

        if (!response.ok) {
          throw new Error(`Failed to fetch drivers: ${response.status}`);
        }

        const driversData = await response.json();

        // Transform API response to match Driver interface
        const driverOptions = driversData.map((driver: any) => {
          return {
            id: driver.id, // User ID
            name: driver.name || `Driver ${driver.id}`,
            dob: driver.driverProfile?.dob || '',
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
        const response = await fetch('/api/cars/insurance-cars');
        const data = await response.json();

        if (data.success && data.data) {
          const vehicleOptions = data.data.map((car: any) => ({
            id: car.id,
            registration: car.registration,
            make: car.make,
            model: car.model,
            year: car.year,
            bodyType: car.bodyType,
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
    const { name, value } = e.target;

    setFormData(prevData => {
      const updatedData = { ...prevData, [name]: value };

      // Auto-fill driver details when driver is selected
      if (name === 'driverId' && value) {
        const selectedDriver = drivers.find(driver => driver.id === parseInt(value));
        if (selectedDriver) {
          return {
            ...updatedData,
            driverName: selectedDriver.name || '',
            licenseNumber: selectedDriver.licenseNumber || '',
            phone: selectedDriver.phone || '',
            email: selectedDriver.email || '',
            title: prevData.title || `Insurance Certificate - ${selectedDriver.name}`,
            printName: selectedDriver.name || '',
          };
        }
      }

      // Auto-fill vehicle details when vehicle is selected
      if (name === 'vehicleId' && value) {
        const selectedVehicle = vehicles.find(vehicle => vehicle.id === parseInt(value));
        if (selectedVehicle) {
          return {
            ...updatedData,
            vehicleMake: selectedVehicle.make || '',
            vehicleModel: selectedVehicle.model || '',
            registration: selectedVehicle.registration || '',
          };
        }
      }

      return updatedData;
    });
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

  const generateInsuranceCertificateContent = () => {
    return `INSURANCE CERTIFICATE / USE AGREEMENT

Date: ${formData.date}

To Whom it May Concern,

We confirm that the below vehicle can be used for the carriage of passengers
for hire and reward by prior appointment (private hire), also food and parcel
deliveries as specified on our insurance policy.

We authorise and give permission to the following individual to use the vehicle
for ALL private hire appointments, including any trips taken through
the Uber and Bolt platform, also food and delivery services operated through the Uber and Bolt platform.

Regards,

insurance Number: ${formData.insuranceNumber}
HIRE START DATE: ${formData.hireStart}
HIRE END DATE: ${formData.hireEnd}

INSURANCE CERTIFICATE / USE AGREEMENT: ${formData.insuranceCertificate}

CONTACT:
${formData.contactPhone}
${formData.contactEmail}

VEHICLE DETAILS:
Make: ${formData.vehicleMake}
Model: ${formData.vehicleModel}
Registration: ${formData.registration}

DRIVER DETAILS:
Driver Name: ${formData.driverName}
Driving Licence Number: ${formData.licenseNumber}

ACCEPTANCE:
Print Name: ${formData.printName}
Date: ${formData.date}`;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    setShowConfetti(false);

    // Validate required fields
    if (!formData.driverId || !formData.vehicleId) {
      toast.error("Please select both a driver and a vehicle");
      playErrorSound();
      setLoading(false);
      return;
    }

    const payload = {
      type: formData.type,
      title: formData.title || `Insurance Certificate - ${formData.driverName || 'Draft'}`,
      content: generateInsuranceCertificateContent(),
      terms: formData.terms,
      insuranceNumber:formData.insuranceNumber,
      weeklyRate: null,
      depositAmount: null,
      driverId: formData.driverId,  // Send driver ID
      vehicleId: formData.vehicleId, // Send vehicle ID
      startDate : formData.hireStart, 
      endDate : formData.hireEnd,
    };



    try {
      const response = await fetch('/api/agreements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
     

      if (response.ok) { 
        toast.success('✅ Insurance Certificate created successfully!', {
          duration: 5000,
          description: `Certificate "${formData.title}" has been saved as draft.`,
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
            type: 'INSURANCE_CERTIFICATE',
            title: '',
            driverId: '',
            vehicleId: '',
            date: new Date().toISOString().split('T')[0],
            insuranceNumber: '',
            hireStart: '',
            hireEnd: '',
            insuranceCertificate: 'Insurance Certificate / Use Agreement',
            contactPhone: '07984650186',
            contactEmail: 'atanveer@hotmail.co.uk',
            vehicleMake: '',
            vehicleModel: '',
            registration: '',
            driverName: '',
            licenseNumber: '',
            printName: '',
            terms: formData.terms
          });
          
          // Redirect to agreements list after 4 seconds
          setTimeout(() => {
            router.push('/agreements');
          }, 4000);
        }, 1000);
      } else {
        const errorMsg = data.error || data.details || '❌ Failed to create insurance certificate';
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
              <FileCheck className="me-2" />
              Create Insurance Certificate
            </h1>
            <p className="text-muted mb-0">Create insurance certificate/use agreement for Uber and bolt/private hire</p>
          </div>
        </div>

        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" className="mb-4">
            <Alert.Heading>🎉 Certificate Created Successfully!</Alert.Heading>
            <p>
              Your insurance certificate "<strong>{formData.title}</strong>" has been created.
              You will be redirected to the agreements list in a moment...
            </p>
            <div className="d-flex align-items-center mt-2">
              <Spinner animation="grow" size="sm" variant="success" className="me-2" />
              <span>Preparing to redirect...</span>
            </div>
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Card className="mb-4 shadow">
            <Card.Header className="bg-dark text-warning">
              <h5 className="mb-0">Certificate Details</h5>
            </Card.Header>
            <Card.Body>
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Certificate Title *</Form.Label>
                    <Form.Control
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="e.g., Insurance Certificate for John Smith"
                      required
                      disabled={loading || success}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Date *</Form.Label>
                    <Form.Control
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      required
                      disabled={loading || success}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* DRIVER DETAILS WITH DROPDOWN */}
          <Card className="mb-4 shadow">
            <Card.Header className="bg-light">
              <h5 className="mb-0">1. Driver Details</h5>
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
                    <Form.Label>Driver Name *</Form.Label>
                    <Form.Control
                      type="text"
                      name="driverName"
                      value={formData.driverName}
                      onChange={handleChange}
                      placeholder="John Smith"
                      required
                      disabled={loading || success}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Driving Licence Number</Form.Label>
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

          {/* VEHICLE DETAILS WITH DROPDOWN */}
          <Card className="mb-4 shadow">
            <Card.Header className="bg-light">
              <h5 className="mb-0">2. Vehicle Details</h5>
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
                <Col md={6}>
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
                <Col md={6}>
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
              </Row>
            </Card.Body>
          </Card>

          {/* ADDRESS SECTION */}
          <Card className="mb-4 shadow">
            <Card.Header className="bg-light">
              <h5 className="mb-0">3. insurance Number</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={12}>
                  <Form.Group>
                    <Form.Label>insurance Number</Form.Label>
                    <Form.Control
                      type="text"
                      name="insuranceNumber"
                      value={formData.insuranceNumber}
                      onChange={handleChange}
                      placeholder="insuranceNumber"
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
              <h5 className="mb-0">4. Hire Period</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Hire Start Date *</Form.Label>
                    <Form.Control
                      type="date"
                      name="hireStart"
                      value={formData.hireStart}
                      onChange={handleChange}
                      required
                      disabled={loading || success}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Hire End Date*</Form.Label>
                    <Form.Control
                      type="date"
                      name="hireEnd"
                      required
                      value={formData.hireEnd}
                      onChange={handleChange}
                      disabled={loading || success}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* CONTACT DETAILS */}
          <Card className="mb-4 shadow">
            <Card.Header className="bg-light">
              <h5 className="mb-0">5. Contact Details</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Contact Phone</Form.Label>
                    <Form.Control
                      type="text"
                      name="contactPhone"
                      value={formData.contactPhone}
                      onChange={handleChange}
                      disabled={loading || success}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Contact Email</Form.Label>
                    <Form.Control
                      type="email"
                      name="contactEmail"
                      value={formData.contactEmail}
                      onChange={handleChange}
                      disabled={loading || success}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* ACCEPTANCE SECTION */}
          <Card className="mb-4 shadow">
            <Card.Header className="bg-light">
              <h5 className="mb-0">6. Acceptance</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Print Name</Form.Label>
                    <Form.Control
                      type="text"
                      name="printName"
                      value={formData.printName}
                      onChange={handleChange}
                      placeholder="Authorized Signatory"
                      disabled={loading || success}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Certificate Type</Form.Label>
                    <Form.Control
                      type="text"
                      name="insuranceCertificate"
                      value={formData.insuranceCertificate}
                      onChange={handleChange}
                      disabled={loading || success}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Signature</Form.Label>
                    <div className="border rounded p-3 bg-light text-center">
                      <small className="text-muted">To be completed when assigned</small>
                    </div>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* PREVIEW */}
          <Card className="mb-4 border-info">
            <Card.Header className="bg-info text-white">
              <h5 className="mb-0">Preview Certificate</h5>
            </Card.Header>
            <Card.Body>
              <div className="border p-3 bg-light" style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '12px' }}>
                {generateInsuranceCertificateContent()}
              </div>
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
                  Creating Certificate...
                </>
              ) : success ? (
                <>
                  <Spinner animation="grow" size="sm" variant="light" className="me-2" />
                  Success! Redirecting...
                </>
              ) : (
                <>
                  <Save className="me-2" />
                  Create Insurance Certificate
                </>
              )}
            </Button>
          </div>
        </Form>

        <Alert variant="info" className="mt-4">
          <h5>💡 About Insurance Certificate:</h5>
          <ul className="mb-0 mt-2">
            <li>This certificate authorizes vehicle use for private hire, Uber,Bolt and deliveries</li>
            <li>Creates a 2-page document for records</li>
            <li>Can be assigned to drivers for electronic signature</li>
            <li>Required for Uber,Bolt/private hire platform verification</li>
          </ul>
        </Alert>
      </Container>
    </>
  );
}