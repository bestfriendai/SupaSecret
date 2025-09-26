import React from "react";
import { View, Text, StyleSheet } from "react-native";

const BasicAudioControls: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Voice change not available</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: "center",
  },
  text: {
    color: "#666",
    fontSize: 14,
  },
});

export default BasicAudioControls;
