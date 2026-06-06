import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import AuthLayout from "../layouts/AuthLayout";
import AppLayout from "../layouts/AppLayout";
import PublicLayout from "../layouts/PublicLayout";

import Login from "../sections/Login";
import Dashboard from "../sections/Dashboard";
import Clientes from "../sections/Clientes";
import Productos from "../sections/Productos";
import Deudas from "../sections/Deudas";
import Roles from "../sections/Roles";
import Auditorias from "../sections/Auditorias";
import Catalogo from "../sections/Catalogo";
import SobreNosotros from "../sections/SobreNosotros";
import NotFound from "../sections/notFound";

const isAuthenticated = () => {
  return !!localStorage.getItem("token");
};

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/catalogo" />} />
        {/* LOGIN */}
        <Route
          path="/login"
          element={
            <AuthLayout>
              <Login />
            </AuthLayout>
          }
        />

        {/* ADMIN / DASHBOARD */}
        <Route
          path="/app"
          element={
            isAuthenticated() ? (
              <AppLayout />
            ) : (
              <Navigate to="/login" />
            )
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="productos" element={<Productos />} />
          <Route path="deudas" element={<Deudas />} />
          <Route path="roles" element={<Roles />} />
          <Route path="auditorias" element={<Auditorias />} />
        </Route>

        {/* PÚBLICAS */}
        <Route
          path="/catalogo"
          element={
            <PublicLayout>
              <Catalogo />
            </PublicLayout>
          }
        />

        <Route
          path="/sobre-nosotros"
          element={
            <PublicLayout>
              <SobreNosotros />
            </PublicLayout>
          }
        />
        
      {/* 404 Not Found */}
      <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}