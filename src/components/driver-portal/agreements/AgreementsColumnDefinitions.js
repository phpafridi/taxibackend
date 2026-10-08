// components/agreements/AgreementsColumnDefinitions.js
import { Badge, Button } from "react-bootstrap";
import { Eye, Download, Edit, Trash, UserPlus } from "lucide-react";

export const agreementsColumns = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => (
      <span className="text-muted">#{row.original.id}</span>
    ),
    size: 80,
  },
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => (
      <div>
        <div className="fw-semibold">{row.original.title}</div>
        <div className="text-muted small">
          Type: <span className="text-capitalize">{row.original.type.toLowerCase()}</span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "driver",
    header: "Driver",
    cell: ({ row }) => {
      const driverName = row.original.driver;
      const email = row.original.email;
      
      if (driverName === "Not Assigned") {
        return (
          <div>
            <div className="fw-medium text-danger">{driverName}</div>
            <div className="text-muted small">Awaiting assignment</div>
          </div>
        );
      }
      
      return (
        <div>
          <div className="fw-medium">{driverName}</div>
          <div className="text-muted small">{email}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status?.toUpperCase() || "";
      let variant = "secondary";
      
      switch(status) {
        case "DRAFT":
          variant = "info";
          break;
        case "SIGNED":
          variant = "success";
          break;
        case "PENDING SIGNATURE":
        case "PENDING_SIGNATURE":
          variant = "warning";
          break;
        case "EXPIRED":
          variant = "danger";
          break;
        case "TERMINATED":
        case "CANCELLED":
          variant = "dark";
          break;
        default:
          variant = "secondary";
      }
      
      return (
        <Badge bg={variant} className="px-3 py-2">
          {row.original.status.replace("_", " ").toLowerCase()}
        </Badge>
      );
    },
  },
  {
    accessorKey: "dates",
    header: "Dates",
    cell: ({ row }) => (
      <div>
        <div className="small">
          <span className="fw-medium">Start:</span> {row.original.startDate}
        </div>
        <div className="small">
          <span className="fw-medium">End:</span> {row.original.endDate}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => (
      <span className="text-muted">{row.original.createdAt}</span>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const agreement = row.original.originalData;
      
      const handleView = () => {
        window.location.href = `/agreements/${agreement.id}`;
      };

      const handleDownload = async () => {
        try {
          const response = await fetch(`/api/agreements/${agreement.id}/download`);
          if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `agreement-${agreement.id}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
          } else {
            alert("Failed to download agreement");
          }
        } catch (error) {
          console.error('Error:', error);
          alert('Error downloading agreement');
        }
      };

      const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this agreement?')) {
          try {
            const response = await fetch(`/api/agreements/${agreement.id}`, {
              method: 'DELETE',
            });
            if (response.ok) {
              window.location.reload();
            } else {
              const error = await response.json();
              alert(error.error || "Failed to delete agreement");
            }
          } catch (error) {
            console.error('Error:', error);
            alert('Failed to delete agreement');
          }
        }
      };

      return (
        <div className="d-flex gap-1">
          <Button 
            variant="outline-primary"
            size="sm"
            onClick={handleView}
            title="View"
          >
            <Eye size={14} />
          </Button>
          
          {agreement.status === 'SIGNED' && (
            <Button 
              variant="outline-success"
              size="sm"
              onClick={handleDownload}
              title="Download"
            >
              <Download size={14} />
            </Button>
          )}
          
          {agreement.status === 'DRAFT' && (
            <Button 
              variant="outline-info"
              size="sm"
              onClick={() => window.location.href = `/agreements/${agreement.id}/edit`}
              title="Edit"
            >
              <Edit size={14} />
            </Button>
          )}
          
          {agreement.status === 'DRAFT' && (
            <Button 
              variant="outline-danger"
              size="sm"
              onClick={handleDelete}
              title="Delete"
            >
              <Trash size={14} />
            </Button>
          )}
        </div>
      );
    },
  },
];