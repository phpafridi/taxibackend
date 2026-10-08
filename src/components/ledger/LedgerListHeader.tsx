"use client";

import { useState, useEffect } from "react";
import {
  Button, Col, Row, Form, InputGroup, Modal, Badge, Spinner,
} from "react-bootstrap";
import { ArrowDownCircle, ArrowUpCircle, CarFront, Person } from "react-bootstrap-icons";
import { toast } from "sonner";
import Confetti from "react-confetti";

interface Car {
  id: number;
  registration: string;
  make: string;
  model: string;
  driverProfileId: number | null;
}

interface Driver {
  id: number;
  name: string;
}

const ledgerCategories = [
  { value: "WEEKLY_INCOME",               label: "Weekly Rent" },
  { value: "MAINTENANCE_EXPENSE",         label: "Maintenance Expense" },
  { value: "MAINTENANCE_REIMBURSEMENT",   label: "Maintenance Reimbursement" },
  { value: "INSURANCE",                   label: "Insurance Payment" },
  { value: "INSURANCE_DRIVER_PAYMENT",    label: "Insurance Driver Payment" },
  { value: "CAR_PURCHASE",                label: "Car Purchase" },
  { value: "DEPOSIT",                     label: "Deposit" },
  { value: "REFUND",                      label: "Refund" },
  { value: "FINE",                        label: "Fine" },
  { value: "ADJUSTMENT",                  label: "Adjustment" },
  { value: "OTHER",                       label: "Other" },
];

const emptyForm = {
  direction: "CREDIT" as "CREDIT" | "DEBIT",
  ownerType: "DRIVER",
  driverId: "",
  carId: "",
  category: "WEEKLY_INCOME",
  amount: "",
  paymentMethod: "CASH",
  paymentDate: new Date().toISOString().split("T")[0],
  description: "",
  referenceId: "",
  referenceType: "",
};

