import { useEffect } from 'react';

export default function ThemeSwitcher() {
  useEffect(() => {
    // Set the user's preferred theme, defaulting to 'glass' as requested
    const activeTheme = localStorage.getItem('preferredStyleTheme') || 'glass';
    
    // Remove existing theme classes
    document.documentElement.classList.remove('theme-neo', 'theme-glass', 'theme-amethyst', 'theme-cosmic');
    
    // Add glass or active theme class
    document.documentElement.classList.add(`theme-${activeTheme}`);
    localStorage.setItem('preferredStyleTheme', activeTheme);
  }, []);

  return null;
}
