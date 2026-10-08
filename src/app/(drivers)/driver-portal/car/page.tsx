// app/dashboard/cars/[id]/page.tsx
import { Metadata } from "next";
import CarDetail from "../../../../components/driver-portal/cars/CarDetail";


export const metadata: Metadata = {
  title: "Car Details | Rs Private",
  description: "View car details",
};

const CarDetailPage = () => {
  return <CarDetail />;
};

export default CarDetailPage;