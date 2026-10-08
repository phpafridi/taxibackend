// components/agreements/AgreementListHeader.tsx
"use client";

import { useState } from "react";
import { Row, Col, Button, Modal, Form, Spinner, Nav, Dropdown } from "react-bootstrap";
import { Plus as IconPlus, FileText, FileCheck } from "react-bootstrap-icons";
import Flex from "../common/Flex";
import DasherBreadcrumb from "../common/DasherBreadcrumb";
import { toast } from "sonner";
import Confetti from "react-confetti";
import { useRouter } from "next/navigation";

const AgreementListHeader = () => {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'HIRE_AGREEMENT' | 'INSURANCE_CERTIFICATE'>('HIRE_AGREEMENT');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    terms: '',
    weeklyRate: '',
    depositAmount: '',
    // Insurance specific fields
    date: new Date().toISOString().split('T')[0],
    address: '',
    hireStart: '',
    hireEnd: '',
    vehicleMake: '',
    vehicleModel: '',
    registration: '',
    driverName: '',
    licenseNumber: '',
    printName: '',
  });

  const openModal = (type: 'HIRE_AGREEMENT' | 'INSURANCE_CERTIFICATE') => {
    setModalType(type);
    setFormData({
      title: '',
      content: '',
      terms: type === 'HIRE_AGREEMENT' ? `1. I accept full responsibility and agree to pay on demand for:
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
   and legal fees.` : `To Whom it May Concern,

We confirm that the below vehicle can be used for the carriage of passengers
for hire and reward by prior appointment (private hire), also food and parcel deliveries.

We authorise and give permission to the following individual to use the vehicle
for ALL private hire appointments, including any trips taken through
the Uber and Bolt platform, also food and delivery services operated through the Uber and Bolt platform.

Regards,`,
      weeklyRate: '',
      depositAmount: '',
      date: new Date().toISOString().split('T')[0],
      address: '',
      hireStart: '',
      hireEnd: '',
      vehicleMake: '',
      vehicleModel: '',
      registration: '',
      driverName: '',
      licenseNumber: '',
      printName: '',
    });
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const generateHireAgreementContent = () => {
    return `HIRE AGREEMENT
Non Regulated – 12 Months

CONTACT DETAILS
Phone: 07904388925
Email: rsprivatehireltd@gmail.com

1. CUSTOMER DETAILS
   Full Name: [To be assigned]
   Date of Birth: [To be assigned]
   Address: [To be assigned]
   Postcode: [To be assigned]
   Driver's License Number: [To be assigned]
   License Expiry Date: [To be assigned]

2. VEHICLE RATES & DETAILS
   Vehicle Make: [To be assigned]
   Vehicle Model: [To be assigned]
   Registration: [To be assigned]
   Type of Body: [To be assigned]
   Weekly Rate: £${formData.weeklyRate || '0.00'}
   Deposit: £${formData.depositAmount || '0.00'}

3. HIRE PERIOD
   Date Out: [To be assigned]
   Date In: [To be assigned]
   Due Date In: [To be assigned]

4. VEHICLE CONDITION – OUT
   Damage/Defects noted at check-out: [To be completed]
   KEY: Major Damage · Dent · Scratch · Missing · Chip

5. VEHICLE CONDITION – IN
   Damage/Defects noted at check-in: [To be completed]

6. ACCEPTANCE OF TERMS & CONDITIONS
   I, [Name Required], accept all terms and conditions as outlined in this agreement.
   Signature: _________________________
   Date: [To be assigned]`;
  };

  const generateInsuranceCertificateContent = () => {
    return `INSURANCE CERTIFICATE / USE AGREEMENT

Date: ${formData.date}

To Whom it May Concern,

We confirm that the below vehicle can be used for the carriage of passengers
for hire and reward by prior appointment (private hire), also food and parcel deliveries.

We authorise and give permission to the following individual to use the vehicle
for ALL private hire appointments, including any trips taken through
the Uber and Bolt platform, also food and delivery services operated through the Uber and Bolt platform.

Regards,

ADDRESS: ${formData.address || '[Address Required]'}
HIRE START DATE: ${formData.hireStart || '[Start Date Required]'}
HIRE END DATE: ${formData.hireEnd || '[End Date Required]'}

INSURANCE CERTIFICATE / USE AGREEMENT: Insurance Certificate / Use Agreement

CONTACT:
07984650186
atanveer@hotmail.co.uk

VEHICLE DETAILS:
Make: ${formData.vehicleMake || '[Make Required]'}
Model: ${formData.vehicleModel || '[Model Required]'}
Registration: ${formData.registration || '[Registration Required]'}

DRIVER DETAILS:
Driver Name: ${formData.driverName || '[Driver Name Required]'}
Driving Licence Number: ${formData.licenseNumber || '[Licence Required]'}

ACCEPTANCE:
Print Name: ${formData.printName || '[Print Name Required]'}
Signature: _________________________
Date: ${formData.date}`;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const content = modalType === 'HIRE_AGREEMENT' 
        ? generateHireAgreementContent()
        : generateInsuranceCertificateContent();

      const payload = {
        type: modalType,
        title: formData.title || `${modalType === 'HIRE_AGREEMENT' ? 'Hire Agreement' : 'Insurance Certificate'} - Draft`,
        content: content,
        terms: formData.terms,
        weeklyRate: modalType === 'HIRE_AGREEMENT' ? formData.weeklyRate || null : null,
        depositAmount: modalType === 'HIRE_AGREEMENT' ? formData.depositAmount || null : null,
      };

      const response = await fetch('/api/agreements/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create agreement');
      }

      // Success
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      toast.success(`${modalType === 'HIRE_AGREEMENT' ? 'Hire Agreement' : 'Insurance Certificate'} created successfully!`);
      
      const audio = new Audio("/notifications/sucess.wav");

      
      closeModal();
      
      // Redirect to agreements page
      setTimeout(() => {
        router.push('/agreements');
        router.refresh(); // Refresh to show new agreement
      }, 1000);

    } catch (error: any) {
      toast.error(`Failed to create agreement: ${error.message}`);
      const audio = new Audio("/notifications/error.wav");

    } finally {
      setLoading(false);
    }
  };

  const handleCreateFullPage = (type: 'HIRE_AGREEMENT' | 'INSURANCE_CERTIFICATE') => {
    if (type === 'HIRE_AGREEMENT') {
      router.push('/agreements/create-draft');
    } else {
      router.push('/agreements/create-insurance');
    }
  };

  return (
    <>
      {success && <Confetti/>}
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
              <h1 className="mb-3 h2">Agreements</h1>
              <DasherBreadcrumb />
            </div>

            <div className="d-flex gap-2">
              <Dropdown>
                <Dropdown.Toggle variant="primary" className="d-md-flex align-items-center gap-1">
                  <IconPlus size={18} />
                  Create New
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => handleCreateFullPage('HIRE_AGREEMENT')}>
                    <FileText className="me-2" />
                    Hire Agreement (Full Page)
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => handleCreateFullPage('INSURANCE_CERTIFICATE')}>
                    <FileCheck className="me-2" />
                    Insurance Certificate (Full Page)
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </Flex>
        </Col>
      </Row>

      {/* QUICK CREATE MODAL */}
      <Modal show={showModal} onHide={closeModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Create Draft {modalType === 'HIRE_AGREEMENT' ? 'Hire Agreement' : 'Insurance Certificate'}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Row className="mb-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Title *</Form.Label>
                  <Form.Control
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder={modalType === 'HIRE_AGREEMENT' ? "e.g., Standard Hire Agreement" : "e.g., Insurance Certificate for Uber"}
                    required
                    disabled={loading}
                  />
                </Form.Group>
              </Col>
            </Row>

            {modalType === 'HIRE_AGREEMENT' && (
              <>
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Weekly Rate (£)</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.01"
                        name="weeklyRate"
                        value={formData.weeklyRate}
                        onChange={handleChange}
                        placeholder="150.00"
                        disabled={loading}
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
                        disabled={loading}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </>
            )}

            {modalType === 'INSURANCE_CERTIFICATE' && (
              <>
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Date *</Form.Label>
                      <Form.Control
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        required
                        disabled={loading}
                      />
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
                        disabled={loading}
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
                        disabled={loading}
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
                        disabled={loading}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="mb-3">
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
                        disabled={loading}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Address</Form.Label>
                      <Form.Control
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Company Address"
                        disabled={loading}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </>
            )}

            <div className="d-grid">
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Creating...
                  </>
                ) : `Create ${modalType === 'HIRE_AGREEMENT' ? 'Hire Agreement' : 'Insurance Certificate'}`}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default AgreementListHeader;