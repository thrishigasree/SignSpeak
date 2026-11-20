import { Hand } from "lucide-react";
import { NavTab } from "./Header";

interface FooterProps {
  setActiveTab: (tab: NavTab) => void;
}

export function Footer({ setActiveTab }: FooterProps) {
  const handleNav = (tab: NavTab) => {
    setActiveTab(tab);
  };

  return (
    <footer className="site-footer">
      <div className="section-shell footer-inner">
        <div className="footer-brand-column">
          <div className="footer-brand">
            <span className="brand-mark">
              <Hand size={16} />
            </span>
            <span>SignSpeak ISL</span>
          </div>
          <p className="footer-tagline">A camera-based communication aid for supported ISL signs.</p>
        </div>

        <div className="footer-links-group">
          <strong>Features</strong>
          <button onClick={() => handleNav("detector")}>Live ISL Detector</button>
          <button onClick={() => handleNav("dictionary")}>Common ISL signs</button>
          <span className="footer-privacy">Experimental recognition. Not a substitute for a qualified interpreter.</span>
        </div>
      </div>

      <div className="footer-bottom section-shell">
        <span>© {new Date().getFullYear()} SignSpeak ISL · Hand gestures, spoken naturally.</span>
        <span>Built for accessible communication</span>
      </div>
    </footer>
  );
}
