import { create } from "zustand";
import { lightTheme, darkTheme, Theme } from "../theme";

interface ThemeStore {
  isDark: boolean;
  theme: Theme;
  toggle: () => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  isDark: false,
  theme: lightTheme,
  toggle: () => set({ isDark: !get().isDark, theme: get().isDark ? lightTheme : darkTheme }),
}));
