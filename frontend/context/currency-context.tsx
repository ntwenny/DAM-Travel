import React, {createContext, useContext, useMemo, useState, useCallback} from "react";
import {convertCurrency} from "@/lib/firebase"; // your callable wrapper

type CurrencyContextValue = {
  baseCurrency: string;
  displayCurrency: string;
  rate: number;
  setDisplayCurrency: (code: string) => Promise<void>;
  convertAmount: (amount: number) => number;
};

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

export function CurrencyProvider({
  baseCurrency,
  children,
}: { baseCurrency: string; children: React.ReactNode }) {
  const [displayCurrency, setDisplayCurrencyState] = useState(baseCurrency);
  const [rate, setRate] = useState(1);

  const setDisplayCurrency = useCallback(
    async (code: string) => {
      if (!code || code === displayCurrency) return;
      if (code === baseCurrency) {
        setDisplayCurrencyState(code);
        setRate(1);
        return;
      }
      const res = await convertCurrency(baseCurrency, code);
      const r = Number(res?.rate) || 1;
      setDisplayCurrencyState(code);
      setRate(r);
    },
    [baseCurrency, displayCurrency]
  );

  const value = useMemo(
    () => ({
      baseCurrency,
      displayCurrency,
      rate,
      setDisplayCurrency,
      convertAmount: (amount: number) => amount * rate,
    }),
    [baseCurrency, displayCurrency, rate, setDisplayCurrency]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
