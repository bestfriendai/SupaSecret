export const isDisposalError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message = "message" in error ? String((error as Record<string, unknown>).message) : "";
  return (
    message.includes("NativeSharedObjectNotFoundException") ||
    message.includes("FunctionCallException") ||
    message.includes("Unable to find the native shared object")
  );
};
