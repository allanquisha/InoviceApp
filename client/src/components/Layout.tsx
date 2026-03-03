import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, ClipboardList, Settings, LogOut, Users, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">FieldPay</div>
        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <LayoutDashboard /> Dashboard
          </NavLink>
          <NavLink to="/invoices" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <FileText /> Invoices
          </NavLink>
          <NavLink to="/estimates" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <ClipboardList /> Estimates
          </NavLink>
          <NavLink to="/clients" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <Users /> Clients
          </NavLink>
          <NavLink to="/earnings" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <TrendingUp /> Earnings
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <Settings /> Settings
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div style={{ padding: '0 4px 8px', fontSize: 12, color: 'var(--text-muted)' }}>
            {user?.firstName} {user?.lastName}
          </div>
          <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={handleLogout}>
            <LogOut /> Sign out
          </button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
