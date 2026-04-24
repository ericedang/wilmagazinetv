import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const LANGUAGES = [
  { code: 'fr', label: 'FR Français' },
  { code: 'en', label: 'EN English' },
  { code: 'es', label: 'ES Español' }
];

export default function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLangCode = i18n.language?.substring(0, 2).toLowerCase() || 'fr';
  const displayLang = currentLangCode.toUpperCase();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectLanguage = (code: string) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 hover:border-gold transition-all group"
        title="Change language"
      >
        <Globe className="w-4 h-4 text-gray-400 group-hover:text-gold transition-colors" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 group-hover:text-gold transition-colors">
          {displayLang}
        </span>
        <ChevronDown className={cn("w-3 h-3 text-gray-400 group-hover:text-gold transition-all duration-300", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full right-0 mt-2 w-40 bg-white border border-gray-100 shadow-xl rounded-xl overflow-hidden z-50 py-2"
          >
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => selectLanguage(lang.code)}
                className={cn(
                  "w-full text-left px-4 py-2 text-xs uppercase tracking-widest font-medium transition-colors border-l-2",
                  currentLangCode === lang.code
                    ? "bg-gold/5 text-gold border-gold"
                    : "text-gray-600 hover:bg-gray-50 border-transparent hover:border-gray-200"
                )}
              >
                {lang.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
