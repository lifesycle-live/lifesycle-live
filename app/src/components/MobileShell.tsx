import React from "react";
import { Platform, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { colors } from "../theme";

export function MobileShell({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const framed = Platform.OS === "web" && width >= 600;
  if (!framed) return <View style={{ flex: 1 }}>{children}</View>;
  return (
    <View style={styles.stage}>
      <View style={[styles.phone, { height: Math.min(880, height - 40) }]}>
        <View style={styles.status} accessibilityElementsHidden>
          <Text style={styles.time}>Lifesycle</Text>
          <View style={styles.island} />
          <Text style={styles.time}>Live ●</Text>
        </View>
        <View style={{ flex: 1, minHeight: 0 }}>{children}</View>
        <View style={styles.home}><View style={styles.indicator} /></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f5e8ee" },
  phone: { width: 414, maxWidth: "100%", borderRadius: 46, borderWidth: 8, borderColor: "#30242c", overflow: "hidden", backgroundColor: colors.surface, boxShadow: "0 24px 80px #63334830" },
  status: { height: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22 },
  time: { fontSize: 11, fontWeight: "700", color: colors.text },
  island: { width: 106, height: 25, borderRadius: 20, backgroundColor: "#30242c" },
  home: { height: 18, alignItems: "center", justifyContent: "center" },
  indicator: { width: 110, height: 4, borderRadius: 4, backgroundColor: "#30242c" },
});