const LedgerListHeader = () => {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cars, setCars]       = useState<Car[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [form, setForm]       = useState(emptyForm);
  const [errors, setErrors]   = useState<Record<string, string>>({});

  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize]     = useState({ width: 0, height: 0 });
  const [isClient, setIsClient]         = useState(false);

  useEffect(() => {
    setIsClient(true);
    const handleResize = () =>
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchResources = async () => {
    setResourcesLoading(true);
    try {
      const res  = await fetch("/api/ledger/resources");
      const data = await res.json();
      if (data.success) {
        setCars(data.data.cars || []);
        setDrivers(data.data.drivers || []);
      }
    } catch {
      toast.error("Failed to load drivers and cars");
    } finally {
      setResourcesLoading(false);
    }
  };

  const openModal = (direction: "CREDIT" | "DEBIT") => {
    setForm({ ...emptyForm, direction });
    setErrors({});
    setShowModal(true);
    fetchResources();
  };

  const closeModal = () => {
    setShowModal(false);
    setErrors({});
  };

  const handleDriverChange = (driverId: string) => {
    const assignedCar = cars.find(
      (c) => c.driverProfileId !== null && c.driverProfileId === parseInt(driverId)
    );
    setForm((prev) => ({
      ...prev,
      driverId,
      carId: assignedCar ? String(assignedCar.id) : "",
    }));
  };

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.amount || parseFloat(form.amount) <= 0) e.amount = "Enter a valid amount";
    if (!form.category)    e.category    = "Select a category";
    if (!form.description.trim()) e.description = "Description is required";
    if (form.ownerType === "DRIVER" && !form.driverId) e.driverId = "Select a driver";
    if (!form.carId)       e.carId       = "Select a car";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      toast.error("Please fix the errors below");
      return;
    }

    setLoading(true);
    const payload: any = {
      direction:     form.direction,
      ownerType:     form.ownerType,
      carId:         parseInt(form.carId),
      category:      form.category,
      amount:        parseFloat(form.amount),
      paymentMethod: form.paymentMethod,
      paymentDate:   form.paymentDate,
      description:   form.description.trim(),
      status:        "ACCEPT",
      ...(form.referenceId   && { referenceId:   parseInt(form.referenceId) }),
      ...(form.referenceType && { referenceType: form.referenceType }),
    };

    if (form.ownerType === "DRIVER") {
      payload.driverId = parseInt(form.driverId); // driverProfile.id — API resolves ownerId from this
    } else {
      payload.ownerId = 1;
    }

    try {
      const res  = await fetch("/api/ledger", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Failed to save transaction");
        return;
      }

      toast.success("Transaction added successfully");
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
      closeModal();
      window.dispatchEvent(new Event("ledgerUpdated"));
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  const availableCars = form.ownerType === "DRIVER" && form.driverId
    ? cars.filter(
        (c) =>
          c.driverProfileId === parseInt(form.driverId) ||
          c.driverProfileId === null
      )
    : cars;

  const selectedDriver = drivers.find((d) => String(d.id) === form.driverId);
  const selectedCar    = cars.find((c) => String(c.id) === form.carId);

  const isPaymentIn = form.direction === "CREDIT";

  return (
    <>
      {showConfetti && isClient && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={200}
          gravity={0.1}
        />
      )}

      {/* Header */}
      <Row className="mb-4 align-items-center">
        <Col>
          <h2 className="mb-1">Ledger Management</h2>
          <p className="text-muted mb-0">Record payments and add charges for drivers</p>
        </Col>
        <Col xs="auto">
          <div className="d-flex gap-2">
            <Button
              variant="success"
              onClick={() => openModal("CREDIT")}
              className="d-flex align-items-center gap-2"
            >
              <ArrowDownCircle size={16} />
              <span>Record Payment</span>
            </Button>
            <Button
              variant="danger"
              onClick={() => openModal("DEBIT")}
              className="d-flex align-items-center gap-2"
            >
              <ArrowUpCircle size={16} />
              <span>Add Charge</span>
            </Button>
          </div>
        </Col>
      </Row>

      {/* Modal */}
      <Modal show={showModal} onHide={closeModal} centered size="lg" scrollable>
        <Modal.Header
          closeButton
          style={{
            background: isPaymentIn
              ? "linear-gradient(135deg, #198754 0%, #20c997 100%)"
              : "linear-gradient(135deg, #dc3545 0%, #fd7e14 100%)",
            color: "#fff",
            borderBottom: "none",
          }}
        >
          <Modal.Title className="d-flex align-items-center gap-2 text-white">
            {isPaymentIn ? (
              <>
                <ArrowDownCircle size={20} />
                <div>
                  <div className="fw-bold">Record Payment</div>
                  <small className="opacity-75 fw-normal" style={{ fontSize: "0.8rem" }}>
                    Money coming in — driver paid rent, deposit, etc.
                  </small>
                </div>
              </>
            ) : (
              <>
                <ArrowUpCircle size={20} />
                <div>
                  <div className="fw-bold">Add Charge</div>
                  <small className="opacity-75 fw-normal" style={{ fontSize: "0.8rem" }}>
                    Money owed — fine, maintenance, insurance, etc.
                  </small>
                </div>
              </>
            )}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {resourcesLoading ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" className="me-2" />
              Loading...
            </div>
          ) : (
            <Form onSubmit={handleSubmit} noValidate id="ledger-form">

              {/* Step 1 — Who */}
              <div className="mb-4">
                <div className="text-muted small fw-semibold text-uppercase mb-2" style={{ letterSpacing: ".05em" }}>
                  Step 1 — Who is this for?
                </div>
                <Row className="g-3">
                  <Col xs={12} md={4}>
                    <Form.Group>
                      <Form.Label>Account type</Form.Label>
                      <Form.Select
                        value={form.ownerType}
                        onChange={(e) => {
                          setForm((prev) => ({ ...prev, ownerType: e.target.value, driverId: "", carId: "" }));
                        }}
                      >
                        <option value="DRIVER">Driver</option>
                        <option value="OWNER">Owner</option>
                        <option value="COMPANY">Company</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  {form.ownerType === "DRIVER" && (
                    <Col xs={12} md={8}>
                      <Form.Group>
                        <Form.Label>Select driver</Form.Label>
                        <Form.Select
                          value={form.driverId}
                          onChange={(e) => handleDriverChange(e.target.value)}
                          isInvalid={!!errors.driverId}
                        >
                          <option value="">— choose a driver —</option>
                          {drivers.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">{errors.driverId}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  )}
                </Row>

                {selectedDriver && (
                  <div className="mt-2 d-flex align-items-center gap-2">
                    <Person size={14} className="text-muted" />
                    <small className="text-muted">Driver: <strong>{selectedDriver.name}</strong></small>
                  </div>
                )}
              </div>

              {/* Step 2 — Which car */}
              <div className="mb-4">
                <div className="text-muted small fw-semibold text-uppercase mb-2" style={{ letterSpacing: ".05em" }}>
                  Step 2 — Which car?
                </div>
                <Form.Group>
                  <Form.Select
                    value={form.carId}
                    onChange={(e) => set("carId", e.target.value)}
                    isInvalid={!!errors.carId}
                  >
                    <option value="">— select a car —</option>
                    {availableCars.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.registration} — {c.make} {c.model}
                        {c.driverProfileId === parseInt(form.driverId) ? " ✓ assigned" : ""}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">{errors.carId}</Form.Control.Feedback>
                  {selectedCar && (
                    <div className="mt-1 d-flex align-items-center gap-2">
                      <CarFront size={13} className="text-muted" />
                      <small className="text-muted">
                        Car: <strong>{selectedCar.registration}</strong> — {selectedCar.make} {selectedCar.model}
                        {selectedCar.driverProfileId === parseInt(form.driverId) && (
                          <Badge bg="success" className="ms-2" style={{ fontSize: "0.7rem" }}>Auto-selected</Badge>
                        )}
                      </small>
                    </div>
                  )}
                </Form.Group>
              </div>

              {/* Step 3 — Transaction details */}
              <div className="mb-4">
                <div className="text-muted small fw-semibold text-uppercase mb-2" style={{ letterSpacing: ".05em" }}>
                  Step 3 — Transaction details
                </div>
                <Row className="g-3">
                  <Col xs={12} md={6}>
                    <Form.Group>
                      <Form.Label>Category</Form.Label>
                      <Form.Select
                        value={form.category}
                        onChange={(e) => set("category", e.target.value)}
                        isInvalid={!!errors.category}
                      >
                        {ledgerCategories.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">{errors.category}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>

                  <Col xs={12} md={6}>
                    <Form.Group>
                      <Form.Label>Amount</Form.Label>
                      <InputGroup>
                        <InputGroup.Text>£</InputGroup.Text>
                        <Form.Control
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          value={form.amount}
                          onChange={(e) => set("amount", e.target.value)}
                          isInvalid={!!errors.amount}
                        />
                        <Form.Control.Feedback type="invalid">{errors.amount}</Form.Control.Feedback>
                      </InputGroup>
                    </Form.Group>
                  </Col>

                  <Col xs={12}>
                    <Form.Group>
                      <Form.Label>Description</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        placeholder={
                          isPaymentIn
                            ? "e.g. Weekly rent payment for this week"
                            : "e.g. PCN fine received on 20 May"
                        }
                        value={form.description}
                        onChange={(e) => set("description", e.target.value)}
                        maxLength={500}
                        isInvalid={!!errors.description}
                      />
                      <Form.Control.Feedback type="invalid">{errors.description}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>
              </div>

              {/* Step 4 — Payment info */}
              <div className="mb-2">
                <div className="text-muted small fw-semibold text-uppercase mb-2" style={{ letterSpacing: ".05em" }}>
                  Step 4 — Payment info
                </div>
                <Row className="g-3">
                  <Col xs={12} md={6}>
                    <Form.Group>
                      <Form.Label>Payment method</Form.Label>
                      <Form.Select value={form.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)}>
                        <option value="CASH">Cash</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="CARD">Card</option>
                        <option value="CHEQUE">Cheque</option>
                        <option value="OTHER">Other</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col xs={12} md={6}>
                    <Form.Group>
                      <Form.Label>Date</Form.Label>
                      <Form.Control
                        type="date"
                        value={form.paymentDate}
                        onChange={(e) => set("paymentDate", e.target.value)}
                        max={new Date().toISOString().split("T")[0]}
                      />
                    </Form.Group>
                  </Col>

                  <Col xs={12} md={6}>
                    <Form.Group>
                      <Form.Label>Reference <span className="text-muted">(optional)</span></Form.Label>
                      <Form.Control
                        placeholder="e.g. invoice number"
                        value={form.referenceType}
                        onChange={(e) => set("referenceType", e.target.value)}
                        maxLength={100}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </div>

            </Form>
          )}
        </Modal.Body>

        <Modal.Footer className="justify-content-between">
          <Button variant="outline-secondary" onClick={closeModal} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="ledger-form"
            variant={isPaymentIn ? "success" : "danger"}
            disabled={loading || resourcesLoading}
            style={{ minWidth: 180 }}
            className="d-flex align-items-center gap-2"
          >
            {loading ? (
              <><Spinner animation="border" size="sm" />Saving...</>
            ) : isPaymentIn ? (
              <><ArrowDownCircle size={16} />Save Payment</>
            ) : (
              <><ArrowUpCircle size={16} />Save Charge</>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default LedgerListHeader;
