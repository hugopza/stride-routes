import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "../config/env";

const hasSupabaseConfig = Boolean(env.supabaseUrl && env.supabaseAnonKey);

let client: SupabaseClient | null = null;

function createSupabaseClient(): SupabaseClient {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

export function getSupabaseClient(): SupabaseClient {
  if (!hasSupabaseConfig) {
    throw new Error(
      "Missing Supabase config. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  if (!client) {
    client = createSupabaseClient();
  }

  return client;
}

// Shared singleton for app usage. It is null only when env vars are missing.
export const supabase: SupabaseClient | null = hasSupabaseConfig
  ? getSupabaseClient()
  : null;

export type SupabaseConnectionCheckResult = {
  ok: boolean;
  status: number;
  error?: string;
};

// Lightweight connectivity check that does not require knowledge of project tables.
export async function checkSupabaseConnection(): Promise<SupabaseConnectionCheckResult> {
  if (!hasSupabaseConfig) {
    return {
      ok: false,
      status: 0,
      error:
        "Missing Supabase config. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.",
    };
  }

  try {
    const response = await fetch(`${env.supabaseUrl}/rest/v1/`, {
      method: "GET",
      headers: {
        apikey: env.supabaseAnonKey,
        Authorization: `Bearer ${env.supabaseAnonKey}`,
      },
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: `Supabase REST responded with status ${response.status}.`,
      };
    }

    return { ok: true, status: response.status };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error:
        error instanceof Error
          ? error.message
          : "Unknown network error while connecting to Supabase.",
    };
  }
}

