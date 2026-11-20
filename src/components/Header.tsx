import { useState } from "react";
import { Camera, Hand, BookOpen, Menu, X, ArrowUpRight } from "lucide-react";

export type NavTab = "detector" | "dictionary";

interface HeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onLaunchCamera?: () => void;
}

export function Header({
  activeTab,
  setActiveTab,
  onLaunchCamera,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNav = (tab: NavTab) => {
    setActiveTab(tab);
    setMenuOpen(false);
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
