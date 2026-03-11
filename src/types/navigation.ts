import type { CandidateRoute, RouteParams } from './route';
import type { SavedRouteSurface } from "./saved-route";

export type RootStackParamList = {
  Home: undefined;
  Results: {
    params: RouteParams;
    routes: CandidateRoute[];
  };
  RouteDetail: {
    route: CandidateRoute;
    surface?: SavedRouteSurface;
  };
};
