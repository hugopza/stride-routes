import type { CandidateRoute, RouteParams } from './route';
import type {
  SavedRouteActivity,
  SavedRouteSurface,
} from "./saved-route";

export type RootStackParamList = {
  Home: undefined;
  Results: {
    params: RouteParams;
    routes: CandidateRoute[];
  };
  RouteDetail: {
    route: CandidateRoute;
    activity?: SavedRouteActivity;
    surface?: SavedRouteSurface;
    timeLabel?: string;
  };
};
