export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import UploadClient from "./UploadClient";

export const metadata: Metadata = { title: "Relink — Upload Manifest" };

export default function UploadPage() {
  return <UploadClient operatorName="" />;
}
