import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar.jsx';

// App shell: centered column, generous spacing, minimal chrome (Monkeytype feel).
export function Layout() {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6">
      <Navbar />
      <main className="flex flex-1 flex-col animate-fade-in">
        <Outlet />
      </main>
      <footer className="py-6 text-center text-xs text-secondary">
        type fast · race friends · climb the leaderboard
      </footer>
    </div>
  );
}
