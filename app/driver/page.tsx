import DriverClient from "./DriverClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Relink — Driver App",
  description: "Mark a delivery and notify the customer instantly.",
};

export default function DriverPage() {
  return <DriverClient />;
}
