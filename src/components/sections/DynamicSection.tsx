import React from 'react';
import { useTranslation } from 'react-i18next';
import { CustomSection } from '../../types';
import { motion } from 'motion/react';
import { Check, Star, Users, ArrowRight, ShieldCheck, Search, User, Play, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

const IconMap: Record<string, any> = {
  ShieldCheck,
  Search,
  User,
  Star,
  Check,
  Users
};

interface DynamicSectionProps {
  section: CustomSection;
  isEditing?: boolean;
  onUpdate?: (updates: Partial<CustomSection>) => void;
  selectedId?: string;
}

export default function DynamicSection({ section, isEditing, onUpdate, selectedId }: DynamicSectionProps) {
  const { section_type, content, title } = section;
  const { t } = useTranslation();

  const handleTextChange = (path: string, value: string) => {
    if (!onUpdate) return;
    const newContent = { ...content };
    const keys = path.split('.');
    let current = newContent;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    onUpdate({ content: newContent });
  };

  const renderEditableText = (path: string, initialValue: string, className?: string, element: 'h1' | 'h2' | 'h3' | 'p' | 'span' = 'p') => {
    if (!isEditing) {
      const Tag = element;
      return <Tag className={className}>{initialValue}</Tag>;
    }

    return (
      <div className="relative group/edit">
        <textarea
          defaultValue={initialValue}
          onBlur={(e) => handleTextChange(path, e.target.value)}
          className={cn(
            "w-full bg-gold/5 border border-dashed border-gold/30 p-2 focus:border-gold focus:outline-none transition-all resize-none overflow-hidden",
            className
          )}
          rows={1}
          onInput={(e: any) => {
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
        />
        <div className="absolute -top-4 right-0 opacity-0 group-hover/edit:opacity-100 transition-opacity">
          <span className="bg-gold text-black-rich text-[8px] px-1 font-bold uppercase tracking-widest">{t('edition')}</span>
        </div>
      </div>
    );
  };

  const renderIcon = (iconName: string) => {
    const IconComponent = IconMap[iconName] || Star;
    return <IconComponent size={32} />;
  };

  const renderEditableImage = (path: string, initialValue: string, className?: string) => {
    if (!isEditing) {
      return <img src={initialValue} className={className} alt="Section content" referrerPolicy="no-referrer" />;
    }

    return (
      <div className="relative group/edit-img">
        <img src={initialValue} className={className} alt="Section content" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/edit-img:opacity-100 transition-opacity flex items-center justify-center">
          <div className="text-center">
            <Sparkles className="text-gold mx-auto mb-2" />
            <span className="text-[8px] uppercase tracking-widest font-bold text-white">{t('change_image')}</span>
            <input 
              type="text" 
              defaultValue={initialValue}
              onBlur={(e) => handleTextChange(path, e.target.value)}
              className="mt-2 w-full bg-white/10 border border-white/20 p-1 text-[8px] text-white focus:outline-none"
              placeholder={t('dashboard_section_placeholder_image')}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (section_type) {
      case 'texte':
        return (
          <section className="py-20 container-custom">
            {title && renderEditableText('title', title, "text-4xl font-serif mb-8", 'h2')}
            <div className="prose prose-lg max-w-none text-gray-600 leading-relaxed" 
                 dangerouslySetInnerHTML={{ __html: content.html }} />
          </section>
        );

      case 'cartes':
      return (
        <section className="py-20 container-custom">
          {title && renderEditableText('title', title, "text-4xl font-serif mb-12 text-center", 'h2')}
          <div className={`grid grid-cols-1 md:grid-cols-${content.columns || 3} gap-8`}>
            {content.items?.map((item: any, idx: number) => (
              <div key={idx} className="bg-white p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                {item.image && renderEditableImage(`items.${idx}.image`, item.image, "w-full h-48 object-cover mb-6")}
                {renderEditableText(`items.${idx}.title`, item.title, "text-xl font-serif mb-4", 'h3')}
                {renderEditableText(`items.${idx}.description`, item.description, "text-gray-600 text-sm mb-6", 'p')}
                {item.link && (
                  <a href={item.link} className="text-gold text-xs uppercase tracking-widest font-bold flex items-center gap-2">
                    {t('learn_more')} <ArrowRight size={14} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      );

    case 'cta':
      return (
        <section className={`py-20 ${content.bgColor || 'bg-burgundy'} text-white`}>
          <div className="container-custom text-center">
            {renderEditableText('title', title || content.title, "text-4xl font-serif mb-6", 'h2')}
            {renderEditableText('description', content.description, "text-gray-200 mb-10 max-w-2xl mx-auto", 'p')}
            <button className="btn-gold px-12">{content.buttonText}</button>
          </div>
        </section>
      );

    case 'stats':
      return (
        <section className="py-20 bg-gray-50">
          <div className="container-custom grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            {content.items?.map((item: any, idx: number) => (
              <div key={idx}>
                <div className="text-4xl font-serif text-burgundy mb-2">{item.value}</div>
                <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{item.label}</div>
              </div>
            ))}
          </div>
        </section>
      );

    case 'temoignages':
      return (
        <section className="py-20 container-custom overflow-hidden">
          {title && <h2 className="text-4xl font-serif mb-16 text-center">{title}</h2>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {content.items?.map((item: any, idx: number) => (
              <div key={idx} className="bg-white p-10 border border-gray-100 relative">
                <Star className="text-gold mb-6" size={20} fill="currentColor" />
                <p className="text-gray-600 italic mb-8">"{item.text}"</p>
                <div className="flex items-center gap-4">
                  {item.photo && <img src={item.photo} alt={item.name} className="w-12 h-12 rounded-full object-cover" />}
                  <div>
                    <div className="font-bold text-sm">{item.name}</div>
                    <div className="text-[10px] text-gold uppercase tracking-widest">{item.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      );

    case 'deux_colonnes':
      return (
        <section className="py-20 container-custom">
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-16 items-center ${content.reverse ? 'md:flex-row-reverse' : ''}`}>
             <div className={content.reverse ? 'md:order-2' : ''}>
                {title && <h2 className="text-4xl font-serif mb-8">{title}</h2>}
                <div className="prose prose-lg text-gray-600" dangerouslySetInnerHTML={{ __html: content.html }} />
                {content.buttonText && <button className="btn-premium mt-8">{content.buttonText}</button>}
             </div>
             <div className={content.reverse ? 'md:order-1' : ''}>
                <img src={content.image} alt={title} className="w-full shadow-2xl" />
             </div>
          </div>
        </section>
      );

    case 'logos':
      return (
        <section className="py-16 border-y border-gray-100">
          <div className="container-custom">
            <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-50 grayscale hover:grayscale-0 transition-all duration-700">
              {content.items?.map((logo: string, idx: number) => (
                <img key={idx} src={logo} alt="Partner" className="h-8 md:h-12 object-contain" />
              ))}
            </div>
          </div>
        </section>
      );

    case 'citation':
    case 'quote':
      return (
        <section className={cn(
          "py-24 relative overflow-hidden text-white",
          content.background === 'luxury-dark-gradient' ? "bg-gradient-to-br from-black-rich via-burgundy/20 to-black" : "bg-black-rich"
        )}>
          <div className="absolute inset-0 opacity-20">
            <img src={content.image || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=1200"} className="w-full h-full object-cover grayscale" alt="Background" />
          </div>
          <div className="container-custom relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="max-w-4xl mx-auto"
            >
              <span className="text-gold text-6xl font-serif mb-8 block">"</span>
              <h2 className="text-3xl md:text-5xl font-serif italic mb-12 leading-tight">
                {content.text}
              </h2>
              <div className="flex flex-col items-center">
                <div className="w-12 h-[1px] bg-gold mb-4" />
                <span className="text-xs uppercase tracking-[0.3em] font-bold text-gold">{content.author}</span>
              </div>
            </motion.div>
          </div>
        </section>
      );

    case 'story':
      return (
        <section className="py-24 bg-white">
          <div className="container-custom">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <div className="relative">
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-gold/10 rounded-full blur-3xl" />
                <img 
                  src={content.image || "https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=1200"} 
                  alt={content.headline} 
                  className="relative z-10 w-full aspect-[4/5] object-cover shadow-2xl"
                />
                <div className="absolute -bottom-6 -right-6 bg-burgundy text-white p-8 z-20 hidden md:block">
                  <span className="text-xs uppercase tracking-widest font-bold text-gold block mb-2">{content.category}</span>
                  <p className="font-serif text-xl italic">"{content.headline}"</p>
                </div>
              </div>
              <div>
                <span className="text-gold text-xs uppercase tracking-[0.4em] font-bold mb-6 block">{t('success_story')}</span>
                <h2 className="text-4xl md:text-6xl font-serif mb-8 leading-tight">{content.headline}</h2>
                <p className="text-gray-600 text-lg leading-relaxed mb-10 italic">
                  {content.text}
                </p>
                <div className="flex items-center gap-6">
                  <div className="w-16 h-[1px] bg-black-rich" />
                  <span className="font-serif text-2xl">{content.highlight_person}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      );

    case 'mindset':
      return (
        <section className="py-24 bg-gray-50 border-y border-gray-100">
          <div className="container-custom">
            <div className="max-w-4xl mx-auto text-center mb-20">
              <span className="text-burgundy text-xs uppercase tracking-[0.4em] font-bold mb-4 block">{t('mindset_abundance')}</span>
              <h2 className="text-4xl md:text-6xl font-serif mb-8">{content.headline}</h2>
              <p className="text-gray-500 text-lg">{content.text}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {content.points?.map((point: string, idx: number) => (
                <div key={idx} className="bg-white p-10 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center text-gold mb-6">
                    <Check size={24} />
                  </div>
                  <p className="font-serif text-xl">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case 'featured_video':
      return (
        <section className="py-24 bg-black text-white overflow-hidden relative">
          <div className="container-custom relative z-10">
            <div className="flex flex-col md:flex-row items-center gap-16">
              <div className="w-full md:w-1/2">
                <span className="bg-gold text-black-rich px-3 py-1 text-[10px] font-bold uppercase tracking-widest mb-6 inline-block">
                  {content.label}
                </span>
                <h2 className="text-4xl md:text-7xl font-serif mb-8 leading-tight">{title}</h2>
                <p className="text-gray-400 text-lg mb-10 max-w-lg leading-relaxed">
                  {content.description}
                </p>
                <button className="btn-gold px-10">{t('discover_interview')}</button>
              </div>
              <div className="w-full md:w-1/2 relative group">
                <div className="aspect-video overflow-hidden relative rounded-sm shadow-2xl border border-white/10">
                  <img 
                    src={content.thumbnail || "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=1200"} 
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                    alt="Featured Video" 
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full border-2 border-white flex items-center justify-center group-hover:scale-110 transition-all duration-500 bg-white/10 backdrop-blur-sm">
                      <Play fill="white" size={32} />
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-gold/20 blur-3xl -z-10" />
              </div>
            </div>
          </div>
        </section>
      );

    case 'leadership':
      return (
        <section className="py-24 bg-gray-50">
          <div className="container-custom">
            <div className="text-center mb-20">
              <h2 className="text-4xl font-serif mb-4">{title}</h2>
              <div className="w-20 h-[1px] bg-gold mx-auto" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {content.items?.map((item: any, idx: number) => (
                <div key={idx} className="bg-white p-12 shadow-sm hover:shadow-xl transition-all duration-500 group border-t-4 border-transparent hover:border-burgundy">
                  <div className="text-gold mb-8 group-hover:scale-110 transition-transform duration-500">
                    {renderIcon(item.icon)}
                  </div>
                  <h3 className="text-xl font-serif mb-4">{item.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case 'galerie':
      return (
        <section className="py-24 bg-white">
          <div className="container-custom">
            <div className="flex justify-between items-end mb-16">
              <h2 className="text-4xl font-serif">{title}</h2>
              <button className="text-[10px] uppercase tracking-widest text-gold font-bold hover:text-burgundy transition-colors">{t('view_full_album')}</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {content.items?.map((img: string, idx: number) => (
                <motion.div 
                  key={idx}
                  whileHover={{ scale: 0.98 }}
                  className={cn(
                    "relative overflow-hidden aspect-square group",
                    idx === 0 && "md:col-span-2 md:row-span-2 aspect-auto"
                  )}
                >
                  <img src={img} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Gallery" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      );

    case 'image_seule':
      return (
        <section className={cn("py-12", content.fullWidth ? "" : "container-custom")}>
          <div className="relative group/img-section">
            {renderEditableImage('image', content.image, cn("w-full shadow-lg", content.fullWidth ? "h-[60vh] object-cover" : ""))}
            {content.caption && (
              <div className="mt-4 text-center text-gray-500 italic text-sm">
                {renderEditableText('caption', content.caption)}
              </div>
            )}
          </div>
        </section>
      );

    default:
        return null;
    }
  };

  return (
    <div className={cn(
      "relative group/section transition-all",
      isEditing && "hover:outline hover:outline-2 hover:outline-gold cursor-pointer",
      isEditing && selectedId === section.id && "outline outline-2 outline-gold bg-gold/5"
    )}>
      {isEditing && (
        <div className="absolute top-0 right-0 bg-gold text-black-rich text-[8px] uppercase tracking-widest px-2 py-1 z-30 font-bold opacity-0 group-hover/section:opacity-100 transition-opacity">
          {section_type}
        </div>
      )}
      {renderContent()}
    </div>
  );
}
