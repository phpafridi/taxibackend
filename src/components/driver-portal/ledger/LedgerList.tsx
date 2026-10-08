// components/driver-portal/ledger/LedgerList.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card, Badge, Button, Spinner, Alert, Row, Col,
  Form, InputGroup, FormControl, Table, Modal
} from "react-bootstrap";
import {
  CarFront, ArrowDownCircle, ArrowUpCircle, Calendar,
  Search, ArrowClockwise, CheckCircle, XCircle, Clock,
  CreditCard, Wrench, Tag, ExclamationTriangle, Cash
} from "react-bootstrap-icons";
import { toast } from "sonner";

/* ─── Constants ─────────────────────────────────────────────────────────── */
const CAT_LABELS: Record<string, string> = {
  WEEKLY_INCOME: "Weekly Rent",
  MAINTENANCE_EXPENSE: "Maintenance",
  MAINTENANCE_REIMBURSEMENT: "Maint. Refund",
  INSURANCE: "Insurance",
  INSURANCE_DRIVER_PAYMENT: "Ins. Payment",
  CAR_PURCHASE: "Car Purchase",
  DEPOSIT: "Deposit",
  REFUND: "Refund",
  FINE: "Fine",
  ADJUSTMENT: "Adjustment",
  OTHER: "Other",
};

const CAT_COLOR: Record<string, string> = {
  WEEKLY_INCOME: "success",
  FINE: "danger",
  INSURANCE_DRIVER_PAYMENT: "info",
  MAINTENANCE_EXPENSE: "warning",
  MAINTENANCE_REIMBURSEMENT: "success",
  INSURANCE: "info",
  DEPOSIT: "primary",
  REFUND: "success",
  ADJUSTMENT: "dark",
  OTHER: "secondary",
};

const CAT_ICON: Record<string, React.ReactNode> = {
  WEEKLY_INCOME: <Calendar size={13} />,
  MAINTENANCE_EXPENSE: <Wrench size={13} />,
  MAINTENANCE_REIMBURSEMENT: <Wrench size={13} />,
  INSURANCE: <CreditCard size={13} />,
  INSURANCE_DRIVER_PAYMENT: <CreditCard size={13} />,
  FINE: <ExclamationTriangle size={13} />,
  DEPOSIT: <Cash size={13} />,
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);

const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/* ─── Sub-components ─────────────────────────────────────────────────────── */
const StatusPill = ({ status }: { status: string }) => {
  const map: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
    ACCEPT:   { bg: "success", icon: <CheckCircle size={11} />, label: "Approved" },
    PENDING:  { bg: "warning", icon: <Clock size={11} />,       label: "Pending"  },
    REJECTED: { bg: "danger",  icon: <XCircle size={11} />,     label: "Rejected" },
  };
  const s = map[status] || { bg: "secondary", icon: null, label: status };
  return (
    <Badge bg={s.bg} className="d-inline-flex align-items-center gap-1" style={{ fontSize: "0.73rem" }}>
      {s.icon} {s.label}
    </Badge>
  );
};

const CatBadge = ({ category }: { category: string }) => (
  <Badge bg={CAT_COLOR[category] || "secondary"} className="d-inline-flex align-items-center gap-1" style={{ fontSize: "0.72rem" }}>
    {CAT_ICON[category] || <Tag size={11} />} {CAT_LABELS[category] || category}
  </Badge>
);

