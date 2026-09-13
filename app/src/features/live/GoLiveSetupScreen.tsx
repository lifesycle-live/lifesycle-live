import React, { useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getProperties } from "../../api/broadcasts";
import { QueryBoundary } from "../../components/QueryBoundary";
import { colors, shadow } from "../../theme";
import { PhotoGallery } from "./components/PhotoGallery";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { LiveStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<LiveStackParamList, "GoLiveSetup">;

export function GoLiveSetupScreen({ navigation }: Props) {
  const { data: properties, isLoading, isError, error, refetch } = useQuery({ queryKey: ["properties"], queryFn: getProperties });
  const [search, setSearch] = useState("");
  if (isLoading || isError || !properties) return <QueryBoundary isLoading={isLoading} isError={isError} error={error} onRetry={refetch} />;
  const filtered = properties.filter(p => `${p.address} ${p.propertyType ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <FlatList
      style={styles.screen}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.list}
      data={filtered}
      keyExtractor={item => item.id}
      ListHeaderComponent={<View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate("AddProperty")} style={{ padding: 14, backgroundColor: colors.primary, borderRadius: 16, marginBottom: 16 }}><Text style={{ color: "white", fontWeight: "700", textAlign: "center" }}>＋ Add property</Text></TouchableOpacity>
        <TextInput accessibilityLabel="Search properties" placeholder="Search address or property type" placeholderTextColor={colors.textMuted} value={search} onChangeText={setSearch} style={styles.search} />
        <View style={styles.section}><Text style={styles.sectionTitle}>Your properties</Text><Text style={styles.count}>{filtered.length} properties</Text></View>
      </View>}
      ListEmptyComponent={<Text style={styles.subtitle}>No properties match your search.</Text>}
      renderItem={({ item }) => <View style={[styles.card, shadow]}>
        <PhotoGallery images={item.images?.length ? item.images : [item.imageUrl || item.thumbnailUrl].filter(Boolean) as string[]} height={220} />
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`View ${item.address}`} onPress={() => navigation.navigate("PropertyDetail", { propertyId: item.id })} style={styles.body}>
          <View style={styles.section}><Text style={styles.type}>{item.propertyType || "PROPERTY"}</Text><Text style={styles.link}>Prepare live tour →</Text></View>
          <Text style={styles.price}>{item.price || "Price on application"}</Text>
          <Text style={styles.address}>{item.address}</Text>
          <View style={styles.specs}>
            {item.bedrooms != null && <Text style={styles.spec}>{item.bedrooms} bedrooms</Text>}
            {item.bathrooms != null && <Text style={styles.spec}>{item.bathrooms} bathrooms</Text>}
            <Text style={styles.spec}>View details →</Text>
          </View>
        </TouchableOpacity>
      </View>}
    />
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 20, paddingBottom: 30 },
  header: { marginBottom: 16 },
  subtitle: { fontSize: 14, lineHeight: 22, color: colors.textMuted, marginTop: 12 },
  search: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 15, marginBottom: 20, color: colors.text, fontSize: 13 },
  section: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  count: { color: colors.textMuted, fontSize: 12 },
  card: { backgroundColor: colors.surface, borderRadius: 24, overflow: "hidden", marginBottom: 24, borderWidth: 1, borderColor: colors.border },
  body: { padding: 18 },
  type: { color: colors.primaryDark, fontSize: 10, letterSpacing: 1, fontWeight: "700", flex: 1 },
  link: { color: colors.primaryDark, fontSize: 12, fontWeight: "600" },
  price: { fontSize: 24, fontWeight: "800", color: colors.text, marginTop: 10 },
  address: { fontSize: 14, color: colors.textMuted, marginTop: 5, lineHeight: 21 },
  specs: { flexDirection: "row", flexWrap: "wrap", gap: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14, marginTop: 16 },
  spec: { color: colors.textMuted, fontSize: 11 },
});
