import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

// Pages
import LandingPage from "./pages/LandingPage";
import ClientLogin from "./pages/client/ClientLogin";
import ClientRegister from "./pages/client/ClientRegister";
import ClientDashboard from "./pages/client/ClientDashboard";
import ClientCourse from "./pages/client/ClientCourse";
import ChauffeurLogin from "./pages/chauffeur/ChauffeurLogin";
import ChauffeurDashboard from "./pages/chauffeur/ChauffeurDashboard";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";

// Auth context
import { AuthProvider, useAuth } from "./context/AuthContext";

// Protected Route Component
const ProtectedRoute = ({ children, allowedType }) => {
  const { user, token } = useAuth();
  
  if (!token) {
    return <Navigate to="/" replace />;
  }
  
  if (allowedType && user?.type !== allowedType) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      
      {/* Client Routes */}
      <Route path="/client/login" element={<ClientLogin />} />
      <Route path="/client/register" element={<ClientRegister />} />
      <Route path="/client" element={
        <ProtectedRoute allowedType="client">
          <ClientDashboard />
        </ProtectedRoute>
      } />
      <Route path="/client/course/:courseId" element={
        <ProtectedRoute allowedType="client">
          <ClientCourse />
        </ProtectedRoute>
      } />
      
      {/* Chauffeur Routes */}
      <Route path="/chauffeur/login" element={<ChauffeurLogin />} />
      <Route path="/chauffeur" element={
        <ProtectedRoute allowedType="chauffeur">
          <ChauffeurDashboard />
        </ProtectedRoute>
      } />
      
      {/* Admin Routes */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={
        <ProtectedRoute allowedType="admin">
          <AdminDashboard />
        </ProtectedRoute>
      } />
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#09090B]">
          <AppRoutes />
          <Toaster 
            position="top-center" 
            toastOptions={{
              style: {
                background: '#18181B',
                color: '#fff',
                border: '1px solid #27272a',
              },
            }}
          />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
