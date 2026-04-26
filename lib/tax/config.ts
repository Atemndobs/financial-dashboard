import type { TaxConfig } from "@/lib/tax/types"

export const SWISS_TAX_CONFIG: TaxConfig = {
  version: "1.0",
  tax_year_default: 2025,
  currency: "CHF",
  tax_deduction_categories: {
    berufsauslagen: {
      label_de: "Berufsauslagen",
      label_en: "Professional/Work Expenses",
      description: "Work-related expenses for primary employment (commute, tools, meals at work)",
      source_categories: ["Transportation"],
      limits: {
        flat_rate: 4000,
        max: null,
      },
      documents: [
        "Halbtax/GA subscription receipts",
        "Public transport tickets and receipts",
        "Professional tools and equipment receipts",
        "Home office cost documentation",
        "Work-related meal receipts",
      ],
    },
    versicherungen: {
      label_de: "Versicherungspramien",
      label_en: "Insurance Premiums",
      description: "Health insurance (Krankenkasse) and supplementary insurance premiums",
      source_categories: ["Insurance"],
      limits: {
        single: 1800,
        married: 3600,
      },
      documents: [
        "Krankenkasse premium statement (Pramienrechnung)",
        "Supplementary insurance premium confirmations",
        "Accident insurance premium statements",
      ],
    },
    krankheitskosten: {
      label_de: "Krankheits- und Unfallkosten",
      label_en: "Medical & Accident Costs",
      description: "Out-of-pocket medical costs exceeding 5% of net income",
      source_categories: ["Healthcare"],
      limits: {
        threshold_pct: 5,
      },
      documents: [
        "Doctor and hospital invoices with payment receipts",
        "Pharmacy receipts",
        "Dental invoices",
        "Physiotherapy receipts",
        "Prescription glasses/contact lens receipts",
      ],
    },
    spenden: {
      label_de: "Spenden und Zuwendungen",
      label_en: "Donations & Charitable Contributions",
      description: "Donations to recognized charitable organizations",
      source_categories: ["Gifts & Donations"],
      limits: {
        min: 100,
        max_pct_of_net_income: 20,
      },
      documents: [
        "Donation receipts/confirmations from charitable organizations",
        "Proof of tax-exempt status of recipient organization",
      ],
    },
    schuldzinsen: {
      label_de: "Schuldzinsen",
      label_en: "Debt Interest",
      description: "Interest payments on loans and mortgages",
      source_categories: ["Debt Payments", "Banking"],
      limits: null,
      documents: [
        "Loan interest statements from bank",
        "Mortgage interest certificates (Hypothekarzinsausweis)",
        "Credit card interest statements",
      ],
    },
    weiterbildung: {
      label_de: "Weiterbildungskosten",
      label_en: "Continuing Education",
      description: "Work-related continuing education and professional development",
      source_categories: ["Education"],
      limits: {
        max: 12000,
      },
      documents: [
        "Course enrollment and fee receipts",
        "Exam and certification fee receipts",
        "Course material receipts",
        "Employer confirmation of work-relevance (if available)",
      ],
    },
    kinderbetreuung: {
      label_de: "Kinderbetreuungskosten",
      label_en: "Childcare Costs",
      description: "Costs for third-party childcare (Kita, Tagesmutter, etc.)",
      source_categories: ["Family"],
      limits: {
        max_per_child: 10100,
      },
      documents: [
        "Daycare/Kita invoices",
        "Babysitter/Tagesmutter receipts",
        "After-school care invoices",
      ],
    },
    wohnkosten: {
      label_de: "Wohnkosten",
      label_en: "Housing Costs",
      description: "Rent and housing-related expenses (Nebenkosten, utilities)",
      source_categories: ["Rent", "Housing", "Utilities"],
      limits: null,
      documents: [
        "Rental contract (Mietvertrag)",
        "Nebenkosten annual statement",
        "Utility bills (electricity, water, heating)",
      ],
    },
    vorsorge_3a: {
      label_de: "Saule 3a Beitrage",
      label_en: "Pillar 3a Contributions",
      description: "Tax-deductible contributions to pillar 3a retirement savings",
      source_categories: ["Savings & Investments"],
      limits: {
        employed: 7056,
        self_employed: 35280,
      },
      documents: [
        "3a account deposit confirmation from bank or insurance",
        "Pillar 3a annual statement",
      ],
    },
    berufsauslagen_nebenerwerb: {
      label_de: "Berufsauslagen Nebenerwerb",
      label_en: "Secondary Employment Expenses",
      description: "Expenses related to secondary employment or freelance work",
      source_categories: ["Professional Services", "Cloud"],
      limits: null,
      documents: [
        "Invoices and receipts for secondary work-related expenses",
        "Cloud/hosting service invoices (if work-related)",
        "Software license receipts",
      ],
    },
  },
  non_deductible_categories: [
    "Groceries",
    "Dining",
    "Entertainment",
    "Shopping",
    "Subscriptions",
    "Telecom",
    "Personal Care",
    "Home & Garden",
    "Pets",
    "Travel",
    "Miscellaneous",
    "Household",
    "Vacation",
    "JNA",
  ],
  excluded_categories: ["Income", "Transfer", "Refund"],
}
