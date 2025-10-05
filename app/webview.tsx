import React from "react";
import { useLocalSearchParams } from "expo-router";
import WebViewScreen from "../src/screens/WebViewScreen";

export default function WebView() {
  const params = useLocalSearchParams();
  const url = typeof params.url === "string" ? params.url : params.url?.[0] || "";
  const title = typeof params.title === "string" ? params.title : params.title?.[0] || "";

  return <WebViewScreen route={{ params: { url, title } }} />;
}
