import { createContext, useContext, useState } from "react";

const ThemeContext = createContext(null);

export const lightColors = {
  background: "#F5F7FA",
  card: "#FFFFFF",
  text: "#1F2937",
  subtext: "#6B7280",
  border: "#E5E7EB",
  icon: "#1E3A5F",
  primary: "#1E3A5F",
  buttonText: "#FFFFFF",
  placeholder: "#9CA3AF",
};

export const darkColors = {
  background: "#111827",
  card: "#1F2937",
  text: "#F9FAFB",
  subtext: "#9CA3AF",
  border: "#374151",
  icon: "#93C5FD",
  primary: "#3B82F6",
  buttonText: "#FFFFFF",
  placeholder: "#6B7280",
};

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(false);

  const toggleTheme = () => setDarkMode((prev) => !prev);
  const colors = darkMode ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme precisa ser usado dentro de um ThemeProvider");
  }
  return context;
}