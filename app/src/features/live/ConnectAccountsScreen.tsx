import React, { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PLATFORM_CATALOG, PlatformId } from "../../types/models";
import { connectFacebook, disconnectPlatform, getPlatformConnections } from "../../api/platformConnections";

const CONNECTABLE: PlatformId[] = ["facebook"];

/**
 * "Connect your accounts" — done once, per docs/08-user-journeys.md. After
 * this, GoLiveSetupScreen's platform picker just uses whatever's already
 * connected; there's no per-broadcast re-auth.
 */
export function ConnectAccountsScreen() {
  const queryClient = useQueryClient();
  const [connectingPlatform, setConnectingPlatform] = useState<PlatformId | null>(null);

  const { data: connections, isLoading } = useQuery({
    queryKey: ["platform-connections"],
    queryFn: getPlatformConnections,
  });

  const connectedByPlatform = new Map((connections ?? []).map((c) => [c.platform, c]));

  async function handleConnect(platform: PlatformId) {
    if (platform !== "facebook") return;
    setConnectingPlatform(platform);
    try {
      const result = await connectFacebook();
      if (result.status === "success") {
        await queryClient.invalidateQueries({ queryKey: ["platform-connections"] });
      } else if (result.status === "error") {
        Alert.alert("Connection failed", result.message);
      }
    } finally {
      setConnectingPlatform(null);
    }
  }

  async function handleDisconnect(platform: PlatformId) {
    await disconnectPlatform(platform);
    await queryClient.invalidateQueries({ queryKey: ["platform-connections"] });
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        Connect each account once — after that, starting a broadcast just uses whichever platforms you've connected.
      </Text>

      {Object.values(PLATFORM_CATALOG).map((platform) => {
        const connection = connectedByPlatform.get(platform.id);
        const isConnectable = CONNECTABLE.includes(platform.id);
        const isBusy = connectingPlatform === platform.id;

        return (
          <View key={platform.id} style={styles.row}>
            <View style={styles.textCol}>
              <Text style={styles.label}>{platform.label}</Text>
              {connection ? (
                <Text style={styles.connected}>Connected · {connection.externalAccountName}</Text>
              ) : (
                <Text style={styles.notConnected}>{isConnectable ? "Not connected" : "Not available yet"}</Text>
              )}
            </View>

            {isConnectable &&
              (connection ? (
                <TouchableOpacity style={styles.disconnectButton} onPress={() => handleDisconnect(platform.id)}>
                  <Text style={styles.disconnectButtonText}>Disconnect</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.connectButton}
                  disabled={isBusy}
                  onPress={() => handleConnect(platform.id)}
                >
                  {isBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.connectButtonText}>Connect</Text>}
                </TouchableOpacity>
              ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  intro: { fontSize: 13, color: "#64748b", marginBottom: 20, lineHeight: 18 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  textCol: { flex: 1, marginRight: 12 },
  label: { fontSize: 15, fontWeight: "600", color: "#111" },
  connected: { fontSize: 12, color: "#16a34a", marginTop: 2 },
  notConnected: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  connectButton: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 88,
    alignItems: "center",
  },
  connectButtonText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  disconnectButton: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  disconnectButtonText: { color: "#dc2626", fontWeight: "600", fontSize: 13 },
});
