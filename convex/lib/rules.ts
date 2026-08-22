// PostFinance categorization rules (ported from app/categorize/rules.yaml).
// Rules are evaluated in array order; first matching rule wins.

export type CategorizationRule = {
  name: string
  // Matches if ANY keyword is a substring of the combined text.
  keywords: string[]
  // If set, EVERY entry must be a substring (AND). Combined with `keywords`,
  // the rule matches when the ALL-condition holds (keywords is then optional).
  allKeywords?: string[]
  // If any of these is present, the rule does NOT match (veto).
  excludeKeywords?: string[]
  category: string
  excludeFromSpending?: boolean
}

export const DEFAULTS = {
  unknown: "Unknown",
  income: "Income",
  transfer: "Transfer",
} as const

export const RULES: CategorizationRule[] = [
  {
    // Internal transfers to own PostFinance account — not spending.
    name: "Internal transfer (own account)",
    keywords: ["ch8709000000166286941"],
    category: "Transfer",
    excludeFromSpending: true,
  },
  {
    name: "Betreibungsamt fee",
    keywords: ["betreibungsamt"],
    category: "Taxes",
  },
  {
    name: "Groceries",
    keywords: ["rewe", "tesco", "migros", "coop", "lidl", "aldi", "denner"],
    category: "Groceries",
  },
  {
    name: "Dining",
    keywords: [
      "restaurant",
      "bistro",
      "cafe",
      "tk maxx",
      "vishandel",
      "pasta & burger house",
      "sumup *teranga",
      "kkiosk",
      "läckerli huus ag",
      "kunz ag",
      "pizzahüsli",
      "tibits aarau",
    ],
    category: "Dining",
  },
  {
    name: "Subscriptions",
    keywords: [
      "spotify",
      "chatgpt",
      "openai",
      "netflix",
      "prime",
      "audible",
      "classpass",
      "bankpaket",
      "google one mountain view",
      "sunrise gmbh yallo",
      "sunrise gmbh",
      "sunrise",
      "gesamter überweisungs-betrag anzah",
    ],
    category: "Subscriptions",
  },
  {
    name: "Cloud",
    keywords: ["aws", "one.com", "strato"],
    category: "Cloud",
  },
  {
    name: "Rent via Revolut",
    keywords: ["sebastian kaufmann", "mietzahlung"],
    category: "Rent",
  },
  {
    name: "Rent to Jens Herbst",
    keywords: [
      "jens herbst burgstrasse 19",
      "zuger kantonalbank",
      "ch4900787786168515424",
    ],
    category: "Rent",
  },
  {
    name: "JNA Business Solutions",
    keywords: [
      "sofi bank",
      "j&a business solutions",
      "jna business solutions",
      "j and a business solutions",
      "jna",
      "choice financial group",
    ],
    category: "jna",
  },
  // Loan repayments to specific people. Keyed on the recipient (address /
  // IBAN), which is stable, and placed BEFORE the amount-split rules so the
  // recipient always wins regardless of amount.
  {
    // To Anchenmick Esther: the USD transfer is the Family Fund contribution;
    // every EUR transfer is loan repayment.
    name: "Family Fund - Anchenmick Esther (USD)",
    keywords: [],
    allKeywords: ["pascalkehre", "usd"],
    category: "Family Fund",
  },
  {
    name: "Loan repayment - Anchenmick Esther",
    keywords: ["pascalkehre"],
    category: "Loan repayment",
  },
  {
    name: "Loan repayment - Juliane Schlegel",
    keywords: ["de89120300001068947843", "juliane schlegel"],
    category: "Loan repayment",
  },

  // Commerzbank standing orders split by fixed EUR amount. These must come
  // BEFORE the generic Comdirect->Household rule so the amount wins. The EUR
  // amount + FX marker ("zum kurs") identifies a transfer; excludeKeywords
  // avoids matching EUR-denominated card purchases ("karten nr").
  {
    name: "Commerzbank ETF transfer (EUR 1600)",
    keywords: [],
    allKeywords: ["eur 1'600.00", "zum kurs"],
    excludeKeywords: ["karten nr"],
    category: "Savings & Investments",
  },
  {
    name: "Commerzbank Kids Fund transfer (EUR 200)",
    keywords: [],
    allKeywords: ["eur 200.00", "zum kurs"],
    excludeKeywords: ["karten nr"],
    category: "Kids Fund",
  },
  {
    name: "Commerzbank Vacation Fund transfer (EUR 100)",
    keywords: [],
    allKeywords: ["eur 100.00", "zum kurs"],
    excludeKeywords: ["karten nr"],
    category: "Vacation Fund",
  },
  {
    name: "Commerzbank Household transfer (EUR 800)",
    keywords: [],
    allKeywords: ["eur 800.00", "zum kurs"],
    excludeKeywords: ["karten nr"],
    category: "Household",
  },
  {
    name: "Comdirect Household Fund",
    keywords: [
      "commerzbank ag (formerly",
      "comdirect bank ag",
      "commerzbank ag",
    ],
    category: "Household",
  },
  {
    name: "Helsana Insurance",
    keywords: ["helsana", "versicherungen"],
    category: "Insurance",
  },
  {
    name: "Helvetia Insurance",
    keywords: [
      "helvetia schweizerische versicherung",
      "helvetia versicherung",
      "versicherun",
    ],
    category: "Insurance",
  },
  {
    name: "USA Vacation Expenses",
    keywords: ["vereinigte staaten", "usa vacation", "vacation", "einstein-haus"],
    category: "vacation",
  },
  {
    name: "Shopping",
    keywords: [
      "amazon",
      "amzn",
      "apple",
      "etos",
      "cinque store",
      "xxxlutz",
      "bargeldbezug",
      "müller handels",
      "post ch ag",
      "eoperations",
      "media markt",
      "nike",
      "ch4809000000166286964",
      "migrolino",
      "migro",
      "denner",
      "bearbeitungszuschlag",
    ],
    category: "Shopping",
  },
  {
    name: "Dining Seidenstrasse",
    keywords: [
      "seidenstrasse gmbh",
      "tchibo",
      "manito",
      "frati group gmbh",
      "rathaus bar bern",
      "bakerybakery",
    ],
    category: "Dining",
  },
  {
    name: "Dining",
    keywords: [
      "srg rest.",
      "srg restaurant",
      "pavillon",
      "leimbacher",
      "meike",
      "ubs aarau aarau",
    ],
    category: "Dining",
  },
  {
    name: "Dining Chez Nous",
    keywords: ["chez nous lounge"],
    category: "Dining",
  },
  {
    // TWINT peer payments are almost always splitting a bill when eating out.
    name: "TWINT (eating out)",
    keywords: ["twint", "an telefon-nr", "von telefon-nr"],
    category: "Dining",
  },
  {
    name: "Dining local merchants",
    keywords: [
      "caffè spettacolo",
      "caffe spettacolo",
      "bäckerei kult",
      "wälchli bäckerei",
      "verein schwanbar",
      "kalte lust",
      "napolicious",
      "thommen gastrono",
      "90 grad bar",
      "walther buvette",
      "penny farthing",
      "pizzeria pulverturm",
      "weihnachtsmarkt",
      "lsp*aha",
    ],
    category: "Dining",
  },
  {
    name: "Entertainment venues",
    keywords: ["casino bern", "tuchlaube", "blockparty", "google play", "munster-fahre", "currency cloud"],
    category: "Entertainment",
  },
  {
    name: "Healthcare (Dr. Risch lab)",
    keywords: ["risch ag", "dr. risch"],
    category: "Healthcare",
  },
  {
    name: "Education (Klubschule)",
    keywords: ["klubschule"],
    category: "Education",
  },
  {
    name: "Home & Garden (Jumbo)",
    keywords: ["jumbo-", "jumbo "],
    category: "Home & Garden",
  },
  {
    name: "Shopping (Euro Computer)",
    keywords: ["euro computer"],
    category: "Shopping",
  },
  {
    name: "Transport",
    keywords: [
      "taxi",
      "u-ber",
      "uber",
      "db vertrieb",
      "sbb cff ffs",
      "sbb zugsverkauf",
      "swiss federal railways",
      "bahnhofplatz sbb",
      "bahnhofplatz",
      "ov-chip",
      "mobility",
      "carsharing",
    ],
    category: "Transportation",
  },
  {
    name: "Housing",
    keywords: ["rent", "miete"],
    category: "Rent",
  },
  {
    name: "Remittance",
    keywords: ["worldremit", "remit"],
    category: "Family",
  },
  {
    name: "Salary",
    keywords: ["gehalt", "salary", "salarzahlung", "payroll", "ingtes ag"],
    category: "Income",
  },
  {
    name: "Savings",
    keywords: [
      "same same",
      "refund",
      "savings for the future",
      "the little fund",
      "haushalt",
      "kredit",
      "spar",
      "saving",
      "transfer",
      "ubertrag",
      "übertrag",
      "gutschrift",
    ],
    category: "Savings",
    excludeFromSpending: true,
  },
]

