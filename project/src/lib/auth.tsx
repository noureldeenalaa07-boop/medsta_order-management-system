import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Staff } from "./types";

interface AuthContextType {
  session: Session | null;
  staff: Staff | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  staff: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        fetchStaff(data.session.user.id);
      } else {
        setLoading(false);
      }
    });

    supabase.auth.onAuthStateChange((_event, newSession) => {
      (async () => {
        setSession(newSession);
        if (newSession) {
          await fetchStaff(newSession.user.id);
        } else {
          setStaff(null);
          setLoading(false);
        }
      })();
    });
  }, []);

  async function fetchStaff(userId: string) {
    const { data } = await supabase
      .from("staff")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (data) {
      setStaff(data as Staff);
    }
    setLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setStaff(null);
  }

  return (
    <AuthContext.Provider value={{ session, staff, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
