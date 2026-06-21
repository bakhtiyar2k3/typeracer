import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-5xl font-bold text-accent">404</h1>
      <p className="text-secondary">this page took a wrong turn</p>
      <Link to="/" className="btn-primary">
        back home
      </Link>
    </div>
  );
}
