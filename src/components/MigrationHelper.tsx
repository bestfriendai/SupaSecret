import React, { useState } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { testReportSystem } from "../utils/testReportSystem";
import { testReportsTable } from "../utils/runReportsMigration";

/**
 * Temporary component to help run the reports migration
 * Add this to your app temporarily to set up the reports table
 *
 * Usage:
 * 1. Import this component in your App.tsx or any screen
 * 2. Add <MigrationHelper /> to the render
 * 3. Tap "Setup Reports Table" button
 * 4. Remove this component after setup is complete
 */
export default function MigrationHelper() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSetupReports = async () => {
    setIsLoading(true);
    setStatus("idle");

    try {
      console.log("🚀 Starting reports table setup...");

      // First check if table already exists
      const tableExists = await testReportsTable();

      if (tableExists) {
        Alert.alert("Already Set Up!", "The reports table already exists and is working correctly.", [{ text: "OK" }]);
        setStatus("success");
        setIsLoading(false);
        return;
      }

      // Run the full test which will attempt migration
      const success = await testReportSystem();

      if (success) {
        Alert.alert(
          "Success!",
          "Reports table has been set up successfully. You can now use the report functionality.",
          [{ text: "OK" }],
        );
        setStatus("success");
      } else {
        Alert.alert(
          "Manual Setup Required",
          "Could not set up the reports table automatically. Please:\n\n1. Go to your Supabase dashboard\n2. Open SQL Editor\n3. Run the contents of supabase/reports-migration.sql",
          [{ text: "OK" }],
        );
        setStatus("error");
      }
    } catch (error) {
      console.error("Setup error:", error);
      Alert.alert("Error", "An error occurred during setup. Check the console for details.", [{ text: "OK" }]);
      setStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestReports = async () => {
    setIsLoading(true);

    try {
      const success = await testReportSystem();

      if (success) {
        Alert.alert("Test Passed!", "The reports system is working correctly.", [{ text: "OK" }]);
      } else {
        Alert.alert("Test Failed", "The reports system is not working. Check the console for details.", [
          { text: "OK" },
        ]);
      }
    } catch (error) {
      console.error("Test error:", error);
      Alert.alert("Test Error", "An error occurred during testing. Check the console for details.", [{ text: "OK" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="bg-gray-900 border border-gray-700 rounded-lg p-4 m-4">
      <View className="flex-row items-center mb-3">
        <Ionicons name="construct" size={20} color="#F59E0B" />
        <Text className="text-white text-16 font-semibold ml-2">Reports Migration Helper</Text>
      </View>

      <Text className="text-gray-400 text-14 mb-4">
        Use this helper to set up the reports table in your database. Remove this component after setup is complete.
      </Text>

      <View className="space-y-3">
        <Pressable
          className={`rounded-lg py-3 px-4 ${
            isLoading ? "bg-gray-700" : status === "success" ? "bg-green-600" : "bg-blue-600"
          }`}
          onPress={handleSetupReports}
          disabled={isLoading}
        >
          <View className="flex-row items-center justify-center">
            {isLoading ? (
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
            ) : status === "success" ? (
              <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
            ) : (
              <Ionicons name="rocket" size={16} color="#FFFFFF" />
            )}
            <Text className="text-white font-semibold ml-2">
              {isLoading ? "Setting up..." : status === "success" ? "Setup Complete" : "Setup Reports Table"}
            </Text>
          </View>
        </Pressable>

        <Pressable
          className={`rounded-lg py-3 px-4 border border-gray-600 ${isLoading ? "bg-gray-800" : "bg-gray-800"}`}
          onPress={handleTestReports}
          disabled={isLoading}
        >
          <View className="flex-row items-center justify-center">
            <Ionicons name="flask" size={16} color="#8B98A5" />
            <Text className="text-gray-300 font-semibold ml-2">Test Reports System</Text>
          </View>
        </Pressable>
      </View>

      {status === "error" && (
        <View className="mt-3 p-3 bg-red-900/20 border border-red-700 rounded-lg">
          <Text className="text-red-400 text-13">Manual setup required. Check console for details.</Text>
        </View>
      )}

      {status === "success" && (
        <View className="mt-3 p-3 bg-green-900/20 border border-green-700 rounded-lg">
          <Text className="text-green-400 text-13">✅ Reports system is ready! You can now remove this component.</Text>
        </View>
      )}
    </View>
  );
}
