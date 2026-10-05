import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { demoUsers } from '../lib/demo-data';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export type GlobalRole = 'root_admin' | 'user';
export type OrganizationRole = 'admin' | 'user';
type LegacyOrganizationRole = 'owner' | 'admin' | 'member' | 'user';

export interface User {
  id: string;
  email: string;
  name: string;
  role: GlobalRole;
}

export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export interface OrganizationMember {
  userId: string;
  organizationId: string;
  role: OrganizationRole;
  joinedAt: string;
}

export interface OrganizationMemberWithUser extends OrganizationMember {
  user: User;
}

interface CreateUserPayload {
  email: string;
  name: string;
  password: string;
  organizationId: string;
  role: OrganizationRole;
}

interface AuthContextType {
  user: User | null;
  currentOrg: Organization | null;
  organizations: Organization[];
  isRootAdmin: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  createOrganization: (name: string) => Promise<boolean>;
  createUser: (payload: CreateUserPayload) => Promise<boolean>;
  changePassword: (password: string) => Promise<boolean>;
  updateUserPassword: (userId: string, password: string) => Promise<boolean>;
  switchOrganization: (orgId: string) => void;
  inviteUserToOrganization: (email: string, organizationId: string, role: OrganizationRole) => Promise<boolean>;
  updateOrganizationMemberRole: (organizationId: string, userId: string, role: OrganizationRole) => Promise<boolean>;
  getUserRole: (organizationId: string) => GlobalRole | OrganizationRole | null;
  canCreateOrganizations: boolean;
  canManageOrganization: (organizationId: string) => boolean;
  canViewOrganization: (organizationId: string) => boolean;
  listOrganizationMembers: (organizationId: string) => Promise<OrganizationMemberWithUser[]>;
  isLoading: boolean;
  isDemoMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_ORG_STORAGE_KEY = 'current_org_id';
const DEMO_CUSTOM_USERS_STORAGE_KEY = 'demo_custom_users';
const DEMO_PASSWORD_OVERRIDES_STORAGE_KEY = 'demo_password_overrides';
const REMOVED_DEMO_USER_IDS = new Set(['3', '4']);

function normalizeOrganizationRole(role?: LegacyOrganizationRole | null): OrganizationRole {
  return role === 'owner' || role === 'admin' ? 'admin' : 'user';
}

function mapAuthUser(
  source: { id: string; email?: string | null; name?: string | null; role?: GlobalRole | 'admin' | 'user' },
) {
  const fallbackName = source.email?.split('@')[0] ?? 'User';
  return {
    id: source.id,
    email: source.email ?? '',
    name: source.name?.trim() || fallbackName,
    role: source.role === 'root_admin' || source.role === 'admin' ? 'root_admin' : 'user',
  } satisfies User;
}

function getSupabaseProfileName(user: { email?: string | null; user_metadata?: Record<string, unknown> }) {
  const metadata = user.user_metadata ?? {};
  const candidate = metadata.name ?? metadata.full_name ?? metadata.display_name;
  return typeof candidate === 'string' && candidate.trim()
    ? candidate.trim()
    : user.email?.split('@')[0] ?? 'User';
}

function getAuthMetadataRole(user: { user_metadata?: Record<string, unknown> }): GlobalRole | undefined {
  const metadataRole = user.user_metadata?.global_role ?? user.user_metadata?.role;
  return metadataRole === 'root_admin' ? 'root_admin' : undefined;
}

function getStoredDemoUsers() {
  const stored = localStorage.getItem(DEMO_CUSTOM_USERS_STORAGE_KEY);
  const parsed: Array<{ id: string; email: string; password: string; name: string; role: GlobalRole }> = stored
    ? JSON.parse(stored)
    : [];

  return [...demoUsers.map((entry) => ({ ...entry, role: entry.role === 'admin' ? 'root_admin' as const : 'user' as const })), ...parsed];
}

function saveStoredDemoUsers(users: Array<{ id: string; email: string; password: string; name: string; role: GlobalRole }>) {
  localStorage.setItem(DEMO_CUSTOM_USERS_STORAGE_KEY, JSON.stringify(users));
}

function getDemoPasswordOverrides() {
  const stored = localStorage.getItem(DEMO_PASSWORD_OVERRIDES_STORAGE_KEY);
  return stored ? JSON.parse(stored) as Record<string, string> : {};
}

function saveDemoPasswordOverride(userId: string, password: string) {
  const overrides = getDemoPasswordOverrides();
  localStorage.setItem(DEMO_PASSWORD_OVERRIDES_STORAGE_KEY, JSON.stringify({
    ...overrides,
    [userId]: password,
  }));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [memberships, setMemberships] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isDemoMode = !isSupabaseConfigured || !supabase;
  const isRootAdmin = user?.role === 'root_admin';

  const setCurrentOrganization = (orgs: Organization[]) => {
    const storedOrgId = localStorage.getItem(CURRENT_ORG_STORAGE_KEY);
    const nextOrg =
      orgs.find((org) => org.id === storedOrgId) ??
      orgs[0] ??
      null;

    setCurrentOrg(nextOrg);

    if (nextOrg) {
      localStorage.setItem(CURRENT_ORG_STORAGE_KEY, nextOrg.id);
    } else {
      localStorage.removeItem(CURRENT_ORG_STORAGE_KEY);
    }
  };

  const clearAuthState = () => {
    setUser(null);
    setCurrentOrg(null);
    setOrganizations([]);
    setMemberships([]);
    localStorage.removeItem('auth_user');
    localStorage.removeItem(CURRENT_ORG_STORAGE_KEY);
  };

  const loadDemoOrganizations = (currentUser: User) => {
    const orgsData = localStorage.getItem('organizations');
    const allOrgs: Organization[] = orgsData ? JSON.parse(orgsData) : [];

    const membershipsData = localStorage.getItem('organization_members');
    const storedMemberships: Array<OrganizationMember & { role: LegacyOrganizationRole }> = membershipsData ? JSON.parse(membershipsData) : [];
    const organizationsToKeep = allOrgs.filter((org) => !REMOVED_DEMO_USER_IDS.has(org.ownerId));
    const removedOrganizationIds = new Set(
      allOrgs.filter((org) => REMOVED_DEMO_USER_IDS.has(org.ownerId)).map((org) => org.id),
    );
    const membershipsToKeep = storedMemberships.filter(
      (membership) => !REMOVED_DEMO_USER_IDS.has(membership.userId) && !removedOrganizationIds.has(membership.organizationId),
    );

    if (organizationsToKeep.length !== allOrgs.length) {
      localStorage.setItem('organizations', JSON.stringify(organizationsToKeep));
    }
    if (membershipsToKeep.length !== storedMemberships.length) {
      localStorage.setItem('organization_members', JSON.stringify(membershipsToKeep));
    }

    const normalizedMemberships: OrganizationMember[] = membershipsToKeep.map((membership) => ({
      ...membership,
      role: normalizeOrganizationRole(membership.role),
    }));

    if (currentUser.role === 'root_admin') {
      return { userOrganizations: organizationsToKeep, userMemberships: normalizedMemberships };
    }

    const userMemberships = normalizedMemberships.filter((membership) => membership.userId === currentUser.id);
    const userOrgIds = new Set(userMemberships.map((membership) => membership.organizationId));
    const userOrganizations = organizationsToKeep.filter((org) => userOrgIds.has(org.id));

    return { userOrganizations, userMemberships };
  };

  const getOrganizationRole = (organizationId: string, targetUserId?: string) => {
    const effectiveUserId = targetUserId ?? user?.id;
    if (!effectiveUserId) return null;

    const membership = memberships.find(
      (entry) => entry.userId === effectiveUserId && entry.organizationId === organizationId,
    );

    return membership ? membership.role : null;
  };

  const canViewOrganization = (organizationId: string) => {
    if (!user) return false;
    return isRootAdmin || getOrganizationRole(organizationId) !== null;
  };

  const canManageOrganization = (organizationId: string) => {
    if (!user) return false;
    return isRootAdmin || getOrganizationRole(organizationId) === 'admin';
  };

  const createSupabaseOrganizationRecord = async (name: string, creatorId: string) => {
    if (!supabase) return null;

    const { data: organization, error } = await supabase
      .from('organizations')
      .insert({
        name,
        owner_id: creatorId,
      })
      .select('id, name, owner_id, created_at')
      .single();

    if (error || !organization) {
      return null;
    }

    const membershipResult = await supabase.from('organization_members').insert({
      organization_id: organization.id,
      user_id: creatorId,
      role: 'admin',
    });

    if (membershipResult.error) {
      return null;
    }

    return {
      id: organization.id,
      name: organization.name,
      ownerId: organization.owner_id,
      createdAt: organization.created_at,
    } satisfies Organization;
  };

  const refreshSupabaseOrganizations = async (currentUser: User) => {
    if (!supabase) return { organizations: [] as Organization[], memberships: [] as OrganizationMember[] };

    if (currentUser.role === 'root_admin') {
      const [{ data: organizationsData }, { data: membershipsData }] = await Promise.all([
        supabase
          .from('organizations')
          .select('id, name, owner_id, created_at')
          .order('name', { ascending: true }),
        supabase
          .from('organization_members')
          .select('organization_id, user_id, role, joined_at'),
      ]);

      return {
        organizations: (organizationsData ?? []).map((organization) => ({
          id: organization.id,
          name: organization.name,
          ownerId: organization.owner_id,
          createdAt: organization.created_at,
        })),
        memberships: (membershipsData ?? []).map((membership) => ({
          organizationId: membership.organization_id,
          userId: membership.user_id,
          role: normalizeOrganizationRole(membership.role),
          joinedAt: membership.joined_at,
        })),
      };
    }

    const { data, error } = await supabase
      .from('organization_members')
      .select('organization_id, role, joined_at, organizations(id, name, owner_id, created_at)')
      .eq('user_id', currentUser.id);

    if (error || !data) {
      return { organizations: [] as Organization[], memberships: [] as OrganizationMember[] };
    }

    const nextMemberships: OrganizationMember[] = [];
    const nextOrganizations: Organization[] = [];

    for (const row of data) {
      const organization = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations;
      if (!organization) continue;

      nextMemberships.push({
        organizationId: row.organization_id,
        userId: currentUser.id,
        role: normalizeOrganizationRole(row.role),
        joinedAt: row.joined_at,
      });

      nextOrganizations.push({
        id: organization.id,
        name: organization.name,
        ownerId: organization.owner_id,
        createdAt: organization.created_at,
      });
    }

    return { organizations: nextOrganizations, memberships: nextMemberships };
  };

  const ensureSupabaseProfile = async (authUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }) => {
    if (!supabase) {
      return mapAuthUser({ id: authUser.id, email: authUser.email, name: getSupabaseProfileName(authUser) });
    }

    const name = getSupabaseProfileName(authUser);
    const email = authUser.email ?? '';
    const metadataRole = getAuthMetadataRole(authUser);

    await supabase.from('profiles').upsert(
      {
        id: authUser.id,
        email,
        name,
        ...(metadataRole ? { global_role: metadataRole } : {}),
      },
      { onConflict: 'id' },
    );

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, name, global_role')
      .eq('id', authUser.id)
      .maybeSingle();

    return mapAuthUser({
      id: authUser.id,
      email: profile?.email ?? email,
      name: profile?.name ?? name,
      role: profile?.global_role ?? metadataRole ?? 'user',
    });
  };

