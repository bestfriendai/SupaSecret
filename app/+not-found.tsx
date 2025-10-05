import { Link, Stack } from "expo-router";
import { StyleSheet, View, Text, Pressable } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops! Page Not Found" }} />
      <View style={styles.container}>
        <Text style={styles.title}>This page doesn't exist.</Text>
        <Text style={styles.description}>The page you're looking for could not be found.</Text>

        <Link href="/(tabs)" asChild>
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>Go to Home</Text>
          </Pressable>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#000000",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: "#8B98A5",
    textAlign: "center",
    marginBottom: 32,
  },
  button: {
    backgroundColor: "#1D9BF0",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
