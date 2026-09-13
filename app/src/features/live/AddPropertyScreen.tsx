import React, { useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useQueryClient } from "@tanstack/react-query";
import { createProperty } from "../../api/broadcasts";
import { USE_MOCKS } from "../../api/config";
import { colors } from "../../theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { LiveStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<LiveStackParamList, "AddProperty">;
export function AddPropertyScreen({ navigation }: Props) {
  const cache = useQueryClient();
  const [form, setForm] = useState({ address: "", price: "", propertyType: "", bedrooms: "", bathrooms: "", summary: "", features: "" });
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function pick() {
    setPicking(true); setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: 6 - images.length, base64: true, quality: 0.6 });
      if (result.canceled) return;
      const photos = result.assets.map(asset => {
        if (!asset.base64 || asset.base64.length > 1399900) throw new Error("Each photo must be under 1 MB. Choose a smaller JPEG, PNG or WebP image.");
        // Expo returns JPEG base64 on native; web preserves the selected file type.
        const mime = Platform.OS === "web" ? (asset.mimeType || "image/jpeg") : "image/jpeg";
        if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) throw new Error("Please choose JPEG, PNG or WebP photos.");
        return `data:${mime};base64,${asset.base64}`;
      });
      setImages(current => [...current, ...photos].slice(0, 6));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not select photos."); }
    finally { setPicking(false); }
  }
  async function save() {
    setError(null);
    const roomCount = (value: string) => value.trim() ? Number(value) : undefined;
    const bedrooms = roomCount(form.bedrooms), bathrooms = roomCount(form.bathrooms);
    if (form.address.trim().length < 3 || !form.propertyType.trim()) return setError("Enter an address and property type.");
    if ([bedrooms, bathrooms].some(n => n !== undefined && (!Number.isInteger(n) || n < 0 || n > 100))) return setError("Room counts must be whole numbers between 0 and 100.");
    const features = form.features.split("\n").map(s => s.trim()).filter(Boolean);
    if (features.length > 30 || features.some(s => s.length > 160)) return setError("Use up to 30 features, each under 160 characters.");
    setBusy(true);
    try {
      const property = await createProperty({ ...form, address: form.address.trim(), bedrooms, bathrooms, features, images });
      cache.setQueryData(["property", property.id], property);
      await cache.invalidateQueries({ queryKey: ["properties"] });
      navigation.replace("PropertyDetail", { propertyId: property.id });
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save. Your draft is still here."); }
    finally { setBusy(false); }
  }
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>A new property</Text>
      <Text style={styles.hint}>Add the details you want to show during your live tour.</Text>
      {USE_MOCKS && <Text style={styles.hint}>Demo: added properties last until this preview reloads.</Text>}
      <View style={styles.card}>
        <Text style={styles.label}>Photos · {images.length}/6</Text>
        <Text style={styles.hint}>First photo is the cover. JPEG, PNG or WebP, up to 1 MB each.</Text>
        <ScrollView horizontal style={{ marginVertical: 12 }}>
          {images.map((uri, index) => <View key={index} style={{ marginRight: 10 }}>
            <Image source={{ uri }} style={{ width: 120, height: 100, borderRadius: 12 }} />
            <TouchableOpacity disabled={busy} accessibilityLabel={`Remove photo ${index + 1}`} onPress={() => setImages(p => p.filter((_, i) => i !== index))}><Text style={styles.remove}>Remove</Text></TouchableOpacity>
          </View>)}
        </ScrollView>
        <TouchableOpacity disabled={busy || picking || images.length >= 6} onPress={pick} style={styles.secondary}><Text style={styles.secondaryText}>{picking ? "Opening photos…" : "＋ Choose photos"}</Text></TouchableOpacity>
      </View>
      <View style={styles.card}>
        {([['address','Address *',500],['propertyType','Property type *',120],['price','Asking price',255],['bedrooms','Bedrooms',3],['bathrooms','Bathrooms',3],['summary','Property description',2000],['features','Key features · one per line',5000]] as const).map(([key,label,maxLength]) => <View key={key}>
          <Text style={styles.label}>{label}</Text>
          <TextInput accessibilityLabel={label} editable={!busy} style={[styles.input, (key === 'summary' || key === 'features') && { minHeight: 110, textAlignVertical: 'top' }]} value={form[key]} onChangeText={value => setForm(p => ({ ...p, [key]: value }))} maxLength={maxLength} multiline={key === 'summary' || key === 'features'} keyboardType={key === 'bedrooms' || key === 'bathrooms' ? 'number-pad' : 'default'} placeholder={key === 'features' ? 'South-facing garden\nRecently renovated kitchen' : undefined} placeholderTextColor={colors.textMuted} />
        </View>)}
      </View>
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <TouchableOpacity disabled={busy || picking} onPress={save} style={[styles.primary, (busy || picking) && { opacity: 0.5 }]}>{busy ? <ActivityIndicator color="white" /> : <Text style={styles.primaryText}>Save property & prepare live tour →</Text>}</TouchableOpacity>
    </ScrollView>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({
  root: { backgroundColor: colors.bg }, content: { padding: 20, paddingBottom: 40 }, title: { fontSize: 26, fontWeight: '800', color: colors.text },
  hint: { color: colors.textMuted, fontSize: 12, lineHeight: 19, marginTop: 6 }, card: { padding: 18, backgroundColor: 'white', borderRadius: 22, marginTop: 18 },
  label: { color: colors.text, fontSize: 13, fontWeight: '700', marginTop: 10, marginBottom: 8 }, input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, color: colors.text, marginBottom: 10 },
  remove: { color: colors.primaryDark, paddingVertical: 8, fontSize: 12 }, secondary: { padding: 13, borderRadius: 12, backgroundColor: colors.primarySoft }, secondaryText: { color: colors.primaryDark, textAlign: 'center', fontWeight: '700' },
  primary: { backgroundColor: colors.primary, borderRadius: 16, padding: 17, marginTop: 20 }, primaryText: { color: 'white', textAlign: 'center', fontWeight: '700' }, error: { color: colors.live, marginTop: 14 },
});
