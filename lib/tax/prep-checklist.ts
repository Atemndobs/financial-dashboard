export type TaxPrepApplicability = "required" | "if_applicable"

export interface TaxPrepChecklistItem {
  id: string
  label: string
  note?: string
  applicability: TaxPrepApplicability
}

export interface TaxPrepChecklistGroup {
  id: string
  title: string
  description?: string
  items: TaxPrepChecklistItem[]
}

export const TAX_PREP_TRANSLATION_NOTICE =
  "Auslaendische Dokumente sollten ins Deutsche uebersetzt sein."

export const TAX_PREP_CHECKLIST_GROUPS: TaxPrepChecklistGroup[] = [
  {
    id: "foundation",
    title: "Grundlagen",
    items: [
      {
        id: "steuerbogen-aktuell",
        label: "Aktueller Steuerbogen",
        applicability: "required",
      },
      {
        id: "letzte-steuererklaerung",
        label: "Kopie der letzten Steuererklaerung",
        applicability: "required",
      },
      {
        id: "letzte-veranlagung",
        label: "Kopie der letzten Steuerveranlagung",
        applicability: "required",
      },
      {
        id: "lohnausweis-oder-ea",
        label: "Lohnausweis des vergangenen Jahres",
        note: "Bei Selbststaendigkeit: Einnahmen- und Ausgabenuebersicht.",
        applicability: "required",
      },
    ],
  },
  {
    id: "family-health",
    title: "Familie, Betreuung, Gesundheit",
    items: [
      {
        id: "alimente",
        label: "Alimentenvereinbarungen und passende Bankauszuege",
        note: "Mit Angaben zu Geber, Empfaenger und Geburtsdaten.",
        applicability: "if_applicable",
      },
      {
        id: "fremdbetreuung",
        label: "Fremdbetreuungskosten (z. B. KiTa)",
        applicability: "if_applicable",
      },
      {
        id: "krankenkasse",
        label: "Jahrespraemie/Steuerbescheinigung der Krankenkasse",
        applicability: "required",
      },
      {
        id: "krankheitskosten",
        label: "Quittungen/Rechnungen fuer selbst getragene Krankheits- und Zahnarztkosten",
        applicability: "if_applicable",
      },
      {
        id: "spenden",
        label: "Steuerbescheinigungen fuer freiwillige Spenden",
        applicability: "if_applicable",
      },
    ],
  },
  {
    id: "assets-debts",
    title: "Vermoegen, Konten, Schulden",
    items: [
      {
        id: "schuldzinsen",
        label: "Zins- und Kapitalausweise von Schulden (Kreditkarte, Konsumkredit, Hypothek usw.)",
        applicability: "if_applicable",
      },
      {
        id: "saeule3a",
        label: "Steuerbescheinigung der einbezahlten Saeule-3a-Beitraege",
        applicability: "if_applicable",
      },
      {
        id: "banken-depots",
        label: "Zins- und Kapitalausweise aller Privatkonten + Depotauszuege per 31.12.",
        note: "Kontostand per 31.12., Ertraege und bezahlte Steuern hervorheben.",
        applicability: "required",
      },
      {
        id: "liegenschaften",
        label: "Offizielle Steuereinschaetzung fuer Liegenschaften",
        note: "Mit Vermoegenssteuerwerten und Eigenmietwerten.",
        applicability: "if_applicable",
      },
      {
        id: "pensionskasse",
        label: "Pensionskassenausweis / Freizuegigkeitspolice / Freizuegigkeitskonto",
        applicability: "if_applicable",
      },
    ],
  },
  {
    id: "special-cases",
    title: "Spezialfaelle",
    items: [
      {
        id: "unterstuetzung-verwandte",
        label: "Bescheinigungen ueber finanzielle Unterstuetzung von Verwandten",
        note: "Mit Name, Adresse, Geburtsdatum, Betrag und Verwandtschaftsgrad.",
        applicability: "if_applicable",
      },
      {
        id: "bvg-auszahlung",
        label: "BVG-Auszahlung im vergangenen Jahr",
        applicability: "if_applicable",
      },
      {
        id: "erbe-schenkung",
        label: "Erbe/Erbvorbezug/Schenkung im vergangenen Jahr",
        note: "Mit Angaben zu Erblasser/Schenker und Beguenstigtem.",
        applicability: "if_applicable",
      },
      {
        id: "miete-zug",
        label: "Monatliche Netto-Miete und Anschrift des Vermieters (nur Kanton Zug)",
        applicability: "if_applicable",
      },
    ],
  },
]
