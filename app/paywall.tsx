import React from "react";
import { useLocalSearchParams } from "expo-router";
import PaywallScreen from "../src/screens/PaywallScreen";

export default function Paywall() {
  const params = useLocalSearchParams();
  const feature = typeof params.feature === "string" ? params.feature : params.feature?.[0];
  const source = typeof params.source === "string" ? params.source : params.source?.[0];

  return <PaywallScreen route={{ params: { feature, source } }} />;
}
