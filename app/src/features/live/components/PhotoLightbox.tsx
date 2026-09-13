import React, { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

interface Props {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

/**
 * Full-screen swipeable photo viewer, shared by the inline PhotoGallery
 * (tap a photo in the detail screen) and the listing grid (long-press a
 * card to preview its photos without opening the detail screen).
 */
export function PhotoLightbox({ visible, images, initialIndex = 0, onClose }: Props) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(initialIndex);
  useEffect(() => { if (visible) setIndex(initialIndex); }, [visible, initialIndex]);

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  }

  if (!visible || images.length === 0) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.viewer}>
        <FlatList
          data={images}
          keyExtractor={(uri, i) => `full-${i}-${uri}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={onScroll}
          renderItem={({ item }) => (
            <View style={{ width, height: "100%", justifyContent: "center" }}>
              <Image source={{ uri: item }} style={styles.fullImage} resizeMode="contain" />
            </View>
          )}
        />
        <View style={styles.viewerBar}>
          <Text style={styles.viewerCount}>
            {index + 1} / {images.length}
          </Text>
          <Pressable hitSlop={12} onPress={onClose}>
            <Text style={styles.close}>Close ✕</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  viewer: { flex: 1, backgroundColor: "rgba(0,0,0,0.96)" },
  fullImage: { width: "100%", height: "80%" },
  viewerBar: {
    position: "absolute",
    top: 48,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  viewerCount: { color: "#fff", fontSize: 14, fontWeight: "700" },
  close: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
