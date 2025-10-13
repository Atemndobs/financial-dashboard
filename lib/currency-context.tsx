"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

type Currency = "CHF" | "EUR" | "USD"

interface ExchangeRates {
  EUR: number
  USD: number
  CHF: number
}

interface CurrencyContextType {
  currency: Currency
  setCurrency: (currency: Currency) => void
  rates: ExchangeRates | null
  isLoading: boolean
  convertAmount: (amount: number, fromCurrency?: Currency) => number
  lastUpdate: Date | null
  refreshRates: () => Promise<void>
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>("CHF")
  const [rates, setRates] = useState<ExchangeRates | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchRates = async () => {
    setIsLoading(true)
    try {
      // Using exchangerate-api.com free tier
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/CHF`)
      const data = await response.json()

      setRates({
        CHF: 1,
        EUR: data.rates.EUR,
        USD: data.rates.USD,
      })
      setLastUpdate(new Date())
    } catch (error) {
      console.error("Failed to fetch exchange rates:", error)
      // Fallback rates if API fails
      setRates({
        CHF: 1,
        EUR: 0.93,
        USD: 1.14,
      })
      setLastUpdate(new Date())
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRates()
    // Refresh rates every 30 minutes
    const interval = setInterval(fetchRates, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const convertAmount = (amount: number, fromCurrency: Currency = "CHF"): number => {
    if (!rates) return amount

    // Convert from source currency to CHF first
    const amountInCHF = fromCurrency === "CHF" ? amount : amount / rates[fromCurrency]

    // Then convert from CHF to target currency
    const result = currency === "CHF" ? amountInCHF : amountInCHF * rates[currency]

    return result
  }

  const refreshRates = async () => {
    await fetchRates()
  }

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        rates,
        isLoading,
        convertAmount,
        lastUpdate,
        refreshRates,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider")
  }
  return context
}
