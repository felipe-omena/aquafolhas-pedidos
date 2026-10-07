import Home from "../page";
import { isAdminRequest } from "../admin-auth";
import AdminLogin from "./admin-login";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdminRequest())) return <AdminLogin />;

  return <Home customerOnly={false} adminOnly />;
}
