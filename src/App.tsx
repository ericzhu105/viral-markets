import { useEffect } from 'react';
import { Editor } from './components/Editor';
import { Home } from './components/Home';
import { PlayScreen } from './components/Play';
import { StaffGateProvider } from './components/StaffLock';
import { Toaster } from './components/Toast';
import { useRoute } from './lib/router';
import { StoreProvider, useStore } from './lib/store';
import { VmLogo } from './components/VmLogo';

export function App() {
  return (
    <StoreProvider>
      <StaffGateProvider>
        <Screens />
        <Toaster />
      </StaffGateProvider>
    </StoreProvider>
  );
}

function Screens() {
  const route = useRoute();
  const { ready } = useStore();

  // Block pinch-zoom on iPad Safari (it ignores user-scalable=no).
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener('gesturestart', stop);
    return () => document.removeEventListener('gesturestart', stop);
  }, []);

  if (!ready) {
    return (
      <div className="screen-center splash">
        <VmLogo size={140} />
      </div>
    );
  }
  if (route.name === 'play') return <PlayScreen key={route.id} id={route.id} />;
  if (route.name === 'edit') return <Editor key={route.id} id={route.id} />;
  return <Home />;
}
