import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Search, User, PlayCircle, BookOpen, Crown, Mail as MailIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

export default function Navbar() {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: t('magazine'), path: '/magazine', icon: <BookOpen className="w-4 h-4" /> },
    { name: t('tv'), path: '/tv', icon: <PlayCircle className="w-4 h-4" /> },
    { name: t('articles'), path: '/articles', icon: <Search className="w-4 h-4" /> },
    { name: t('events'), path: '/events', icon: <Crown className="w-4 h-4" /> },
    { name: t('contact'), path: '/#contact', icon: <MailIcon className="w-4 h-4" /> },
  ];

  const categories = [
    t('cat_leadership'),
    t('cat_mindset'),
    t('cat_faith'),
    t('cat_science'),
    t('cat_culture'),
    t('cat_transformation')
  ];

  return (
    <nav 
      className={cn(
        "fixed w-full z-50 transition-all duration-500",
        isScrolled || isOpen ? "bg-white shadow-md py-4" : "bg-transparent py-6"
      )}
    >
      <div className="container-custom">
        <div className="flex justify-between items-center">
          {/* Mobile Menu Toggle */}
          <button 
            className={cn(
              "lg:hidden p-2",
              isScrolled || isOpen ? "text-black-rich" : "text-white"
            )}
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X /> : <Menu />}
          </button>

          {/* Logo */}
          <Link to="/" className="flex flex-col items-center">
            <span className={cn(
              "font-serif text-3xl md:text-4xl font-bold tracking-tighter transition-colors duration-500",
              isScrolled || isOpen ? "text-burgundy" : "text-white"
            )}>
              WIL <span className="font-light italic">Magazine</span>
            </span>
            <span className={cn(
              "text-[8px] md:text-[9px] tracking-[0.4em] uppercase transition-colors duration-500 text-center",
              isScrolled || isOpen ? "text-gold" : "text-gold-light"
            )}>
              Women Impact Level
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center space-x-8">
            {navLinks.map((link) => (
              <div key={link.path} className="relative group">
                <Link
                  to={link.path}
                  className={cn(
                    "text-xs uppercase tracking-widest font-medium hover:text-gold transition-colors flex items-center gap-1",
                    isScrolled ? "text-black-rich" : "text-white",
                    location.pathname === link.path && "text-gold"
                  )}
                >
                  {link.name}
                </Link>
                {link.name === 'Articles' && (
                  <div className="absolute top-full left-0 pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
                    <div className="bg-white shadow-xl border border-gray-100 p-6 w-64 grid grid-cols-1 gap-4">
                      {categories.map(cat => (
                        <Link 
                          key={cat}
                          to={`/articles?category=${encodeURIComponent(cat)}`}
                          className="text-[10px] uppercase tracking-widest text-gray-500 hover:text-gold transition-colors"
                        >
                          {cat}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <LanguageSwitcher 
              className={cn(
                "transition-colors",
                isScrolled ? "border-gray-200" : "border-white/20 text-white"
              )} 
            />
            <Link 
              to="/subscribe" 
              className="bg-burgundy text-white px-6 py-2 text-xs uppercase tracking-widest hover:bg-black-rich transition-all"
            >
              {t('subscribe')}
            </Link>
            <Link 
              to="/dashboard" 
              className={cn(
                "p-2 hover:text-gold transition-colors relative",
                isScrolled ? "text-black-rich" : "text-white"
              )}
            >
              <User className="w-5 h-5" />
              {profile?.role === 'admin' && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-gold rounded-full" />
              )}
            </Link>
          </div>

          {/* Mobile Search/User Icons */}
          <div className="lg:hidden flex items-center space-x-4">
            <LanguageSwitcher className="border-none p-0" />
            <Link to="/dashboard" className={cn(
              isScrolled || isOpen ? "text-black-rich" : "text-white"
            )}>
              <User className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="lg:hidden absolute top-full left-0 w-full bg-white border-t border-gray-100 shadow-xl overflow-hidden"
          >
            <div className="flex flex-col p-6 space-y-6">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center space-x-4 text-lg font-serif text-black-rich hover:text-gold transition-colors"
                >
                  <span className="text-gold">{link.icon}</span>
                  <span>{link.name}</span>
                </Link>
              ))}
              <Link
                to="/subscribe"
                onClick={() => setIsOpen(false)}
                className="w-full bg-burgundy text-white py-4 text-center uppercase tracking-widest text-sm font-bold"
              >
                {t('subscribe_now')}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
