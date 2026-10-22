import { Link } from 'react-router-dom';
import { Page, useDocumentTitle } from '../components/ui.jsx';

export default function NotFound() {
  useDocumentTitle('Page not found');
  return (
    <Page>
      <div className="mx-auto max-w-md rounded-2xl border border-dashed border-[#cfc9b5] bg-white/60 p-8 text-center">
        <h1 className="text-3xl font-extrabold">Page not found</h1>
        <p className="mt-2 text-ink-soft">That address does not exist in ¡Hola Ingeniero!.</p>
        <Link className="btn btn-primary mt-5" to="/">Go to the home page</Link>
      </div>
    </Page>
  );
}
