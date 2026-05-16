import { cookies } from "next/headers";

export interface SessionOperator {
  operator_id: string;
  operator_name: string;
  operator_email: string;
}

export async function getSession(): Promise<SessionOperator | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("relink_session")?.value;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.operator_id) return null;
    return parsed as SessionOperator;
  } catch {
    return null;
  }
}
