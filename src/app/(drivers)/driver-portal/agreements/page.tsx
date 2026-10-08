// app/agreements/page.tsx (or page.jsx)
import { Fragment } from "react";

// Import agreement components (make sure these exist)
import AgreementList from "../../../../components/driver-portal/agreements/AgreementList";
import AgreementListHeader from "../../../../components/driver-portal/agreements/AgreementListHeader";


const AgreementsPage = () => {
  return (
    <Fragment>
      <AgreementListHeader />
      <AgreementList />
    </Fragment>
  );
};

export default AgreementsPage;