import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Layout/Sidebar';
import Navbar from './components/Layout/Navbar';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Drivers from './pages/Drivers';
import Trips from './pages/Trips';
import Maintenance from './pages/Maintenance';
import Reports from './pages/Reports';

// Shared shell (sidebar + navbar) for every authenticated screen
function AppLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-col">
        <Navbar />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/vehicles" element={
          <ProtectedRoute roles={['fleet_manager']}><Vehicles /></ProtectedRoute>
        } />

        <Route path="/drivers" element={
          <ProtectedRoute roles={['fleet_manager', 'safety_officer']}><Drivers /></ProtectedRoute>
        } />

        <Route path="/trips" element={
          <ProtectedRoute roles={['fleet_manager', 'driver']}><Trips /></ProtectedRoute>
        } />

        <Route path="/maintenance" element={
          <ProtectedRoute roles={['fleet_manager']}><Maintenance /></ProtectedRoute>
        } />

        <Route path="/reports" element={
          <ProtectedRoute roles={['fleet_manager', 'financial_analyst']}><Reports /></ProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} />} />
    </Routes>
  );
}
