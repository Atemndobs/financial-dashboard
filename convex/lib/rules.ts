// PostFinance categorization rules (ported from app/categorize/rules.yaml).
// Rules are evaluated in array order; first matching rule wins.

export type CategorizationRule = {
  name: string
  keywords: string[]
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
    name: "Transport",
    keywords: [
      "taxi",
      "u-ber",
      "uber",
      "db vertrieb",
      "sbb cff ffs",
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
    for (const kw of rule.keywords) {
      if (text.includes(kw.toLowerCase())) {
        return {
          category: rule.category || DEFAULTS.unknown,
          excludeFromSpending: rule.excludeFromSpending ?? false,
        }
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
