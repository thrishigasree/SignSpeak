import { useState } from "react";
import { Camera, Hand, Sparkles, BookOpen, Brain, Info, Menu, X, ArrowUpRight, Globe } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "../utils/sentenceSynthesizer";

export type NavTab = "detector" | "dictionary" | "studio" | "trainer" | "about";

interface HeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onLaunchCamera?: () => void;
  activeLang: string;
  onLanguageChange: (lang: string) => void;
}

export function Header({
  activeTab,
  setActiveTab,
  onLaunchCamera,
  activeLang,
  onLanguageChange,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNav = (tab: NavTab) => {
    setActiveTab(tab);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <header className="site-header">
      <button
        className="brand"
        onClick={() => handleNav("detector")}
        style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
      >
        <span className="brand-mark">
          <Hand size={18} />
        </span>
        <span className="brand-name">
          SignSpeak <span className="brand-sub">ISL</span>
        </span>
      </button>

      <nav className={`site-nav ${menuOpen ? "open" : ""}`} aria-label="Main Navigation">
        <button
          className={`nav-tab ${activeTab === "detector" ? "active" : ""}`}
          onClick={() => handleNav("detector")}
        >
          <Camera size={14} />
          <span>Live Detector</span>
        </button>

        <button
          className={`nav-tab ${activeTab === "dictionary" ? "active" : ""}`}
          onClick={() => handleNav("dictionary")}
        >
          <BookOpen size={14} />
          <span>ISL Dictionary</span>
        </button>

        <button
          className={`nav-tab ${activeTab === "studio" ? "active" : ""}`}
          onClick={() => handleNav("studio")}
        >
          <Sparkles size={14} />
          <span>AI Sentence Studio</span>
        </button>

        <button
          className={`nav-tab ${activeTab === "trainer" ? "active" : ""}`}
          onClick={() => handleNav("trainer")}
        >
          <Brain size={14} />
          <span>Model Trainer</span>
        </button>

        <button
          className={`nav-tab ${activeTab === "about" ? "active" : ""}`}
          onClick={() => handleNav("about")}
        >
          <Info size={14} />
          <span>About ISL</span>
        </button>

        {/* Global Language Selector Pill */}
        <div className="header-lang-selector">
          <Globe size={13} className="text-teal-400" />
          <select
            value={activeLang}
            onChange={(e) => onLanguageChange(e.target.value)}
            aria-label="Change translation language"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.flag} {l.nativeName} ({l.name})
              </option>
            ))}
          </select>
        </div>

        <button
          className="nav-cta"
          onClick={() => {
            handleNav("detector");
            onLaunchCamera?.();
          }}
        >
          <span>Launch Camera</span>
          <ArrowUpRight size={14} />
        </button>
      </nav>

      <button
        className="menu-button"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        aria-expanded={menuOpen}
      >
        {menuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
    </header>
  );
}
