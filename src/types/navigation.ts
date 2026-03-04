import type { CandidateRoute, RouteParams } from './route';

export type RootStackParamList = {
  Home: undefined;
  Results: {
    params: RouteParams;
    routes: CandidateRoute[];
  };
  RouteDetail: {
    route: CandidateRoute;
  };
};
