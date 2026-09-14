import React from "react";
import { Platform, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { colors } from "../theme";
import { useStudioLayout } from '../state/studioLayout';

export function MobileShell({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const landscape = useStudioLayout(s => s.landscape);
  const framed = Platform.OS === "web" && width >= 600;
  const landscapeWidth = Math.max(0, Math.min(880, width - 40, (height - 40) * 880 / 414));
  if (!framed) return <View style={{ flex: 1 }}>{children}</View>;
  return (
    <View style={styles.stage}>
      <View style={[styles.phone, { flexDirection: landscape ? 'row' : 'column', height: landscape ? landscapeWidth * 414 / 880 : Math.min(880, height - 40), width: landscape ? landscapeWidth : 414 }]}>
        <View style={[styles.status, landscape && { width: 38, height: '100%', paddingHorizontal: 0, justifyContent: 'center' }]} accessibilityElementsHidden>
          {!landscape && <>
          <Text style={styles.time}>Lifesycle</Text>
          <View style={styles.island} />
          <Text style={styles.time}>Live ●</Text>
          </>}
          {landscape && <View style={{ width: 20, height: 106, borderRadius: 20, backgroundColor: '#30242c' }} />}
        </View>
        <View style={{ flex: 1, minHeight: 0, minWidth: 0 }}>{children}</View>
        <View style={[styles.home, landscape && { width: 18, height: '100%' }]}><View style={[styles.indicator, landscape && { width: 4, height: 110 }]} /></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f5e8ee" },
  phone: { maxWidth: "100%", borderRadius: 46, borderWidth: 8, borderColor: "#30242c", overflow: "hidden", backgroundColor: colors.surface, boxShadow: "0 24px 80px #63334830" },
  status: { height: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22 },
  time: { fontSize: 11, fontWeight: "700", color: colors.text },
  island: { width: 106, height: 25, borderRadius: 20, backgroundColor: "#30242c" },
  home: { height: 18, alignItems: "center", justifyContent: "center" },
  indicator: { width: 110, height: 4, borderRadius: 4, backgroundColor: "#30242c" },
});
