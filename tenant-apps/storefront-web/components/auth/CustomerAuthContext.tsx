"use client";

import { createContext, useContext, type ReactNode } from "react";

const CustomerAuthContext = createContext(false);

export function CustomerAuthProvider({ signedIn, children }: { signedIn: boolean; children: ReactNode }) {
  return <CustomerAuthContext.Provider value={signedIn}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerSignedIn(): boolean {
  return useContext(CustomerAuthContext);
}
