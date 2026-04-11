import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Youtube, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  
  return (
    <footer className="bg-black-rich text-white pt-20 pb-10">
      <div className="container-custom">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
          {/* Brand Section */}
          <div className="md:col-span-4">
            <h4 className="font-serif text-lg mb-6 text-gold">{t('contact')}</h4>
            <p className="text-gray-400 text-sm mb-4 leading-relaxed">
              WOMEN IMPACT MEDIA GROUP<br />
              Yaoundé, Cameroun<br />
              Tél: +237 697 061 084<br />
              Email: contact@womenimpact.com
            </p>
            <div className="flex space-x-5">
              <a href="#" className="text-gray-400 hover:text-gold transition-colors"><Facebook size={20} /></a>
              <a href="#" className="text-gray-400 hover:text-gold transition-colors"><Instagram size={20} /></a>
              <a href="#" className="text-gray-400 hover:text-gold transition-colors"><Twitter size={20} /></a>
              <a href="#" className="text-gray-400 hover:text-gold transition-colors"><Youtube size={20} /></a>
            </div>
          </div>

          {/* Links Sections */}
          <div className="md:col-span-2">
            <h4 className="font-serif text-lg mb-6 text-gold">{t('magazine')}</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li><Link to="/magazine" className="hover:text-white transition-colors">{t('latest_magazine')}</Link></li>
              <li><Link to="/magazine" className="hover:text-white transition-colors">{t('archives')}</Link></li>
              <li><Link to="/subscribe" className="hover:text-white transition-colors">{t('subscribe')}</Link></li>
              <li><Link to="/articles" className="hover:text-white transition-colors">{t('articles')}</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="font-serif text-lg mb-6 text-gold">{t('tv')} & {t('videos')}</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li><Link to="/tv" className="hover:text-white transition-colors">{t('live_tv')}</Link></li>
              <li><Link to="/tv" className="hover:text-white transition-colors">{t('replay')}</Link></li>
              <li><Link to="/tv" className="hover:text-white transition-colors">{t('interviews')}</Link></li>
              <li><Link to="/tv" className="hover:text-white transition-colors">{t('documentaries')}</Link></li>
            </ul>
          </div>

          {/* Newsletter Section */}
          <div className="md:col-span-4">
            <h4 className="font-serif text-lg mb-6 text-gold">{t('newsletter')}</h4>
            <p className="text-gray-400 text-sm mb-6">
              {t('newsletter_description')}
            </p>
            <form className="flex">
              <input 
                type="email" 
                placeholder={t('your_email')} 
                className="bg-white/5 border border-white/10 px-4 py-3 text-sm w-full focus:outline-none focus:border-gold transition-colors"
              />
              <button className="bg-gold text-black-rich px-6 py-3 hover:bg-white transition-colors">
                <Mail size={20} />
              </button>
            </form>
          </div>
        </div>

        <div className="pt-10 border-t border-white/10 flex flex-col md:row justify-between items-center text-[10px] uppercase tracking-widest text-gray-500 space-y-4 md:space-y-0">
          <p>{t('footer_text')}</p>
          <div className="flex space-x-8">
            <a href="#" className="hover:text-white transition-colors">{t('legal_notice')}</a>
            <a href="#" className="hover:text-white transition-colors">{t('privacy_policy')}</a>
            <a href="#" className="hover:text-white transition-colors">{t('advertising')}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
