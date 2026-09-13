import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface Props {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  onRetry?: () => void;
}

/**
 * Shared loading/error state for screens driven by a single query. Prevents the
 * "spinner forever" behaviour when a request fails (server down, 401, etc.).
 */
export function QueryBoundary({ isLoading, isError, error, onRetry }: Props) {
  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Couldn’t load this screen</Text>
        <Text style={styles.detail}>
          {error instanceof Error ? error.message : "Something went wrong."}
        </Text>
        {onRetry ? (
          <TouchableOpacity style={styles.button} onPress={onRetry}>
            <Text style={styles.buttonText}>Try again</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <ActivityIndicator />
      {isLoading ? null : <Text style={styles.detail}>No data.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 6 },
  detail: { fontSize: 13, color: "#64748b", textAlign: "center", marginTop: 8 },
  button: {
    marginTop: 16,
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  buttonText: { color: "#fff", fontWeight: "700" },
});
