const isDevBuild = typeof __DEV__ !== "undefined" ? __DEV__ : false;
const parseBooleanEnv = (value: string | undefined): boolean =>
  value === "1" || value === "true";

export const env = {
  openRouteServiceApiKey: process.env.EXPO_PUBLIC_ORS_API_KEY ?? "",
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
  // Routing debug logs are opt-in and disabled in production.
  routingDebug: isDevBuild && parseBooleanEnv(process.env.EXPO_PUBLIC_DEBUG_ROUTING),
};
