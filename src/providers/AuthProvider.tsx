import type { PropsWithChildren } from "react";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";

import { getSupabaseClient } from "../lib/supabase";
import { createMyProfile, getMyProfile } from "../services/profileService";
import type { Profile } from "../types/profile";

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  isAuthReady: boolean;
  isProfileReady: boolean;
  setProfile: (profile: Profile | null) => void;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function loadOrCreateProfile(): Promise<Profile | null> {
  const existing = await getMyProfile();
  if (existing) {
    return existing;
  }
  return createMyProfile({
    default_activity: "foot",
    default_surface: "mixed",
    default_route_type: "point_to_point",
  });
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isProfileReady, setIsProfileReady] = useState(false);
  const profileRequestIdRef = useRef(0);

  useEffect(() => {
    const supabase = getSupabaseClient();
    let isMounted = true;

    const hydrateProfile = async (nextSession: Session | null) => {
      const requestId = profileRequestIdRef.current + 1;
      profileRequestIdRef.current = requestId;

      if (!nextSession?.user) {
        if (isMounted && requestId === profileRequestIdRef.current) {
          setProfile(null);
          setIsProfileReady(true);
        }
        return;
      }

      if (isMounted && requestId === profileRequestIdRef.current) {
        setIsProfileReady(false);
      }

      try {
        const nextProfile = await loadOrCreateProfile();
        if (isMounted && requestId === profileRequestIdRef.current) {
          setProfile(nextProfile);
        }
      } catch {
        if (isMounted && requestId === profileRequestIdRef.current) {
          setProfile(null);
        }
      } finally {
        if (isMounted && requestId === profileRequestIdRef.current) {
          setIsProfileReady(true);
        }
      }
    };

    const bootstrap = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }

      const nextSession = error ? null : data.session;
      setSession(nextSession);
      setIsAuthReady(true);
      await hydrateProfile(nextSession);
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsAuthReady(true);
      void hydrateProfile(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    const supabase = getSupabaseClient();
    const {
      data: { session: nextSession },
    } = await supabase.auth.getSession();

    setSession(nextSession);
    setIsAuthReady(true);

    const requestId = profileRequestIdRef.current + 1;
    profileRequestIdRef.current = requestId;

    if (!nextSession?.user) {
      if (requestId === profileRequestIdRef.current) {
        setProfile(null);
        setIsProfileReady(true);
      }
      return;
    }

    setIsProfileReady(false);
    try {
      const nextProfile = await loadOrCreateProfile();
      if (requestId === profileRequestIdRef.current) {
        setProfile(nextProfile);
      }
    } finally {
      if (requestId === profileRequestIdRef.current) {
        setIsProfileReady(true);
      }
    }
  };

  const signOut = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    profileRequestIdRef.current += 1;
    setSession(null);
    setProfile(null);
    setIsAuthReady(true);
    setIsProfileReady(true);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        isAuthReady,
        isProfileReady,
        setProfile,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
