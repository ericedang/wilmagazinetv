import React, { Component, ReactNode } from 'react';
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

import Galeries from './pages/Galeries';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: any }> {
  state = { hasError: false, error: null as any };
  constructor(props: { children: ReactNode }) {
    super(props);
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error('Caught by ErrorBoundary:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return <div id="caught-error" style={{ padding: 20, color: 'red' }}><h1>Something went wrong.</h1><pre>{this.state.error?.toString()}</pre></div>;
    }
    return (this as any).props.children;
  }
}

export default function App() {
  useScrollToHash();
  
  return (
    <ErrorBoundary>
      <AuthProvider>
        <div className="flex flex-col min-h-[100dvh]">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/magazine" element={<Magazine />} />
              <Route path="/tv" element={<TV />} />
              <Route path="/articles" element={<Articles />} />
              <Route path="/articles/:id" element={<ArticleDetail />} />
              <Route path="/events" element={<Events />} />
              <Route path="/galeries" element={<Galeries />} />
              <Route path="/subscribe" element={<Subscribe />} />
              <Route path="/dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
            </Routes>
          </main>
          <Footer />
          <ContactFloating />
          <BreakingNewsBar />
          <Toaster position="bottom-right" />
        </div>
      </AuthProvider>
    </ErrorBoundary>
  );
}
