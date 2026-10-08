// components/ledger/LedgerList.tsx – IMPROVED: Pending tab, better mobile/desktop
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card, Table, Badge, Button, Spinner, Alert, Modal,
  Row, Col, Form, InputGroup, Tabs, Tab, Dropdown,
  FormControl, DropdownButton
} from "react-bootstrap";
import {
  CarFront, Tag, FileText, ArrowDownCircle, ArrowUpCircle,
  Calendar, CreditCard, Wrench, Eye, Person, Building,
  PersonCircle, Search, Filter, SortAlphaDown, Layers,
  CheckCircle, XCircle, Clock, ThreeDotsVertical, ArrowClockwise,
  ExclamationTriangle, BellFill
} from "react-bootstrap-icons";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Confetti from "react-confetti";
import { IconReload } from "@tabler/icons-react";

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface CarOwnerLedger {
  id: string;
  carId: number;
  registration: string;
  make: string;
  model: string;
  ownerType: "OWNER" | "DRIVER" | "COMPANY";
  ownerId: number;
  driverId: number | null;
  ownerName: string;
  totalCredit: number;
  totalDebit: number;
  netBalance: number;
  totalEntries: number;
  categories: Record<string, { credit: number; debit: number; net: number; count: number; entries: any[] }>;
}

/* ─── Constants ─────────────────────────────────────────────────────────── */
const CATEGORY_META = [
  { value: "WEEKLY_INCOME",              label: "Weekly Rent",             icon: Calendar,        color: "success"   },
  { value: "MAINTENANCE_EXPENSE",        label: "Maintenance",             icon: Wrench,          color: "warning"   },
  { value: "MAINTENANCE_REIMBURSEMENT",  label: "Maint. Refund",           icon: Wrench,          color: "success"   },
  { value: "INSURANCE",                  label: "Insurance",               icon: CreditCard,      color: "info"      },
  { value: "INSURANCE_DRIVER_PAYMENT",   label: "Insurance Payment",       icon: CreditCard,      color: "secondary" },
  { value: "CAR_PURCHASE",               label: "Car Purchase",            icon: CarFront,        color: "primary"   },
  { value: "ADJUSTMENT",                 label: "Adjustment",              icon: Tag,             color: "dark"      },
  { value: "REFUND",                     label: "Refund",                  icon: ArrowDownCircle, color: "success"   },
  { value: "DEPOSIT",                    label: "Deposit",                 icon: ArrowDownCircle, color: "success"   },
  { value: "FINE",                       label: "Fine",                    icon: ArrowUpCircle,   color: "danger"    },
  { value: "OTHER",                      label: "Other",                   icon: Tag,             color: "secondary" },
];

const getCatInfo = (v: string) =>
  CATEGORY_META.find((c) => c.value === v) ||
  { value: v, label: v, icon: Tag, color: "secondary" };

const fmt = (n: any) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(
    typeof n === "number" ? n : Number(n) || 0
  );

const fmtDate = (d: string) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "N/A";

/* ─── StatusBadge ───────────────────────────────────────────────────────── */
const STATUS_INFO: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
  ACCEPT:   { bg: "success", icon: <CheckCircle size={12} />, label: "Accepted" },
  PENDING:  { bg: "warning", icon: <Clock size={12} />,       label: "Pending"  },
  REJECTED: { bg: "danger",  icon: <XCircle size={12} />,     label: "Rejected" },
};
const StatusBadge = ({ status }: { status: string }) => {
  const s = STATUS_INFO[status] || { bg: "secondary", icon: null, label: status };
  return (
    <Badge bg={s.bg} className="d-flex align-items-center gap-1" style={{ width: "fit-content" }}>
      {s.icon} {s.label}
    </Badge>
  );
};

/* ─── OwnerBadge ────────────────────────────────────────────────────────── */
const OwnerBadge = ({ ownerType, ownerName, compact = false }: { ownerType: string; ownerName: string; compact?: boolean }) => {
  const map: Record<string, { bg: string; icon: React.ReactNode }> = {
    COMPANY: { bg: "warning", icon: <Building size={compact ? 10 : 12} /> },
    DRIVER:  { bg: "info",    icon: <Person size={compact ? 10 : 12} />   },
    OWNER:   { bg: "primary", icon: <PersonCircle size={compact ? 10 : 12} /> },
  };
  const m = map[ownerType] || map.OWNER;
  const name = compact && ownerName.length > 10 ? ownerName.slice(0, 10) + "…" : ownerName;
  return (
    <Badge bg={m.bg} className="d-flex align-items-center gap-1 fw-normal" style={{ fontSize: compact ? "0.7rem" : "0.8rem" }}>
      {m.icon} {name}
    </Badge>
  );
};

