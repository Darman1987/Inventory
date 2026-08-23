import { useState, useEffect } from 'react';
import { KeyRound, Wand2, X, Users, Shield, User as UserIcon, Lock, UserRoundPlus } from 'lucide-react';
import { OrganizationMemberWithUser, OrganizationRole, useAuth } from '../contexts/AuthContext';

interface OrganizationSettingsProps {
  onClose: () => void;
}

export function OrganizationSettings({ onClose }: OrganizationSettingsProps) {
  const {
    currentOrg,
    updateOrganizationMemberRole,
    updateUserPassword,
    canManageOrganization,
    getUserRole,
    listOrganizationMembers,
    isRootAdmin,
    createUser,
  } = useAuth();
  const [members, setMembers] = useState<OrganizationMemberWithUser[]>([]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<OrganizationRole>('user');
  const [pendingRoleChanges, setPendingRoleChanges] = useState<Record<string, OrganizationRole>>({});
  const [passwordTarget, setPasswordTarget] = useState<OrganizationMemberWithUser | null>(null);
  const [rootPassword, setRootPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const scopedRole = currentOrg ? getUserRole(currentOrg.id) : null;
  const canManageMembers = currentOrg ? canManageOrganization(currentOrg.id) : false;

  useEffect(() => {
    void loadMembers();
  }, [currentOrg]);

  const loadMembers = async () => {
    if (!currentOrg) return;
    const orgMembers = await listOrganizationMembers(currentOrg.id);
    setMembers(orgMembers.sort((a, b) => a.user.name.localeCompare(b.user.name)));
    setPendingRoleChanges({});
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handlePendingRoleChange = (member: OrganizationMemberWithUser, nextRole: OrganizationRole) => {
    clearMessages();
    setPendingRoleChanges((current) => {
      const next = { ...current };
      if (nextRole === member.role) {
        delete next[member.userId];
      } else {
        next[member.userId] = nextRole;
      }
      return next;
    });
  };

  const handleConfirmRoleChange = async (member: OrganizationMemberWithUser) => {
    clearMessages();

    const nextRole = pendingRoleChanges[member.userId];
    if (!nextRole || nextRole === member.role) return;

    const result = await updateOrganizationMemberRole(member.organizationId, member.userId, nextRole);

    if (result) {
      setSuccess(`Updated ${member.user.name} to ${nextRole}.`);
      setPendingRoleChanges((current) => {
        const next = { ...current };
        delete next[member.userId];
        return next;
      });
      void loadMembers();
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError('Unable to update the user role.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const cancelPendingRoleChange = (userId: string) => {
    setPendingRoleChanges((current) => {
      const next = { ...current };
      delete next[userId];
      return next;
    });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!currentOrg) return;

    const result = await createUser({
      name: newUserName,
      email: newUserEmail,
      password: newUserPassword,
      organizationId: currentOrg.id,
      role: newUserRole,
    });

    if (result) {
      setSuccess(`Created ${newUserEmail} in ${currentOrg.name} as ${newUserRole}.`);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('user');
      void loadMembers();
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError('Unable to create that user. The email may already exist, the password may be too short, or you may not have access to this organization.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const generatePassword = () => {
    const words = ['stock', 'shelf', 'count', 'batch', 'scan', 'crate'];
    const first = words[Math.floor(Math.random() * words.length)];
    const second = words[Math.floor(Math.random() * words.length)];
    const suffix = crypto.getRandomValues(new Uint32Array(1))[0].toString(36).slice(0, 5);
    setNewUserPassword(`${first}-${second}-${suffix}`);
  };

  const generateRootPassword = () => {
    const words = ['stock', 'shelf', 'count', 'batch', 'scan', 'crate'];
    const first = words[Math.floor(Math.random() * words.length)];
    const second = words[Math.floor(Math.random() * words.length)];
    const suffix = crypto.getRandomValues(new Uint32Array(1))[0].toString(36).slice(0, 5);
    setRootPassword(`${first}-${second}-${suffix}`);
  };

  const handleRootPasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!passwordTarget) return;

    const result = await updateUserPassword(passwordTarget.userId, rootPassword);

    if (result) {
      setSuccess(`Updated password for ${passwordTarget.user.name}.`);
      setPasswordTarget(null);
      setRootPassword('');
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError('Unable to update that password.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const getRoleIcon = (role: OrganizationRole | 'root_admin') => {
    switch (role) {
      case 'root_admin':
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-600" />;
      default:
        return <UserIcon className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleBadgeColor = (role: OrganizationRole | 'root_admin') => {
    switch (role) {
      case 'root_admin':
        return 'bg-amber-100 text-amber-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!currentOrg) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Organization Settings</h2>
            <p className="text-sm text-gray-600 mt-1">{currentOrg.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!canManageMembers && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
              <Lock className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">This organization is view only for your account.</span>
            </div>
          )}

          {canManageMembers && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <UserRoundPlus className="w-5 h-5 text-blue-600" />
                <h3 className="font-medium text-gray-900">Create User Account</h3>
              </div>
              <form onSubmit={handleCreateUser} className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Full name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_160px]">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          className="w-full px-9 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          minLength={6}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={generatePassword}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 border border-blue-200 bg-white text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Wand2 className="h-4 w-4" />
                        Generate
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as OrganizationRole)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Create User
                </button>
              </form>
              <p className="text-xs text-blue-700 mt-2">
                The user is added directly to this organization. No invitation email is sent.
              </p>
            </div>
          )}

          {error && (
            <div className="p-2 bg-red-100 border border-red-300 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-2 bg-green-100 border border-green-300 text-green-700 rounded text-sm">
              {success}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-gray-600" />
              <h3 className="font-medium text-gray-900">
                Members ({members.length})
              </h3>
            </div>
            <div className="space-y-2">
              {members.map((member) => {
                const selectedRole = pendingRoleChanges[member.userId] ?? member.role;
                const hasPendingRoleChange = selectedRole !== member.role;

                return (
                <div
                  key={member.userId}
                  className="flex flex-col gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-medium">
                      {member.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{member.user.name}</p>
                      <p className="text-sm text-gray-600">{member.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(member.user.role === 'root_admin' ? 'root_admin' : member.role)}`}>
                      {getRoleIcon(member.user.role === 'root_admin' ? 'root_admin' : member.role)}
                      {member.user.role === 'root_admin' ? 'Root Admin' : member.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                    {canManageMembers && (
                      <>
                        <select
                          value={selectedRole}
                          onChange={(e) => handlePendingRoleChange(member, e.target.value as OrganizationRole)}
                          className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                        {hasPendingRoleChange && (
                          <>
                            <button
                              type="button"
                              onClick={() => void handleConfirmRoleChange(member)}
                              className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => cancelPendingRoleChange(member.userId)}
                              className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-100 transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </>
                    )}
                    {isRootAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setPasswordTarget(member);
                          setRootPassword('');
                          clearMessages();
                        }}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-200 bg-white text-amber-700 text-sm font-medium hover:bg-amber-50 transition-colors"
                      >
                        <KeyRound className="h-4 w-4" />
                        Password
                      </button>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              <strong>Your scope:</strong> {isRootAdmin ? 'Root admin across all organizations' : scopedRole === 'admin' ? 'Organization admin' : 'Read-only user'}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Organization created on {new Date(currentOrg.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
      {passwordTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Update User Password</h3>
              <p className="mt-1 text-sm text-gray-600">
                {passwordTarget.user.name} ({passwordTarget.user.email})
              </p>
            </div>
            <form onSubmit={handleRootPasswordUpdate} className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={rootPassword}
                    onChange={(e) => setRootPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    minLength={6}
                    className="w-full px-9 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={generateRootPassword}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 border border-amber-200 bg-white text-amber-700 rounded-lg hover:bg-amber-50 transition-colors"
                >
                  <Wand2 className="h-4 w-4" />
                  Generate
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 transition-colors"
                >
                  Update Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPasswordTarget(null);
                    setRootPassword('');
                  }}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
