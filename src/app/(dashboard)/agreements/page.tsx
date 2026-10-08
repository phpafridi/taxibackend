// app/agreements/page.tsx (or page.jsx)
import { Fragment } from "react";

// Import agreement components (make sure these exist)
import AgreementList from "../../../components/agreements/AgreementList";
import AgreementListHeader from "../../../components/agreements/AgreementListHeader";


const AgreementsPage = () => {
  return (
    <Fragment>
      <AgreementListHeader />
      <AgreementList />
    </Fragment>
  );
};

export default AgreementsPage;