import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, Phone, Mail, MessageSquare, X, Send } from 'lucide-react';

const ContactFloating = () => {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  const actions = [
    {
      icon: <Phone size={18} />,
      label: t('call_whatsapp'),
      href: 'https://api.whatsapp.com/send?phone=237697061084',
      color: 'bg-[#25D366]/80 backdrop-blur-md border border-white/20',
    },
    {
      icon: <MessageCircle size={18} />,
      label: t('write_whatsapp'),
      href: 'https://api.whatsapp.com/send?phone=237697061084',
      color: 'bg-[#25D366]/80 backdrop-blur-md border border-white/20',
    },
    {
      icon: <Mail size={18} />,
      label: t('send_email'),
      href: 'mailto:contact@womenimpactlevel.com',
      color: 'bg-burgundy/80 backdrop-blur-md border border-white/20',
    },
    {
      icon: <MessageSquare size={18} />,
      label: t('leave_message'),
      action: () => {
        const contactSection = document.getElementById('contact');
        if (contactSection) {
          contactSection.scrollIntoView({ behavior: 'smooth' });
          setOpen(false);
        } else {
          window.location.href = '/#contact';
        }
      },
      color: 'bg-black-rich/80 backdrop-blur-md border border-white/20',
    },
  ];

  return (
    <div className="fixed bottom-20 right-8 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 space-y-3 flex flex-col items-end"
          >
            {actions.map((action, index) => (
              <motion.a
                key={index}
                href={action.href}
                onClick={action.action}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 group cursor-pointer"
              >
                <span className="bg-white/10 backdrop-blur-xl text-white border border-white/10 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                  {action.label}
                </span>
                <div className={`${action.color} text-white p-4 rounded-full shadow-2xl hover:scale-110 hover:shadow-gold/40 hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all duration-300`}>
                  {action.icon}
                </div>
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen(!open)}
        className={`${
          open ? 'bg-white/20 backdrop-blur-xl text-white border border-white/30' : 'bg-gold/90 backdrop-blur-md text-black-rich border border-white/20'
        } p-5 rounded-full shadow-[0_0_30px_rgba(0,0,0,0.2)] hover:scale-110 hover:shadow-gold/50 hover:shadow-[0_0_25px_rgba(212,175,55,0.5)] transition-all duration-500 flex items-center justify-center relative group overflow-hidden`}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        {open ? <X size={28} /> : <MessageCircle size={28} />}
      </button>
    </div>
  );
};

export default ContactFloating;
