// DarkModeContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface DarkModeContextProps {
  isDark: boolean;
  toggleDarkMode: () => void;
}

const DarkModeContext = createContext<DarkModeContextProps>({
  isDark: false,
  toggleDarkMode: () => {},
});

export const DarkModeProvider = ({ children }: { children: ReactNode }) => {
  const [isDark, setIsDark] = useState<boolean>(() => localStorage.getItem("darkMode") === "true");

  const toggleDarkMode = () => setIsDark(prev => {
    const newVal = !prev;
    localStorage.setItem("darkMode", String(newVal));
    return newVal;
  });

  useEffect(() => {
    if (isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [isDark]);

  return (
    <DarkModeContext.Provider value={{ isDark, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
};

/**
 * Custom hook to access the dark mode context.
 * @returns {{isDark: boolean, toggleDarkMode: () => void}} The current dark mode state and the toggle function.
 */
export const useDarkMode = () => useContext(DarkModeContext);
