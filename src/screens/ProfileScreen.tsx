import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "../components/Button";
import { Chip } from "../components/Chip";
import { InputRow } from "../components/InputRow";
import { searchPlaces, type PlaceSuggestion } from "../lib/place-search";
import { useAuth } from "../providers/AuthProvider";
import { updateMyProfile } from "../services/profileService";
import type { Profile } from "../types/profile";
import type { RouteCoordinate } from "../types/route";

type Activity = "foot" | "road_cycling";
type Surface = "asphalt" | "mixed" | "trail";
type RouteType = "point_to_point" | "circular";

function toSurfaceLabel(value: Surface): string {
  if (value === "asphalt") {
    return "Asphalt";
  }
  if (value === "trail") {
    return "Trail";
  }
  return "Mixed";
}

function getProfileSignature(profile: Profile | null): string {
  if (!profile) {
    return "missing";
  }
  return `${profile.id}:${profile.updated_at}`;
}

function getProfileActivity(profile: Profile | null): Activity {
  return profile?.default_activity ?? "foot";
}

function getProfileSurface(profile: Profile | null): Surface {
  if (profile?.default_activity === "road_cycling") {
    return "asphalt";
  }
  return profile?.default_surface ?? "mixed";
}

function getProfileRouteType(profile: Profile | null): RouteType {
  return profile?.default_route_type ?? "point_to_point";
}

