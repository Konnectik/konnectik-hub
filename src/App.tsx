import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import Index from "./pages/Index";
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import Dashboard from "./pages/Dashboard";
import DashboardLayout from "./components/DashboardLayout";
import KZones from "./pages/KZones";
import KPlans from "./pages/KPlans";
import KUsers from "./pages/KUsers";
import Transx from "./pages/Transactions";
import AddUser from "./pages/AddUser";
import AddAccessPoint from "./pages/AddAccessPoint";
import AddBundle from "./pages/AddBundle";
import MyBalance from "./pages/MyBalance";
import PlaceholderPage from "./pages/PlaceholderPage";
import NotFound from "./pages/NotFound";
import EditAccessPoint from "./pages/EditAccessPoint";
import EditBundle from "./pages/EditBundle";
import ProfileSettings from "./pages/ProfileSettings";
import UserDetail from "./pages/UserDetail";
import BulkNotifications from "./pages/BulkNotifications";
import ApHealth from "./pages/ApHealth";
import ProviderDashboard from "./pages/ProviderDashboard";
import ProviderManagement from "./pages/ProviderManagement";
import ProviderDetail from "./pages/ProviderDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/signin" element={<SignIn />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="k-zones" element={<KZones />} />
              <Route path="k-zones/add" element={<AddAccessPoint />} />
              <Route path="k-zones/:id" element={<EditAccessPoint />} />
              <Route path="users" element={<AdminRoute><KUsers /></AdminRoute>} />
              <Route path="users/add" element={<AdminRoute><AddUser /></AdminRoute>} />
              <Route path="users/:id" element={<AdminRoute><UserDetail /></AdminRoute>} />
              <Route path="k-plans" element={<AdminRoute><KPlans /></AdminRoute>} />
              <Route path="k-plans/add" element={<AdminRoute><AddBundle /></AdminRoute>} />
              <Route path="k-plans/:id" element={<AdminRoute><EditBundle /></AdminRoute>} />
              <Route path="providers" element={<AdminRoute><ProviderManagement /></AdminRoute>} />
              <Route path="providers/:id" element={<AdminRoute><ProviderDetail /></AdminRoute>} />
              <Route path="transactions" element={<Transx />} />
              <Route path="notifications" element={<AdminRoute><BulkNotifications /></AdminRoute>} />
              <Route path="ap-health" element={<AdminRoute><ApHealth /></AdminRoute>} />
              <Route path="mybalance" element={<MyBalance />} />
              <Route path="provider" element={<ProviderDashboard />} />
              <Route path="help" element={<PlaceholderPage />} />
              <Route path="profile" element={<ProfileSettings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
