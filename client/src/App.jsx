import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { useAuth } from './hooks/authContext';
import { ToastProvider } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Students from './pages/Students';
import Matching from './pages/Matching';
import Assignments from './pages/Assignments';
import MisAsignaciones from './pages/MisAsignaciones';
import Landing from './pages/Landing';
import RegistroPaciente from './pages/RegistroPaciente';
import RegistroEstudiante from './pages/RegistroEstudiante';
import Notifications from './pages/Notifications';
import './App.css';

function homeFor(role) {
  return role === 'student' ? '/mis-asignaciones' : '/';
}

function ProtectedRoute({ children }) {
  const { isLoggedIn, loading } = useAuth();
  if (loading) return <div className="loading" role="status">Cargando…</div>;
  if (!isLoggedIn) return <Navigate to="/login" />;
  return children;
}

function RoleRoute({ roles, children }) {
  const { user } = useAuth();
  return roles.includes(user?.role) ? children : <Navigate to={homeFor(user?.role)} replace />;
}

function AppRoutes() {
  const { isLoggedIn, loading, user } = useAuth();

  if (loading) return <div className="loading" role="status">Cargando…</div>;

  return (
    <Routes>
      <Route path="/landing" element={<Landing />} />
      <Route path="/registro-paciente" element={<RegistroPaciente />} />
      <Route path="/registro-estudiante" element={<RegistroEstudiante />} />
      <Route path="/login" element={isLoggedIn ? <Navigate to={homeFor(user?.role)} /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<RoleRoute roles={['admin', 'coordinator']}><Dashboard /></RoleRoute>} />
        <Route path="patients" element={<RoleRoute roles={['admin', 'coordinator']}><Patients /></RoleRoute>} />
        <Route path="students" element={<RoleRoute roles={['admin', 'coordinator']}><Students /></RoleRoute>} />
        <Route path="matching" element={<RoleRoute roles={['admin', 'coordinator']}><Matching /></RoleRoute>} />
        <Route path="assignments" element={<RoleRoute roles={['admin', 'coordinator']}><Assignments /></RoleRoute>} />
        <Route path="mis-asignaciones" element={<RoleRoute roles={['student']}><MisAsignaciones /></RoleRoute>} />
        <Route path="notifications" element={<RoleRoute roles={['admin', 'coordinator']}><Notifications /></RoleRoute>} />
        <Route path="*" element={<Navigate to={homeFor(user?.role)} replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