/* ─── Pay Now Modal ─────────────────────────────────────────────────────── */
const PayNowModal = ({
  entry, show, onHide, onPaid
}: { entry: any; show: boolean; onHide: () => void; onPaid: () => void }) => {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (entry && show) {
      setAmount(String(entry.amount || ""));
      setDescription(CAT_LABELS[entry.category] ? `${CAT_LABELS[entry.category]} payment` : "Payment");
      setPaymentMethod("CASH");
    }
  }, [entry, show]);

  const handlePay = async () => {
    if (!amount || parseFloat(amount) <= 0) { toast.error("Enter a valid amount"); return; }
    if (!description.trim()) { toast.error("Enter a description"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/driver-portal/ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "CREDIT",
          amount: parseFloat(amount),
          category: entry.category,
          description: description.trim(),
          paymentDate: new Date().toISOString().split("T")[0],
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Payment submitted — awaiting admin approval");
      onPaid();
      onHide();
    } catch (e: any) {
      toast.error(e.message || "Failed to submit payment");
    } finally {
      setLoading(false);
    }
  };

  if (!entry) return null;

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header
        closeButton
        style={{ background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)", borderBottom: "none" }}
      >
        <Modal.Title className="text-white d-flex align-items-center gap-2">
          <Cash size={20} />
          <div>
            <div className="fw-bold">Pay Now</div>
            <small className="opacity-75 fw-normal" style={{ fontSize: "0.8rem" }}>
              {CAT_LABELS[entry.category] || entry.category} · {fmt(entry.amount || 0)} due
            </small>
          </div>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="alert alert-warning py-2 mb-3 d-flex align-items-center gap-2 small">
          <ExclamationTriangle size={14} />
          This charge was added by your admin. Submit your payment for approval.
        </div>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Amount (£) <span className="text-danger">*</span></Form.Label>
            <InputGroup>
              <InputGroup.Text>£</InputGroup.Text>
              <Form.Control
                type="number" step="0.01" min="0.01"
                value={amount} onChange={(e) => setAmount(e.target.value)}
                style={{ color: "#000" }} autoFocus
              />
            </InputGroup>
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
          <Form.Group>
            <Form.Label>Notes <span className="text-danger">*</span></Form.Label>
            <Form.Control
              as="textarea" rows={2}
              value={description} onChange={(e) => setDescription(e.target.value)}
              style={{ color: "#000" }}
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer className="justify-content-between">
        <Button variant="outline-secondary" onClick={onHide}>Cancel</Button>
        <Button
          style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", border: "none", minWidth: 140 }}
          onClick={handlePay} disabled={loading || !amount || !description.trim()}
          className="d-flex align-items-center gap-2"
        >
          {loading ? <><Spinner size="sm" animation="border" /> Submitting…</> : <><Cash size={15} /> Submit Payment</>}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

/* ─── Category Summary Card ─────────────────────────────────────────────── */
const CategoryCard = ({
  category, entries, onClick, active
}: { category: string; entries: any[]; onClick: () => void; active: boolean }) => {
  const accepted = entries.filter((e) => e.status === "ACCEPT");
  const lastCredit = accepted.filter((e) => e.direction === "CREDIT").sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  const nextDebit = entries.filter((e) => e.direction === "DEBIT" && e.status === "ACCEPT")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  const pendingCount = entries.filter((e) => e.status === "PENDING").length;
  const color = CAT_COLOR[category] || "secondary";

  return (
    <Card
      className={`h-100 cursor-pointer border-2 ${active ? `border-${color} shadow` : "border-light"}`}
      onClick={onClick}
      style={{ cursor: "pointer", transition: "all 0.15s" }}
    >
      <Card.Body className="p-3">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <CatBadge category={category} />
          {pendingCount > 0 && (
            <Badge bg="warning" pill style={{ fontSize: "0.65rem" }}>{pendingCount} pending</Badge>
          )}
        </div>
        {lastCredit ? (
          <div className="small">
            <div className="text-muted" style={{ fontSize: "0.7rem" }}>Last paid</div>
            <div className="fw-bold text-success">{fmt(lastCredit.amount)}</div>
            <div className="text-muted" style={{ fontSize: "0.68rem" }}>{fmtDate(lastCredit.createdAt)}</div>
          </div>
        ) : (
          <div className="text-muted small">No payments yet</div>
        )}
        {nextDebit && (
          <div className="mt-2 pt-2 border-top small">
            <div className="text-muted" style={{ fontSize: "0.7rem" }}>Next due</div>
            <div className="fw-bold text-danger">{fmt(nextDebit.amount)}</div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

/* ─── Main Component ─────────────────────────────────────────────────────── */
const LedgerList = () => {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const [activeTab, setActiveTab] = useState<"all" | "pending" | string>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");

  const [payEntry, setPayEntry] = useState<any>(null);
  const [showPayModal, setShowPayModal] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const fetchLedger = async (silent = false, attempt = 1) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch("/api/driver-portal/ledger?limit=200");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setEntries(data.data || []);
      setError(null);
    } catch (e: any) {
      if (attempt < 3) {
        // Auto-retry after a short delay (500ms, 1000ms)
        setTimeout(() => fetchLedger(silent, attempt + 1), attempt * 500);
        return;
      }
      setError(e.message);
      if (!silent) toast.error("Failed to load ledger");
    } finally {
      if (attempt >= 3 || !silent) { setLoading(false); setRefreshing(false); }
    }
  };

  useEffect(() => {
    fetchLedger();
    const handler = () => fetchLedger(true);
    window.addEventListener("ledgerUpdated", handler);
    return () => window.removeEventListener("ledgerUpdated", handler);
  }, []);

  /* ── Derived ── */
  const categories = useMemo(() =>
    Array.from(new Set(entries.map((e) => e.category).filter(Boolean))),
    [entries]
  );

  const stats = useMemo(() => {
    const accepted = entries.filter((e) => e.status === "ACCEPT");
    const paid    = accepted.filter((e) => e.direction === "CREDIT").reduce((s, e) => s + (e.amount || 0), 0);
    const charges = accepted.filter((e) => e.direction === "DEBIT").reduce((s, e) => s + (e.amount || 0), 0);
    const pending = entries.filter((e) => e.status === "PENDING");
    const pendingOwed = entries.filter((e) => e.status === "ACCEPT" && e.direction === "DEBIT");
    return { paid, charges, balance: paid - charges, pending: pending.length, pendingOwed: pendingOwed.reduce((s,e) => s + (e.amount||0), 0) };
  }, [entries]);

  // Debit IDs that already have a matching CREDIT payment (PENDING or ACCEPT) — hide Pay Now for these
  const alreadyPaidDebitIds = useMemo(() => {
    const paid = new Set<number>();
    entries.forEach((debit) => {
      if (debit.direction !== "DEBIT" || debit.status !== "ACCEPT") return;
      const hasCreditPayment = entries.some(
        (credit) =>
          credit.direction === "CREDIT" &&
          credit.category === debit.category &&
          ["PENDING", "ACCEPT"].includes(credit.status) &&
          new Date(credit.createdAt).getTime() >= new Date(debit.createdAt).getTime()
      );
      if (hasCreditPayment) paid.add(debit.id);
    });
    return paid;
  }, [entries]);

  // Entries for "Pending Charges" tab — DEBIT entries from admin that driver needs to pay
  const pendingCharges = useMemo(() =>
    entries.filter((e) => e.direction === "DEBIT" && e.status === "ACCEPT" && !alreadyPaidDebitIds.has(e.id)),
    [entries]
  );

  // Entries awaiting admin approval (driver submitted, not yet approved)
  const awaitingApproval = useMemo(() =>
    entries.filter((e) => e.status === "PENDING"),
    [entries]
  );


  const getTabEntries = () => {
    let list: any[] = [];
    if (activeTab === "all") list = [...entries];
    else if (activeTab === "pending") list = [...pendingCharges, ...awaitingApproval];
    else list = entries.filter((e) => e.category === activeTab);

    if (search) {
      const t = search.toLowerCase();
      list = list.filter((e) =>
        e.description?.toLowerCase().includes(t) ||
        e.car?.registration?.toLowerCase().includes(t)
      );
    }
    list.sort((a, b) => {
      if (sortBy === "date-asc") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "amount-desc") return (b.amount || 0) - (a.amount || 0);
      if (sortBy === "amount-asc") return (a.amount || 0) - (b.amount || 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return list;
  };

  const filtered = getTabEntries();

  const openPay = (entry: any) => { setPayEntry(entry); setShowPayModal(true); };

  /* ── Loading / Error ── */
  if (loading && entries.length === 0) return (
    <div className="text-center py-5">
      <Spinner animation="border" />
      <p className="mt-2 text-muted">Loading your ledger…</p>
    </div>
  );
  if (error) return (
    <Alert variant="danger">
      <Alert.Heading>Error</Alert.Heading>
      <p>{error}</p>
      <Button variant="outline-danger" onClick={() => fetchLedger()}>Retry</Button>
    </Alert>
  );

  /* ── Render ── */
  return (
    <div>

      {/* ── Category overview cards ── */}
      {categories.length > 0 && (
        <Row className="g-2 mb-4">
          {categories.map((cat) => (
            <Col key={cat} xs={6} sm={4} md={3}>
              <CategoryCard
                category={cat}
                entries={entries.filter((e) => e.category === cat)}
                onClick={() => setActiveTab(cat)}
                active={activeTab === cat}
              />
            </Col>
          ))}
        </Row>
      )}

      {/* ── Tabs ── */}
      <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
        <Button
          size="sm" variant={activeTab === "all" ? "dark" : "outline-secondary"}
          onClick={() => setActiveTab("all")}
        >
          All Records <Badge bg="secondary" pill className="ms-1">{entries.length}</Badge>
        </Button>
        <Button
          size="sm"
          variant={activeTab === "pending" ? "warning" : "outline-warning"}
          onClick={() => setActiveTab("pending")}
          className="d-flex align-items-center gap-1"
        >
          <ExclamationTriangle size={12} />
          Pending
          {(pendingCharges.length + awaitingApproval.length) > 0 && (
            <Badge bg="danger" pill className="ms-1">{pendingCharges.length + awaitingApproval.length}</Badge>
          )}
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat} size="sm"
            variant={activeTab === cat ? CAT_COLOR[cat] || "secondary" : `outline-${CAT_COLOR[cat] || "secondary"}`}
            onClick={() => setActiveTab(cat)}
            className="d-flex align-items-center gap-1"
          >
            {CAT_ICON[cat] || <Tag size={11} />}
            {CAT_LABELS[cat] || cat}
            <Badge bg="light" text="dark" pill className="ms-1" style={{ fontSize: "0.65rem" }}>
              {entries.filter((e) => e.category === cat).length}
            </Badge>
          </Button>
        ))}

        {/* Refresh + search right-aligned */}
        <div className="ms-auto d-flex align-items-center gap-2">
          <InputGroup size="sm" style={{ width: 180 }}>
            <InputGroup.Text><Search size={12} /></InputGroup.Text>
            <FormControl placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && <Button variant="outline-secondary" size="sm" onClick={() => setSearch("")}>×</Button>}
          </InputGroup>
          <Form.Select size="sm" value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ width: 140 }}>
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="amount-desc">Highest £</option>
            <option value="amount-asc">Lowest £</option>
          </Form.Select>
          <Button variant="outline-secondary" size="sm" onClick={() => fetchLedger()} disabled={refreshing}>
            {refreshing ? <Spinner size="sm" animation="border" style={{ width: 14, height: 14 }} /> : <ArrowClockwise size={14} />}
          </Button>
        </div>
      </div>

      {/* ── Pending charges banner ── */}
      {activeTab === "pending" && pendingCharges.length > 0 && (
        <Alert variant="warning" className="mb-3 py-2">
          <div className="d-flex align-items-center gap-2">
            <ExclamationTriangle size={16} />
            <strong>You have {pendingCharges.length} outstanding charge{pendingCharges.length > 1 ? "s" : ""} totalling {fmt(pendingCharges.reduce((s, e) => s + (e.amount || 0), 0))}</strong>
          </div>
          <small className="text-muted">Click "Pay Now" on each charge below to submit your payment for admin approval.</small>
        </Alert>
      )}

      <small className="text-muted d-block mb-2">{filtered.length} transaction{filtered.length !== 1 ? "s" : ""}</small>

      {/* ── Desktop table ── */}
      <div className="d-none d-md-block">
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-0">
            <Table hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 100 }}>Date</th>
                  <th style={{ width: 95 }}>Status</th>
                  <th style={{ width: 80 }}>Type</th>
                  <th style={{ width: 140 }}>Category</th>
                  <th>Description</th>
                  <th style={{ width: 90 }}>Car</th>
                  <th style={{ width: 110 }} className="text-end">Amount</th>
                  <th style={{ width: 100 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-5 text-muted">No transactions found</td></tr>
                ) : filtered.map((entry) => {
                  const approved = entry.status === "ACCEPT";
                  const isPending = entry.status === "PENDING";
                  const isOwed = entry.direction === "DEBIT" && approved && !alreadyPaidDebitIds.has(entry.id);
                  return (
                    <tr
                      key={entry.id}
                      className={isOwed ? "table-danger" : isPending ? "table-warning" : entry.status === "REJECTED" ? "table-light" : ""}
                    >
                      <td className="small align-middle">{fmtDate(entry.createdAt)}</td>
                      <td className="align-middle"><StatusPill status={entry.status} /></td>
                      <td className="align-middle">
                        <Badge
                          bg={entry.direction === "CREDIT" ? "success" : "danger"}
                          className="d-flex align-items-center gap-1"
                          style={{ fontSize: "0.72rem", width: "fit-content" }}
                        >
                          {entry.direction === "CREDIT" ? <><ArrowDownCircle size={10} /> Paid</> : <><ArrowUpCircle size={10} /> Owe</>}
                        </Badge>
                      </td>
                      <td className="align-middle"><CatBadge category={entry.category} /></td>
                      <td className="align-middle small">
                        <div className="text-truncate" style={{ maxWidth: 200 }}>{entry.description || "—"}</div>
                        {isPending && <div className="text-muted" style={{ fontSize: "0.68rem" }}>Awaiting admin confirmation</div>}
                        {isOwed && <div className="text-danger fw-medium" style={{ fontSize: "0.68rem" }}>⚡ Payment due — click Pay Now</div>}
                      </td>
                      <td className="align-middle small">
                        {entry.car ? (
                          <span className="d-flex align-items-center gap-1 text-muted">
                            <CarFront size={12} />{entry.car.registration}
                          </span>
                        ) : "—"}
                      </td>
                      <td className={`align-middle text-end fw-bold ${approved ? (entry.direction === "CREDIT" ? "text-success" : "text-danger") : "text-muted"}`}>
                        {entry.direction === "CREDIT" ? "+" : "−"}{fmt(entry.amount || 0)}
                        {!approved && <div className="text-muted fw-normal" style={{ fontSize: "0.65rem" }}>(pending)</div>}
                      </td>
                      <td className="align-middle text-end">
                        {isOwed && (
                          <Button
                            size="sm"
                            style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", border: "none", fontSize: "0.72rem" }}
                            onClick={() => openPay(entry)}
                          >
                            Pay Now
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      </div>

      {/* ── Mobile card list ── */}
      <div className="d-md-none">
        {filtered.length === 0 ? (
          <Card className="text-center py-5 text-muted border-0 shadow-sm">No transactions found</Card>
        ) : filtered.map((entry) => {
          const approved = entry.status === "ACCEPT";
          const isPending = entry.status === "PENDING";
          const isOwed = entry.direction === "DEBIT" && approved && !alreadyPaidDebitIds.has(entry.id);
          return (
            <Card
              key={entry.id}
              className={`mb-3 shadow-sm border-0 border-start border-4 ${
                isOwed ? "border-danger" : isPending ? "border-warning" :
                entry.status === "REJECTED" ? "border-secondary" :
                entry.direction === "CREDIT" ? "border-success" : "border-danger"
              }`}
            >
              <Card.Body className="p-3">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <Badge
                      bg={entry.direction === "CREDIT" ? "success" : "danger"}
                      className="d-flex align-items-center gap-1"
                      style={{ fontSize: "0.72rem" }}
                    >
                      {entry.direction === "CREDIT" ? <ArrowDownCircle size={10} /> : <ArrowUpCircle size={10} />}
                      {entry.direction === "CREDIT" ? "Paid" : "Owe"}
                    </Badge>
                    <StatusPill status={entry.status} />
                  </div>
                  <div className={`fw-bold ${approved ? (entry.direction === "CREDIT" ? "text-success" : "text-danger") : "text-muted"}`}>
                    {entry.direction === "CREDIT" ? "+" : "−"}{fmt(entry.amount || 0)}
                  </div>
                </div>

                <div className="fw-medium small mb-2">{entry.description || "No description"}</div>

                <div className="d-flex align-items-center justify-content-between flex-wrap gap-1">
                  <div className="d-flex align-items-center gap-1 text-muted small">
                    <Calendar size={11} /> {fmtDate(entry.createdAt)}
                  </div>
                  <div className="d-flex align-items-center gap-1 flex-wrap">
                    <CatBadge category={entry.category} />
                    {entry.car && (
                      <span className="text-muted small d-flex align-items-center gap-1">
                        <CarFront size={11} />{entry.car.registration}
                      </span>
                    )}
                  </div>
                </div>

                {isOwed && (
                  <div className="mt-2 pt-2 border-top d-flex align-items-center justify-content-between">
                    <span className="text-danger small d-flex align-items-center gap-1">
                      <ExclamationTriangle size={11} /> Payment due
                    </span>
                    <Button
                      size="sm"
                      style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", border: "none", fontSize: "0.72rem" }}
                      onClick={() => openPay(entry)}
                    >
                      Pay Now
                    </Button>
                  </div>
                )}
                {isPending && (
                  <div className="mt-2 text-warning small d-flex align-items-center gap-1">
                    <Clock size={11} /> Awaiting admin confirmation — not counted yet
                  </div>
                )}
                {entry.status === "REJECTED" && (
                  <div className="mt-2 text-danger small d-flex align-items-center gap-1">
                    <XCircle size={11} /> Rejected — contact admin
                  </div>
                )}
              </Card.Body>
            </Card>
          );
        })}
      </div>

      {/* Pay Now Modal */}
      <PayNowModal
        entry={payEntry}
        show={showPayModal}
        onHide={() => setShowPayModal(false)}
        onPaid={() => { fetchLedger(true); window.dispatchEvent(new Event("ledgerUpdated")); }}
      />
    </div>
  );
};

export default LedgerList;
