import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Magazine from './pages/Magazine';
import TV from './pages/TV';
import Articles from './pages/Articles';
import Events from './pages/Events';
import Subscribe from './pages/Subscribe';
import Dashboard from './pages/Dashboard';
import ArticleDetail from './pages/ArticleDetail';
import { AuthProvider } from './contexts/AuthContext';
import ContactFloating from './components/ContactFloating';
import BreakingNewsBar from './components/BreakingNewsBar';
import { useScrollToHash } from './hooks/useScrollToHash';
import { Toaster } from 'react-hot-toast';

export default function App() {
  useScrollToHash();
  
  return (
    <AuthProvider>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/magazine" element={<Magazine />} />
            <Route path="/tv" element={<TV />} />
            <Route path="/articles" element={<Articles />} />
            <Route path="/articles/:id" element={<ArticleDetail />} />
            <Route path="/events" element={<Events />} />
            <Route path="/subscribe" element={<Subscribe />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </main>
        <Footer />
        <ContactFloating />
        <BreakingNewsBar />
        <Toaster position="bottom-right" />
      </div>
    </AuthProvider>
  );
}
