"use client";

import { createContext, PropsWithChildren, useContext, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/sidebar";
import { WalletMinimal } from "lucide-react";

type HeaderContextValue = {
  showHeader: boolean;
  setShowHeader: (value: boolean) => void;
};

const HeaderContext = createContext<HeaderContextValue | null>(null);

export function useHeaderVisibility() {
  const ctx = useContext(HeaderContext);
  if (!ctx) {
    throw new Error("useHeaderVisibility must be used within AppFrame");
  }
  return ctx;
}

export function AppFrame({ children }: PropsWithChildren) {
  const [collapsed, setCollapsed] = useState(false);
  const [showHeader, setShowHeader] = useState(true);

  return (
    <HeaderContext.Provider value={{ showHeader, setShowHeader }}>
      <div className="flex h-screen overflow-hidden bg-white text-gray-900">
        <div className="h-full overflow-hidden">
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((prev) => !prev)} />
        </div>
        <div className="flex h-full flex-1 flex-col overflow-hidden">
          {showHeader ? (
            <header className="flex items-center justify-end px-6 py-4">
              <Button
                size="sm"
                variant="secondary"
                className="flex items-center gap-2 rounded-full bg-[#4B6BFF] px-3 py-2 text-white shadow-md hover:bg-[#3d5ff5]"
              >
                <WalletMinimal className="h-4 w-4" />
                Connect Wallet
              </Button>
            </header>
          ) : null}
          <div className="flex-1 overflow-hidden px-6">{children}</div>
        </div>
      </div>
    </HeaderContext.Provider>
  );
}
