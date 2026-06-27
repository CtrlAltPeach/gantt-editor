/** Дизайн-токены для светлой и тёмной темы. */

export const lightTheme = {
  // База
  background: "#f5f7fb",
  surface: "#ffffff",
  surfaceVariant: "#f1f5f9",
  sidebarBg: "#ffffff",
  inputBg: "#ffffff",

  // Material-like primary
  primary: "#6750a4",
  primaryHover: "#5b4598",
  primaryContainer: "#eaddff",
  onPrimary: "#ffffff",
  onPrimaryContainer: "#21005d",

  // Текст
  text: "#1d1b20",
  textSecondary: "#625b71",
  textHint: "#79747e",

  // Границы
  border: "#d9d5e3",
  gridLine: "#e7e0ec",

  // Элементы UI
  headerBg: "#f7f2fa",
  buttonBg: "#f3edf7",
  buttonHover: "#e8def8",

  // SVG
  svgBackground: "#fffbfe",
  headerText: "#49454f",
  arrowColor: "#6750a4",

  // Контекстное меню
  menuBg: "#ffffff",
  menuShadow: "rgba(30, 22, 48, 0.18)",
  menuBorder: "#e7e0ec",

  // Состояния
  danger: "#ba1a1a",
  dangerContainer: "#ffdad6",
};

export const darkTheme = {
  // База
  background: "#121318",
  surface: "#1d1b20",
  surfaceVariant: "#2b2930",
  sidebarBg: "#1d1b20",
  inputBg: "#2b2930",

  // Material-like primary
  primary: "#d0bcff",
  primaryHover: "#c4a9ff",
  primaryContainer: "#4f378b",
  onPrimary: "#381e72",
  onPrimaryContainer: "#eaddff",

  // Текст
  text: "#e6e1e5",
  textSecondary: "#cac4d0",
  textHint: "#938f99",

  // Границы
  border: "#49454f",
  gridLine: "#37323d",

  // Элементы UI
  headerBg: "#211f26",
  buttonBg: "#2f2b35",
  buttonHover: "#3a3542",

  // SVG
  svgBackground: "#17151b",
  headerText: "#cac4d0",
  arrowColor: "#d0bcff",

  // Контекстное меню
  menuBg: "#211f26",
  menuShadow: "rgba(0, 0, 0, 0.45)",
  menuBorder: "#49454f",

  // Состояния
  danger: "#ffb4ab",
  dangerContainer: "#93000a",
};

export type Theme = typeof lightTheme;
