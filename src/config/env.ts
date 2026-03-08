const isDevBuild = typeof __DEV__ !== "undefined" ? __DEV__ : false;
const parseBooleanEnv = (value: string | undefined): boolean =>
  value === "1" || value === "true";

export const env = {
  openRouteServiceApiKey: process.env.EXPO_PUBLIC_ORS_API_KEY ?? "",
  // Fake routes are opt-in for development/testing only.
  allowFakeRoutes: isDevBuild && parseBooleanEnv(process.env.EXPO_PUBLIC_ALLOW_FAKE_ROUTES),
  // Routing debug logs are opt-in and disabled in production.
  routingDebug: isDevBuild && parseBooleanEnv(process.env.EXPO_PUBLIC_DEBUG_ROUTING),
};
