//import node modules libraries
import { v4 as uuid } from "uuid";
import {
  IconCar,
  IconBook2,
  IconUsers,
  IconContract,
  IconDashboard,
  IconProng,
  IconBell
} from "@tabler/icons-react";

//import custom type
import { MenuItemType } from "../types/menuTypes";

export const DashboardMenu: MenuItemType[] = [
  {
    id: uuid(),
    title: "Dashboard",
    link: "/admin",
    icon: <IconDashboard size={20} strokeWidth={1.5} />,
  },
  {
    id: uuid(),
    title: "Cars",
    link: "/cars",
    icon: <IconCar size={20} strokeWidth={1.5} />,
  },
  {
    id: uuid(),
    title: "Drivers",
    link: "/drivers",
    icon: <IconUsers size={20} strokeWidth={1.5} />,
  },
  {
    id: uuid(),
    title: "Ledger",
    link: "/ledger",
    icon: <IconBook2 size={20} strokeWidth={1.5} />,
  },

  {
    id: uuid(),
    title: "Agreements",
    link: "/agreements",
    icon: <IconContract size={20} strokeWidth={1.5} />,
  },

  {
    id: uuid(),
    title: "Maintenance Requests",
    link: "/maint",
    icon: <IconProng size={20} strokeWidth={1.5} />,
  },

  {
    id: uuid(),
    title: "Notify Drivers",
    link: "/test-notifications",
    icon: <IconBell size={20} strokeWidth={1.5} />,
  },

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
