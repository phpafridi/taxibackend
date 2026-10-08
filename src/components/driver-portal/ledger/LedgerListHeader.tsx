// components/driver-portal/ledger/LedgerListHeader.tsx
// Shows ALL admin categories; auto-creates driver ledger on admin approval
"use client";

import { useState, useEffect } from "react";
import { Button, Col, Row, Modal, Form, InputGroup, Spinner, Badge } from "react-bootstrap";
import { ArrowDownCircle, Calendar, CreditCard, Wrench, Tag, ArrowUpCircle, CarFront } from "react-bootstrap-icons";
import { toast } from "sonner";
import Confetti from "react-confetti";

interface Category {
  value: string;
  label: string;
  hasEntries: boolean;
}

const CATEGORY_DEFAULT_NOTES: Record<string, string> = {
  WEEKLY_INCOME: "Weekly rent payment",
  MAINTENANCE_EXPENSE: "Maintenance cost payment",
  MAINTENANCE_REIMBURSEMENT: "Maintenance reimbursement request",
  INSURANCE: "Insurance premium payment",
  INSURANCE_DRIVER_PAYMENT: "Insurance contribution payment",
  CAR_PURCHASE: "Car purchase payment",
  DEPOSIT: "Security deposit payment",
  REFUND: "Refund request",
  FINE: "Fine payment",
  ADJUSTMENT: "Balance adjustment",
  OTHER: "Payment",
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  WEEKLY_INCOME: <Calendar size={14} />,
  INSURANCE: <CreditCard size={14} />,
  INSURANCE_DRIVER_PAYMENT: <CreditCard size={14} />,
  MAINTENANCE_EXPENSE: <Wrench size={14} />,
  MAINTENANCE_REIMBURSEMENT: <Wrench size={14} />,
  FINE: <ArrowUpCircle size={14} />,
  DEPOSIT: <ArrowDownCircle size={14} />,
  REFUND: <ArrowDownCircle size={14} />,
};