/* ─── StatusActions (inline approve/reject) ─────────────────────────────── */
const StatusActions = ({
  entry, onStatusUpdate, isMobile = false,
}: {
  entry: any; onStatusUpdate: (id: number, status: string, entry?: any) => Promise<void>; isMobile?: boolean;
}) => {
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<"ACCEPT" | "REJECTED" | null>(null);

  const confirm = async () => {
    if (!modal) return;
    setBusy(true);
    try {
      await onStatusUpdate(entry.id, modal, entry);
      // For weekly income acceptance, the modal handles the toast — skip here
      const isWeeklyAccept = modal === "ACCEPT" && entry.category === "WEEKLY_INCOME" && entry.direction === "CREDIT";
      if (!isWeeklyAccept) {
        toast.success(modal === "ACCEPT" ? "Payment accepted ✓" : "Payment rejected");
      }
      setModal(null);
    } catch {
      toast.error("Failed to update status");
    } finally { setBusy(false); }
  };

  return (
    <>
      <div className={`d-flex ${isMobile ? "flex-column" : "align-items-center"} gap-1`}>
        <StatusBadge status={entry.status} />
        {entry.status === "PENDING" && (
          isMobile ? (
            <div className="d-flex gap-1 mt-1">
              <Button size="sm" variant="success" className="flex-fill" onClick={() => setModal("ACCEPT")} disabled={busy}>
                <CheckCircle size={12} className="me-1" />Accept
              </Button>
              <Button size="sm" variant="outline-danger" className="flex-fill" onClick={() => setModal("REJECTED")} disabled={busy}>
                <XCircle size={12} className="me-1" />Reject
              </Button>
            </div>
          ) : (
            <DropdownButton title={<ThreeDotsVertical size={14} />} variant="outline-secondary" size="sm" align="end">
              <Dropdown.Item onClick={() => setModal("ACCEPT")} className="text-success">
                <CheckCircle className="me-2" /> Accept
              </Dropdown.Item>
              <Dropdown.Item onClick={() => setModal("REJECTED")} className="text-danger">
                <XCircle className="me-2" /> Reject
              </Dropdown.Item>
            </DropdownButton>
          )
        )}
      </div>

      <Modal show={!!modal} onHide={() => setModal(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{modal === "ACCEPT" ? "Accept Payment?" : "Reject Payment?"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant={modal === "ACCEPT" ? "success" : "danger"} className="mb-3">
            <strong>{modal === "ACCEPT" ? "✓ Accept" : "✗ Reject"}</strong> — {fmt(entry.amount)} · {entry.category}
          </Alert>
          <p className="text-muted small mb-0">{entry.description}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
          <Button variant={modal === "ACCEPT" ? "success" : "danger"} onClick={confirm} disabled={busy}>
            {busy ? <Spinner size="sm" animation="border" /> : modal === "ACCEPT" ? "Yes, Accept" : "Yes, Reject"}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

/* ─── PendingCard (for the Pending Approvals tab) ──────────────────────── */
const PendingCard = ({ entry, onStatusUpdate, isMobile }: { entry: any; onStatusUpdate: any; isMobile: boolean }) => (
  <Card className="mb-3 border-warning shadow-sm">
    <Card.Body className="p-3">
      <Row className="g-2 align-items-start">
        <Col xs={isMobile ? 12 : 6} md={4}>
          <div className="fw-bold d-flex align-items-center gap-1">
            <Person size={14} className="text-muted" />
            {entry.driverName || "Driver"}
          </div>
          <small className="text-muted">
            {entry.car?.registration
              ? <><CarFront size={11} className="me-1" />{entry.car.registration}</>
              : <span className="text-warning">⚠ No car assigned</span>}
          </small>
          <div className="mt-1">
            <Badge bg={getCatInfo(entry.category).color} style={{ fontSize: "0.7rem" }}>
              {getCatInfo(entry.category).label}
            </Badge>
          </div>
        </Col>
        <Col xs={isMobile ? 6 : 3} md={3}>
          <div className="text-muted small">Amount</div>
          <div className="fw-bold text-success fs-6">+{fmt(entry.amount)}</div>
          <div className="text-muted" style={{ fontSize: "0.7rem" }}>{fmtDate(entry.createdAt)}</div>
        </Col>
        <Col xs={isMobile ? 6 : 3} md={2}>
          <div className="text-muted small">Method</div>
          <Badge bg="secondary" style={{ fontSize: "0.7rem" }}>{entry.paymentMethod || "CASH"}</Badge>
        </Col>
        <Col xs={12} md={3}>
          <div className="text-muted small mb-1 text-truncate" title={entry.description}>{entry.description}</div>
          <StatusActions entry={entry} onStatusUpdate={onStatusUpdate} isMobile={isMobile} />
        </Col>
      </Row>
    </Card.Body>
  </Card>
);

/* ─── CategoryTabContent ─────────────────────────────────────────────────── */
const CategoryTabContent = ({
  category, data, ledger, onAddTransaction, onStatusUpdate, isMobile,
}: {
  category: string; data: any; ledger: CarOwnerLedger;
  onAddTransaction: (l: CarOwnerLedger, t: "CREDIT" | "DEBIT", cat?: string) => void;
  onStatusUpdate: (id: number, status: string, entry?: any) => Promise<void>; isMobile: boolean;
}) => {
  const acceptedCredit = data.entries.filter((e: any) => e.status === "ACCEPT" && e.direction === "CREDIT").reduce((s: number, e: any) => s + e.amount, 0);
  const acceptedDebit  = data.entries.filter((e: any) => e.status === "ACCEPT" && e.direction === "DEBIT").reduce((s: number, e: any) => s + e.amount, 0);

  return (
    <Card>
      <Card.Body>
        <Row className="text-center mb-4 g-2">
          {[
            { label: "Money In",   val: data.credit,           sub: `Accepted: ${fmt(acceptedCredit)}`, cls: "text-success" },
            { label: "Money Out",  val: data.debit,            sub: `Accepted: ${fmt(acceptedDebit)}`,  cls: "text-danger"  },
            { label: "Net",        val: data.credit - data.debit, sub: "",                              cls: data.credit - data.debit >= 0 ? "text-primary" : "text-warning" },
          ].map(({ label, val, sub, cls }) => (
            <Col xs={4} key={label}>
              <div className="text-muted small">{label}</div>
              <div className={`fw-bold ${cls} ${isMobile ? "fs-6" : "fs-5"}`}>{fmt(val)}</div>
              {sub && <small className="text-muted" style={{ fontSize: "0.7rem" }}>{sub}</small>}
            </Col>
          ))}
        </Row>

        {isMobile ? (
          <div className="vstack gap-2">
            {data.entries.length === 0 ? (
              <div className="text-center py-3 text-muted">No transactions</div>
            ) : data.entries.map((entry: any) => (
              <Card key={entry.id} className={entry.status !== "ACCEPT" ? "border-warning" : ""}>
                <Card.Body className="p-3">
                  <Row className="g-1">
                    <Col xs={7}>
                      <div className={`fw-bold ${entry.status === "ACCEPT" ? (entry.direction === "CREDIT" ? "text-success" : "text-danger") : "text-muted"}`}>
                        {entry.direction === "CREDIT" ? "+" : "-"}{fmt(entry.amount)}
                      </div>
                      <div className="text-muted small">{fmtDate(entry.createdAt)}</div>
                      <div className="small text-truncate mt-1">{entry.description}</div>
                    </Col>
                    <Col xs={5} className="d-flex flex-column align-items-end gap-1">
                      <OwnerBadge ownerType={entry.ownerType} ownerName={entry.ownerName} compact />
                      <StatusActions entry={entry} onStatusUpdate={onStatusUpdate} isMobile />
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            ))}
          </div>
        ) : (
          <div className="table-responsive">
            <Table hover size="sm" className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Date</th><th>Type</th><th>Status</th>
                  <th>Description</th><th>Amount</th><th>Payment Date</th>
                  <th>Owner</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-4 text-muted">No transactions in this category</td></tr>
                ) : data.entries.map((entry: any) => (
                  <tr key={entry.id} className={entry.status !== "ACCEPT" ? "table-light" : ""}>
                    <td className="small">{fmtDate(entry.createdAt)}</td>
                    <td>
                      <Badge bg={entry.direction === "CREDIT" ? "success" : "danger"}>
                        {entry.direction === "CREDIT" ? "IN" : "OUT"}
                      </Badge>
                    </td>
                    <td><StatusBadge status={entry.status} /></td>
                    <td className="small" style={{ maxWidth: 200 }}>
                      <div className="text-truncate">{entry.description}</div>
                    </td>
                    <td className={`fw-bold small ${entry.status === "ACCEPT" ? (entry.direction === "CREDIT" ? "text-success" : "text-danger") : "text-muted"}`}>
                      {entry.direction === "CREDIT" ? "+" : "-"}{fmt(entry.amount)}
                    </td>
                    <td className="small">{fmtDate(entry.paymentDate)}</td>
                    <td><OwnerBadge ownerType={entry.ownerType} ownerName={entry.ownerName} /></td>
                    <td><StatusActions entry={entry} onStatusUpdate={onStatusUpdate} /></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

/* ─── Main LedgerList ────────────────────────────────────────────────────── */
const LedgerList = () => {
  const [allLedger, setAllLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [showConfetti, setShowConfetti] = useState(false);

  // Main tab: "all" | "pending" | "accepted" | "rejected"
  const [mainTab, setMainTab] = useState("all");

  // Ledger detail modal
  const [showDetail, setShowDetail] = useState(false);
  const [selectedLedger, setSelectedLedger] = useState<CarOwnerLedger | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("WEEKLY_INCOME");

  // Add transaction modal
  const [showAdd, setShowAdd] = useState(false);
  const [txType, setTxType] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [txAmount, setTxAmount] = useState("");
  const [txDesc, setTxDesc] = useState("");
  const [txMethod, setTxMethod] = useState("CASH");
  const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);
  const [txStatus, setTxStatus] = useState("ACCEPT");
  const [txRefId, setTxRefId] = useState("");
  const [txRefType, setTxRefType] = useState("");
  const [txLoading, setTxLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("ALL");
  const [balanceFilter, setBalanceFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("registration-asc");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const onResize = () => {
      setIsMobile(window.innerWidth < 768);
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* ── Data ── */
  const fetchLedger = async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      const res = await fetch("/api/ledger/with-relations?limit=1000");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch");
      setAllLedger(data.data || []);
    } catch (e: any) {
      setError(e.message || "Failed to load");
      toast.error("Failed to load ledger");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const [weeklyConfirm, setWeeklyConfirm] = useState<{ transactionId: number; suggestedAmount: number; driverId: number; carId: number | null; ownerId: number } | null>(null);
  const [weeklyNextAmount, setWeeklyNextAmount] = useState("");
  const [weeklyStep, setWeeklyStep] = useState<"confirm" | "nextWeek">("confirm");
  const [weeklyLoading, setWeeklyLoading] = useState(false);

  const handleStatusUpdate = async (id: number, status: string, entryData?: any) => {
    const entry = entryData || allLedger.find((e: any) => e.id === id);
    if (
      status === "ACCEPT" &&
      entry?.category === "WEEKLY_INCOME" &&
      entry?.direction === "CREDIT"
    ) {
      setWeeklyNextAmount(String(entry.amount || ""));
      setWeeklyStep("confirm");
      setWeeklyConfirm({
        transactionId: id,
        suggestedAmount: entry.amount || 0,
        driverId: entry.driverId || entry.ownerId,
        carId: entry.carId || null,
        ownerId: entry.ownerId,
      });
      return;
    }
    const res = await fetch(`/api/ledger/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Failed");
    if (status === "ACCEPT") { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 4000); }
    await fetchLedger(true);
  };

  // Step 1: Admin confirms the approval — then ask about next week
  const handleWeeklyApprove = async () => {
    if (!weeklyConfirm) return;
    setWeeklyLoading(true);
    const res = await fetch(`/api/ledger/${weeklyConfirm.transactionId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ACCEPT", skipAutoDebit: true }),
    });
    setWeeklyLoading(false);
    if (!res.ok) { toast.error("Failed to approve payment"); return; }
    toast.success("Payment approved ✓");
    setShowConfetti(true); setTimeout(() => setShowConfetti(false), 4000);
    // Move to step 2 — ask about next week
    setWeeklyStep("nextWeek");
    await fetchLedger(true);
  };

  // Step 2: Admin chooses to generate next week's rent (optional)
  const handleWeeklyGenerate = async () => {
    if (!weeklyConfirm) return;
    const amount = parseFloat(weeklyNextAmount);
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }
    setWeeklyLoading(true);
    const debitRes = await fetch("/api/ledger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ownerType: "DRIVER",
        ownerId: weeklyConfirm.ownerId,
        driverId: weeklyConfirm.driverId,
        carId: weeklyConfirm.carId,
        category: "WEEKLY_INCOME",
        direction: "DEBIT",
        amount,
        description: "Weekly Rent Due For Next Week",
        paymentMethod: "AUTO",
        paymentDate: new Date().toISOString().split("T")[0],
        status: "ACCEPT",
        referenceId: weeklyConfirm.transactionId,
        referenceType: "AUTO_WEEKLY_DEBIT",
      }),
    });
    setWeeklyLoading(false);
    if (!debitRes.ok) { toast.error("Failed to create next week entry"); }
    else toast.success("Next week's rent generated ✓");
    setWeeklyConfirm(null);
    await fetchLedger(true);
  };

  useEffect(() => {
    fetchLedger();
    const handler = () => fetchLedger(true);
    window.addEventListener("ledgerUpdated", handler);
    return () => window.removeEventListener("ledgerUpdated", handler);
  }, []);

  /* ── Derived data ── */
  const pendingEntries = useMemo(
    () => allLedger.filter((e) => e.status === "PENDING").map((e) => {
      let driverName = "Unknown Driver";
      if (e.driverprofile?.user?.name) {
        driverName = e.driverprofile.user.name;
      } else if (e.driverprofile?.user_driverprofile_userIdTouser?.name) {
        driverName = e.driverprofile.user_driverprofile_userIdTouser.name;
      } else if (e.user?.name) {
        driverName = e.user.name;
      }
      return { ...e, amount: typeof e.amount === "number" ? e.amount : Number(e.amount) || 0, driverName };
    }),
    [allLedger]
  );

  const carOwnerLedgers = useMemo(() => {
    const map = new Map<string, CarOwnerLedger>();
    allLedger.forEach((entry) => {
      // Build a synthetic car object for entries that have no car assigned
      const car = entry.car || {
        id: 0,
        registration: "No Car",
        make: "",
        model: "",
      };
      const cat = entry.category || "OTHER";
      const amt = typeof entry.amount === "number" ? entry.amount : Number(entry.amount) || 0;
      const accepted = entry.status === "ACCEPT";
      const ownerType = entry.ownerType || "OWNER";
      const ownerId = entry.ownerId || 1;
      // For DRIVER entries, key by driverId (profile id) not ownerId — avoids cross-driver merge
      const driverKey = ownerType === "DRIVER" ? (entry.driverId || entry.ownerId || 0) : ownerId;
      let ownerName = ownerType === "DRIVER" && entry.driverprofile
        ? (entry.driverprofile.user?.name || entry.driverprofile.user_driverprofile_userIdTouser?.name || "Driver")
        : ownerType === "COMPANY" ? "Company" : "Owner";

      const key = `${car.id}-${ownerType}-${driverKey}`;
      if (!map.has(key)) {
        map.set(key, { id: key, carId: car.id, registration: car.registration, make: car.make || "", model: car.model || "", ownerType, ownerId, driverId: ownerType === "DRIVER" ? driverKey : null, ownerName, totalCredit: 0, totalDebit: 0, netBalance: 0, totalEntries: 0, categories: {} });
      }
      const ledger = map.get(key)!;
      if (accepted) {
        if (entry.direction === "CREDIT") ledger.totalCredit += amt;
        else if (!(cat === "WEEKLY_INCOME" && entry.direction === "DEBIT")) ledger.totalDebit += amt;
        ledger.netBalance = ledger.totalCredit - ledger.totalDebit;
      }
      ledger.totalEntries++;
      if (!ledger.categories[cat]) ledger.categories[cat] = { credit: 0, debit: 0, net: 0, count: 0, entries: [] };
      const cs = ledger.categories[cat];
      entry.direction === "CREDIT" ? (cs.credit += amt) : (cs.debit += amt);
      cs.net = cs.credit - cs.debit;
      cs.count++;
      cs.entries.push({ id: entry.id, direction: entry.direction, amount: amt, description: entry.description, createdAt: entry.createdAt, paymentDate: entry.paymentDate, category: entry.category, ownerType, ownerId, ownerName, status: entry.status || "PENDING", paymentMethod: entry.paymentMethod });
    });
    return Array.from(map.values());
  }, [allLedger]);

  const filteredLedgers = useMemo(() => {
    let list = [...carOwnerLedgers];
    if (search) {
      const t = search.toLowerCase();
      list = list.filter((l) => l.registration.toLowerCase().includes(t) || l.ownerName.toLowerCase().includes(t) || l.make.toLowerCase().includes(t));
    }
    if (ownerFilter !== "ALL") list = list.filter((l) => l.ownerType === ownerFilter);
    if (balanceFilter === "PROFIT") list = list.filter((l) => l.netBalance > 0);
    if (balanceFilter === "LOSS")   list = list.filter((l) => l.netBalance < 0);
    list.sort((a, b) => {
      if (sortBy === "net-desc") return b.netBalance - a.netBalance;
      if (sortBy === "net-asc")  return a.netBalance - b.netBalance;
      if (sortBy === "registration-desc") return b.registration.localeCompare(a.registration);
      return a.registration.localeCompare(b.registration);
    });
    return list;
  }, [carOwnerLedgers, search, ownerFilter, balanceFilter, sortBy]);

  const summary = useMemo(() => {
    const accepted = allLedger.filter((e) => e.status === "ACCEPT");
    const totalCredit = accepted.filter((e) => e.direction === "CREDIT").reduce((s, e) => s + (e.amount || 0), 0);
    const totalDebit  = accepted.filter((e) => e.direction === "DEBIT" && !(e.category === "WEEKLY_INCOME")).reduce((s, e) => s + (e.amount || 0), 0);
    return { totalCredit, totalDebit, netBalance: totalCredit - totalDebit, pending: allLedger.filter((e) => e.status === "PENDING").length };
  }, [allLedger]);

  /* ── Modal helpers ── */
  const openDetail = (ledger: CarOwnerLedger) => {
    setSelectedLedger(ledger);
    const cats = Object.keys(ledger.categories);
    setSelectedCategory(cats.length ? cats.sort((a, b) => ledger.categories[b].count - ledger.categories[a].count)[0] : "WEEKLY_INCOME");
    setShowDetail(true);
  };

  const openAdd = (ledger: CarOwnerLedger, type: "CREDIT" | "DEBIT" = "CREDIT", cat?: string) => {
    setSelectedLedger(ledger);
    setTxType(type);
    setTxStatus("ACCEPT");
    const c = cat || (Object.keys(ledger.categories)[0] || "WEEKLY_INCOME");
    setSelectedCategory(c);
    setTxDesc(`${getCatInfo(c).label} – ${ledger.registration} (${ledger.ownerName})`);
    setTxAmount("");
    setTxDate(new Date().toISOString().split("T")[0]);
    setShowDetail(false);
    setTimeout(() => setShowAdd(true), 100);
  };

  const submitAdd = async () => {
    if (!selectedLedger || !txAmount || parseFloat(txAmount) <= 0) { toast.error("Enter a valid amount"); return; }
    setTxLoading(true);
    const payload: any = { ownerType: selectedLedger.ownerType, ownerId: selectedLedger.ownerId, carId: selectedLedger.carId, category: selectedCategory, direction: txType, amount: parseFloat(txAmount), description: txDesc.trim(), paymentMethod: txMethod, paymentDate: txDate, referenceId: txRefId || null, referenceType: txRefType || null, status: txStatus };
    if (selectedLedger.ownerType === "DRIVER") { delete payload.ownerId; payload.driverId = selectedLedger.driverId || selectedLedger.ownerId; }
    try {
      const res = await fetch("/api/ledger", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || "Failed"); return; }
      toast.success("Transaction added ✓");
      setShowConfetti(true); setTimeout(() => setShowConfetti(false), 4000);
      setShowAdd(false);
      await fetchLedger(true);
    } catch { toast.error("Network error"); } finally { setTxLoading(false); }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text("Car-Owner Ledger Report", 14, 15);
    doc.setFontSize(10); doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 22);
    autoTable(doc, {
      head: [["Registration", "Car", "Owner", "Credit", "Debit", "Net", "Entries"]],
      body: filteredLedgers.map((l) => [l.registration, `${l.make} ${l.model}`, l.ownerName, fmt(l.totalCredit), fmt(l.totalDebit), fmt(l.netBalance), l.totalEntries]),
      startY: 30, styles: { fontSize: 8 }, headStyles: { fillColor: [41, 128, 185] },
    });
    doc.save(`ledger-${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success("PDF exported");
  };

  /* ── Loading / Error ── */
  if (loading && allLedger.length === 0) return (
    <div className="text-center py-5"><Spinner animation="border" variant="primary" /><p className="mt-3">Loading ledger…</p></div>
  );
  if (error) return (
    <Alert variant="danger"><Alert.Heading>Error</Alert.Heading><p>{error}</p><Button variant="outline-danger" onClick={() => fetchLedger()}>Retry</Button></Alert>
  );

  /* ─────────────────────────────── RENDER ────────────────────────────────── */
  return (
    <div className={isMobile ? "px-2" : "px-3"}>
      {showConfetti && isClient && (
        <Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={200} gravity={0.1} />
      )}

      {/* ── Top bar ── */}
      {isMobile ? (
        <div className="sticky-top bg-white py-2 mb-3 border-bottom" style={{ zIndex: 1000 }}>
          <div className="d-flex align-items-center justify-content-between mb-2">
            <div>
              <h5 className="mb-0 fw-bold">Car Ledger</h5>
              <small className="text-muted">{filteredLedgers.length} records</small>
              {summary.pending > 0 && (
                <Badge bg="danger" className="ms-2 d-inline-flex align-items-center gap-1">
                  <BellFill size={10} /> {summary.pending} pending
                </Badge>
              )}
            </div>
            <Button variant="outline-primary" size="sm" onClick={() => fetchLedger(true)} disabled={refreshing}>
              {refreshing ? <Spinner size="sm" animation="border" style={{ width: 16, height: 16 }} /> : <IconReload size={16} />}
            </Button>
          </div>
          <InputGroup size="sm">
            <InputGroup.Text><Search size={12} /></InputGroup.Text>
            <FormControl placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && <Button variant="outline-secondary" onClick={() => setSearch("")}>×</Button>}
          </InputGroup>
        </div>
      ) : (
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="mb-0 fw-bold">Car Ledger</h2>
            <p className="text-muted mb-0 small">
              All car-owner payment records
              {summary.pending > 0 && (
                <Badge bg="danger" className="ms-2 align-middle d-inline-flex align-items-center gap-1">
                  <BellFill size={10} /> {summary.pending} pending approval
                </Badge>
              )}
            </p>
          </div>
          <div className="d-flex gap-2">
            <Button variant="outline-primary" size="sm" onClick={() => fetchLedger(true)} disabled={refreshing} className="d-flex align-items-center gap-1">
              {refreshing ? <Spinner size="sm" animation="border" style={{ width: 14, height: 14 }} /> : <IconReload size={14} />} Refresh
            </Button>
            <Button variant="success" size="sm" onClick={exportPDF} disabled={!filteredLedgers.length} className="d-flex align-items-center gap-1">
              <FileText size={14} /> Export PDF
            </Button>
          </div>
        </div>
      )}

      {/* ── Summary stats ── */}
      <Row className="g-2 mb-4">
        {[
          { label: "Records",    val: filteredLedgers.length, sub: `${summary.pending} pending`,       cls: "text-primary",  border: "border-primary",  icon: <Layers size={18} />                                 },
          { label: "Money In",   val: fmt(summary.totalCredit),  sub: "Accepted only",               cls: "text-success",  border: "border-success",  icon: <ArrowDownCircle size={18} />                        },
          { label: "Money Out",  val: fmt(summary.totalDebit),   sub: "Excl. rent debit",            cls: "text-danger",   border: "border-danger",   icon: <ArrowUpCircle size={18} />                          },
          { label: "Net",        val: fmt(summary.netBalance),   sub: summary.netBalance >= 0 ? "Profit" : "Loss", cls: summary.netBalance >= 0 ? "text-primary" : "text-warning", border: "border-secondary", icon: null },
        ].map(({ label, val, sub, cls, border, icon }) => (
          <Col xs={6} md={3} key={label}>
            <Card className={`text-center h-100 ${border}`}>
              <Card.Body className="p-2">
                {icon && <div className={`${cls} mb-1`}>{icon}</div>}
                <div className={`fw-bold ${cls} ${isMobile ? "fs-6" : "fs-5"}`}>{val}</div>
                <div className="text-muted" style={{ fontSize: "0.75rem" }}>{label}</div>
                <div className="text-muted" style={{ fontSize: "0.7rem" }}>{sub}</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* ── Main tabs: Pending / All / Accepted / Rejected ── */}
      <Tabs activeKey={mainTab} onSelect={(k) => setMainTab(k || "all")} className="mb-3" variant="pills">

        {/* ── PENDING TAB ── */}
        <Tab
          eventKey="pending"
          title={
            <span className="d-flex align-items-center gap-1">
              <Clock size={14} />
              Pending Approvals
              {summary.pending > 0 && <Badge bg="danger" style={{ fontSize: "0.7rem" }}>{summary.pending}</Badge>}
            </span>
          }
        >
          {pendingEntries.length === 0 ? (
            <Card className="text-center py-5">
              <CheckCircle size={40} className="text-success mx-auto mb-2" />
              <h5>All caught up!</h5>
              <p className="text-muted">No payments waiting for approval.</p>
            </Card>
          ) : (
            <>
              <div className="d-flex align-items-center gap-2 mb-3">
                <ExclamationTriangle className="text-warning" />
                <span className="fw-bold">{pendingEntries.length} payment{pendingEntries.length > 1 ? "s" : ""} waiting for review</span>
              </div>
              {pendingEntries.map((entry) => (
                <PendingCard key={entry.id} entry={entry} onStatusUpdate={handleStatusUpdate} isMobile={isMobile} />
              ))}
            </>
          )}
        </Tab>

        {/* ── ALL LEDGERS TAB ── */}
        <Tab eventKey="all" title={<span className="d-flex align-items-center gap-1"><Layers size={14} />All Records <Badge bg="secondary">{filteredLedgers.length}</Badge></span>}>

          {/* Filters */}
          {!isMobile && (
            <Card className="mb-3">
              <Card.Body className="py-2">
                <Row className="g-2 align-items-end">
                  <Col md={4}>
                    <InputGroup size="sm">
                      <InputGroup.Text><Search size={12} /></InputGroup.Text>
                      <FormControl placeholder="Search by reg, owner, car…" value={search} onChange={(e) => setSearch(e.target.value)} />
                      {search && <Button variant="outline-secondary" size="sm" onClick={() => setSearch("")}>×</Button>}
                    </InputGroup>
                  </Col>
                  <Col md={2}>
                    <Form.Select size="sm" value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
                      <option value="ALL">All Owners</option>
                      <option value="OWNER">Owner</option>
                      <option value="DRIVER">Driver</option>
                      <option value="COMPANY">Company</option>
                    </Form.Select>
                  </Col>
                  <Col md={2}>
                    <Form.Select size="sm" value={balanceFilter} onChange={(e) => setBalanceFilter(e.target.value)}>
                      <option value="ALL">All Balances</option>
                      <option value="PROFIT">Profit</option>
                      <option value="LOSS">Loss</option>
                    </Form.Select>
                  </Col>
                  <Col md={2}>
                    <Form.Select size="sm" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                      <option value="registration-asc">Reg A→Z</option>
                      <option value="registration-desc">Reg Z→A</option>
                      <option value="net-desc">Net High→Low</option>
                      <option value="net-asc">Net Low→High</option>
                    </Form.Select>
                  </Col>
                  <Col md={2}>
                    <Button variant="outline-secondary" size="sm" className="w-100" onClick={() => { setSearch(""); setOwnerFilter("ALL"); setBalanceFilter("ALL"); setSortBy("registration-asc"); }}>
                      Reset Filters
                    </Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}

          {/* Mobile filters */}
          {isMobile && (
            <div className="mb-3">
              <Button variant="outline-secondary" size="sm" className="d-flex align-items-center gap-1 mb-2" onClick={() => setShowFilters((v) => !v)}>
                <Filter size={12} /> Filters {ownerFilter !== "ALL" || balanceFilter !== "ALL" ? "(active)" : ""}
              </Button>
              {showFilters && (
                <Row className="g-2">
                  <Col xs={6}><Form.Select size="sm" value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
                    <option value="ALL">All Owners</option>
                    <option value="OWNER">Owner</option>
                    <option value="DRIVER">Driver</option>
                    <option value="COMPANY">Company</option>
                  </Form.Select></Col>
                  <Col xs={6}><Form.Select size="sm" value={balanceFilter} onChange={(e) => setBalanceFilter(e.target.value)}>
                    <option value="ALL">All Balances</option>
                    <option value="PROFIT">Profit</option>
                    <option value="LOSS">Loss</option>
                  </Form.Select></Col>
                </Row>
              )}
            </div>
          )}

          {/* Desktop table */}
          {!isMobile && (
            <Card>
              <Card.Body className="p-0">
                <Table hover className="mb-0" style={{ minWidth: 800 }}>
                  <thead className="table-light">
                    <tr>
                      <th>Car</th><th>Owner</th><th>Categories</th>
                      <th className="text-success">Money In</th>
                      <th className="text-danger">Money Out</th>
                      <th>Net</th><th>Entries</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLedgers.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-5 text-muted">No records found. Try adjusting filters.</td></tr>
                    ) : filteredLedgers.map((ledger) => {
                      const hasPending = Object.values(ledger.categories).some((c) => c.entries.some((e: any) => e.status === "PENDING"));
                      return (
                        <tr key={ledger.id} className={hasPending ? "table-warning" : ""}>
                          <td>
                            <div className="fw-bold d-flex align-items-center gap-1">
                              {hasPending && <Clock size={12} className="text-warning" />}
                              {ledger.registration}
                            </div>
                            <small className="text-muted">{ledger.make} {ledger.model}</small>
                          </td>
                          <td><OwnerBadge ownerType={ledger.ownerType} ownerName={ledger.ownerName} /></td>
                          <td>
                            <div className="d-flex flex-wrap gap-1">
                              {Object.entries(ledger.categories).slice(0, 3).map(([cat, d]) => {
                                const ci = getCatInfo(cat);
                                const pending = d.entries.filter((e: any) => e.status === "PENDING").length;
                                return (
                                  <Badge key={cat} bg={ci.color} style={{ fontSize: "0.7rem" }}>
                                    {ci.label} ({d.count}){pending > 0 && ` ⚠${pending}`}
                                  </Badge>
                                );
                              })}
                              {Object.keys(ledger.categories).length > 3 && (
                                <Badge bg="light" text="dark" style={{ fontSize: "0.7rem" }}>+{Object.keys(ledger.categories).length - 3}</Badge>
                              )}
                            </div>
                          </td>
                          <td className="text-success fw-bold">{fmt(ledger.totalCredit)}</td>
                          <td className="text-danger fw-bold">{fmt(ledger.totalDebit)}</td>
                          <td className={`fw-bold ${ledger.netBalance >= 0 ? "text-primary" : "text-warning"}`}>{fmt(ledger.netBalance)}</td>
                          <td><Badge bg="secondary">{ledger.totalEntries}</Badge></td>
                          <td>
                            <Button variant="outline-primary" size="sm" onClick={() => openDetail(ledger)} className="d-flex align-items-center gap-1">
                              <Eye size={13} /> View
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          )}

          {/* Mobile cards */}
          {isMobile && (
            <div className="vstack gap-3">
              {filteredLedgers.length === 0 ? (
                <Card className="text-center py-4 text-muted">No records found</Card>
              ) : filteredLedgers.map((ledger) => {
                const hasPending = Object.values(ledger.categories).some((c) => c.entries.some((e: any) => e.status === "PENDING"));
                const pendingCount = Object.values(ledger.categories).reduce((sum, c) => sum + c.entries.filter((e: any) => e.status === "PENDING").length, 0);
                return (
                  <Card key={ledger.id} className={`shadow-sm ${hasPending ? "border-warning" : ""}`}>
                    <Card.Body className="p-3">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <div className="fw-bold">{ledger.registration}
                            {hasPending && <Badge bg="warning" className="ms-1 text-dark" style={{ fontSize: "0.65rem" }}>⚠ {pendingCount}</Badge>}
                          </div>
                          <small className="text-muted">{ledger.make} {ledger.model}</small>
                          <div className="mt-1"><OwnerBadge ownerType={ledger.ownerType} ownerName={ledger.ownerName} compact /></div>
                        </div>
                        <Badge bg="secondary">{ledger.totalEntries}</Badge>
                      </div>
                      <Row className="text-center g-1 mb-2">
                        <Col xs={4}><div className="small text-muted">In</div><div className="fw-bold text-success small">{fmt(ledger.totalCredit)}</div></Col>
                        <Col xs={4}><div className="small text-muted">Out</div><div className="fw-bold text-danger small">{fmt(ledger.totalDebit)}</div></Col>
                        <Col xs={4}><div className="small text-muted">Net</div><div className={`fw-bold small ${ledger.netBalance >= 0 ? "text-primary" : "text-warning"}`}>{fmt(ledger.netBalance)}</div></Col>
                      </Row>
                      <Button variant="outline-primary" size="sm" className="w-100 d-flex align-items-center justify-content-center gap-1" onClick={() => openDetail(ledger)}>
                        <Eye size={13} /> View Details
                      </Button>
                    </Card.Body>
                  </Card>
                );
              })}
            </div>
          )}
        </Tab>
      </Tabs>

      {/* ── Mobile floating refresh ── */}
      {isMobile && (
        <Button
          variant="warning" size="lg" className="rounded-circle shadow-lg d-md-none"
          onClick={() => fetchLedger(true)} disabled={refreshing}
          style={{ position: "fixed", bottom: 83, right: 24, width: 44, height: 44, zIndex: 1050, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {refreshing ? <Spinner size="sm" animation="border" style={{ width: 20, height: 20 }} /> : <ArrowClockwise size={20} />}
        </Button>
      )}

      {/* ── Ledger Detail Modal ── */}
      <Modal show={showDetail} onHide={() => setShowDetail(false)} size="xl" centered fullscreen={isMobile ? true : undefined} scrollable>
        <Modal.Header closeButton>
          <Modal.Title className="w-100">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <CarFront />
              <span className="fw-bold">{selectedLedger?.registration}</span>
              <OwnerBadge ownerType={selectedLedger?.ownerType || "OWNER"} ownerName={selectedLedger?.ownerName || "Unknown"} compact={isMobile} />
              <Badge bg="secondary">{selectedLedger?.totalEntries} entries</Badge>
            </div>
            <div className="text-muted small mt-1">{selectedLedger?.make} {selectedLedger?.model}</div>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className={isMobile ? "p-2" : ""}>
          {/* Summary */}
          <Row className="text-center mb-4 g-2">
            <Col xs={4}><div className="text-muted small">Money In</div><div className="fw-bold text-success">{fmt(selectedLedger?.totalCredit || 0)}</div></Col>
            <Col xs={4}><div className="text-muted small">Money Out</div><div className="fw-bold text-danger">{fmt(selectedLedger?.totalDebit || 0)}</div></Col>
            <Col xs={4}><div className="text-muted small">Net</div><div className={`fw-bold ${(selectedLedger?.netBalance || 0) >= 0 ? "text-primary" : "text-warning"}`}>{fmt(selectedLedger?.netBalance || 0)}</div></Col>
          </Row>

          {selectedLedger && Object.keys(selectedLedger.categories).length > 0 ? (
            <Tabs activeKey={selectedCategory} onSelect={(k) => setSelectedCategory(k || "WEEKLY_INCOME")} className="mb-3">
              {Object.entries(selectedLedger.categories)
                .sort(([, a], [, b]) => b.count - a.count)
                .map(([cat, data]) => {
                  const ci = getCatInfo(cat);
                  const Icon = ci.icon;
                  const pendingInCat = data.entries.filter((e: any) => e.status === "PENDING").length;
                  return (
                    <Tab key={cat} eventKey={cat} title={
                      <span className="d-flex align-items-center gap-1">
                        <Icon size={12} />
                        <span className="d-none d-md-inline">{ci.label}</span>
                        <Badge bg="secondary">{data.count}</Badge>
                        {pendingInCat > 0 && <Badge bg="danger">{pendingInCat}</Badge>}
                      </span>
                    }>
                      <CategoryTabContent category={cat} data={data} ledger={selectedLedger} onAddTransaction={openAdd} onStatusUpdate={handleStatusUpdate} isMobile={isMobile} />
                    </Tab>
                  );
                })}
            </Tabs>
          ) : (
            <Alert variant="info" className="text-center">
              <FileText size={24} className="mb-2" />
              <h5>No Transactions Yet</h5>
              <Button variant="primary" onClick={() => selectedLedger && openAdd(selectedLedger, "CREDIT")}>
                Add First Transaction
              </Button>
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer className={isMobile ? "px-2 py-2" : ""}>
          <div className="w-100 d-flex flex-wrap gap-2 justify-content-between">
            <div className="d-flex gap-2 flex-wrap">
              <Button variant="success" size={isMobile ? "sm" : undefined} onClick={() => selectedLedger && openAdd(selectedLedger, "CREDIT")} className="d-flex align-items-center gap-1">
                <ArrowDownCircle size={14} /> Record Payment
              </Button>
              <Button variant="danger" size={isMobile ? "sm" : undefined} onClick={() => selectedLedger && openAdd(selectedLedger, "DEBIT")} className="d-flex align-items-center gap-1">
                <ArrowUpCircle size={14} /> Add Charge
              </Button>
            </div>
            <Button variant="secondary" size={isMobile ? "sm" : undefined} onClick={() => setShowDetail(false)}>Close</Button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* ── Add Transaction Modal ── */}
      <Modal show={showAdd} onHide={() => setShowAdd(false)} size="lg" centered fullscreen={isMobile ? true : undefined} scrollable>
        <Modal.Header closeButton>
          <Modal.Title className="d-flex align-items-center gap-2">
            {txType === "CREDIT" ? <ArrowDownCircle className="text-success" /> : <ArrowUpCircle className="text-danger" />}
            {txType === "CREDIT" ? "Record Payment" : "Add Charge"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedLedger && (
            <Alert variant="secondary" className="p-2 mb-3 d-flex align-items-center gap-2">
              <CarFront /> <strong>{selectedLedger.registration}</strong>
              <OwnerBadge ownerType={selectedLedger.ownerType} ownerName={selectedLedger.ownerName} compact />
            </Alert>
          )}
          <Form>
            <Row className="g-3">
              <Col xs={12}>
                <Form.Label>Transaction Type</Form.Label>
                <div className="d-flex gap-2">
                  <Button variant={txType === "CREDIT" ? "success" : "outline-success"} className="flex-fill" onClick={() => setTxType("CREDIT")} size={isMobile ? "sm" : undefined}>
                    <ArrowDownCircle className="me-1" /> Money In
                  </Button>
                  <Button variant={txType === "DEBIT" ? "danger" : "outline-danger"} className="flex-fill" onClick={() => setTxType("DEBIT")} size={isMobile ? "sm" : undefined}>
                    <ArrowUpCircle className="me-1" /> Money Out
                  </Button>
                </div>
              </Col>
              <Col xs={12} md={6}>
                <Form.Label>Category *</Form.Label>
                <Form.Select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} size={isMobile ? "sm" : undefined}>
                  {CATEGORY_META.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </Form.Select>
              </Col>
              <Col xs={12} md={6}>
                <Form.Label>Status *</Form.Label>
                <Form.Select value={txStatus} onChange={(e) => setTxStatus(e.target.value)} size={isMobile ? "sm" : undefined}>
                  <option value="ACCEPT">Accepted</option>
                  <option value="PENDING">Pending</option>
                  <option value="REJECTED">Rejected</option>
                </Form.Select>
              </Col>
              <Col xs={12} md={6}>
                <Form.Label>Amount (£) *</Form.Label>
                <InputGroup size={isMobile ? "sm" : undefined}>
                  <InputGroup.Text>£</InputGroup.Text>
                  <Form.Control type="number" step="0.01" min="0.01" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} placeholder="0.00" />
                </InputGroup>
              </Col>
              <Col xs={12} md={6}>
                <Form.Label>Payment Method *</Form.Label>
                <Form.Select value={txMethod} onChange={(e) => setTxMethod(e.target.value)} size={isMobile ? "sm" : undefined}>
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CARD">Card</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="OTHER">Other</option>
                </Form.Select>
              </Col>
              <Col xs={12}>
                <Form.Label>Description *</Form.Label>
                <Form.Control as="textarea" rows={2} value={txDesc} onChange={(e) => setTxDesc(e.target.value)} size={isMobile ? "sm" : undefined} />
              </Col>
              <Col xs={12} md={6}>
                <Form.Label>Payment Date *</Form.Label>
                <Form.Control type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} max={new Date().toISOString().split("T")[0]} size={isMobile ? "sm" : undefined} />
              </Col>
              <Col xs={12} md={6}>
                <Form.Label>Reference ID (optional)</Form.Label>
                <Form.Control type="number" value={txRefId} onChange={(e) => setTxRefId(e.target.value)} size={isMobile ? "sm" : undefined} />
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAdd(false)} disabled={txLoading}>Cancel</Button>
          <Button variant={txType === "CREDIT" ? "success" : "danger"} onClick={submitAdd} disabled={txLoading || !txAmount || !txDesc.trim()}>
            {txLoading ? <Spinner size="sm" animation="border" className="me-2" /> : txType === "CREDIT" ? <ArrowDownCircle className="me-1" /> : <ArrowUpCircle className="me-1" />}
            {txType === "CREDIT" ? "Record Payment" : "Add Charge"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Weekly Confirmation Modal (2 steps) ── */}
      <Modal show={!!weeklyConfirm} onHide={() => setWeeklyConfirm(null)} centered style={{ zIndex: 1060 }}>
        {weeklyStep === "confirm" ? (
          <>
            <Modal.Header closeButton style={{ background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)", borderBottom: "none" }}>
              <Modal.Title className="text-white d-flex align-items-center gap-2">
                <CheckCircle size={20} />
                <div>
                  <div className="fw-bold">Confirm Payment Approval</div>
                  <small className="opacity-75 fw-normal" style={{ fontSize: "0.8rem" }}>
                    Weekly Rent · £{weeklyConfirm?.suggestedAmount?.toFixed(2)}
                  </small>
                </div>
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <p className="mb-0">Are you sure you want to <strong>approve</strong> this weekly rent payment?</p>
            </Modal.Body>
            <Modal.Footer className="justify-content-between">
              <Button variant="outline-secondary" onClick={() => setWeeklyConfirm(null)} disabled={weeklyLoading}>Cancel</Button>
              <Button variant="success" onClick={handleWeeklyApprove} disabled={weeklyLoading} className="d-flex align-items-center gap-2">
                {weeklyLoading ? <Spinner size="sm" animation="border" /> : <CheckCircle size={15} />}
                Yes, Approve
              </Button>
            </Modal.Footer>
          </>
        ) : (
          <>
            <Modal.Header closeButton style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", borderBottom: "none" }}>
              <Modal.Title className="text-white d-flex align-items-center gap-2">
                <Calendar size={20} />
                <div>
                  <div className="fw-bold">Generate Next Week's Rent?</div>
                  <small className="opacity-75 fw-normal" style={{ fontSize: "0.8rem" }}>
                    Payment approved — do you want to create next week's due?
                  </small>
                </div>
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <div className="alert alert-info py-2 mb-3 small">
                Set the amount for next week's rent charge for this driver.
              </div>
              <Form.Group>
                <Form.Label>Next Week Amount (£) <span className="text-danger">*</span></Form.Label>
                <InputGroup>
                  <InputGroup.Text>£</InputGroup.Text>
                  <Form.Control
                    type="number" step="0.01" min="0.01"
                    value={weeklyNextAmount}
                    onChange={(e) => setWeeklyNextAmount(e.target.value)}
                    style={{ color: "#000" }}
                    autoFocus
                  />
                </InputGroup>
                <Form.Text className="text-muted">Suggested: £{weeklyConfirm?.suggestedAmount?.toFixed(2)}</Form.Text>
              </Form.Group>
            </Modal.Body>
            <Modal.Footer className="justify-content-between">
              <Button variant="outline-secondary" onClick={() => setWeeklyConfirm(null)} disabled={weeklyLoading}>
                Skip — Don't Generate
              </Button>
              <Button variant="warning" onClick={handleWeeklyGenerate} disabled={weeklyLoading || !weeklyNextAmount || parseFloat(weeklyNextAmount) <= 0} className="d-flex align-items-center gap-2">
                {weeklyLoading ? <Spinner size="sm" animation="border" /> : <Calendar size={15} />}
                Generate Next Week
              </Button>
            </Modal.Footer>
          </>
        )}
      </Modal>
    </div>
  );
};

export default LedgerList;
