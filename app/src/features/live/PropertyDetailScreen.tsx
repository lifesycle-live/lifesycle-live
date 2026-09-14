import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useCameraPermissions } from "expo-camera";
import { getAiPrep, getProperty, startBroadcast } from "../../api/broadcasts";
import { getPlatformAvailability, getPlatformConnections } from "../../api/platformConnections";
import { QueryBoundary } from "../../components/QueryBoundary";
import { ONE_CLICK_PLATFORMS, PlatformId } from "../../types/models";
import { AiPrepPanel } from "./components/AiPrepPanel";
import { PhotoGallery } from "./components/PhotoGallery";
import { PlatformSelector } from "./components/PlatformSelector";
import { useLiveSessionStore } from "../../state/liveSessionStore";
import { colors, radius, shadow } from "../../theme";
import { ApiError } from "../../api/client";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { LiveStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<LiveStackParamList, "PropertyDetail">;

export function PropertyDetailScreen({ route, navigation }: Props) {
  const { propertyId } = route.params;
  const [platforms, setPlatforms] = useState<PlatformId[] | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<{ message: string; details?: string[] } | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const setActiveBroadcast = useLiveSessionStore((s) => s.setActiveBroadcast);

  const { data: property, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["property", propertyId],
    queryFn: () => getProperty(propertyId),
  });

  const { data: prep, isLoading: prepLoading } = useQuery({
    queryKey: ["ai-prep", propertyId],
    queryFn: () => getAiPrep(propertyId),
  });

  const { data: connections } = useQuery({
    queryKey: ["platform-connections"],
    queryFn: getPlatformConnections,
  });
  // YouTube doesn't have per-agent OAuth yet (TASKS.md Day 2) — the server
  // authenticates it with a single .env refresh token, so there's never a
  // PlatformConnection row for it. Only treat it as available once the
  // server actually reports YOUTUBE_* as configured — otherwise it gets
  // auto-selected alongside a real connection (e.g. Facebook) and fails the
  // whole broadcast, since /broadcasts requires every selected platform to
  // succeed.
  const { data: availability } = useQuery({
    queryKey: ["platform-availability"],
    queryFn: getPlatformAvailability,
  });
  const youtubeConfigured = availability?.find((a) => a.platform === "youtube")?.configured ?? false;
  const connectedPlatforms = [
    ...new Set([
      ...(connections ?? []).map((c) => c.platform),
      ...(youtubeConfigured ? (["youtube"] as PlatformId[]) : []),
    ]),
  ];

  // Default the picker to whichever one-click platforms are already
  // connected, once we know — a hardcoded default would pre-select
  // platforms the agent may not have connected yet.
  useEffect(() => {
    if (platforms === null && connections !== undefined && availability !== undefined) {
      setPlatforms(ONE_CLICK_PLATFORMS.filter((p) => connectedPlatforms.includes(p)));
    }
  }, [connections, availability]);
  const selectedPlatforms = platforms ?? [];

  function togglePlatform(platform: PlatformId) {
    setPlatforms((prev) =>
      (prev ?? []).includes(platform) ? (prev ?? []).filter((p) => p !== platform) : [...(prev ?? []), platform],
    );
  }

  function handleRequestConnect(_platform: PlatformId) {
    navigation.navigate("ConnectAccounts");
  }

  async function handleGoLive() {
    setIsStarting(true);
    setStartError(null);
    try {
      const permission = cameraPermission?.granted ? cameraPermission : await requestCameraPermission();
      if (!permission.granted) {
        setStartError({ message: "Camera access is required before opening the live studio." });
        return;
      }
      const broadcast = await startBroadcast(propertyId, selectedPlatforms);
      setActiveBroadcast(broadcast);
      navigation.replace("LiveDashboard", { broadcastId: broadcast.id });
    } catch (err) {
      if (err instanceof ApiError) {
        setStartError({ message: err.message, details: err.details });
      } else if (err instanceof Error) {
        setStartError({ message: err.message });
      } else {
        setStartError({ message: "Could not start the broadcast." });
      }
    } finally {
      setIsStarting(false);
    }
  }

  if (isLoading || isError || !property) {
    return <QueryBoundary isLoading={isLoading} isError={isError} error={error} onRetry={refetch} />;
  }

  const specs = [
    property.bedrooms != null ? `${property.bedrooms} bed` : null,
    property.bathrooms != null ? `${property.bathrooms} bath` : null,
    property.propertyType ?? null,
  ].filter(Boolean) as string[];

  const canGoLive = selectedPlatforms.length > 0 && !isStarting;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <PhotoGallery
          images={
            property.images && property.images.length > 0
              ? property.images
              : ([property.imageUrl || property.thumbnailUrl].filter(Boolean) as string[])
          }
        />

        <View style={styles.sheet}>
          <Text style={styles.price}>{property.price ?? "Price on application"}</Text>
          <Text style={styles.address}>{property.address}</Text>

          {specs.length > 0 ? (
            <View style={styles.specRow}>
              {specs.map((s) => (
                <View key={s} style={styles.specChip}>
                  <Text style={styles.specChipText}>{s}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {property.summary ? <Text style={styles.summary}>{property.summary}</Text> : null}

          {property.features && property.features.length > 0 ? (
            <View style={styles.featureWrap}>
              {property.features.map((f) => (
                <View key={f} style={styles.featureChip}>
                  <Text style={styles.featureText}>✓ {f}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.divider} />

          <AiPrepPanel isLoading={prepLoading} prep={prep} />

          <Text style={styles.sectionLabel}>WHERE TO GO LIVE</Text>
          <Text style={styles.sectionHint}>Tap a platform to include it — selected platforms turn their colour.</Text>
          <PlatformSelector
            selected={selectedPlatforms}
            onToggle={togglePlatform}
            connectedPlatforms={connectedPlatforms}
            onRequestConnect={handleRequestConnect}
          />

          {startError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>{startError.message}</Text>
              {startError.details?.map((d) => (
                <Text key={d} style={styles.errorLine}>
                  • {d}
                </Text>
              ))}
              <Text style={styles.errorHint}>
                The broadcast could not start. Resolve the platform error above before trying again.
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.bar, shadow]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.barCount}>
            {selectedPlatforms.length} platform{selectedPlatforms.length === 1 ? "" : "s"} selected
          </Text>
          <Text style={styles.barSub} numberOfLines={1}>
            {property.address}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.goLive, !canGoLive && styles.goLiveDisabled]}
          disabled={!canGoLive}
          onPress={handleGoLive}
          activeOpacity={0.85}
        >
          {isStarting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.goLiveText}>● Go Live</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 120 },
  hero: { width: "100%", height: 280, backgroundColor: colors.border },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    marginTop: -20,
    padding: 18,
  },
  price: { fontSize: 24, fontWeight: "800", color: colors.text },
  address: { fontSize: 15, color: colors.textMuted, marginTop: 2 },
  specRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  specChip: {
    backgroundColor: colors.bg,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  specChipText: { fontSize: 13, fontWeight: "600", color: colors.text },
  summary: { fontSize: 14, lineHeight: 21, color: colors.text, marginTop: 14 },
  featureWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  featureChip: {
    backgroundColor: "#ecfdf5",
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  featureText: { fontSize: 12, color: "#047857", fontWeight: "600" },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 18 },
  sectionLabel: { fontSize: 12, fontWeight: "800", color: colors.textMuted, letterSpacing: 0.5 },
  sectionHint: { fontSize: 12, color: colors.textMuted, marginTop: 4, marginBottom: 12 },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderRadius: radius.md,
    padding: 12,
    marginTop: 14,
  },
  errorTitle: { color: colors.live, fontSize: 13, fontWeight: "700" },
  errorLine: { color: colors.live, fontSize: 12, marginTop: 4 },
  errorHint: { color: colors.textMuted, fontSize: 12, marginTop: 8, lineHeight: 17 },
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  barCount: { fontSize: 13, fontWeight: "700", color: colors.text },
  barSub: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  goLive: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    minWidth: 120,
  },
  goLiveDisabled: { backgroundColor: colors.primary, opacity: 0.45 },
  goLiveText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
