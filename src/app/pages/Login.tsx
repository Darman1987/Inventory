import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Package, Eye, EyeOff, Mail, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isDemoMode } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const success = await login(email, password);

    if (success) {
      navigate('/dashboard');
    } else {
      setError('Invalid email or password');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#1e3a5f_0%,#0f172a_40%,#020617_100%)] p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-semibold text-white mb-2">
            Inventory Management
          </h1>
          <p className="text-slate-300">Sign in to manage your inventory</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-blue-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {isDemoMode ? (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">Demo Credentials:</p>
              <div className="space-y-1 text-sm text-blue-800">
                <p><strong>Root Admin:</strong> admin@inventory.com / admin123</p>
                <p><strong>User:</strong> demo@inventory.com / demo123</p>
                <p><strong>User:</strong> john@example.com / john123</p>
                <p><strong>User:</strong> jane@example.com / jane123</p>
              </div>
              <p className="text-xs text-blue-700 mt-3">
                Supabase keys are not configured yet, so the app is running in local demo mode.
              </p>
            </div>
          ) : (
            <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-sm font-medium text-emerald-900 mb-1">Supabase Mode</p>
              <p className="text-sm text-emerald-800">
                Sign in with a real Supabase Auth user from your project.
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-slate-300 mt-6">
          Secure inventory management system
        </p>
      </div>
    </div>
  );
}
