import type { PropsWithChildren } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { getRouteFingerprint } from "../lib/route-fingerprint";
import {
  createSavedRoute,
  deleteSavedRoute,
  listMySavedRoutes,
} from "../services/savedRoutesService";
import type { CandidateRoute } from "../types/route";
import type {
  CreateSavedRouteInput,
  SavedRouteActivity,
  SavedRoute,
  SavedRouteSurface,
} from "../types/saved-route";
import { useAuth } from "./AuthProvider";

type SaveRouteInput = {
  customName: string;
  route: CandidateRoute;
  activity?: SavedRouteActivity;
  surface?: SavedRouteSurface;
};

type SavedRoutesContextValue = {
  savedRoutes: SavedRoute[];
  isSavedRoutesReady: boolean;
  savedRoutesError: string | null;
  refreshSavedRoutes: () => Promise<void>;
  saveRoute: (input: SaveRouteInput) => Promise<SavedRoute>;
  removeSavedRoute: (savedRouteId: string) => Promise<void>;
  getSavedRouteForCandidate: (route: CandidateRoute) => SavedRoute | null;
};

const SavedRoutesContext = createContext<SavedRoutesContextValue | undefined>(
  undefined,
);

export function SavedRoutesProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [isSavedRoutesReady, setIsSavedRoutesReady] = useState(false);
  const [savedRoutesError, setSavedRoutesError] = useState<string | null>(null);

  const loadSavedRoutes = useCallback(async () => {
    if (!session) {
      setSavedRoutes([]);
      setSavedRoutesError(null);
      setIsSavedRoutesReady(true);
      return;
    }

    setIsSavedRoutesReady(false);
    try {
      const routes = await listMySavedRoutes();
      setSavedRoutes(routes);
      setSavedRoutesError(null);
    } catch (error) {
      setSavedRoutes([]);
      setSavedRoutesError(
        error instanceof Error
          ? error.message
          : "Could not load saved routes right now.",
      );
    } finally {
      setIsSavedRoutesReady(true);
    }
  }, [session]);

  useEffect(() => {
    void loadSavedRoutes();
  }, [loadSavedRoutes]);

  const fingerprintMap = useMemo(() => {
    const map = new Map<string, SavedRoute>();
    for (const item of savedRoutes) {
      map.set(item.route_fingerprint, item);
    }
    return map;
  }, [savedRoutes]);

  const value: SavedRoutesContextValue = {
    savedRoutes,
    isSavedRoutesReady,
    savedRoutesError,
    refreshSavedRoutes: loadSavedRoutes,
    saveRoute: async (input: SaveRouteInput) => {
      const saved = await createSavedRoute(input as CreateSavedRouteInput);
      setSavedRoutes((current) => [saved, ...current]);
      return saved;
    },
    removeSavedRoute: async (savedRouteId: string) => {
      await deleteSavedRoute(savedRouteId);
      setSavedRoutes((current) =>
        current.filter((item) => item.id !== savedRouteId),
      );
    },
    getSavedRouteForCandidate: (route: CandidateRoute) =>
      fingerprintMap.get(getRouteFingerprint(route)) ?? null,
  };

  return (
    <SavedRoutesContext.Provider value={value}>
      {children}
    </SavedRoutesContext.Provider>
  );
}

export function useSavedRoutes() {
  const context = useContext(SavedRoutesContext);
  if (!context) {
    throw new Error("useSavedRoutes must be used within SavedRoutesProvider.");
  }
  return context;
}
