// app/dashboard/cars/page.tsx
"use client";

import { Fragment } from "react";
import { Metadata } from "next";

// Import custom components (you'll need to create these)
import CarList from "../../../components/cars/CarList";
import CarListHeader from "../../../components/cars/CarListHeader";

// For server components, metadata should be exported separately

const CarsPage = () => {
  return (
    <Fragment>
      <CarListHeader />
      <CarList />
    </Fragment>
  );
};

export default CarsPage;