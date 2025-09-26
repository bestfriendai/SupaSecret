import React from "react";
import { View, Text, StyleSheet } from "react-native";

const BasicCameraControls: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Advanced camera not available</Text>
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

export default BasicCameraControls;
