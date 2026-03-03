import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import InvoiceList from './pages/InvoiceList';
import InvoiceForm from './pages/InvoiceForm';
import InvoiceDetail from './pages/InvoiceDetail';
import EstimateList from './pages/EstimateList';
import EstimateForm from './pages/EstimateForm';
import EstimateDetail from './pages/EstimateDetail';
import Settings from './pages/Settings';
import Pay from './pages/Pay';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Earnings from './pages/Earnings';

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/pay/:id" element={<Pay />} />

          {/* Protected routes */}
          <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />

          <Route path="/invoices" element={<ProtectedLayout><InvoiceList /></ProtectedLayout>} />
          <Route path="/invoices/new" element={<ProtectedLayout><InvoiceForm /></ProtectedLayout>} />
          <Route path="/invoices/:id" element={<ProtectedLayout><InvoiceDetail /></ProtectedLayout>} />
          <Route path="/invoices/:id/edit" element={<ProtectedLayout><InvoiceForm /></ProtectedLayout>} />

          <Route path="/estimates" element={<ProtectedLayout><EstimateList /></ProtectedLayout>} />
          <Route path="/estimates/new" element={<ProtectedLayout><EstimateForm /></ProtectedLayout>} />
          <Route path="/estimates/:id" element={<ProtectedLayout><EstimateDetail /></ProtectedLayout>} />
          <Route path="/estimates/:id/edit" element={<ProtectedLayout><EstimateForm /></ProtectedLayout>} />

          <Route path="/clients" element={<ProtectedLayout><Clients /></ProtectedLayout>} />
          <Route path="/clients/:id" element={<ProtectedLayout><ClientDetail /></ProtectedLayout>} />

          <Route path="/earnings" element={<ProtectedLayout><Earnings /></ProtectedLayout>} />

          <Route path="/settings" element={<ProtectedLayout><Settings /></ProtectedLayout>} />
          <Route path="/settings/stripe/complete" element={<ProtectedLayout><Settings /></ProtectedLayout>} />
          <Route path="/settings/stripe/refresh" element={<ProtectedLayout><Settings /></ProtectedLayout>} />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
