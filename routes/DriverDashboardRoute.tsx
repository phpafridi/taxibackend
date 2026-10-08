//import node modules libraries
import { v4 as uuid } from "uuid";
import {
  IconCar,
  IconBook2,
  IconUser,
  IconContract,
  IconDashboard
} from "@tabler/icons-react";

//import custom type
import { MenuItemType } from "../types/menuTypes";

export const DriverDashboardMenu: MenuItemType[] = [
  {
    id: uuid(),
    title: "Dashboard",
    link: "/driver-portal/dashboard",
    icon: <IconDashboard size={20} strokeWidth={1.5} />,
  },
  {
    id: uuid(),
    title: "My Car",
    link: "/driver-portal/car",
    icon: <IconCar size={20} strokeWidth={1.5} />,
  },
  {
    id: uuid(),
    title: "Profile",
    link: "/driver-portal/profile",
    icon: <IconUser size={20} strokeWidth={1.5} />,
  },
  {
    id: uuid(),
    title: "Ledger",
    link: "/driver-portal/ledger",
    icon: <IconBook2 size={20} strokeWidth={1.5} />,
  },

  {
    id: uuid(),
    title: "Agreements",
    link: "/driver-portal/agreements",
    icon: <IconContract size={20} strokeWidth={1.5} />,
  },

  // {
  //   id: uuid(),
  //   title: "Test",
  //   link: "/driver-portal/test-notifications",
  //   icon: <IconContract size={20} strokeWidth={1.5} />,
  // },


  // {
  //   id: uuid(),
  //   title: "Pages",
  //   grouptitle: true,
  // },
  // {
  //   id: uuid(),
  //   title: "Pages",
  //   icon: <IconFile size={20} strokeWidth={1.5} />,
  //   children: [
  //     { id: uuid(), name: "Maintenance", link: "maintenance" },
  //     { id: uuid(), name: "404 Error", link: "not-found" },
  //   ],
  // },
];
