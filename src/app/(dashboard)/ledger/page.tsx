// app/dashboard/ledger/page.tsx
"use client";

import { Fragment } from "react";
import LedgerListHeader from "../../../components/ledger/LedgerListHeader";
import LedgerList from "../../../components/ledger/LedgerList";

const LedgerPage = () => {
  return (
    <Fragment>
      <LedgerListHeader />
      <LedgerList />
    </Fragment>
  );
};

export default LedgerPage;