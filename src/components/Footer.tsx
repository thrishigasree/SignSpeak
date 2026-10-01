import { Hand, Heart, Sparkles, Github } from "lucide-react";
import { NavTab } from "./Header";

interface FooterProps {
  setActiveTab: (tab: NavTab) => void;
}

export function Footer({ setActiveTab }: FooterProps) {
  const handleNav = (tab: NavTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
          <p className="footer-tagline">
            Empowering communication through Indian Sign Language (ISL) with real-time two-hand tracking and instant AI sentence translation.
          </p>
          <div className="footer-badge">
            <Sparkles size={13} className="text-amber-400" />
            <span>Dual-Hand Neural Tracking · Multilingual Speech (EN / HI / TA)</span>
          </div>
        </div>

        <div className="footer-links-group">
          <strong>Features</strong>
          <button onClick={() => handleNav("detector")}>Live ISL Detector</button>
          <button onClick={() => handleNav("dictionary")}>ISL Vocabulary (42 Signs)</button>
          <button onClick={() => handleNav("studio")}>AI Sentence Studio</button>
          <button onClick={() => handleNav("trainer")}>In-Browser Model Trainer</button>
        </div>

        <div className="footer-links-group">
          <strong>Linguistics & AI</strong>
          <button onClick={() => handleNav("about")}>About Indian Sign Language</button>
          <a href="https://github.com/thrishigasree/SignSpeak" target="_blank" rel="noreferrer">
            <Github size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
            GitHub Repository
          </a>
          <span className="footer-privacy">Client-side processing · 100% Private</span>
        </div>
      </div>

      <div className="footer-bottom section-shell">
        <span>© {new Date().getFullYear()} SignSpeak ISL · Hand gestures, spoken naturally.</span>
        <span>Built for accessible communication</span>
      </div>
    </footer>
  );
}
