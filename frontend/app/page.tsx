"use client";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StepIndicator } from "@/components/StepIndicator";
import { BridgeFlow } from "@/components/bridge";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Convert ZEC to Confidential FHZEC</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Burn your ZEC on Zcash and receive encrypted FHZEC tokens on Ethereum. Your balance remains private using
              Fully Homomorphic Encryption.
            </p>
          </div>

          {/* Step Indicator */}
          <StepIndicator />

          {/* Bridge Flow */}
          <BridgeFlow />
        </div>
      </main>
      <Footer />
    </>
  );
}
