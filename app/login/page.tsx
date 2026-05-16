export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Relink — Login",
};

export default function LoginPage() {
  return <LoginClient />;
}
