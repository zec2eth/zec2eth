"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBridgeStore } from "@/lib/store";
import { Coins } from "lucide-react";

export function AmountInput() {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState("");
  const { setAmount, setStep } = useBridgeStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const amount = parseFloat(inputValue);

    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    if (amount < 0.0001) {
      setError("Minimum amount is 0.0001 ZEC");
      return;
    }

    if (amount > 1000000) {
      setError("Maximum amount is 1,000,000 ZEC");
      return;
    }

    setAmount(amount);
    setStep("burn");
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl flex items-center justify-center gap-2">
          <Coins className="w-6 h-6 text-[#F4B728]" />
          Enter ZEC Amount
        </CardTitle>
        <CardDescription>How much ZEC do you want to transfer to Ethereum?</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (ZEC)</Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                step="0.00000001"
                min="0"
                placeholder="0.00"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="pr-16 text-lg"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">ZEC</span>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="flex gap-2">
            {[0.1, 0.5, 1, 5].map((preset) => (
              <Button
                key={preset}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setInputValue(preset.toString())}
                className="flex-1"
              >
                {preset}
              </Button>
            ))}
          </div>

          <Button type="submit" className="w-full" variant="zcash" size="lg">
            Continue
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