const LedgerListHeaderDriver = () => {
  const [summary, setSummary] = useState({ totalCredit: 0, totalDebit: 0, netBalance: 0, totalEntries: 0 });
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [isClient, setIsClient] = useState(false);
  const [hasCar, setHasCar] = useState<boolean | null>(null); // null = loading

  useEffect(() => {
    setIsClient(true);
    const onResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    onResize();
    window.addEventListener("resize", onResize);
    fetchSummary();
    fetchCategories();
    fetchCarStatus();
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const fetchCarStatus = async () => {
    try {
      const res = await fetch("/api/driver-portal/profile");
      const data = await res.json();
      if (res.ok && data.success) {
        const cars = data.data?.driverprofile?.car || [];
        setHasCar(cars.length > 0);
      } else {
        setHasCar(false);
      }
    } catch {
      setHasCar(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch("/api/driver-portal/ledger");
      const data = await res.json();
      if (res.ok && data.statistics) setSummary(data.statistics);
    } catch {}
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/driver-portal/ledger/categories");
      const data = await res.json();
      if (res.ok && data.categories) {
        setCategories(data.categories);
        // Default to WEEKLY_INCOME if available
        const weekly = data.categories.find((c: Category) => c.value === "WEEKLY_INCOME");
        if (weekly) setCategory(weekly.value);
        else if (data.categories.length > 0) setCategory(data.categories[0].value);
      }
    } catch {}
  };

  const handleRecord = async () => {
    if (!amount || parseFloat(amount) <= 0) { toast.error("Enter a valid amount"); return; }
    if (!category) { toast.error("Select a category"); return; }
    if (!description.trim()) { toast.error("Enter a description"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/driver-portal/ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "CREDIT",
          amount: parseFloat(amount),
          category,
          description: description.trim(),
          paymentDate: new Date().toISOString().split("T")[0],
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      toast.success("Payment recorded — awaiting admin approval");
      setAmount(""); setDescription(""); setPaymentMethod("CASH");
      setShowModal(false);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 7000);
      fetchSummary();
      window.dispatchEvent(new Event("ledgerUpdated"));
    } catch (e: any) {
      toast.error(e.message || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);

  const openModal = (cat?: string) => {
    const selectedCat = cat || category;
    if (selectedCat) setCategory(selectedCat);
    setDescription(CATEGORY_DEFAULT_NOTES[selectedCat || ""] || "");
    setShowModal(true);
  };

  const handleCategoryChange = (val: string) => {
    setCategory(val);
    setDescription(CATEGORY_DEFAULT_NOTES[val] || "");
  };

  return (
    <>
      {showConfetti && isClient && (
        <Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={350} />
      )}

      <Row className="mb-4 align-items-center">
        <Col>
          <h2 className="mb-0 fw-bold">My Ledger</h2>
          <p className="text-muted mb-0 small">Your payments and charges</p>
        </Col>
        <Col xs="auto">
          <Button
            variant="success"
            onClick={() => openModal("WEEKLY_INCOME")}
            className="d-flex align-items-center gap-2"
            disabled={!hasCar}
            title={!hasCar ? "You need an assigned car before recording a payment" : undefined}
          >
            <ArrowDownCircle size={16} /> Record Payment
          </Button>
        </Col>
      </Row>

      {/* No-car warning banner */}
      {hasCar === false && (
        <div className="alert alert-warning d-flex align-items-center gap-2 mb-4 py-2" role="alert">
          <CarFront size={16} className="flex-shrink-0" />
          <span className="small">
            <strong>No car assigned.</strong> You cannot record payments until an admin assigns a car to your account.
          </span>
        </div>
      )}

      {/* Quick-pay category buttons */}
      {categories.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mb-4">
          {categories.slice(0, 6).map((cat) => (
            <Button
              key={cat.value}
              variant={cat.hasEntries ? "outline-primary" : "outline-secondary"}
              size="sm"
              onClick={() => openModal(cat.value)}
              className="d-flex align-items-center gap-1"
              disabled={!hasCar}
              title={!hasCar ? "No car assigned" : undefined}
            >
              {CATEGORY_ICONS[cat.value] || <Tag size={12} />}
              {cat.label}
              {cat.hasEntries && <Badge bg="primary" pill style={{ fontSize: "0.65rem" }}>✓</Badge>}
            </Button>
          ))}
        </div>
      )}

      {/* Record Payment Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header
          closeButton
          style={{ background: "linear-gradient(135deg, #198754 0%, #20c997 100%)", color: "#fff", borderBottom: "none" }}
        >
          <Modal.Title className="text-white d-flex align-items-center gap-2">
            <ArrowDownCircle size={20} />
            <div>
              <div className="fw-bold">Record a Payment</div>
              <small className="opacity-75 fw-normal" style={{ fontSize: "0.8rem" }}>
                Awaiting admin approval after submission
              </small>
            </div>
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Amount (£) <span className="text-danger">*</span></Form.Label>
              <InputGroup>
                <InputGroup.Text>£</InputGroup.Text>
                <Form.Control
                  type="number" step="0.01" min="0.01"
                  value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00" autoFocus
                  style={{ color: "#000" }}
                />
              </InputGroup>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Payment Type <span className="text-danger">*</span></Form.Label>
              <Form.Select value={category} onChange={(e) => handleCategoryChange(e.target.value)} style={{ color: "#000" }}>
                <option value="">Select a payment type</option>
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}{cat.hasEntries ? " ✓" : ""}
                  </option>
                ))}
              </Form.Select>
              {category && !categories.find((c) => c.value === category)?.hasEntries && (
                <Form.Text className="text-muted">
                  This will create a new ledger entry for this category.
                </Form.Text>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Payment Method</Form.Label>
              <Form.Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ color: "#000" }}>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CARD">Card</option>
                <option value="CHEQUE">Cheque</option>
                <option value="OTHER">Other</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-1">
              <Form.Label>Notes <span className="text-danger">*</span></Form.Label>
              <Form.Control
                as="textarea" rows={2}
                value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Weekly rent 19–25 May"
                style={{ color: "#000" }}
              />
            </Form.Group>
          </Form>
        </Modal.Body>

        <Modal.Footer className="justify-content-between">
          <Button variant="outline-secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button
            variant="success" onClick={handleRecord}
            disabled={loading || !amount || !category || !description.trim()}
            className="d-flex align-items-center gap-2" style={{ minWidth: 160 }}
          >
            {loading ? <><Spinner size="sm" animation="border" /> Saving…</> : <><ArrowDownCircle size={16} /> Record Payment</>}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default LedgerListHeaderDriver;
