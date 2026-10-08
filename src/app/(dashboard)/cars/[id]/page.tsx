// app/dashboard/cars/[id]/page.tsx
import { Metadata } from "next";
import CarDetail from "../../../../components/cars/CarDetail";

interface PageProps {
  params: {
    id: string;
  };
}

export const metadata: Metadata = {
  title: "Car Details | Rs Private",
  description: "View car details",
};

const CarDetailPage = ({ params }: PageProps) => {
  return <CarDetail />;
};

export default CarDetailPage;