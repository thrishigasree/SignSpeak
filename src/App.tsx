import { useState, useMemo, useEffect, useRef } from "react";
import islLabelsData from "./data/islLabels.json";
import { ISLTFClassifier, TrainingResult } from "./utils/islGestureClassifier";
import { generatePrepopulatedISLDataset } from "./utils/islRules";
import { Header, NavTab } from "./components/Header";
import { Footer } from "./components/Footer";
import { LiveDetector, ISLLabel } from "./components/LiveDetector";
import { GestureGallery } from "./components/GestureGallery";
import { SentenceStudio } from "./components/SentenceStudio";
import { ModelTrainer } from "./components/ModelTrainer";
import { AboutSection } from "./components/AboutSection";
import {
  ArrowDownRight,
  ArrowUpRight,
  Hand,
  Sparkles,
  Camera,
  BookOpen,
  Brain,
  ShieldCheck,
  Languages,
} from "lucide-react";
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
  const labels = useMemo(() => islLabelsData as ISLLabel[], []);

  // Prepopulated baseline dataset for 42 ISL signs
  const [dataset, setDataset] = useState<Record<string, number[][]>>(() =>
    generatePrepopulatedISLDataset()
  );

  // TensorFlow.js classifier instance
  const classifierRef = useRef<ISLTFClassifier>(new ISLTFClassifier());

  const handleModelTrained = (result: TrainingResult) => {
    console.log("ISL Model Trained:", result);
  };

  const handleAddTokenFromGallery = (tokenId: string) => {
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
        activeLang={activeLang}
        onLanguageChange={setActiveLang}
      />

      <main>
        {/* Hero Section */}
        <section className="hero section-shell" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="status-dot status-dot-pulse" />
              <span>INDIAN SIGN LANGUAGE (ISL) · DUAL-HAND INTERFACE</span>
              <span className="eyebrow-line" />
            </div>

            <h1 id="hero-title">
              Two hands.<br />
              <em>One spoken voice.</em>
            </h1>

            <p className="hero-description">
              SignSpeak is built specifically for <strong>Indian Sign Language (ISL)</strong>. It tracks both hands simultaneously, translates two-handed and single-handed signs into words, and synthesizes complete, natural sentences in <strong>English</strong>, <strong>Hindi</strong>, and <strong>Tamil</strong> in real time.
            </p>

            <div className="hero-actions">
              <button
                className="button button-primary"
                onClick={() => scrollToTab("detector")}
              >
                <span>Launch Live Detector</span>
                <ArrowUpRight size={16} />
              </button>
              <button
                className="button button-ghost"
                onClick={() => scrollToTab("studio")}
              >
                <Sparkles size={16} className="text-amber-400" />
                <span>AI Sentence Studio</span>
              </button>
            </div>

            <div className="hero-proof">
              <div className="stat-pill">
                <strong>42</strong>
                <span>ISL Signs Supported</span>
              </div>
              <div className="stat-pill">
                <strong>2 Hands</strong>
                <span>Simultaneous 42-pt Tracking</span>
              </div>
              <div className="stat-pill">
                <strong>EN / HI / TA</strong>
                <span>Multilingual Speech Output</span>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-visual-label label-left">
              <span>CYAN</span> LEFT HAND
            </div>
            <div className="hero-visual-label label-right">
              RIGHT HAND <span>AMBER</span>
            </div>

            <div className="hero-ring ring-a" />
            <div className="hero-ring ring-b" />

            <DualHandHeroSkeleton />

            <div className="hero-visual-bottom">
              <span>ISL NAMASTE & TWO-HANDED SYNTHESIS</span>
              <span className="mono">0.0 ms SERVER DELAY</span>
            </div>
          </div>
        </section>

        {/* Feature Navigation Bar (Pills to jump to sections cleanly) */}
        <div className="feature-nav-bar section-shell">
          <button
            className={`feature-nav-pill ${activeTab === "detector" ? "active" : ""}`}
            onClick={() => scrollToTab("detector")}
          >
            <Camera size={15} />
            <span>01. Live Detector</span>
          </button>
          <button
            className={`feature-nav-pill ${activeTab === "dictionary" ? "active" : ""}`}
            onClick={() => scrollToTab("dictionary")}
          >
            <BookOpen size={15} />
            <span>02. ISL Dictionary</span>
          </button>
          <button
            className={`feature-nav-pill ${activeTab === "studio" ? "active" : ""}`}
            onClick={() => scrollToTab("studio")}
          >
            <Sparkles size={15} />
            <span>03. AI Sentence Studio</span>
          </button>
          <button
            className={`feature-nav-pill ${activeTab === "trainer" ? "active" : ""}`}
            onClick={() => scrollToTab("trainer")}
          >
            <Brain size={15} />
            <span>04. Model Trainer</span>
          </button>
          <button
            className={`feature-nav-pill ${activeTab === "about" ? "active" : ""}`}
            onClick={() => scrollToTab("about")}
          >
            <ShieldCheck size={15} />
            <span>05. About ISL</span>
          </button>
        </div>

        {/* Section 01: Live Camera Detector & Dual-Hand Recognition */}
        <LiveDetector
          labels={labels}
          classifier={classifierRef.current}
          dataset={dataset}
          activeLang={activeLang}
          onLanguageChange={setActiveLang}
        />

        {/* Section 02: ISL Vocabulary Explorer & Dictionary */}
        <GestureGallery
          labels={labels}
          onAddToken={handleAddTokenFromGallery}
        />

        {/* Section 03: AI Sentence Synthesizer Studio */}
        <SentenceStudio
          labels={labels}
          activeLang={activeLang}
          onLanguageChange={setActiveLang}
        />

        {/* Section 04: In-Browser ISL Neural Network Trainer */}
        <ModelTrainer
          classifier={classifierRef.current}
          dataset={dataset}
          labels={labels}
          onModelTrained={handleModelTrained}
        />

        {/* Section 05: About ISL and Guide */}
        <AboutSection />
      </main>

      {/* Footer without blog or contact */}
      <Footer setActiveTab={(tab) => scrollToTab(tab)} />
    </div>
  );
}
