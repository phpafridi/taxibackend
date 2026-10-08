//import node modules libraries
import { Fragment } from "react";
import { Metadata } from "next";

//import custom components
import DriverList from "../../../components/drivers/DriverList";
import DriverListHeader from "../../../components/drivers/DriverListHeader";

export const metadata: Metadata = {
  title: "Drivers | Rs Private",
  description: "Private Rs Taxi",
};

const Drivers = () => {
  return (
    <Fragment>
      <DriverListHeader />
      <DriverList />
    </Fragment>
  );
};

export default Drivers;
