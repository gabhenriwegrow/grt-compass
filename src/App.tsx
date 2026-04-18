import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Initiatives from "./pages/Initiatives";
import InitiativeForm from "./pages/InitiativeForm";
import InitiativeDetail from "./pages/InitiativeDetail";
import Checkins from "./pages/Checkins";
import Reports from "./pages/Reports";
import Import from "./pages/Import";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner theme="dark" position="top-right" />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/initiatives" element={<Initiatives />} />
              <Route path="/initiatives/new" element={<InitiativeForm />} />
              <Route path="/initiatives/:id" element={<InitiativeDetail />} />
              <Route path="/initiatives/:id/edit" element={<InitiativeForm />} />
              <Route path="/checkins" element={<Checkins />} />
              <Route path="/relatorios" element={<Reports />} />
              <Route path="/import" element={<Import />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