export function ProfileScreen() {
  const { session, profile, isAuthReady, isProfileReady, setProfile, signOut } =
    useAuth();
  const [displayName, setDisplayName] = useState("");
  const [homeLocationName, setHomeLocationName] = useState("");
  const [homeLocationCoordinate, setHomeLocationCoordinate] = useState<
    RouteCoordinate | undefined
  >(undefined);
  const [defaultActivity, setDefaultActivity] = useState<Activity>("foot");
  const [defaultSurface, setDefaultSurface] = useState<Surface>("mixed");
  const [defaultRouteType, setDefaultRouteType] =
    useState<RouteType>("point_to_point");
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSearchingHomeLocation, setIsSearchingHomeLocation] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [homeLocationSuggestions, setHomeLocationSuggestions] = useState<
    PlaceSuggestion[]
  >([]);
  const hydratedProfileSignatureRef = useRef<string | null>(null);
  const homeLocationSearchRequestRef = useRef(0);

  const applyProfileToForm = (nextProfile: Profile | null) => {
    setDisplayName(nextProfile?.display_name ?? "");
    setHomeLocationName(nextProfile?.home_location_name ?? "");
    setHomeLocationCoordinate(
      nextProfile?.home_lat != null && nextProfile.home_lng != null
        ? {
            latitude: nextProfile.home_lat,
            longitude: nextProfile.home_lng,
          }
        : undefined,
    );
    setDefaultActivity(getProfileActivity(nextProfile));
    setDefaultSurface(getProfileSurface(nextProfile));
    setDefaultRouteType(getProfileRouteType(nextProfile));
    setHomeLocationSuggestions([]);
  };

  useEffect(() => {
    if (!session) {
      applyProfileToForm(null);
      setIsDirty(false);
      setErrorMessage(null);
      setSuccessMessage(null);
      hydratedProfileSignatureRef.current = null;
      return;
    }

    const nextSignature = getProfileSignature(profile);
    const shouldHydrate =
      !isDirty && hydratedProfileSignatureRef.current !== nextSignature;

    if (!shouldHydrate) {
      return;
    }

    applyProfileToForm(profile);
    hydratedProfileSignatureRef.current = nextSignature;
  }, [isDirty, profile, session]);

  useEffect(() => {
    if (defaultActivity === "road_cycling" && defaultSurface !== "asphalt") {
      setDefaultSurface("asphalt");
    }
  }, [defaultActivity, defaultSurface]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const query = homeLocationName.trim();

      if (!session || query.length < 3 || homeLocationCoordinate) {
        setHomeLocationSuggestions([]);
        setIsSearchingHomeLocation(false);
        return;
      }

      const requestId = homeLocationSearchRequestRef.current + 1;
      homeLocationSearchRequestRef.current = requestId;
      setIsSearchingHomeLocation(true);
      const results = await searchPlaces(query, controller.signal);
      if (
        requestId !== homeLocationSearchRequestRef.current ||
        controller.signal.aborted
      ) {
        return;
      }
      setHomeLocationSuggestions(results);
      setIsSearchingHomeLocation(false);
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
      homeLocationSearchRequestRef.current += 1;
    };
  }, [homeLocationCoordinate, homeLocationName, session]);

  const markEdited = () => {
    if (!isDirty) {
      setIsDirty(true);
    }
    if (successMessage) {
      setSuccessMessage(null);
    }
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const homeLocationError =
    homeLocationName.trim() && !homeLocationCoordinate
      ? "Select a valid location from the search results."
      : undefined;

  const onSelectHomeLocation = (suggestion: PlaceSuggestion) => {
    markEdited();
    setHomeLocationName(suggestion.label);
    setHomeLocationCoordinate(suggestion.coordinate);
    setHomeLocationSuggestions([]);
  };

  const onSave = async () => {
    if (homeLocationError) {
      setErrorMessage(homeLocationError);
      setSuccessMessage(null);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updatedProfile = await updateMyProfile({
        display_name: displayName.trim() || null,
        home_location_name: homeLocationName.trim() || null,
        home_lat: homeLocationCoordinate?.latitude ?? null,
        home_lng: homeLocationCoordinate?.longitude ?? null,
        default_activity: defaultActivity,
        default_surface:
          defaultActivity === "road_cycling" ? "asphalt" : defaultSurface,
        default_route_type: defaultRouteType,
      });

      hydratedProfileSignatureRef.current = getProfileSignature(updatedProfile);
      applyProfileToForm(updatedProfile);
      setProfile(updatedProfile);
      setIsDirty(false);
      setSuccessMessage("Changes saved successfully.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not save your profile right now.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const onSignOut = async () => {
    setIsSigningOut(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await signOut();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not log out right now.",
      );
    } finally {
      setIsSigningOut(false);
    }
  };

  if (!isAuthReady) {
    return (
      <View style={styles.centeredContainer}>
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>Loading profile</Text>
          <Text style={styles.stateText}>
            We are fetching your saved route preferences.
          </Text>
        </View>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.centeredContainer}>
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>Profile unavailable</Text>
          <Text style={styles.stateText}>
            Sign in to manage the preferences used to prefill the route
            generator.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>BASIC INFO</Text>
        <InputRow
          label="Display Name"
          placeholder="How should we call you?"
          value={displayName}
          onChangeText={(value) => {
            markEdited();
            setDisplayName(value);
          }}
        />
        <InputRow
          label="Default Home Location"
          placeholder="Used to prefill your route start point"
          value={homeLocationName}
          onChangeText={(value) => {
            markEdited();
            setHomeLocationName(value);
            setHomeLocationCoordinate(undefined);
          }}
          error={homeLocationError}
          rightAccessory={
            <MaterialIcons name="location-on" size={20} color="#9ca3af" />
          }
        />
        {isSearchingHomeLocation ? (
          <Text style={styles.searchHint}>Searching...</Text>
        ) : null}
        {homeLocationSuggestions.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onSelectHomeLocation(item)}
            style={styles.suggestionItem}
          >
            <Text style={styles.suggestionText}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>GENERATOR PREFERENCES</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Activity Type</Text>
          <View style={styles.goalRow}>
            <Button
              label="Foot"
              variant={defaultActivity === "foot" ? "primary" : "outline"}
              onPress={() => {
                markEdited();
                setDefaultActivity("foot");
              }}
              style={{ flex: 1 }}
              leftAccessory={
                <MaterialIcons
                  name="directions-walk"
                  size={20}
                  color={defaultActivity === "foot" ? "#fff" : "#111827"}
                />
              }
            />
            <Button
              label="Road Cycling"
              variant={
                defaultActivity === "road_cycling" ? "primary" : "outline"
              }
              onPress={() => {
                markEdited();
                setDefaultActivity("road_cycling");
              }}
              style={{ flex: 1 }}
              leftAccessory={
                <MaterialIcons
                  name="directions-bike"
                  size={20}
                  color={
                    defaultActivity === "road_cycling" ? "#fff" : "#111827"
                  }
                />
              }
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Default Surface</Text>
          {defaultActivity === "road_cycling" ? (
            <View style={styles.lockedField}>
              <Text style={styles.lockedFieldText}>
                Asphalt only for road cycling.
              </Text>
            </View>
          ) : (
            <View style={styles.chipRow}>
              {(["Asphalt", "Trail", "Mixed"] as const).map((label) => (
                <Chip
                  key={label}
                  label={label}
                  selected={toSurfaceLabel(defaultSurface) === label}
                  onPress={() => {
                    markEdited();
                    setDefaultSurface(label.toLowerCase() as Surface);
                  }}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Route Type</Text>
          <View style={styles.goalRow}>
            <Button
              label="Circular"
              variant={defaultRouteType === "circular" ? "primary" : "outline"}
              onPress={() => {
                markEdited();
                setDefaultRouteType("circular");
              }}
              style={{ flex: 1 }}
            />
            <Button
              label="Point to Point"
              variant={
                defaultRouteType === "point_to_point" ? "primary" : "outline"
              }
              onPress={() => {
                markEdited();
                setDefaultRouteType("point_to_point");
              }}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>

      {!isProfileReady ? (
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Preparing your profile preferences...
          </Text>
        </View>
      ) : null}

      {!profile && isProfileReady ? (
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Your profile is still being initialized. You can edit these defaults
            and save them now.
          </Text>
        </View>
      ) : null}

      {successMessage ? (
        <View style={styles.successCard}>
          <MaterialIcons name="check-circle" size={20} color="#059669" />
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      ) : null}

      {errorMessage ? (
        <View style={styles.errorCard}>
          <MaterialIcons name="error" size={20} color="#dc2626" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        <Button
          label="Save Changes"
          onPress={onSave}
          loading={isSaving}
          disabled={!session || Boolean(homeLocationError)}
        />
        <Button
          label="Log out"
          variant="outline"
          onPress={onSignOut}
          loading={isSigningOut}
          disabled={!session}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centeredContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    padding: 16,
  },
  content: {
    padding: 20,
    gap: 24,
    paddingBottom: 56,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6b7280",
    letterSpacing: 0.5,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
  },
  goalRow: {
    flexDirection: "row",
    gap: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  footer: {
    marginTop: 8,
    gap: 12,
  },
  stateCard: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingVertical: 28,
    paddingHorizontal: 20,
    backgroundColor: "#f9fafb",
    alignItems: "center",
    gap: 8,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  stateText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#4b5563",
    textAlign: "center",
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#dc2626",
    flex: 1,
  },
  successCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  successText: {
    fontSize: 14,
    color: "#059669",
    flex: 1,
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
  searchHint: {
    fontSize: 12,
    color: "#6b7280",
  },
  suggestionItem: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#f9fafb",
  },
  suggestionText: {
    fontSize: 13,
    color: "#111827",
  },
  lockedField: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#f9fafb",
  },
  lockedFieldText: {
    fontSize: 14,
    color: "#4b5563",
    fontWeight: "500",
  },
});
