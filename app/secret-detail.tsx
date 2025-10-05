import React from "react";
import { useLocalSearchParams } from "expo-router";
import SecretDetailScreen from "../src/screens/SecretDetailScreen";

export default function SecretDetail() {
  const params = useLocalSearchParams();
  const confessionId = typeof params.confessionId === "string" ? params.confessionId : params.confessionId?.[0];

  return <SecretDetailScreen route={{ params: { confessionId } }} />;
}
