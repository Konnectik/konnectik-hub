import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import Dashboard from "./pages/Dashboard";
import DashboardLayout from "./components/DashboardLayout";
import KZones from "./pages/KZones";
import KPlans from "./pages/KPlans";
import KUsers from "./pages/KUsers";
import AddUser from "./pages/AddUser";
import AddRouter from "./pages/AddRouter";
import AddZone from "./pages/AddZone";
import AddBundle from "./pages/AddBundle";
import PlaceholderPage from "./pages/PlaceholderPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="k-zones" element={<KZones />} />
            <Route path="k-zones/add-zone" element={<AddZone />} />
            <Route path="k-zones/add-router" element={<AddRouter />} />
            <Route path="users" element={<KUsers />} />
            <Route path="users/add" element={<AddUser />} />
            <Route path="k-plans" element={<KPlans />} />
            <Route path="k-plans/add" element={<AddBundle />} />
            <Route path="transactions" element={<PlaceholderPage />} />
            <Route path="help" element={<PlaceholderPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
