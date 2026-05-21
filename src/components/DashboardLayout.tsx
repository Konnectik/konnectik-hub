import { Outlet } from "react-router-dom";
import DashboardNav from "./DashboardNav";

const DashboardLayout = () => {
  return (
    <div className="min-h-screen bg-secondary">
      <DashboardNav />
      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
