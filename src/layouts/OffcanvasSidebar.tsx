"use client";
//import node modules libraries
import { Image } from "react-bootstrap";
import Offcanvas from "react-bootstrap/Offcanvas";
import OffcanvasBody from "react-bootstrap/OffcanvasBody";
import OffcanvasHeader from "react-bootstrap/OffcanvasHeader";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react"; // Add useRef

//import custom components
import Sidebar from "./Sidebar";

//import custom hooks
import useMenu from "../hooks/useMenu";
import { getAssetPath } from "../helper/assetPath";

const OffcanvasSidebar = () => {
  const { showMenu, toggleMenuHandler } = useMenu();
  const pathname = usePathname();
  const previousPathname = useRef(pathname); // Track previous pathname

  // Close menu only when route changes (not when menu opens)
  useEffect(() => {
    // Check if pathname actually changed (not initial render)
    if (previousPathname.current !== pathname && showMenu) {
      toggleMenuHandler(false);
    }
    // Update the previous pathname
    previousPathname.current = pathname;
  }, [pathname, showMenu, toggleMenuHandler]);

  return (
    <Offcanvas
      placement={"start"}
      show={showMenu}
      onHide={() => toggleMenuHandler(false)}
      backdrop={true}
      bsPrefix="offcanvasNav offcanvas offcanvas-start "
    >
      <OffcanvasHeader closeButton>
        <Link href="/" className="d-flex align-items-center gap-2">
          {/* <Image src={getAssetPath("/images/brand/logo/logo-icon2.svg")} alt="" /> */}
          <span className="fw-bold small  site-logo-text" style={{color : "orange"}}> RS PRIVATE HIRE LTD </span>
        </Link>
      </OffcanvasHeader>
      <OffcanvasBody className="p-0 ">
        <Sidebar hideLogo />
      </OffcanvasBody>
    </Offcanvas>
  );
};

export default OffcanvasSidebar;