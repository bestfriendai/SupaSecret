import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

const TEST_VIDEO_URL = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

export const SimpleVideoTest: React.FC = () => {
  console.log('SimpleVideoTest: Creating player with URL:', TEST_VIDEO_URL);
  
  const player = useVideoPlayer(TEST_VIDEO_URL, (player) => {
    console.log('SimpleVideoTest: Player callback called with:', player ? 'valid player' : 'null player');
    if (player) {
      player.loop = true;
      player.muted = false;
      console.log('SimpleVideoTest: Player configured successfully');
    }
  });

  console.log('SimpleVideoTest: Player object:', player ? 'available' : 'null');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Simple Video Test</Text>
      <Text style={styles.info}>Player: {player ? 'Available' : 'Null'}</Text>
      <Text style={styles.info}>URL: {TEST_VIDEO_URL}</Text>
      
      {player ? (
        <VideoView 
          style={styles.video} 
          player={player} 
          fullscreenOptions={{ enabled: false }}
          nativeControls={true}
        />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>No Player Available</Text>
        </View>
      )}
      
      <View style={styles.controls}>
        <Button
          title="Play"
          onPress={() => {
            if (player) {
              console.log('SimpleVideoTest: Playing video');
              player.play();
            }
          }}
        />
        <Button
          title="Pause"
          onPress={() => {
            if (player) {
              console.log('SimpleVideoTest: Pausing video');
              player.pause();
            }
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  info: {
    color: 'white',
    fontSize: 14,
    marginBottom: 10,
  },
  video: {
    width: 300,
    height: 200,
    backgroundColor: '#333',
    marginVertical: 20,
  },
  placeholder: {
    width: 300,
    height: 200,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  placeholderText: {
    color: 'white',
    fontSize: 16,
  },
  controls: {
    flexDirection: 'row',
    gap: 20,
  },
});
