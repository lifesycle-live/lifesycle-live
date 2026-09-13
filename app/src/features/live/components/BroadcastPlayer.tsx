import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
export function BroadcastPlayer({ videoId }: { videoId?: string }) {
  return <View style={styles.box}><Text style={styles.text}>Open the platform's live page to monitor the outgoing broadcast. Camera preview is available below.</Text></View>;
}
const styles = StyleSheet.create({box:{height:230,justifyContent:'center',padding:24,backgroundColor:'#30242c'},text:{color:'white',textAlign:'center',lineHeight:22}});
