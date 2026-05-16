export const dynamic = "force-dynamic";

import DashboardClient from "./DashboardClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Relink — Dashboard" };

export default function DashboardPage() {
  return <DashboardClient operatorId="" operatorName="" />;
}
