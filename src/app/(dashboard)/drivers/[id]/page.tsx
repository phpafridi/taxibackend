// app/dashboard/drivers/[id]/page.tsx
import { Metadata } from "next";
import DriverDetail from "../../../../components/drivers/DriverDetail";

interface PageProps {
  params: {
    id: string;
  };
}

export const metadata: Metadata = {
  title: "Driver Details | Rs Private",
  description: "View driver details",
};

const DriverDetailPage = ({ params }: PageProps) => {
  return <DriverDetail  />;
};

export default DriverDetailPage;