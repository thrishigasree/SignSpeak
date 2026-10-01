import { useState, useEffect } from "react";
import {
  Sparkles,
  Volume2,
  Copy,
  Check,
  Trash2,
  Plus,
  RefreshCw,
  Brain,
  Key,
  Globe,
} from "lucide-react";
import { ISLLabel } from "./LiveDetector";
import {
  SUPPORTED_LANGUAGES,
  synthesizeSentenceInAllLanguages,
  enhanceSentenceWithAI,
  speakText,
  TranslatedResult,
} from "../utils/sentenceSynthesizer";

interface SentenceStudioProps {
  labels: ISLLabel[];
  initialTokens?: string[];
  activeLang: string;
  onLanguageChange: (lang: string) => void;
}

const PRESET_SCENARIOS = [
  {
    title: "Hospital & Medical Need",
    description: "Emergency medical call for doctor assistance",
    tokens: ["emergency", "pain", "doctor", "help"],
    badge: "Emergency",
  },
  {
    title: "Respectful Greeting",
    description: "Greeting a guest or partner in Indian tradition",
    tokens: ["namaste", "how", "you", "nice_to_meet_you"],
    badge: "Greeting",
  },
  {
    title: "Requesting Water / Food",
    description: "Expressing thirst and hunger politely",
    tokens: ["i_me", "water", "thirsty", "please"],
    badge: "Daily Need",
  },
  {
    title: "Inviting a Friend Home",
    description: "Social invitation to visit one's house",
    tokens: ["you", "come", "house", "friend"],
    badge: "Social",
  },
  {
    title: "Asking for Restroom",
    description: "Asking for directions to the washroom",
    tokens: ["where", "bathroom", "please"],
    badge: "Directions",
  },
  {
    title: "Time & Inquiries",
    description: "Inquiring about current time",
    tokens: ["what", "time"],
    badge: "General",
  },
];

