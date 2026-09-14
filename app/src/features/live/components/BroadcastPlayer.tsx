import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
export function BroadcastPlayer({ videoId }: { videoId?: string }) {
  if (Platform.OS === 'web' && videoId) {
    return <View style={styles.box}>{React.createElement('iframe', {
      src: `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&mute=1`,
      title: 'YouTube broadcast monitor',
      allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
      allowFullScreen: true,
      style: { width: '100%', height: '100%', border: 0 },
    })}</View>;
  }
  return <View style={styles.box}><Text style={styles.text}>{videoId ? "Open the YouTube live page to monitor this broadcast." : "YouTube monitor is unavailable because no broadcast ID was returned."}</Text></View>;
}
const styles = StyleSheet.create({box:{height:230,justifyContent:'center',backgroundColor:'#30242c'},text:{color:'white',textAlign:'center',lineHeight:22,padding:24}});
