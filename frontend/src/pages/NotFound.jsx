import { Link } from 'react-router-dom';
import Barcode from '../components/Barcode';
import BrandMark from '../components/BrandMark';
import './Home.css';

export default function NotFound() {
  return (
    <div className="pp-home">
      <header className="pp-nav">
        <div className="pp-container pp-nav-inner">
          <Link className="pp-brand" to="/" aria-label="Parcel Point home">
            <BrandMark size={30} />
            <span>Parcel Point</span>
          </Link>
        </div>
      </header>
      <main className="pp-notfound">
        <div className="pp-container">
          <p className="pp-micro">ERROR / 404</p>
          <h1>This route isn&apos;t on the manifest.</h1>
          <p>The page you asked for does not exist or has been moved.</p>
          <Link className="pp-btn pp-btn-amber" to="/">Back to home</Link>
        </div>
      </main>
      <Barcode className="pp-barcode pp-footer-barcode" />
    </div>
  );
}
