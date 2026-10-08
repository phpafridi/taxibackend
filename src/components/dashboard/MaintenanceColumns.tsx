import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "react-bootstrap";
import Image from "next/image";

export type MaintenanceRow = {
  id: number;
  title: string;
  amount: number;
  status: string;
  car: {
    registration: string;
  };
  driverprofile: {
    user_driverprofile_userIdTouser: {
      name: string;
    };
  };
  document?: { id: number; fileUrl: string; fileName: string }[];
};

const statusVariant = (status: string) => {
  switch (status) {
    case "PENDING":
      return "warning";
    case "APPROVED":
      return "success";
    case "REJECTED":
      return "danger";
    case "IN_PROGRESS":
      return "primary";
    case "COMPLETED":
      return "info";
    default:
      return "secondary";
  }
};

export const MaintenanceColumns: ColumnDef<MaintenanceRow>[] = [
  {
    header: "Photo",
    cell: ({ row }) => {
      const photo = row.original.document?.[0];
      if (!photo) return <span className="text-muted small">—</span>;
      return (
        <a href={photo.fileUrl} target="_blank" rel="noopener noreferrer" title="View full size">
          <Image
            src={photo.fileUrl}
            alt={photo.fileName || "Bill photo"}
            width={40}
            height={40}
            unoptimized
            style={{ borderRadius: 6, objectFit: "cover", width: 40, height: 40 }}
          />
        </a>
      );
    },
  },
  {
    header: "Request",
    accessorKey: "title",
    cell: ({ row }) => (
      <div className="fw-semibold text-truncate" style={{ maxWidth: 160 }}>
        {row.original.title}
      </div>
    ),
  },
  {
    header: "Vehicle",
    cell: ({ row }) => (
      <span className="small">{row.original.car.registration}</span>
    ),
  },
  {
    header: "Driver",
    cell: ({ row }) => (
      <span className="small">
        {row.original.driverprofile.user_driverprofile_userIdTouser.name}
      </span>
    ),
  },
  {
    header: "Amount",
    cell: ({ row }) => (
      <strong>£{row.original.amount.toFixed(2)}</strong>
    ),
  },
  {
    header: "Status",
    cell: ({ row }) => (
      <Badge bg={statusVariant(row.original.status)}>
        {row.original.status}
      </Badge>
    ),
  },
];
