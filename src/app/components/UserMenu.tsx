import { useMemo, useState } from 'react';
import {
  Building2,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  Plus,
  Settings,
  User,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { OrganizationSettings } from './OrganizationSettings';
import { cn } from './ui/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface UserMenuProps {
  onLogout: () => Promise<void>;
  compact?: boolean;
  className?: string;
}

export function UserMenu({ onLogout, compact = false, className }: UserMenuProps) {
  const { user, currentOrg, organizations, switchOrganization, createOrganization, changePassword, canCreateOrganizations, isRootAdmin } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const initials = useMemo(() => {
    const source = user?.name?.trim() || user?.email?.trim() || 'U';
    return source
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }, [user?.email, user?.name]);

  const handleCreateOrg = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedName = newOrgName.trim();
    if (!trimmedName) return;

    setIsCreatingOrg(true);
    await createOrganization(trimmedName);
    setIsCreatingOrg(false);
    setNewOrgName('');
    setShowCreateForm(false);
  };

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordMessage('');

    if (newPassword.trim().length < 6) {
      setPasswordMessage('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage('Passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    const changed = await changePassword(newPassword);
    setIsChangingPassword(false);

    if (changed) {
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage('');
      setShowPasswordForm(false);
    } else {
      setPasswordMessage('Unable to change password right now.');
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-3 rounded-2xl border border-white/80 bg-white/85 px-3 py-2 text-left shadow-sm transition-colors hover:bg-white',
              compact && 'w-full justify-between border-slate-200 bg-slate-50/90 px-4 py-3',
              className,
            )}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700">
              {initials}
            </div>
            <div className={cn('min-w-0', compact ? 'block flex-1' : 'hidden sm:block')}>
              <div className="truncate text-sm font-medium text-slate-900">
                {user?.name ?? 'Signed in'}
              </div>
              <div className="truncate text-xs text-slate-500">
                {currentOrg?.name ?? user?.email}
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-80 rounded-2xl border-slate-200 bg-white p-2 shadow-xl">
          <DropdownMenuLabel className="rounded-xl px-3 py-3">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                <User className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{user?.name ?? 'Signed in user'}</p>
                <p className="truncate text-xs text-slate-500">{user?.email}</p>
                <p className="mt-1 text-xs font-medium text-amber-700">
                  {isRootAdmin ? 'Root Admin' : 'Read access by default'}
                </p>
                {currentOrg && (
                  <p className="mt-1 truncate text-xs font-medium text-sky-700">
                    Current organization: {currentOrg.name}
                  </p>
                )}
              </div>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="bg-slate-200" />

          <div className="px-2 py-2">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Organizations
            </p>
            <div className="max-h-60 space-y-1 overflow-y-auto">
              {organizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => switchOrganization(org.id)}
                  className="rounded-xl px-3 py-2.5"
                >
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{org.name}</p>
                    <p className="text-xs text-slate-500">
                      Created {new Date(org.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {currentOrg?.id === org.id && <Check className="h-4 w-4 text-sky-600" />}
                </DropdownMenuItem>
              ))}
            </div>
          </div>

          <DropdownMenuSeparator className="bg-slate-200" />

          <DropdownMenuItem
            onClick={() => setShowSettings(true)}
            className="rounded-xl px-3 py-2.5 text-slate-700"
          >
            <Settings className="h-4 w-4" />
            Organization Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowPasswordForm(true)}
            className="rounded-xl px-3 py-2.5 text-slate-700"
          >
            <KeyRound className="h-4 w-4" />
            Change Password
          </DropdownMenuItem>
          {canCreateOrganizations && (
            <DropdownMenuItem
              onClick={() => setShowCreateForm(true)}
              className="rounded-xl px-3 py-2.5 text-sky-700 focus:text-sky-700"
            >
              <Plus className="h-4 w-4" />
              Create New Organization
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator className="bg-slate-200" />
          <DropdownMenuItem
            onClick={() => {
              void onLogout();
            }}
            variant="destructive"
            className="rounded-xl px-3 py-2.5"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-white/80 bg-white p-6 shadow-2xl">
            <div className="mb-4">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">Create Organization</h2>
              <p className="mt-1 text-sm text-slate-500">
                Add another workspace to keep inventory separated by team or business.
              </p>
            </div>

            <form onSubmit={handleCreateOrg} className="space-y-4">
              <input
                type="text"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="Organization name"
                autoFocus
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:ring-2 focus:ring-sky-500"
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={!newOrgName.trim() || isCreatingOrg}
                  className="inline-flex flex-1 items-center justify-center rounded-2xl bg-sky-600 px-4 py-3 text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreatingOrg ? 'Creating...' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewOrgName('');
                  }}
                  className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-700 transition-colors hover:bg-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPasswordForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-white/80 bg-white p-6 shadow-2xl">
            <div className="mb-4">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">Change Password</h2>
              <p className="mt-1 text-sm text-slate-500">
                Update the password for {user?.email}.
              </p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  autoFocus
                  minLength={6}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 pr-12 text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:ring-2 focus:ring-sky-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
                  title={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  minLength={6}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 pr-12 text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:ring-2 focus:ring-sky-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                </button>
              </div>
              {passwordMessage && (
                <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {passwordMessage}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={!newPassword || !confirmPassword || isChangingPassword}
                  className="inline-flex flex-1 items-center justify-center rounded-2xl bg-sky-600 px-4 py-3 text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isChangingPassword ? 'Updating...' : 'Update'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordMessage('');
                  }}
                  className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-700 transition-colors hover:bg-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSettings && <OrganizationSettings onClose={() => setShowSettings(false)} />}
    </>
  );
}
