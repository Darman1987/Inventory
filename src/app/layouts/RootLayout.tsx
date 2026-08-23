import { Outlet } from 'react-router';
import { AuthProvider } from '../contexts/AuthContext';
import { Toaster } from '../components/ui/sonner';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster richColors position="top-right" />
    </AuthProvider>
  );
}
