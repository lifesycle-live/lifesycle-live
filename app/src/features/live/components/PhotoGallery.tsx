import React, { useRef, useState } from "react";
import {
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { PhotoLightbox } from "./PhotoLightbox";

const PLACEHOLDER =
  "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=70";

interface Props {
  images: string[];
  /** Height of the inline (non-fullscreen) gallery. */
  height?: number;
}

/**
 * Swipeable listing photo gallery. Tapping any photo opens a full-screen,
 * swipeable viewer. Falls back to a single placeholder when a listing has
 * no photos yet.
 */
export function PhotoGallery({ images, height = 280 }: Props) {
  const [width, setWidth] = useState(0);
  const photos = images.length > 0 ? images : [PLACEHOLDER];

  const [index, setIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const list = useRef<FlatList<string>>(null);
  function move(delta: number) {
    const next = Math.max(0, Math.min(photos.length - 1, index + delta));
    list.current?.scrollToOffset({ offset: next * width, animated: true });
    setIndex(next);
  }

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>, w: number) {
    const next = Math.round(e.nativeEvent.contentOffset.x / w);
    if (next !== index) setIndex(next);
  }

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 && <FlatList
        ref={list}
        key={width}
        data={photos}
        keyExtractor={(uri, i) => `${i}-${uri}`}
        horizontal
        pagingEnabled
        onScroll={(e) => onScroll(e, width)}
        scrollEventThrottle={32}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => onScroll(e, width)}
        renderItem={({ item }) => (
          <Pressable onPress={() => setViewerOpen(true)}>
            <Image source={{ uri: item }} style={{ width, height }} />
          </Pressable>
        )}
      />}

      {photos.length > 1 ? (
        <>
          <View style={styles.arrows} pointerEvents="box-none">
            <Pressable accessibilityLabel="Previous photo" accessibilityRole="button" disabled={index === 0} onPress={() => move(-1)} style={[styles.arrow, { opacity: index === 0 ? 0.3 : 1 }]}><Text style={styles.counterText}>‹</Text></Pressable>
            <Pressable accessibilityLabel="Next photo" accessibilityRole="button" disabled={index === photos.length - 1} onPress={() => move(1)} style={[styles.arrow, { opacity: index === photos.length - 1 ? 0.3 : 1 }]}><Text style={styles.counterText}>›</Text></Pressable>
          </View>
          <View style={styles.counter}>
            <Text style={styles.counterText}>
              {index + 1} / {photos.length}
            </Text>
          </View>
          <View style={styles.dots}>
            {photos.map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>
        </>
      ) : null}

      <PhotoLightbox
        visible={viewerOpen}
        images={photos}
        initialIndex={index}
        onClose={() => setViewerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  arrows: { position: "absolute", top: "45%", left: 10, right: 10, flexDirection: "row", justifyContent: "space-between" },
  arrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#36283288", alignItems: "center", justifyContent: "center" },
  counter: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(15,23,42,0.65)",
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  counterText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  dots: {
    position: "absolute",
    bottom: 28,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  dotActive: { backgroundColor: "#fff", width: 18 },
});
