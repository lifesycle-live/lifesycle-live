import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { endBroadcast } from "../../api/broadcasts";
import { convertEngagementToLead, convertEngagementToTask, getEngagementFeed } from "../../api/engagement";
import { useLiveSessionStore } from "../../state/liveSessionStore";
import { EngagementFeed } from "./components/EngagementFeed";
import { PriorityQueue } from "./components/PriorityQueue";
import { rtmpStreamer } from "../../live/rtmpStreamer";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { LiveStackParamList } from "../../navigation/types";
import { EngagementEvent } from "../../types/models";

type Props = NativeStackScreenProps<LiveStackParamList, "LiveDashboard">;

const POLL_INTERVAL_MS = 4000;

export function LiveDashboardScreen({ route, navigation }: Props) {
  const { broadcastId } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isEnding, setIsEnding] = useState(false);

  const activeBroadcast = useLiveSessionStore((s) => s.activeBroadcast);
  const engagementQueue = useLiveSessionStore((s) => s.engagementQueue);
  const setEngagementQueue = useLiveSessionStore((s) => s.setEngagementQueue);
  const removeFromQueue = useLiveSessionStore((s) => s.removeFromQueue);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission]);

  // Starts pushing to every one-click ingest target the backend provisioned.
  // See src/live/rtmpStreamer.ts for the spike notes on why this is mocked
  // pending a physical-device verification pass.
  useEffect(() => {
    if (!activeBroadcast?.ingest) return;
    const [first] = Object.values(activeBroadcast.ingest);
    if (first) rtmpStreamer.start(first.rtmpUrl, first.streamKey);
    return () => {
      rtmpStreamer.stop();
    };
  }, [activeBroadcast]);

  useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  useEffect(() => {
    async function poll() {
      const events = await getEngagementFeed(broadcastId);
      setEngagementQueue(events);
    }
    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [broadcastId]);

  async function handleConvertToLead(event: EngagementEvent) {
    await convertEngagementToLead(event.id);
    removeFromQueue(event.id);
  }

  async function handleConvertToTask(event: EngagementEvent) {
    await convertEngagementToTask(event.id);
    removeFromQueue(event.id);
  }

  async function handleEndLive() {
    setIsEnding(true);
    try {
      await endBroadcast(broadcastId);
      navigation.replace("BroadcastSummary", { broadcastId });
    } finally {
      setIsEnding(false);
    }
  }

  const timeLabel = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:${String(
    elapsedSeconds % 60,
  ).padStart(2, "0")}`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.liveLabel}>● LIVE {timeLabel}</Text>
        <Text style={styles.propertyLabel}>{activeBroadcast?.property.address}</Text>
        <TouchableOpacity onPress={handleEndLive} disabled={isEnding}>
          <Text style={styles.endLabel}>{isEnding ? "Ending…" : "End live"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.previewContainer}>
        {permission?.granted ? (
          <CameraView style={styles.preview} facing="back" />
        ) : (
          <View style={[styles.preview, styles.previewPlaceholder]}>
            <Text style={styles.previewPlaceholderText}>Camera permission needed</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.feedContainer} contentContainerStyle={{ padding: 12 }}>
        <EngagementFeed
          events={engagementQueue}
          onConvertToLead={handleConvertToLead}
          onConvertToTask={handleConvertToTask}
        />
        <PriorityQueue
          events={engagementQueue}
          onAction={handleConvertToLead}
          onDismiss={(event) => removeFromQueue(event.id)}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  liveLabel: { color: "#dc2626", fontWeight: "700", fontSize: 13 },
  propertyLabel: { fontSize: 13, color: "#334155", flex: 1, marginLeft: 12 },
  endLabel: { color: "#2563eb", fontWeight: "600", fontSize: 13 },
  previewContainer: { height: 220, backgroundColor: "#000" },
  preview: { flex: 1 },
  previewPlaceholder: { alignItems: "center", justifyContent: "center" },
  previewPlaceholderText: { color: "#94a3b8" },
  feedContainer: { flex: 1 },
});
