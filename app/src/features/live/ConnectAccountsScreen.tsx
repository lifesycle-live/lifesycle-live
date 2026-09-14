import React, { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PLATFORM_CATALOG, PlatformId } from "../../types/models";
import { CONNECTABLE_PLATFORMS, connectPlatform, disconnectPlatform, getPlatformAvailability, getPlatformConnections } from "../../api/platformConnections";
import { colors, radius } from "../../theme";
import { QueryBoundary } from "../../components/QueryBoundary";

export function ConnectAccountsScreen() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<PlatformId | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const connections = useQuery({ queryKey: ["platform-connections"], queryFn: getPlatformConnections });
  const availability = useQuery({ queryKey: ["platform-availability"], queryFn: getPlatformAvailability });
  const connected = new Map((connections.data ?? []).map(c => [c.platform, c]));
  const available = new Map((availability.data ?? []).map(c => [c.platform, c]));
  async function change(platform: PlatformId, disconnect: boolean) {
    setBusy(platform); setNotice(null);
    try {
      if (disconnect) {
        await disconnectPlatform(platform);
        setNotice("Disconnected from Lifesycle. You can also revoke access in the platform's settings.");
      } else {
        const result = await connectPlatform(platform);
        setNotice(result.status === "success" ? "Account connected." : result.status === "cancelled" ? "Connection cancelled." : result.message);
      }
      await queryClient.invalidateQueries({ queryKey: ["platform-connections"] });
    } catch (error) { setNotice(error instanceof Error ? error.message : "Connection failed. Please retry."); }
    finally { setBusy(null); }
  }
  if (connections.isLoading || availability.isLoading || connections.isError || availability.isError) return <QueryBoundary isLoading={connections.isLoading || availability.isLoading} isError={connections.isError || availability.isError} error={connections.error ?? availability.error} onRetry={() => { void connections.refetch(); void availability.refetch(); }} />;
  return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <Text style={styles.title}>Your channels</Text>
    <Text style={styles.intro}>Link the accounts you manage. Each platform has its own broadcast and comment permissions.</Text>
    {notice && <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text>}
    {Object.values(PLATFORM_CATALOG).sort((a, b) => Number(connected.has(b.id) || (b.id === "youtube" && available.get(b.id)?.configured)) - Number(connected.has(a.id) || (a.id === "youtube" && available.get(a.id)?.configured))).map(platform => {
      const connection = connected.get(platform.id);
      const setup = available.get(platform.id);
      const connectable = CONNECTABLE_PLATFORMS.includes(platform.id);
      return <View key={platform.id} style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.icon, { backgroundColor: platform.color }]}><Text style={styles.glyph}>{platform.icon}</Text></View>
          <View style={{ flex: 1 }}><Text style={styles.label}>{platform.label}</Text><Text style={[styles.status, connection && { color: colors.success }]}>{connection ? `Connected · ${connection.externalAccountName}` : setup?.configured ? (connectable ? "Ready to connect" : "Configured on server") : "Setup required"}</Text></View>
        </View>
        <Text style={styles.intro}>{setup?.note}</Text>
        {platform.id === 'facebook' && <Text style={styles.intro}>If Meta shows “Previously shared” and disables your Page, check the Page access permissions. The signed-in person must have the required control of that Page; portfolio membership alone may not be enough.</Text>}
        {connection && connectable && <TouchableOpacity accessibilityRole="button" disabled={busy !== null} style={[styles.button, { marginBottom: 8 }]} onPress={() => change(platform.id, false)}><Text style={styles.buttonText}>Reconnect / update permissions</Text></TouchableOpacity>}
        {connectable && <TouchableOpacity accessibilityRole="button" disabled={busy !== null || (!connection && !setup?.configured)} style={[styles.button, (busy !== null || (!connection && !setup?.configured)) && { opacity: 0.45 }, connection && { backgroundColor: colors.primarySoft }]} onPress={() => change(platform.id, Boolean(connection))}>
          {busy === platform.id ? <ActivityIndicator color={colors.primaryDark} /> : <Text style={[styles.buttonText, connection && { color: colors.primaryDark }]}>{connection ? "Disconnect" : setup?.configured ? "Connect account" : "Application credentials required"}</Text>}
        </TouchableOpacity>}
      </View>;
    })}
  </ScrollView>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg }, content: { padding: 20, paddingBottom: 32 },
  title: { fontSize: 26, fontWeight: "800", color: colors.text },
  intro: { fontSize: 13, color: colors.textMuted, marginTop: 10, marginBottom: 14, lineHeight: 20 },
  notice: { backgroundColor: colors.primarySoft, color: colors.primaryDark, padding: 14, borderRadius: radius.md, marginBottom: 16, lineHeight: 20 },
  card: { padding: 18, marginBottom: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  glyph: { color: "white", fontWeight: "800", fontSize: 21 },
  label: { fontSize: 16, fontWeight: "700", color: colors.text }, status: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  button: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 12, alignItems: "center" },
  buttonText: { fontSize: 13, fontWeight: "700", color: "white" },
});
