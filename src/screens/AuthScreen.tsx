import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "../components/Button";
import { Chip } from "../components/Chip";
import { InputRow } from "../components/InputRow";
import { getSupabaseClient } from "../lib/supabase";

type AuthMode = "login" | "signup";

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value.trim());
}

export function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const emailError = useMemo(() => {
    if (!email) {
      return undefined;
    }
    return isValidEmail(email) ? undefined : "Enter a valid email address.";
  }, [email]);

  const passwordError = useMemo(() => {
    if (!password) {
      return undefined;
    }
    if (password.length < 6) {
      return "Password must be at least 6 characters.";
    }
    return undefined;
  }, [password]);

  const canSubmit =
    Boolean(email.trim()) &&
    Boolean(password) &&
    !emailError &&
    !passwordError &&
    !isSubmitting;

  const onSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    const supabase = getSupabaseClient();

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          throw error;
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) {
          throw error;
        }

        if (!data.session) {
          setInfoMessage("Check your email to confirm your account, then sign in.");
        }
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Authentication failed. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: "padding", default: undefined })}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Welcome back</Text>
          <Text style={styles.heroSubtitle}>
            Sign in to generate routes, save your preferences, and keep your app data in sync.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT ACCESS</Text>
          <View style={styles.modeRow}>
            <Chip
              label="Log in"
              selected={mode === "login"}
              onPress={() => {
                setMode("login");
                setErrorMessage(null);
                setInfoMessage(null);
              }}
              style={{ flex: 1 }}
            />
            <Chip
              label="Sign up"
              selected={mode === "signup"}
              onPress={() => {
                setMode("signup");
                setErrorMessage(null);
                setInfoMessage(null);
              }}
              style={{ flex: 1 }}
            />
          </View>

          <InputRow
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            error={emailError}
          />
          <InputRow
            label="Password"
            placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
            error={passwordError}
          />
        </View>

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Authentication failed</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {infoMessage ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>{infoMessage}</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Button
            label={mode === "login" ? "Log in" : "Create account"}
            onPress={onSubmit}
            loading={isSubmitting}
            disabled={!canSubmit}
          />
          <Text style={styles.footerText}>
            {mode === "login"
              ? "Use your email and password to enter the app."
              : "A confirmation email may be required depending on your Supabase auth settings."}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    gap: 24,
  },
  hero: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#4b5563",
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6b7280",
    letterSpacing: 0.5,
  },
  modeRow: {
    flexDirection: "row",
    gap: 8,
  },
  errorCard: {
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#991b1b",
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#b91c1c",
  },
  infoCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 14,
  },
  infoText: {
    fontSize: 13,
    color: "#4b5563",
    fontWeight: "500",
  },
  footer: {
    gap: 12,
  },
  footerText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#6b7280",
    textAlign: "center",
  },
});
