/**
 * Vision Camera Diagnostics Screen
 * Use this to test if Vision Camera modules are loading correctly
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { runVisionCameraDiagnostics, DiagnosticResult } from '../utils/visionCameraDiagnostics';

export default function VisionCameraDiagnosticsScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [hasRun, setHasRun] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    setHasRun(false);
    
    try {
      const diagnosticResults = await runVisionCameraDiagnostics();
      setResults(diagnosticResults);
      setHasRun(true);
    } catch (error) {
      console.error('Failed to run diagnostics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-run on mount
    runDiagnostics();
  }, []);

  const allLoaded = results.every(r => r.loaded);
  const loadedCount = results.filter(r => r.loaded).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Vision Camera Diagnostics</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Summary */}
        {hasRun && (
          <View style={[styles.summaryCard, allLoaded ? styles.successCard : styles.errorCard]}>
            <Ionicons
              name={allLoaded ? 'checkmark-circle' : 'alert-circle'}
              size={32}
              color={allLoaded ? '#10B981' : '#EF4444'}
            />
            <Text style={styles.summaryTitle}>
              {allLoaded ? 'All Modules Loaded' : 'Some Modules Failed'}
            </Text>
            <Text style={styles.summaryText}>
              {loadedCount}/{results.length} modules loaded successfully
            </Text>
          </View>
        )}

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Running diagnostics...</Text>
          </View>
        )}

        {/* Results */}
        {hasRun && results.map((result, index) => (
          <View key={index} style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Ionicons
                name={result.loaded ? 'checkmark-circle' : 'close-circle'}
                size={24}
                color={result.loaded ? '#10B981' : '#EF4444'}
              />
              <Text style={styles.moduleName}>{result.module}</Text>
            </View>

            {result.loaded ? (
              <View style={styles.resultDetails}>
                <Text style={styles.detailLabel}>Status:</Text>
                <Text style={styles.detailValue}>✅ Loaded successfully</Text>
                
                {result.exports && result.exports.length > 0 && (
                  <>
                    <Text style={[styles.detailLabel, { marginTop: 8 }]}>
                      Exports ({result.exports.length}):
                    </Text>
                    <Text style={styles.detailValue}>
                      {result.exports.join(', ')}
                    </Text>
                  </>
                )}
              </View>
            ) : (
              <View style={styles.resultDetails}>
                <Text style={styles.detailLabel}>Status:</Text>
                <Text style={[styles.detailValue, styles.errorText]}>
                  ❌ Failed to load
                </Text>
                
                {result.error && (
                  <>
                    <Text style={[styles.detailLabel, { marginTop: 8 }]}>Error:</Text>
                    <Text style={[styles.detailValue, styles.errorText]}>
                      {result.error}
                    </Text>
                  </>
                )}
              </View>
            )}
          </View>
        ))}

        {/* Instructions */}
        {hasRun && !allLoaded && (
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>Troubleshooting Steps:</Text>
            <Text style={styles.instructionText}>
              1. Make sure you're running a development build (not Expo Go)
            </Text>
            <Text style={styles.instructionText}>
              2. Clean and rebuild the app:
            </Text>
            <Text style={styles.codeText}>
              npx expo run:ios --clean
            </Text>
            <Text style={styles.instructionText}>
              3. Check that all dependencies are installed:
            </Text>
            <Text style={styles.codeText}>
              npm install
            </Text>
            <Text style={styles.instructionText}>
              4. For iOS, reinstall pods:
            </Text>
            <Text style={styles.codeText}>
              cd ios && pod install && cd ..
            </Text>
          </View>
        )}

        {/* Rerun Button */}
        <Pressable
          style={styles.rerunButton}
          onPress={runDiagnostics}
          disabled={loading}
        >
          <Ionicons name="refresh" size={20} color="#FFFFFF" />
          <Text style={styles.rerunButtonText}>Rerun Diagnostics</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  successCard: {
    backgroundColor: '#10B98120',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  errorCard: {
    backgroundColor: '#EF444420',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 12,
  },
  summaryText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
  },
  resultCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  moduleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
    flex: 1,
  },
  resultDetails: {
    paddingLeft: 32,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#E5E7EB',
    lineHeight: 20,
  },
  errorText: {
    color: '#EF4444',
  },
  instructionsCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: '#E5E7EB',
    marginBottom: 8,
    lineHeight: 20,
  },
  codeText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#8B5CF6',
    backgroundColor: '#111827',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  rerunButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 32,
  },
  rerunButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});

