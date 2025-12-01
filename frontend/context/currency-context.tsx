import React, {createContext, useContext, useMemo, useState, useCallback} from "react";
import {convertCurrency} from "@/lib/firebase"; // your callable wrapper

type CurrencyContextValue = {
  baseCurrency: string;
  displayCurrency: string;
  rate: number;
  setBaseCurrency: (code: string) => void;
  setDisplayCurrency: (code: string) => Promise<void>;
  convertAmount: (amount: number) => number;
};

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

export function CurrencyProvider({
  baseCurrency,
  children,
}: { baseCurrency: string; children: React.ReactNode }) {
  const [base, setBase] = useState(baseCurrency);
  const [displayCurrency, setDisplayCurrencyState] = useState(baseCurrency);
  const [rate, setRate] = useState(1);

  const setBaseCurrency = useCallback((code: string) => {
    if (!code || code === base) return;
    setBase(code);
    // Reset display to base when base changes
    setDisplayCurrencyState(code);
    setRate(1);
  }, [base]);

  const setDisplayCurrency = useCallback(
    async (code: string) => {
      if (!code || code === displayCurrency) return;
      if (code === base) {
        setDisplayCurrencyState(code);
        setRate(1);
        return;
      }
      const res = await convertCurrency(base, code);
      const r = Number(res?.rate) || 1;
      setDisplayCurrencyState(code);
      setRate(r);
    },
    [base, displayCurrency]
  );

  const value = useMemo(
    () => ({
      baseCurrency: base,
      displayCurrency,
      rate,
      setBaseCurrency,
      setDisplayCurrency,
      convertAmount: (amount: number) => amount * rate,
    }),
    [base, displayCurrency, rate, setBaseCurrency, setDisplayCurrency]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
