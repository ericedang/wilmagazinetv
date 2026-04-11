import React from 'react';
import PageBuilder from '../components/sections/PageBuilder';
import { 
  Hero, 
  FeaturedMagazine, 
  TVSection, 
  ArticlesGrid, 
  PortraitOfMonth, 
  EventsSection, 
  PartnersCarousel,
  ContactSection
} from '../components/home/HomeSections';

export default function Home() {
  const nativeSections = [
    { id: 'hero', orderIndex: 0, component: <Hero /> },
    { id: 'magazine', orderIndex: 10, component: <FeaturedMagazine /> },
    { id: 'tv', orderIndex: 20, component: <TVSection /> },
    { id: 'articles', orderIndex: 30, component: <ArticlesGrid /> },
    { id: 'portrait', orderIndex: 40, component: <PortraitOfMonth /> },
    { id: 'events', orderIndex: 50, component: <EventsSection /> },
    { id: 'partners', orderIndex: 60, component: <PartnersCarousel /> },
    { id: 'contact', orderIndex: 70, component: <ContactSection /> },
  ];

  return (
    <div className="overflow-hidden">
      <PageBuilder pageSlug="accueil" nativeSections={nativeSections} />
    </div>
  );
}
