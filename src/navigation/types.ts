import type { NavigatorScreenParams } from "@react-navigation/native";

import type { RootStackParamList } from "../types/navigation";

export type RoutesStackParamList = Pick<
  RootStackParamList,
  "Results" | "RouteDetail"
>;

export type RootTabParamList = {
  Explore: undefined;
  Routes: NavigatorScreenParams<RoutesStackParamList>;
  Profile: undefined;
};
