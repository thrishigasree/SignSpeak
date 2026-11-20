import { useState, useMemo } from "react";
import { Hand, Search, Volume2, ArrowUpRight } from "lucide-react";
import { ISLLabel } from "./LiveDetector";
import { speakText, SupportedLanguage } from "../utils/sentenceSynthesizer";

interface GestureGalleryProps {
  labels: ISLLabel[];
  onAddToken?: (tokenId: string) => void;
}

export function GestureGallery({ labels, onAddToken }: GestureGalleryProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = useMemo(() => {
    const set = new Set<string>();
    set.add("All");
    set.add("Two-Hand Signs");
    labels.forEach((l) => set.add(l.category));
    return Array.from(set);
  }, [labels]);

  const filteredLabels = useMemo(() => {
    return labels.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.output.toLowerCase().includes(search.toLowerCase()) ||
        item.hindi.toLowerCase().includes(search.toLowerCase()) ||
        item.tamil.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedCategory === "All") return true;
      if (selectedCategory === "Two-Hand Signs") return item.handsRequired === 2;
      return item.category === selectedCategory;
    });
  }, [labels, search, selectedCategory]);

  const handleAdd = (id: string) => {
    onAddToken?.(id);
  };

  const handleSpeak = (text: string, lang: SupportedLanguage = "en") => {
    speakText(text, lang);
  };

  return (
    <section className="gallery-section section-shell" id="dictionary">
      <div className="section-heading-row">
        <div>
          <div className="section-index">02 / ISL VOCABULARY & DICTIONARY</div>
          <h2>
            Common ISL<br />
            <em>signs and phrases.</em>
          </h2>
        </div>
        <p className="section-intro">
          Browse supported signs with Hindi and Tamil wording, plus a short description of each gesture.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="gallery-filter-bar">
        <div className="search-box">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search ISL gestures by name, Hindi, Tamil, or meaning…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-pills-row">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`filter-chip ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count Banner */}
      <div className="gallery-meta-bar">
        <span>Showing {filteredLabels.length} supported signs</span>
        <span className="mono text-xs text-amber-500">
          {filteredLabels.filter((l) => l.handsRequired === 2).length} two-hand signs
        </span>
      </div>

      {/* Gesture Grid */}
      <div className="gallery-grid">
        {filteredLabels.map((item) => (
          <article key={item.id} className="gesture-card">
            <div className="gesture-card-top">
              <span className="card-emoji"><Hand size={24} aria-hidden="true" /></span>
              <div className="card-badges">
                <span className={`badge-hands ${item.handsRequired === 2 ? "two-hands" : "one-hand"}`}>
                  {item.handsRequired === 2 ? "Two hands" : "One hand"}
                </span>
                <span className="card-category">{item.category}</span>
              </div>
            </div>

            <div className="gesture-card-content">
              <h3>{item.name}</h3>

              <div className="multilingual-names">
                <div className="ml-item">
                  <small>Hindi</small>
                  <span>{item.hindi}</span>
                  <button
                    className="speak-mini-btn"
                    onClick={() => handleSpeak(item.hindi, "hi")}
                    title="Speak in Hindi"
                  >
                    <Volume2 size={12} />
                  </button>
                </div>
                <div className="ml-item">
                  <small>Tamil</small>
                  <span>{item.tamil}</span>
                  <button
                    className="speak-mini-btn"
                    onClick={() => handleSpeak(item.tamil, "ta")}
                    title="Speak in Tamil"
                  >
                    <Volume2 size={12} />
                  </button>
                </div>
              </div>

              <p className="card-desc">{item.description}</p>

              {item.poseGuide && (
                <div className="pose-guide-box">
                  <strong>Pose Guide:</strong> {item.poseGuide}
                </div>
              )}
            </div>

            <div className="gesture-card-footer">
              <button
                className="button button-ghost btn-sm"
                onClick={() => handleSpeak(item.name, "en")}
              >
                <Volume2 size={14} /> Pronounce
              </button>
              <button
                className="button button-ghost btn-sm"
                onClick={() => handleAdd(item.id)}
              >
                <ArrowUpRight size={14} /> Try this sign
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
