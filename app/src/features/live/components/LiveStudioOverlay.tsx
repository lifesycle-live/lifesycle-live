import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { EngagementEvent, PLATFORM_CATALOG, Property } from "../../../types/models";
import { colors } from "../../../theme";

interface Props {
  elapsed: number;
  events: EngagementEvent[];
  label: string;
  property: Property;
  ending: boolean;
  onEnd: () => void;
  onFlip?: () => void;
  onFullscreen?: () => void;
  fullscreen?: boolean;
  hideTopBar?: boolean;
}

interface RecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type RecognitionConstructor = new () => RecognitionLike;

export function LiveStudioOverlay({ elapsed, events, label, property, ending, onEnd, onFlip, onFullscreen, fullscreen, hideTopBar = false }: Props) {
  const points = useMemo(() => [
    { title: `Introduce ${property.address}`, detail: `Welcome viewers, name the location, and explain what makes this home worth seeing before you begin the walkthrough.` },
    ...(property.price ? [{ title: `Explain the asking price: ${property.price}`, detail: `State the price clearly, then connect it to the condition, location, and strongest value points of the property.` }] : []),
    ...(property.bedrooms != null ? [{ title: `Show the ${property.bedrooms} bedrooms`, detail: `Walk through each bedroom, mentioning light, storage, dimensions, and which room could work as an office or guest room.` }] : []),
    ...(property.features ?? []).map(feature => ({ title: feature, detail: `Show ${feature.toLowerCase()} on camera and give viewers one practical reason it improves everyday living.` })),
  ], [property]);
  const [pointIndex, setPointIndex] = useState(0);
  const [covered, setCovered] = useState<string[]>([]);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const visibleEvents = events.filter(event => event.freshness !== "pending" && event.intent !== "spam").slice(-5);
  const activePoint = points[pointIndex] ?? { title: "Keep the tour moving", detail: "Answer the latest viewer question and show the next part of the property." };
  const detected = transcript.toLocaleLowerCase().split(/\s+/).filter(word => word.length > 4).some(word => `${activePoint.title} ${activePoint.detail}`.toLocaleLowerCase().includes(word));

  useEffect(() => () => recognitionRef.current?.stop(), []);

  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    if (Platform.OS !== "web") {
      setSpeechError("Live transcription is currently available in the web studio only.");
      return;
    }
    const browserWindow = window as typeof window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
    const Recognition = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setSpeechError("This browser does not support live speech recognition. Use Chrome or Edge.");
      return;
    }
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-GB";
    recognition.onresult = event => {
      let text = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) text += `${event.results[index][0].transcript} `;
      setTranscript(text.trim());
    };
    recognition.onerror = event => { setSpeechError(`Transcription stopped: ${event.error}`); setListening(false); };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setSpeechError(null);
    recognition.start();
    setListening(true);
  }

  function nextPoint() {
    setCovered(current => current.includes(activePoint.title) ? current : [...current, activePoint.title]);
    setPointIndex(current => points.length ? (current + 1) % points.length : 0);
  }

  return <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
    {!hideTopBar && <View style={styles.topBar}>
      <View>
        <Text style={styles.live}>● {label}</Text>
        <Text style={styles.address} numberOfLines={1}>{property.address}</Text>
      </View>
      <View style={styles.topActions}>
        <Text style={styles.timer}>{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</Text>
        {onFlip && <TouchableOpacity onPress={onFlip} style={styles.pill}><Text style={styles.pillText}>↻ Camera</Text></TouchableOpacity>}
        <TouchableOpacity disabled={ending} onPress={onEnd} style={[styles.pill, styles.end]}><Text style={styles.pillText}>{ending ? "Ending…" : "End"}</Text></TouchableOpacity>
      </View>
    </View>}

    <View style={styles.guide}>
      <View style={styles.guideTitleRow}><Text style={styles.eyebrow}>✦ LIVE GUIDE</Text><TouchableOpacity onPress={toggleListening} style={[styles.listen, listening && styles.listening]}><Text style={styles.listenText}>{listening ? "● Listening" : "🎙 Listen"}</Text></TouchableOpacity></View>
      <Text style={styles.guideText}>{activePoint.title}</Text>
      <Text style={styles.guideDetail}>{activePoint.detail}</Text>
      {!!transcript && <View style={styles.transcript}><Text style={styles.transcriptLabel}>{detected ? "✓ TOPIC HEARD" : "LIVE TRANSCRIPT"}</Text><Text style={styles.transcriptText} numberOfLines={2}>{transcript}</Text></View>}
      {!!speechError && <Text style={styles.speechError}>{speechError}</Text>}
      <View style={styles.guideFooter}>
        <Text style={styles.progress}>{covered.length}/{points.length} covered</Text>
        <TouchableOpacity onPress={nextPoint} style={styles.next}><Text style={styles.nextText}>Covered · next →</Text></TouchableOpacity>
      </View>
    </View>

    <View style={styles.chat}>
      <View style={styles.chatHeader}><Text style={styles.eyebrow}>YOUTUBE LIVE CHAT</Text><Text style={styles.chatCount}>{visibleEvents.length}</Text></View>
      <ScrollView>{visibleEvents.length ? visibleEvents.map(event => <View key={event.id} style={styles.message}>
        <Text style={styles.author}>{PLATFORM_CATALOG[event.platform].icon} {event.authorName}</Text>
        <Text style={styles.messageText} numberOfLines={3}>{event.text}</Text>
      </View>) : <Text style={styles.empty}>{label === 'LIVE ON YOUTUBE' ? "Waiting for the first viewer comment…" : "No viewer messages received. Check the YouTube status above."}</Text>}</ScrollView>
    </View>
    {onFullscreen && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Toggle full screen" onPress={onFullscreen} style={styles.fullscreen}><Text style={styles.fullscreenText}>{fullscreen ? "↙" : "↗"}</Text></TouchableOpacity>}
  </View>;
}

const glass = { backgroundColor: "rgba(24, 15, 22, 0.66)", borderColor: "rgba(255,255,255,0.18)", borderWidth: 1 } as const;
const styles = StyleSheet.create({
  topBar: { ...glass, position: "absolute", left: 14, right: 14, top: 12, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  live: { color: "#ff7dae", fontSize: 11, fontWeight: "900" },
  address: { color: "white", fontSize: 13, fontWeight: "700", marginTop: 2, maxWidth: 360 },
  topActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  timer: { color: "white", fontVariant: ["tabular-nums"], fontWeight: "700" },
  pill: { backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  end: { backgroundColor: colors.primary },
  pillText: { color: "white", fontSize: 11, fontWeight: "800" },
  guide: { ...glass, position: "absolute", left: 14, bottom: 14, width: "46%", maxWidth: 420, borderRadius: 16, padding: 14 },
  eyebrow: { color: "#ff9fc3", fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  guideTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  listen: { backgroundColor: "rgba(255,255,255,0.13)", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  listening: { backgroundColor: "rgba(220,38,38,0.75)" },
  listenText: { color: "white", fontSize: 9, fontWeight: "800" },
  guideText: { color: "white", fontSize: 16, lineHeight: 21, fontWeight: "800", marginTop: 7 },
  guideDetail: { color: "rgba(255,255,255,0.82)", fontSize: 11, lineHeight: 16, marginTop: 5 },
  transcript: { backgroundColor: "rgba(0,0,0,0.28)", borderRadius: 10, padding: 8, marginTop: 8 },
  transcriptLabel: { color: "#86efac", fontSize: 8, fontWeight: "900", letterSpacing: 0.6 },
  transcriptText: { color: "white", fontSize: 10, lineHeight: 14, marginTop: 3 },
  speechError: { color: "#fecaca", fontSize: 9, marginTop: 6 },
  guideFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10, gap: 8 },
  progress: { color: "rgba(255,255,255,0.72)", fontSize: 10 },
  next: { backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  nextText: { color: colors.primaryDark, fontSize: 10, fontWeight: "900" },
  chat: { ...glass, position: "absolute", right: 14, top: 76, bottom: 62, width: "34%", maxWidth: 310, borderRadius: 16, padding: 12 },
  chatHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  chatCount: { color: "white", fontSize: 10, fontWeight: "800" },
  message: { backgroundColor: "rgba(255,255,255,0.10)", borderRadius: 11, padding: 9, marginTop: 6 },
  author: { color: "#ffb5d1", fontSize: 10, fontWeight: "800" },
  messageText: { color: "white", fontSize: 11, lineHeight: 15, marginTop: 3 },
  empty: { color: "rgba(255,255,255,0.65)", fontSize: 11, lineHeight: 16, marginTop: 8 },
  fullscreen: { ...glass, position: "absolute", right: 14, bottom: 14, width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  fullscreenText: { color: "white", fontSize: 22, fontWeight: "700" },
});
