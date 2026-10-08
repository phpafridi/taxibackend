"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardFooter, Button, Spinner } from "react-bootstrap";
import TanstackTable from "../../components/table/TanstackTable";
import { MaintenanceColumns, MaintenanceRow } from "./MaintenanceColumns";

const ActiveMaintenance = () => {
  const [data, setData] = useState<MaintenanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await fetch("/api/driver-portal/maintenance-all");
        const json = await res.json();

        if (json.success && json.data) {
          setData(json.data.slice(0, 5)); // 🔥 latest 5 only
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  return (
    <Card className="card-lg mb-6">
      <CardHeader className="border-bottom-0">
        <h5 className="mb-0">Recent Maintenance Requests</h5>
      </CardHeader>

      <div className="px-3 pb-2">
        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" size="sm" />
          </div>
        ) : (
          <TanstackTable
            data={data}
            columns={MaintenanceColumns}
            
          />
        )}
      </div>

      <CardFooter className="border-dashed border-top text-center">
        <Button href="/maint" variant="link">
          View All Requests
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ActiveMaintenance;
