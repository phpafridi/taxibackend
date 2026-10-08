// app/dashboard/drivers/[id]/page.tsx
import { Metadata } from "next";
import DriverDetail from "../../../../components/driver-portal/drivers/DriverDetail";

interface PageProps {
  params: {
    id: string;
  };
}

export const metadata: Metadata = {
  title: "Driver Details | Rs Private",
  description: "View driver details",
};

const DriverDetailPage = () => {
  return <DriverDetail  />;
};

export default DriverDetailPage;