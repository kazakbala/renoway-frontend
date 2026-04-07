import { createContext, useContext, useEffect, useState } from "react";
import api from "@/api/client";

export interface Tenant {
  id: string;
  name: string;
  logo_url: string | null;
  bank_details: string | null;
  company_details: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  tenant: Tenant;
  created_at: string;
}

interface AuthContextType {
  // keep `user` for backward compat with pages that use user.id / user.email
  user: { id: string; email: string } | null;
  profile: Profile | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  logout: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get<Profile>("/auth/me/");
      setProfile(data);
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const logout = async () => {
    const refresh = localStorage.getItem("refresh_token");
    try {
      if (refresh) await api.post("/auth/logout/", { refresh });
    } catch {}
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setProfile(null);
  };

  const user = profile ? { id: profile.id, email: profile.email } : null;

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout, refreshProfile: fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
