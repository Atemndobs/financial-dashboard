const CATEGORY_COLORS: Record<string, string> = {
  groceries: "#4CAF50",
  dining: "#FF9800",
  transportation: "#2196F3",
  rent: "#9C27B0",
  housing: "#9C27B0",
  utilities: "#00BCD4",
  healthcare: "#E91E63",
  insurance: "#673AB7",
  entertainment: "#FF5722",
  shopping: "#FFC107",
  subscriptions: "#009688",
  telecom: "#03A9F4",
  banking: "#607D8B",
  education: "#3F51B5",
  travel: "#00ACC1",
  vacation: "#00ACC1",
  "personal care": "#E91E63",
  "home & garden": "#8BC34A",
  pets: "#795548",
  "gifts & donations": "#F06292",
  "professional services": "#5C6BC0",
  taxes: "#D32F2F",
  "savings & investments": "#43A047",
  "kids fund": "#7E57C2",
  "vacation fund": "#26C6DA",
  "loan repayment": "#EF6C00",
  "debt payments": "#C62828",
  cloud: "#1976D2",
  family: "#EC407A",
  household: "#66BB6A",
  income: "#4CAF50",
  transfer: "#9E9E9E",
  savings: "#43A047",
  refund: "#81C784",
  miscellaneous: "#757575",
  unknown: "#BDBDBD",
  jna: "#FF6F00",
}

const CATEGORY_ICONS: Record<string, string> = {
  groceries: "🛒",
  dining: "🍽️",
  transportation: "🚗",
  rent: "🏠",
  housing: "🏠",
  utilities: "💡",
  healthcare: "🩺",
  insurance: "🛡️",
  entertainment: "🎬",
  shopping: "🛍️",
  subscriptions: "🔁",
  telecom: "📱",
  banking: "🏦",
  education: "🎓",
  travel: "✈️",
  vacation: "🌴",
  "personal care": "🧴",
  "home & garden": "🛠️",
  pets: "🐾",
  "gifts & donations": "🎁",
  "professional services": "🧑‍💼",
  taxes: "🧾",
  "savings & investments": "📈",
  "kids fund": "🧒",
  "vacation fund": "🏖️",
  "loan repayment": "💸",
  "debt payments": "💳",
  cloud: "☁️",
  family: "👨‍👩‍👧‍👦",
  household: "🏡",
  income: "💰",
  transfer: "🔄",
  savings: "🐖",
  refund: "↩️",
  miscellaneous: "📦",
  unknown: "❓",
  jna: "💼",
}

const ICON_ALIAS: Record<string, string> = {
  bag: "🛍️",
  basket: "🛒",
  bus: "🚗",
  car: "🚗",
  cart: "🛒",
  creditcard: "💳",
  dollar: "💰",
  food: "🍽️",
  gift: "🎁",
  heart: "🩺",
  home: "🏠",
  house: "🏠",
  plane: "✈️",
  shield: "🛡️",
  shopping: "🛍️",
  transfer: "🔄",
  wallet: "👛",
}

const DEFAULT_COLOR = "#9E9E9E"
const DEFAULT_ICON = "📦"

function normalizeCategory(category: string | null | undefined): string {
  return (category || "unknown").trim().toLowerCase()
}

function normalizeIcon(icon: string | null | undefined): string | null {
  if (!icon) {
    return null
  }

  // If the backend already stores emoji, keep it.
  if (/\p{Extended_Pictographic}/u.test(icon)) {
    return icon
  }

  const iconKey = icon.trim().toLowerCase().replace(/[^a-z]/g, "")
  return ICON_ALIAS[iconKey] ?? null
}

export function getCategoryColor(category: string, colorFromBackend?: string | null): string {
  if (colorFromBackend && colorFromBackend.trim()) {
    return colorFromBackend
  }

  return CATEGORY_COLORS[normalizeCategory(category)] ?? DEFAULT_COLOR
}

export function getCategoryIcon(category: string, iconFromBackend?: string | null): string {
  const backendIcon = normalizeIcon(iconFromBackend)
  if (backendIcon) {
    return backendIcon
  }

  return CATEGORY_ICONS[normalizeCategory(category)] ?? DEFAULT_ICON
}
