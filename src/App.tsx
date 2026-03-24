import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Login } from './components/Login';
import { MusicianList } from './components/MusicianList';
import { PerformanceList } from './components/PerformanceList';
import { Statistics } from './components/Statistics';
import { Music, Calendar, LogOut, TrendingUp, Menu, X } from 'lucide-react';

type View = 'musicians' | 'performances' | 'statistics';

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('musicians');
  const [statisticsKey, setStatisticsKey] = useState(0);
  const [musiciansKey, setMusiciansKey] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={() => {}} />;
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-brand">
          <Music size={32} />
          <h1>Gestión de Banda</h1>
        </div>

        <button
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <div className={`navbar-menu ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <button
            onClick={() => {
              setCurrentView('musicians');
              setMusiciansKey(prev => prev + 1);
              setMobileMenuOpen(false);
            }}
            className={`nav-button ${currentView === 'musicians' ? 'active' : ''}`}
          >
            <Music size={20} />
            Músicos
          </button>
          <button
            onClick={() => {
              setCurrentView('performances');
              setMobileMenuOpen(false);
            }}
            className={`nav-button ${currentView === 'performances' ? 'active' : ''}`}
          >
            <Calendar size={20} />
            Actuaciones
          </button>
          <button
            onClick={() => {
              setCurrentView('statistics');
              setStatisticsKey(prev => prev + 1);
              setMobileMenuOpen(false);
            }}
            className={`nav-button ${currentView === 'statistics' ? 'active' : ''}`}
          >
            <TrendingUp size={20} />
            Estadísticas
          </button>
        </div>

        <button onClick={handleLogout} className="btn-logout">
          <LogOut size={20} />
          <span className="logout-text">Salir</span>
        </button>
      </nav>

      <main className="main-content">
        {currentView === 'musicians' && <MusicianList key={musiciansKey} />}
        {currentView === 'performances' && <PerformanceList />}
        {currentView === 'statistics' && <Statistics key={statisticsKey} />}
      </main>
    </div>
  );
}

export default App;
