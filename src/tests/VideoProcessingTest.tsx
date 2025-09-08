import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { VideoProcessingService } from '../services/VideoProcessingService';

export default function VideoProcessingTest() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [results, setResults] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testVideoProcessingWithMockData = async () => {
    addLog('Starting video processing test with mock data...');
    setIsProcessing(true);
    setProgress(0);
    setResults(null);

    try {
      // Create a mock video URI (in real app, this would be from camera)
      const mockVideoUri = 'file:///mock/video/path.mp4';
      
      addLog('Testing video processing service...');
      
      const processedVideo = await VideoProcessingService.processVideo(mockVideoUri, {
        enableFaceBlur: true,
        enableVoiceChange: true,
        enableTranscription: true,
        quality: 'medium',
        voiceEffect: 'deep',
        onProgress: (prog, stat) => {
          setProgress(prog);
          setStatus(stat);
          addLog(`Progress: ${prog}% - ${stat}`);
        }
      });

      setResults(processedVideo);
      addLog('✅ Video processing completed successfully!');
      addLog(`Transcription: ${processedVideo.transcription}`);
      addLog(`Face blur applied: ${processedVideo.faceBlurApplied}`);
      addLog(`Voice change applied: ${processedVideo.voiceChangeApplied}`);
      addLog(`Duration: ${processedVideo.duration} seconds`);

    } catch (error) {
      addLog(`❌ Video processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      Alert.alert('Error', `Video processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setStatus('');
    }
  };

  const testVideoProcessingWithRealVideo = async () => {
    try {
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Media library permission is required to test with real videos.');
        return;
      }

      // Pick a video from library
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        addLog('Real video selected, starting processing...');
        setIsProcessing(true);
        setProgress(0);
        setResults(null);

        const processedVideo = await VideoProcessingService.processVideo(
          result.assets[0].uri,
          {
            enableFaceBlur: true,
            enableVoiceChange: true,
            enableTranscription: true,
            quality: 'medium',
            voiceEffect: 'light',
            onProgress: (prog, stat) => {
              setProgress(prog);
              setStatus(stat);
              addLog(`Progress: ${prog}% - ${stat}`);
            }
          }
        );

        setResults(processedVideo);
        addLog('✅ Real video processing completed!');
        Alert.alert('Success!', `Video processed successfully!\nTranscription: ${processedVideo.transcription}`);
      }
    } catch (error) {
      addLog(`❌ Real video processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      Alert.alert('Error', `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setStatus('');
    }
  };

  const testTranscriptionService = async () => {
    addLog('Testing real-time transcription...');
    
    try {
      await VideoProcessingService.initialize();
      addLog('✅ Video processing service initialized');

      await VideoProcessingService.startRealTimeTranscription();
      addLog('✅ Real-time transcription started');
      
      // Simulate some time
      setTimeout(async () => {
        await VideoProcessingService.stopRealTimeTranscription();
        addLog('✅ Real-time transcription stopped');
      }, 3000);

    } catch (error) {
      addLog(`❌ Transcription test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setResults(null);
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="px-4 py-3 border-b border-gray-800">
        <Text className="text-white text-18 font-bold">Video Processing Test</Text>
        <Text className="text-gray-400 text-14 mt-1">
          Test video processing functionality
        </Text>
      </View>

      <ScrollView className="flex-1 px-4">
        {/* Processing Status */}
        {isProcessing && (
          <View className="py-4">
            <Text className="text-white text-16 font-semibold mb-2">Processing...</Text>
            <View className="bg-gray-800 rounded-full h-3 mb-2">
              <View 
                className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </View>
            <Text className="text-gray-400 text-14">{status}</Text>
            <Text className="text-blue-400 text-14">{progress.toFixed(0)}% complete</Text>
          </View>
        )}

        {/* Test Buttons */}
        <View className="py-4">
          <Text className="text-white text-16 font-semibold mb-3">Test Options</Text>
          
          <Pressable
            className="bg-blue-600 rounded-lg p-3 mb-3"
            onPress={testVideoProcessingWithMockData}
            disabled={isProcessing}
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="play-circle" size={20} color="#FFFFFF" />
              <Text className="text-white text-center font-medium ml-2">
                Test with Mock Video
              </Text>
            </View>
          </Pressable>
          
          <Pressable
            className="bg-green-600 rounded-lg p-3 mb-3"
            onPress={testVideoProcessingWithRealVideo}
            disabled={isProcessing}
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="videocam" size={20} color="#FFFFFF" />
              <Text className="text-white text-center font-medium ml-2">
                Test with Real Video
              </Text>
            </View>
          </Pressable>
          
          <Pressable
            className="bg-purple-600 rounded-lg p-3 mb-3"
            onPress={testTranscriptionService}
            disabled={isProcessing}
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="mic" size={20} color="#FFFFFF" />
              <Text className="text-white text-center font-medium ml-2">
                Test Transcription
              </Text>
            </View>
          </Pressable>
          
          <Pressable
            className="bg-gray-600 rounded-lg p-3 mb-3"
            onPress={clearLogs}
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="trash" size={20} color="#FFFFFF" />
              <Text className="text-white text-center font-medium ml-2">
                Clear Logs
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Results */}
        {results && (
          <View className="py-4 border-t border-gray-800">
            <Text className="text-white text-16 font-semibold mb-3">Processing Results</Text>
            <View className="bg-gray-900 rounded-lg p-3">
              <Text className="text-green-400 text-14 mb-2">✅ Processing Successful</Text>
              <Text className="text-gray-300 text-13 mb-1">
                <Text className="text-blue-400">Transcription:</Text> {results.transcription}
              </Text>
              <Text className="text-gray-300 text-13 mb-1">
                <Text className="text-blue-400">Duration:</Text> {results.duration} seconds
              </Text>
              <Text className="text-gray-300 text-13 mb-1">
                <Text className="text-blue-400">Face Blur:</Text> {results.faceBlurApplied ? 'Applied' : 'Not Applied'}
              </Text>
              <Text className="text-gray-300 text-13 mb-1">
                <Text className="text-blue-400">Voice Change:</Text> {results.voiceChangeApplied ? 'Applied' : 'Not Applied'}
              </Text>
              <Text className="text-gray-300 text-13">
                <Text className="text-blue-400">Thumbnail:</Text> {results.thumbnailUri ? 'Generated' : 'Not Generated'}
              </Text>
            </View>
          </View>
        )}

        {/* Test Logs */}
        <View className="py-4 border-t border-gray-800">
          <Text className="text-white text-16 font-semibold mb-3">Test Logs</Text>
          <View className="bg-gray-900 rounded-lg p-3 max-h-64">
            <ScrollView showsVerticalScrollIndicator={false}>
              {logs.length === 0 ? (
                <Text className="text-gray-500 text-13 italic">No logs yet...</Text>
              ) : (
                logs.map((log, index) => (
                  <Text key={index} className="text-gray-300 text-12 mb-1 font-mono">
                    {log}
                  </Text>
                ))
              )}
            </ScrollView>
          </View>
        </View>

        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}
