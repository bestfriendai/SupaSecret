import React from "react";
import { View, Text, ActivityIndicator } from "react-native";

export default function ServerProcessingNotice() {
  return (
    <View style={{ padding: 20, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" color="#3B82F6" />
      <Text style={{ marginTop: 10, textAlign: "center", color: "#666" }}>
        Processing on server... This feature requires advanced device capabilities.
      </Text>
    </View>
  );
}
