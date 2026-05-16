import type { Metadata } from "next";
import DemoClient from "./DemoClient";

export const metadata: Metadata = {
  title: "Relink Demo — See how it works",
  description: "Watch failed deliveries get resolved on WhatsApp in real time.",
};

export default function DemoPage() {
  return <DemoClient />;
}
