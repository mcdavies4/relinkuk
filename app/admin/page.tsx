import AdminClient from "./AdminClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Relink — Admin",
  description: "Manage courier operators.",
};

export default function AdminPage() {
  return <AdminClient />;
}
