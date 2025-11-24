"use client";

import { useIsInitialized, useIsSignedIn } from "@coinbase/cdp-hooks";

import { LoadingCard } from "@/components/ui/loading-spinner";
import ChatPage from "./chat/page";
import SignInScreen from "@/components/SignInScreen";
export default function Home() {
  const { isInitialized } = useIsInitialized();
  const { isSignedIn } = useIsSignedIn();

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingCard message="loading..." />
      </div>
    );
  }

  return (
    <>
      {!isSignedIn && <SignInScreen />}
      {isSignedIn && <ChatPage />}
    </>
  );
}
