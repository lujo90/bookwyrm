import { redirect } from "next/navigation";

/**
 * Root path "/" redirects to /dashboard.
 * The middleware will catch unauthenticated users and send them to /login first.
 */
export default function RootPage() {
  redirect("/dashboard");
}