  const hydrateSupabaseUser = async (authUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }) => {
    const nextUser = await ensureSupabaseProfile(authUser);
    let nextOrganizationsResult = await refreshSupabaseOrganizations(nextUser);

    if (nextOrganizationsResult.organizations.length === 0 && nextUser.role !== 'root_admin') {
      const defaultOrg = await createSupabaseOrganizationRecord(`${nextUser.name}'s Organization`, authUser.id);
      if (defaultOrg) {
        nextOrganizationsResult = await refreshSupabaseOrganizations(nextUser);
      }
    }

    setUser(nextUser);
    setOrganizations(nextOrganizationsResult.organizations);
    setMemberships(nextOrganizationsResult.memberships);
    setCurrentOrganization(nextOrganizationsResult.organizations);
  };

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      setIsLoading(true);

      if (isDemoMode) {
        const storedUser = localStorage.getItem('auth_user');
        if (storedUser) {
          const userData = JSON.parse(storedUser) as User;
          const { userOrganizations, userMemberships } = loadDemoOrganizations(userData);
          if (!active) return;
          setUser(userData);
          setOrganizations(userOrganizations);
          setMemberships(userMemberships);
          setCurrentOrganization(userOrganizations);
        } else if (active) {
          clearAuthState();
        }

        if (active) {
          setIsLoading(false);
        }
        return;
      }

      const { data } = await supabase.auth.getSession();

      if (!active) return;

      if (data.session?.user) {
        await hydrateSupabaseUser(data.session.user);
      } else {
        clearAuthState();
      }

      if (active) {
        setIsLoading(false);
      }
    };

    void initialize();

    if (isDemoMode || !supabase) {
      return () => {
        active = false;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        if (!active) return;

        if (session?.user) {
          await hydrateSupabaseUser(session.user);
        } else {
          clearAuthState();
        }

        if (active) {
          setIsLoading(false);
        }
      })();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [isDemoMode]);

  const getUserRole = (organizationId: string) => {
    if (!user) return null;
    if (isRootAdmin) return 'root_admin';
    return getOrganizationRole(organizationId);
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    if (isDemoMode || !supabase) {
      await new Promise((resolve) => setTimeout(resolve, 300));

      const passwordOverrides = getDemoPasswordOverrides();
      const foundUser = getStoredDemoUsers().find((entry) => {
        const effectivePassword = passwordOverrides[entry.id] ?? entry.password;
        return entry.email === email && effectivePassword === password;
      });

      if (!foundUser) {
        return false;
      }

      const nextUser = mapAuthUser(foundUser);
      const { userOrganizations, userMemberships } = loadDemoOrganizations(nextUser);

      if (userOrganizations.length === 0 && nextUser.role !== 'root_admin') {
        const defaultOrg: Organization = {
          id: `org-${Date.now()}`,
          name: `${nextUser.name}'s Organization`,
          ownerId: nextUser.id,
          createdAt: new Date().toISOString(),
        };

        const orgsData = localStorage.getItem('organizations');
        const existingOrganizations: Organization[] = orgsData ? JSON.parse(orgsData) : [];
        const allOrganizations = [...existingOrganizations, defaultOrg];

        const membershipsData = localStorage.getItem('organization_members');
        const storedMemberships: OrganizationMember[] = membershipsData ? JSON.parse(membershipsData) : [];
        const allMemberships: OrganizationMember[] = [
          ...storedMemberships,
          {
            organizationId: defaultOrg.id,
            userId: nextUser.id,
            role: 'admin',
            joinedAt: new Date().toISOString(),
          },
        ];

        localStorage.setItem('organizations', JSON.stringify(allOrganizations));
        localStorage.setItem('organization_members', JSON.stringify(allMemberships));

        setUser(nextUser);
        setOrganizations(nextUser.role === 'root_admin' ? allOrganizations : [defaultOrg]);
        setMemberships(allMemberships);
        setCurrentOrganization(nextUser.role === 'root_admin' ? allOrganizations : [defaultOrg]);
      } else {
        setUser(nextUser);
        setOrganizations(userOrganizations);
        setMemberships(userMemberships);
        setCurrentOrganization(userOrganizations);
      }

      localStorage.setItem('auth_user', JSON.stringify(nextUser));
      return true;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      return false;
    }

    await hydrateSupabaseUser(data.user);
    return true;
  };

  const logout = async () => {
    if (!isDemoMode && supabase) {
      await supabase.auth.signOut();
    }
    clearAuthState();
  };

  const createOrganization = async (name: string) => {
    if (!user || !isRootAdmin) return false;

    if (isDemoMode || !supabase) {
      const newOrg: Organization = {
        id: `org-${Date.now()}`,
        name,
        ownerId: user.id,
        createdAt: new Date().toISOString(),
      };

      const orgsData = localStorage.getItem('organizations');
      const allOrgs: Organization[] = orgsData ? JSON.parse(orgsData) : [];
      const updatedOrgs = [...allOrgs, newOrg];
      localStorage.setItem('organizations', JSON.stringify(updatedOrgs));

      const membershipsData = localStorage.getItem('organization_members');
      const storedMemberships: OrganizationMember[] = membershipsData ? JSON.parse(membershipsData) : [];
      const newMembership: OrganizationMember = {
        userId: user.id,
        organizationId: newOrg.id,
        role: 'admin',
        joinedAt: new Date().toISOString(),
      };

      const updatedMemberships = [...storedMemberships, newMembership];
      localStorage.setItem('organization_members', JSON.stringify(updatedMemberships));

      setOrganizations(updatedOrgs);
      setMemberships(updatedMemberships);
      setCurrentOrg(newOrg);
      localStorage.setItem(CURRENT_ORG_STORAGE_KEY, newOrg.id);
      return true;
    }

    const organization = await createSupabaseOrganizationRecord(name, user.id);
    if (!organization) {
      return false;
    }

    const nextState = await refreshSupabaseOrganizations(user);
    setOrganizations(nextState.organizations);
    setMemberships(nextState.memberships);
    setCurrentOrg(organization);
    localStorage.setItem(CURRENT_ORG_STORAGE_KEY, organization.id);
    return true;
  };

  const createUser = async ({ email, name, password, organizationId, role }: CreateUserPayload) => {
    if (!user || !canManageOrganization(organizationId)) return false;

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();
    const trimmedPassword = password.trim();

    if (!normalizedEmail || !trimmedName || trimmedPassword.length < 6) {
      return false;
    }

    if (isDemoMode || !supabase) {
    const existingUser = getStoredDemoUsers().find((entry) => entry.email.toLowerCase() === normalizedEmail);
    if (existingUser) {
      return false;
    }

    const storedCustomUsers = localStorage.getItem(DEMO_CUSTOM_USERS_STORAGE_KEY);
    const customUsers: Array<{ id: string; email: string; password: string; name: string; role: GlobalRole }> = storedCustomUsers
      ? JSON.parse(storedCustomUsers)
      : [];

      const newUser = {
        id: crypto.randomUUID(),
        email: normalizedEmail,
        password: trimmedPassword,
        name: trimmedName,
        role: 'user' as const,
      };

      saveStoredDemoUsers([
      ...customUsers,
        newUser,
    ]);

      const membershipsData = localStorage.getItem('organization_members');
      const storedMemberships: OrganizationMember[] = membershipsData ? JSON.parse(membershipsData) : [];
      const updatedMemberships = [
        ...storedMemberships,
        {
          userId: newUser.id,
          organizationId,
          role,
          joinedAt: new Date().toISOString(),
        },
      ];

      localStorage.setItem('organization_members', JSON.stringify(updatedMemberships));
      setMemberships(updatedMemberships);

    return true;
    }

    const { error } = await supabase.functions.invoke('create-organization-user', {
      body: {
        email: normalizedEmail,
        name: trimmedName,
        password: trimmedPassword,
        organizationId,
        role,
      },
    });

    if (error) {
      return false;
    }

    const nextState = await refreshSupabaseOrganizations(user);
    setMemberships(nextState.memberships);
    return true;
  };

  const changePassword = async (password: string) => {
    if (!user) return false;

    const trimmedPassword = password.trim();
    if (trimmedPassword.length < 6) {
      return false;
    }

    if (isDemoMode || !supabase) {
      const storedCustomUsers = localStorage.getItem(DEMO_CUSTOM_USERS_STORAGE_KEY);
      const customUsers: Array<{ id: string; email: string; password: string; name: string; role: GlobalRole }> = storedCustomUsers
        ? JSON.parse(storedCustomUsers)
        : [];
      const customUserIndex = customUsers.findIndex((entry) => entry.id === user.id);

      if (customUserIndex >= 0) {
        const updatedCustomUsers = customUsers.map((entry) =>
          entry.id === user.id ? { ...entry, password: trimmedPassword } : entry,
        );
        saveStoredDemoUsers(updatedCustomUsers);
      } else {
        saveDemoPasswordOverride(user.id, trimmedPassword);
      }

      return true;
    }

    const { error } = await supabase.auth.updateUser({ password: trimmedPassword });
    return !error;
  };

  const updateUserPassword = async (userId: string, password: string) => {
    if (!user || !isRootAdmin) return false;

    const trimmedPassword = password.trim();
    if (!userId || trimmedPassword.length < 6) {
      return false;
    }

    if (isDemoMode || !supabase) {
      const storedCustomUsers = localStorage.getItem(DEMO_CUSTOM_USERS_STORAGE_KEY);
      const customUsers: Array<{ id: string; email: string; password: string; name: string; role: GlobalRole }> = storedCustomUsers
        ? JSON.parse(storedCustomUsers)
        : [];
      const hasCustomUser = customUsers.some((entry) => entry.id === userId);

      if (hasCustomUser) {
        saveStoredDemoUsers(customUsers.map((entry) =>
          entry.id === userId ? { ...entry, password: trimmedPassword } : entry,
        ));
      } else {
        const targetUser = getStoredDemoUsers().find((entry) => entry.id === userId);
        if (!targetUser) return false;
        saveDemoPasswordOverride(userId, trimmedPassword);
      }

      return true;
    }

    const { error } = await supabase.functions.invoke('update-user-password', {
      body: {
        userId,
        password: trimmedPassword,
      },
    });

    return !error;
  };

  const switchOrganization = (orgId: string) => {
    if (!canViewOrganization(orgId)) return;

    const organization = organizations.find((entry) => entry.id === orgId);
    if (!organization) return;

    setCurrentOrg(organization);
    localStorage.setItem(CURRENT_ORG_STORAGE_KEY, orgId);
  };

  const inviteUserToOrganization = async (email: string, organizationId: string, role: OrganizationRole) => {
    if (!user || !canManageOrganization(organizationId)) return false;

    if (isDemoMode || !supabase) {
      const invitedUser = getStoredDemoUsers().find((entry) => entry.email.toLowerCase() === email.trim().toLowerCase());
      if (!invitedUser) {
        return false;
      }

      const membershipsData = localStorage.getItem('organization_members');
      const storedMemberships: OrganizationMember[] = membershipsData ? JSON.parse(membershipsData) : [];
      const existingMembership = storedMemberships.find(
        (entry) => entry.userId === invitedUser.id && entry.organizationId === organizationId,
      );

      if (existingMembership) {
        return false;
      }

      const updatedMemberships = [
        ...storedMemberships,
        {
          userId: invitedUser.id,
          organizationId,
          role,
          joinedAt: new Date().toISOString(),
        },
      ];

      localStorage.setItem('organization_members', JSON.stringify(updatedMemberships));
      setMemberships(updatedMemberships);
      return true;
    }

    const { data: invitedProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (!invitedProfile) {
      return false;
    }

    const { data: existingMembership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('organization_id', organizationId)
      .eq('user_id', invitedProfile.id)
      .maybeSingle();

    if (existingMembership) {
      return false;
    }

    const { error } = await supabase.from('organization_members').insert({
      organization_id: organizationId,
      user_id: invitedProfile.id,
      role,
    });

    if (!error) {
      const nextState = await refreshSupabaseOrganizations(user);
      setMemberships(nextState.memberships);
    }

    return !error;
  };

  const updateOrganizationMemberRole = async (organizationId: string, userId: string, role: OrganizationRole) => {
    if (!user || !canManageOrganization(organizationId)) return false;

    if (isDemoMode || !supabase) {
      // Prevent role changes for root admins in demo mode
      const storedUsers = getStoredDemoUsers();
      const targetUser = storedUsers.find((u) => u.id === userId);
      if (targetUser?.role === 'root_admin') {
        return false;
      }

      const membershipsData = localStorage.getItem('organization_members');
      const storedMemberships: OrganizationMember[] = membershipsData ? JSON.parse(membershipsData) : [];
      const updatedMemberships = storedMemberships.map((entry) =>
        entry.organizationId === organizationId && entry.userId === userId
          ? { ...entry, role }
          : entry,
      );

      localStorage.setItem('organization_members', JSON.stringify(updatedMemberships));
      setMemberships(updatedMemberships);
      return true;
    }

    // Prevent role changes for root admins in Supabase mode
    const { data: targetUserProfile } = await supabase
      .from('profiles')
      .select('global_role')
      .eq('id', userId)
      .maybeSingle();

    if (targetUserProfile?.global_role === 'root_admin') {
      return false;
    }

    const { error } = await supabase
      .from('organization_members')
      .update({ role })
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (error) {
      return false;
    }

    const nextState = await refreshSupabaseOrganizations(user);
    setMemberships(nextState.memberships);
    return true;
  };

  const listOrganizationMembers = async (organizationId: string) => {
    if (!canViewOrganization(organizationId)) {
      return [];
    }

    if (isDemoMode || !supabase) {
      const membershipsData = localStorage.getItem('organization_members');
      const storedMemberships: Array<OrganizationMember & { role: LegacyOrganizationRole }> = membershipsData ? JSON.parse(membershipsData) : [];
      const allUsers = getStoredDemoUsers();

      return storedMemberships
        .filter((entry) => entry.organizationId === organizationId)
        .map((entry) => {
          const foundUser = allUsers.find((candidate) => candidate.id === entry.userId);
          if (!foundUser) return null;

          return {
            organizationId: entry.organizationId,
            userId: entry.userId,
            role: normalizeOrganizationRole(entry.role),
            joinedAt: entry.joinedAt,
            user: mapAuthUser(foundUser),
          } satisfies OrganizationMemberWithUser;
        })
        .filter((entry): entry is OrganizationMemberWithUser => entry !== null);
    }

    const { data: memberRows, error } = await supabase
      .from('organization_members')
      .select('organization_id, user_id, role, joined_at')
      .eq('organization_id', organizationId);

    if (error || !memberRows || memberRows.length === 0) {
      return [];
    }

    const userIds = memberRows.map((entry) => entry.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, name, global_role')
      .in('id', userIds);

    const profilesById = new Map(
      (profiles ?? []).map((profile) => [
        profile.id,
        mapAuthUser({
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.global_role ?? 'user',
        }),
      ]),
    );

    return memberRows
      .map((entry) => {
        const profile = profilesById.get(entry.user_id);
        if (!profile) return null;

        return {
          organizationId: entry.organization_id,
          userId: entry.user_id,
          role: normalizeOrganizationRole(entry.role),
          joinedAt: entry.joined_at,
          user: profile,
        } satisfies OrganizationMemberWithUser;
      })
      .filter((entry): entry is OrganizationMemberWithUser => entry !== null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        currentOrg,
        organizations,
        isRootAdmin,
        login,
        logout,
        createOrganization,
        createUser,
        changePassword,
        updateUserPassword,
        switchOrganization,
        inviteUserToOrganization,
        updateOrganizationMemberRole,
        getUserRole,
        canCreateOrganizations: isRootAdmin,
        canManageOrganization,
        canViewOrganization,
        listOrganizationMembers,
        isLoading,
        isDemoMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
