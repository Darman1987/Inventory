import { useState } from 'react';
import { Building2, Plus, Check, ChevronDown, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { OrganizationSettings } from './OrganizationSettings';

export function OrganizationSwitcher() {
  const { currentOrg, organizations, switchOrganization, createOrganization, canCreateOrganizations } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newOrgName.trim()) {
      await createOrganization(newOrgName.trim());
      setNewOrgName('');
      setShowCreateForm(false);
      setShowMenu(false);
    }
  };

  const handleSwitchOrg = (orgId: string) => {
    switchOrganization(orgId);
    setShowMenu(false);
  };

  const handleOpenSettings = () => {
    setShowMenu(false);
    setShowSettings(true);
  };

  if (!currentOrg) return null;

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left"
        >
          <Building2 className="w-4 h-4 text-gray-600" />
          <div className="hidden sm:block">
            <div className="text-sm font-medium text-gray-900 max-w-[150px] truncate">
              {currentOrg.name}
            </div>
            <div className="text-xs text-gray-500">Organization</div>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-600 ml-1" />
        </button>

        {showMenu && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => {
                setShowMenu(false);
                setShowCreateForm(false);
              }}
            ></div>
            <div className="absolute left-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
              {!showCreateForm ? (
                <>
                  <div className="p-2 border-b border-gray-200">
                    <p className="text-xs font-medium text-gray-500 px-2 py-1">
                      Your Organizations
                    </p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {organizations.map(org => (
                      <button
                        key={org.id}
                        onClick={() => handleSwitchOrg(org.id)}
                        className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {org.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              Created {new Date(org.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {currentOrg.id === org.id && (
                          <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="p-2 border-t border-gray-200 space-y-1">
                    <button
                      onClick={handleOpenSettings}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      Organization Settings
                    </button>
                    {canCreateOrganizations && (
                      <button
                        onClick={() => setShowCreateForm(true)}
                        className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Create New Organization
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <form onSubmit={handleCreateOrg} className="p-4">
                  <p className="text-sm font-medium text-gray-900 mb-3">
                    Create New Organization
                  </p>
                  <input
                    type="text"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="Organization name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={!newOrgName.trim()}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewOrgName('');
                      }}
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </>
        )}
      </div>

      {showSettings && (
        <OrganizationSettings onClose={() => setShowSettings(false)} />
      )}
    </>
  );
}
