// app/agreements/page.tsx (or page.jsx)
import { Fragment } from "react";

// Import agreement components (make sure these exist)
import LedgerList from "../../../../components/driver-portal/ledger/LedgerList";
import LedgerListHeader from "../../../../components/driver-portal/ledger/LedgerListHeader";


const AgreementsPage = () => {
  return (
    <Fragment>
      <LedgerListHeader />
      <LedgerList />
    </Fragment>
  );
};

export default AgreementsPage;