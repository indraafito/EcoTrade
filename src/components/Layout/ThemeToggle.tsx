import { useDarkMode } from "@/components";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

const ThemeToggle = () => {
  const { isDark, toggleDarkMode } = useDarkMode();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleDarkMode}
      className="rounded-full transition-all duration-300 hover:bg-green-100 hover:scale-110 dark:hover:bg-green-900/30 shadow-sm hover:shadow-md border border-transparent hover:border-green-200 dark:hover:border-green-800"
    >
      {isDark ? (
        <Sun className="h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-amber-500" />
      ) : (
        <Moon className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-indigo-600" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
};

export default ThemeToggle;