export type CategorizationInput = {
  counterparty?: string | null
  description?: string | null
  type?: string | null
  amount: number
}

export function categorize(row: CategorizationInput): {
  category: string
  excludeFromSpending: boolean
} {
  const text = `${row.counterparty ?? ""} ${row.description ?? ""}`.toLowerCase()

  for (const rule of RULES) {
    if (rule.excludeKeywords?.some((kw) => text.includes(kw.toLowerCase()))) {
      continue
    }

    const allMatch =
      rule.allKeywords !== undefined &&
      rule.allKeywords.length > 0 &&
      rule.allKeywords.every((kw) => text.includes(kw.toLowerCase()))

    const anyMatch = rule.keywords.some((kw) => text.includes(kw.toLowerCase()))

    if (allMatch || anyMatch) {
      return {
        category: rule.category || DEFAULTS.unknown,
        excludeFromSpending: rule.excludeFromSpending ?? false,
      }
    }
  }

  if (row.type && row.type.toLowerCase() === "income") {
    return { category: DEFAULTS.income, excludeFromSpending: false }
  }
  if ((row.amount ?? 0) >= 0) {
    return { category: DEFAULTS.income, excludeFromSpending: false }
  }
  return { category: DEFAULTS.unknown, excludeFromSpending: false }
}
