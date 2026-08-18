import React, { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getAiPrep, getProperties, startBroadcast } from "../../api/broadcasts";
import { PlatformId } from "../../types/models";
import { AiPrepPanel } from "./components/AiPrepPanel";
import { PlatformSelector } from "./components/PlatformSelector";
import { useLiveSessionStore } from "../../state/liveSessionStore";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { LiveStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<LiveStackParamList, "GoLiveSetup">;

export function GoLiveSetupScreen({ navigation }: Props) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [platforms, setPlatforms] = useState<PlatformId[]>(["facebook", "youtube"]);
  const [isStarting, setIsStarting] = useState(false);
  const setActiveBroadcast = useLiveSessionStore((s) => s.setActiveBroadcast);

  const { data: properties, isLoading: propertiesLoading } = useQuery({
    queryKey: ["properties"],
    queryFn: getProperties,
  });

  const { data: prep, isLoading: prepLoading } = useQuery({
    queryKey: ["ai-prep", selectedPropertyId],
    queryFn: () => getAiPrep(selectedPropertyId as string),
    enabled: !!selectedPropertyId,
  });

  React.useEffect(() => {
    if (!selectedPropertyId && properties && properties.length > 0) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  function togglePlatform(platform: PlatformId) {
    setPlatforms((prev) => (prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]));
  }

  async function handleGoLive() {
    if (!selectedPropertyId) return;
    setIsStarting(true);
    try {
      const broadcast = await startBroadcast(selectedPropertyId, platforms);
      setActiveBroadcast(broadcast);
      navigation.replace("LiveDashboard", { broadcastId: broadcast.id });
    } finally {
      setIsStarting(false);
    }
  }

  if (propertiesLoading || !properties) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionLabel}>PROPERTY</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {properties.map((property) => (
          <TouchableOpacity
            key={property.id}
            style={[styles.propertyChip, selectedPropertyId === property.id && styles.propertyChipSelected]}
            onPress={() => setSelectedPropertyId(property.id)}
          >
            <Text
              style={[
                styles.propertyChipText,
                selectedPropertyId === property.id && styles.propertyChipTextSelected,
              ]}
            >
              {property.address}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <AiPrepPanel isLoading={prepLoading} prep={prep} />

      <Text style={styles.sectionLabel}>SELECT PLATFORMS</Text>
      <PlatformSelector selected={platforms} onToggle={togglePlatform} />

      <TouchableOpacity
        style={[styles.goLiveButton, (!selectedProperty || platforms.length === 0) && styles.goLiveButtonDisabled]}
        disabled={!selectedProperty || platforms.length === 0 || isStarting}
        onPress={handleGoLive}
      >
        {isStarting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.goLiveButtonText}>▶ Go Live Now</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: "#64748b", marginBottom: 8, letterSpacing: 0.5 },
  propertyChip: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
  },
  propertyChipSelected: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  propertyChipText: { fontSize: 13, color: "#334155" },
  propertyChipTextSelected: { color: "#fff", fontWeight: "600" },
  goLiveButton: {
    backgroundColor: "#dc2626",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  goLiveButtonDisabled: { backgroundColor: "#fca5a5" },
  goLiveButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