export function SentenceStudio({
  labels,
  initialTokens,
  activeLang,
  onLanguageChange,
}: SentenceStudioProps) {
  const [tokens, setTokens] = useState<string[]>(initialTokens || ["namaste", "how", "you"]);
  const [result, setResult] = useState<TranslatedResult>(() =>
    synthesizeSentenceInAllLanguages(initialTokens || ["namaste", "how", "you"], activeLang)
  );

  // AI State
  const [apiKey, setApiKey] = useState("");
  const [aiTone, setAiTone] = useState<"polite" | "casual" | "emergency" | "simple">("polite");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Re-synthesize immediately when tokens or language changes
  useEffect(() => {
    const instant = synthesizeSentenceInAllLanguages(tokens, activeLang);
    setResult(instant);
  }, [tokens, activeLang]);

  const handleAddToken = (id: string) => {
    setTokens((prev) => [...prev, id]);
  };

  const handleRemoveToken = (index: number) => {
    setTokens((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClear = () => {
    setTokens([]);
  };

  const handleApplyPreset = (presetTokens: string[]) => {
    setTokens(presetTokens);
  };

  const handleSpeak = (text: string, langCode: string) => {
    speakText(text, langCode);
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const handleAiRefine = async () => {
    if (!tokens.length) return;
    setIsAiLoading(true);
    try {
      const enhanced = await enhanceSentenceWithAI(tokens, apiKey, aiTone, activeLang);
      setResult(enhanced);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <section className="studio-section section-shell" id="studio">
      <div className="section-heading-row">
        <div>
          <div className="section-index">03 / AI SENTENCE SYNTHESIZER STUDIO</div>
          <h2>
            From Gesture Tokens<br />
            <em>to Natural Sentences.</em>
          </h2>
        </div>
        <p className="section-intro">
          Test continuous sign combinations and observe immediate sentence formation in any language with optional Google Gemini Generative AI enhancement.
        </p>
      </div>

      {/* Preset Dialogue Scenarios */}
      <div className="presets-block">
        <span className="mono text-xs text-teal-400">POPULAR ISL CONVERSATION SCENARIOS:</span>
        <div className="presets-grid">
          {PRESET_SCENARIOS.map((preset) => (
            <button
              key={preset.title}
              className="preset-card"
              onClick={() => handleApplyPreset(preset.tokens)}
            >
              <div className="preset-card-top">
                <strong>{preset.title}</strong>
                <span className="preset-badge">{preset.badge}</span>
              </div>
              <p>{preset.description}</p>
              <div className="preset-tokens">
                {preset.tokens.map((t) => (
                  <span key={t} className="preset-tok-chip">
                    {labels.find((l) => l.id === t)?.emoji || "✋"} {t}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="studio-workbench">
        {/* Left Side: Active Token Sequence & Token Palette */}
        <div className="studio-tokens-pane">
          <div className="pane-header">
            <strong>Active Sign Sequence ({tokens.length} words)</strong>
            <button className="button button-ghost btn-sm" onClick={handleClear} disabled={tokens.length === 0}>
              <Trash2 size={13} /> Clear
            </button>
          </div>

          <div className="active-tokens-area">
            {tokens.length === 0 ? (
              <div className="empty-studio-hint">
                <Sparkles size={24} className="text-teal-400" />
                <p>Click any sign below to assemble a sentence sequence.</p>
              </div>
            ) : (
              tokens.map((tok, idx) => {
                const info = labels.find((l) => l.id === tok);
                return (
                  <div key={`${tok}-${idx}`} className="studio-token-bubble">
                    <span className="tok-num">{idx + 1}</span>
                    <span className="tok-emoji">{info?.emoji || "✋"}</span>
                    <div className="tok-details">
                      <strong>{info?.name || tok}</strong>
                      <small>{info?.handsRequired === 2 ? "🤲 2 Hands" : "✋ 1 Hand"}</small>
                    </div>
                    <button
                      className="tok-remove-btn"
                      onClick={() => handleRemoveToken(idx)}
                      title="Remove token"
                    >
                      ×
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Add Gestures Palette */}
          <div className="token-palette-header">
            <span className="mono text-xs text-slate-400">ADD SIGNS TO SEQUENCE:</span>
          </div>
          <div className="token-palette-chips">
            {labels.map((item) => (
              <button
                key={item.id}
                className="palette-chip"
                onClick={() => handleAddToken(item.id)}
              >
                <span>{item.emoji}</span>
                <span>{item.name}</span>
                <Plus size={12} className="opacity-60" />
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Multilingual Sentence Synthesis & AI Enhancer */}
        <div className="studio-output-pane">
          <div className="pane-header">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-teal-400" />
              <strong>Synthesized Natural Sentences</strong>
            </div>

            {/* Language Selector */}
            <div className="lang-picker-wrap">
              <Globe size={13} className="text-teal-400" />
              <select
                className="global-lang-dropdown"
                value={activeLang}
                onChange={(e) => onLanguageChange(e.target.value)}
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="output-cards-stack">
            {/* Primary Selected Language Card */}
            {(() => {
              const langInfo = SUPPORTED_LANGUAGES.find((l) => l.code === activeLang) || SUPPORTED_LANGUAGES[0];
              const text = result.translations[activeLang] || result.activeText;
              return (
                <div className="output-language-card primary-focus">
                  <div className="card-lang-header">
                    <span className="lang-tag">
                      {langInfo.flag} {langInfo.name.toUpperCase()} ({langInfo.nativeName})
                    </span>
                    <div className="lang-actions">
                      <button
                        className="icon-action-btn"
                        onClick={() => handleSpeak(text, activeLang)}
                        title={`Speak in ${langInfo.name}`}
                      >
                        <Volume2 size={15} />
                      </button>
                      <button
                        className="icon-action-btn"
                        onClick={() => handleCopy(text, activeLang)}
                        title="Copy sentence"
                      >
                        {copiedField === activeLang ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                      </button>
                    </div>
                  </div>
                  <p className="card-sentence-text">{text}</p>
                </div>
              );
            })()}

            {/* Other Key Languages (English, Hindi, Tamil, Telugu, Spanish) */}
            {SUPPORTED_LANGUAGES.filter((l) => l.code !== activeLang).slice(0, 4).map((lang) => {
              const text = result.translations[lang.code] || "";
              return (
                <div key={lang.code} className="output-language-card">
                  <div className="card-lang-header">
                    <span className="lang-tag">
                      {lang.flag} {lang.name.toUpperCase()} ({lang.nativeName})
                    </span>
                    <div className="lang-actions">
                      <button
                        className="icon-action-btn"
                        onClick={() => handleSpeak(text, lang.code)}
                        title={`Speak in ${lang.name}`}
                      >
                        <Volume2 size={15} />
                      </button>
                      <button
                        className="icon-action-btn"
                        onClick={() => handleCopy(text, lang.code)}
                        title="Copy sentence"
                      >
                        {copiedField === lang.code ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                      </button>
                    </div>
                  </div>
                  <p className="card-sentence-text">{text}</p>
                </div>
              );
            })}
          </div>

          {/* AI / LLM Contextual Expansion Box */}
          <div className="ai-expansion-box">
            <div className="ai-box-title">
              <Brain size={16} className="text-teal-400" />
              <strong>Generative AI / LLM Contextual Polisher</strong>
            </div>
            <p className="text-xs text-slate-400" style={{ margin: "4px 0 12px" }}>
              The local grammar engine translates instantly. Optionally enter a Google Gemini API key to refine tone and conversational polish.
            </p>

            <div className="ai-controls-grid">
              <div className="api-input-wrap">
                <Key size={14} className="text-slate-400" />
                <input
                  type="password"
                  placeholder="Optional Gemini API Key (AI Studio)"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>

              <select
                className="tone-select"
                value={aiTone}
                onChange={(e) => setAiTone(e.target.value as any)}
              >
                <option value="polite">Polite & Respectful</option>
                <option value="casual">Casual / Friendly</option>
                <option value="emergency">Urgent / Emergency</option>
                <option value="simple">Simple & Direct</option>
              </select>

              <button
                className="button button-primary"
                onClick={handleAiRefine}
                disabled={isAiLoading || tokens.length === 0}
              >
                {isAiLoading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Polishing…
                  </>
                ) : (
                  <>
                    <Sparkles size={14} /> Refine with AI
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
