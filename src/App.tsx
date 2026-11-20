import { useState, useMemo, useRef } from "react";
import islLabelsData from "./data/islLabels.json";
import { ISLTFClassifier } from "./utils/islGestureClassifier";
import { Header, NavTab } from "./components/Header";
import { Footer } from "./components/Footer";
import { LiveDetector, ISLLabel } from "./components/LiveDetector";
import { GestureGallery } from "./components/GestureGallery";
import { ArrowUpRight, BookOpen } from "lucide-react";
import "./index.css";

const HAND_POINTS = [
  [92, 142], [96, 122], [100, 104], [105, 85], [110, 68],
  [105, 105], [111, 86], [117, 67], [121, 50],
  [100, 106], [98, 84], [98, 62], [98, 42],
  [95, 108], [89, 88], [84, 69], [79, 54],
  [90, 112], [82, 99], [73, 89], [64, 80],
] as const;

const HAND_BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
] as const;

function DualHandHeroSkeleton() {
  return (
    <div className="hero-dual-skeleton-wrapper" aria-label="Dual hand tracking diagram">
      {/* Left Hand Skeleton (Cyan) */}
      <svg className="hero-hand-svg hand-left" viewBox="0 0 180 180" role="img">
        <g className="bones-left">
          {HAND_BONES.map(([from, to]) => (
            <line
              key={`h1-${from}-${to}`}
              x1={HAND_POINTS[from][0] - 25}
              y1={HAND_POINTS[from][1]}
              x2={HAND_POINTS[to][0] - 25}
              y2={HAND_POINTS[to][1]}
            />
          ))}
        </g>
        <g className="joints-left">
          {HAND_POINTS.map(([x, y], idx) => (
            <circle
              key={`j1-${idx}`}
              cx={x - 25}
              cy={y}
              r={idx === 0 ? 3.6 : 2.4}
            />
          ))}
        </g>
      </svg>

      {/* Right Hand Skeleton (Amber) */}
      <svg className="hero-hand-svg hand-right" viewBox="0 0 180 180" role="img">
        <g className="bones-right">
          {HAND_BONES.map(([from, to]) => (
            <line
              key={`h2-${from}-${to}`}
              x1={205 - HAND_POINTS[from][0]}
              y1={HAND_POINTS[from][1]}
              x2={205 - HAND_POINTS[to][0]}
              y2={HAND_POINTS[to][1]}
            />
          ))}
        </g>
        <g className="joints-right">
          {HAND_POINTS.map(([x, y], idx) => (
            <circle
              key={`j2-${idx}`}
              cx={205 - x}
              cy={y}
              r={idx === 0 ? 3.6 : 2.4}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>("detector");
  const [activeLang, setActiveLang] = useState<string>("en");
  const [tokenQueue, setTokenQueue] = useState<string[]>([]);
  const labels = useMemo(() => islLabelsData as ISLLabel[], []);

  const classifierRef = useRef<ISLTFClassifier>(new ISLTFClassifier());

  const handleAddTokenFromGallery = (tokenId: string) => {
    setTokenQueue((prev) => [...prev, tokenId]);
    setActiveTab("detector");
    const detectorElement = document.getElementById("detector");
    detectorElement?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToTab = (tab: NavTab) => {
    setActiveTab(tab);
    const element = document.getElementById(tab);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="app-shell" id="top">
      {/* Navigation Header with Global Language Selector */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => scrollToTab(tab)}
        onLaunchCamera={() => scrollToTab("detector")}
      />

      <main>
        {/* Hero Section */}
        <section className="hero section-shell" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="status-dot status-dot-pulse" />
              <span>INDIAN SIGN LANGUAGE · LIVE CAMERA TRANSLATION</span>
              <span className="eyebrow-line" />
            </div>

            <h1 id="hero-title">
              Clear communication,<br />
              <em>when it matters.</em>
            </h1>

            <p className="hero-description">
              A simple camera-based ISL communication aid. Recognized signs build an editable message that you can review and speak aloud. Recognition is experimental; confirm important or medical messages with a qualified interpreter.
            </p>

            <div className="hero-actions">
              <button
                className="button button-primary"
                onClick={() => scrollToTab("detector")}
              >
                <span>Start translating</span>
                <ArrowUpRight size={16} />
              </button>
              <button
                className="button button-ghost"
                onClick={() => scrollToTab("dictionary")}
              >
                <BookOpen size={16} />
                <span>Common signs</span>
              </button>
            </div>

          </div>
        </section>

        {/* Section 01: Live Camera Detector & Dual-Hand Recognition */}
        <LiveDetector
          labels={labels}
          classifier={classifierRef.current}
          dataset={{}}
          activeLang={activeLang}
          onLanguageChange={setActiveLang}
          tokenQueue={tokenQueue}
          onTokenQueueChange={setTokenQueue}
        />

        {/* Section 02: ISL Vocabulary Explorer & Dictionary */}
        <GestureGallery
          labels={labels}
          onAddToken={handleAddTokenFromGallery}
        />

      </main>

      {/* Footer without blog or contact */}
      <Footer setActiveTab={(tab) => scrollToTab(tab)} />
    </div>
  );
}
