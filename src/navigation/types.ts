import type { NavigatorScreenParams } from "@react-navigation/native";

import type { RootStackParamList } from "../types/navigation";

export type RoutesStackParamList = Pick<
  RootStackParamList,
  "Home" | "Results" | "RouteDetail"
>;

export type RootTabParamList = {
  Generate: NavigatorScreenParams<RoutesStackParamList> | undefined;
  Saved: undefined;
  Profile: undefined;
};
