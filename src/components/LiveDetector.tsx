import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  Copy,
  Check,
  FlipHorizontal,
  Hand,
  Layers,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  Globe,
  Radio,
  Clock,
  ArrowRight,
} from "lucide-react";
import { LandmarkPoint, normalizeTwoHands, ISLTFClassifier, knnPredictISL } from "../utils/islGestureClassifier";
import { classifyISLRules } from "../utils/islRules";
import {
  SUPPORTED_LANGUAGES,
  synthesizeSentenceInAllLanguages,
  speakText,
  TranslatedResult,
  MULTILINGUAL_VOCAB,
} from "../utils/sentenceSynthesizer";

export type ISLLabel = {
  id: string;
  name: string;
  output: string;
  emoji: string;
  category: string;
  handsRequired: number;
  hindi: string;
  tamil: string;
  description: string;
  poseGuide?: string;
};

interface LiveDetectorProps {
  labels: ISLLabel[];
  classifier: ISLTFClassifier;
  dataset: Record<string, number[][]>;
  activeLang: string;
  onLanguageChange: (lang: string) => void;
}

const HAND_BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
] as const;

export function LiveDetector({
  labels,
  classifier,
  dataset,
  activeLang,
  onLanguageChange,
}: LiveDetectorProps) {
  // Video and canvas refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handsRef = useRef<any>(null);
  const frameRef = useRef<number | null>(null);

  // Core detection state
  const [active, setActive] = useState(false);
  const [mirrorVideo, setMirrorVideo] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(65);
  const [holdTime, setHoldTime] = useState(320); // Faster, snappier continuous detection (320ms)
  const [continuousMode, setContinuousMode] = useState(true);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [cameraMessage, setCameraMessage] = useState("Camera ready. Click 'Start Camera' to begin.");

  // Telemetry & Continuous Recognition
  const [handsDetectedCount, setHandsDetectedCount] = useState(0);
  const [currentGestureId, setCurrentGestureId] = useState<string>("waiting");
  const [currentConfidence, setCurrentConfidence] = useState<number>(0);
  const [candidateGesture, setCandidateGesture] = useState<string>("");
  const candidateSinceRef = useRef<number>(0);
  const lastAddedTokenRef = useRef<string>("");
  const holdProgressRef = useRef<number>(0);
  const [holdProgressPercent, setHoldProgressPercent] = useState<number>(0);

  // Sentence Builder State
  const [tokenQueue, setTokenQueue] = useState<string[]>([]);
  const [translatedData, setTranslatedData] = useState<TranslatedResult>(() =>
    synthesizeSentenceInAllLanguages([], activeLang)
  );
  const [copied, setCopied] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);

  // Active label definition
  const activeLabel = labels.find((l) => l.id === currentGestureId) || {
    id: "waiting",
    name: active ? "Detecting hands…" : "Detector Standby",
    output: "",
    emoji: active ? "✨" : "💤",
    category: "Standby",
    handsRequired: 1,
    hindi: "प्रतीक्षा",
    tamil: "காத்திருக்கிறது",
    description: "Hold one or both hands in front of the camera.",
  };

  // Re-synthesize immediately when tokens or language change
  useEffect(() => {
    const result = synthesizeSentenceInAllLanguages(tokenQueue, activeLang);
    setTranslatedData(result);

    // Speak continuous translation if enabled
    if (autoSpeak && tokenQueue.length > 0) {
      speakText(result.activeText, activeLang, speechRate);
    }
  }, [tokenQueue, activeLang, autoSpeak, speechRate]);

  // Continuous frame evaluation
  const processFrame = useCallback(
    (hand1?: LandmarkPoint[], hand2?: LandmarkPoint[]) => {
      const now = performance.now();
      const handsCount = (hand1 ? 1 : 0) + (hand2 ? 1 : 0);
      setHandsDetectedCount(handsCount);

      if (handsCount === 0) {
        candidateSinceRef.current = 0;
        setCandidateGesture("");
        setCurrentGestureId("waiting");
        setCurrentConfidence(0);
        setHoldProgressPercent(0);
        return;
      }

      // 1. Geometric ISL Rules Check (two-hand and single-hand)
      const ruleResult = classifyISLRules({ hand1, hand2 });
      let finalId = ruleResult.id;
      let finalConf = ruleResult.confidence;

      // 2. Machine Learning Classifier Fallback
      if (finalId === "no_match" || finalConf < 70) {
        const featureVector = normalizeTwoHands(hand1, hand2);
        const activeClassIds = labels.map((l) => l.id);

        if (classifier.trained) {
          const tfResult = classifier.predict(featureVector, activeClassIds);
          if (tfResult.confidence > finalConf) {
            finalId = tfResult.id;
            finalConf = tfResult.confidence;
          }
        } else if (Object.keys(dataset).length > 0) {
          const knnResult = knnPredictISL(featureVector, dataset, 4);
          if (knnResult.confidence > finalConf) {
            finalId = knnResult.id;
            finalConf = knnResult.confidence;
          }
        }
      }

      // Check threshold and manage continuous gesture queue
      if (finalId !== "no_match" && finalConf >= confidenceThreshold) {
        setCurrentGestureId(finalId);
        setCurrentConfidence(finalConf);

        if (candidateGesture === finalId) {
          const elapsed = now - candidateSinceRef.current;
          const progress = Math.min(100, Math.round((elapsed / holdTime) * 100));
          setHoldProgressPercent(progress);

          // Once held for the required duration, add token in continuous stream
          if (elapsed >= holdTime && lastAddedTokenRef.current !== finalId) {
            lastAddedTokenRef.current = finalId;
            setTokenQueue((prev) => [...prev, finalId]);
            setHoldProgressPercent(100);
          }
        } else {
          // Gesture transition detected
          setCandidateGesture(finalId);
          candidateSinceRef.current = now;
          setHoldProgressPercent(10);
        }
      } else {
        setCandidateGesture("");
        candidateSinceRef.current = 0;
        setCurrentGestureId("waiting");
        setCurrentConfidence(0);
        setHoldProgressPercent(0);
        lastAddedTokenRef.current = "";
      }
    },
    [candidateGesture, classifier, confidenceThreshold, dataset, holdTime, labels]
  );

  // MediaPipe Results
  const onResults = useCallback(
    (results: any) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      const multiHands = results.multiHandLandmarks || [];
      const hand1 = multiHands[0] as LandmarkPoint[] | undefined;
      const hand2 = multiHands[1] as LandmarkPoint[] | undefined;

      // Draw aesthetic skeleton overlays for both hands
      if (showSkeleton && multiHands.length > 0) {
        ctx.save();
        if (mirrorVideo) {
          ctx.translate(width, 0);
          ctx.scale(-1, 1);
        }

        multiHands.forEach((hand: LandmarkPoint[], index: number) => {
          const isPrimary = index === 0;
          // Calming aesthetic neon colors: Calm Mint/Teal (#2dd4bf) & Soft Rose/Amber (#fb923c)
          const boneColor = isPrimary ? "#2dd4bf" : "#f472b6";
          const jointColor = isPrimary ? "#ccfbf1" : "#fdf2f8";

          ctx.strokeStyle = boneColor;
          ctx.fillStyle = jointColor;
          ctx.lineWidth = Math.max(2.5, width / 260);

          HAND_BONES.forEach(([from, to]) => {
            const p1 = hand[from];
            const p2 = hand[to];
            if (p1 && p2) {
              ctx.beginPath();
              ctx.moveTo(p1.x * width, p1.y * height);
              ctx.lineTo(p2.x * width, p2.y * height);
              ctx.stroke();
            }
          });

          hand.forEach((p, idx) => {
            ctx.beginPath();
            ctx.arc(p.x * width, p.y * height, idx === 0 ? 5 : 3.2, 0, Math.PI * 2);
            ctx.fill();
          });
        });

        // Inter-hand connection line when 2 hands are interacting
        if (hand1 && hand2 && hand1[0] && hand2[0]) {
          ctx.beginPath();
          ctx.strokeStyle = "rgba(167, 139, 250, 0.45)"; // Soft lavender glow
          ctx.setLineDash([4, 4]);
          ctx.moveTo(hand1[0].x * width, hand1[0].y * height);
          ctx.lineTo(hand2[0].x * width, hand2[0].y * height);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.restore();
      }

      processFrame(hand1, hand2);
    },
    [mirrorVideo, processFrame, showSkeleton]
  );

  // Initialize MediaPipe Hands (with maxNumHands: 2)
  const loadMediaPipeHands = useCallback(async () => {
    if (handsRef.current) return handsRef.current;

    await new Promise<void>((resolve, reject) => {
      if ((window as any).Hands) return resolve();
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load MediaPipe Hands"));
      document.head.appendChild(script);
    });

    const Hands = (window as any).Hands;
    const hands = new Hands({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    hands.onResults(onResults);
    handsRef.current = hands;
    return hands;
  }, [onResults]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    handsRef.current?.close?.();
    handsRef.current = null;

    setActive(false);
    setHandsDetectedCount(0);
    setCurrentGestureId("waiting");
    setCurrentConfidence(0);
    setHoldProgressPercent(0);
    setCameraMessage("Camera resting. Click 'Start Camera' to resume.");

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraMessage("Camera access is not supported by your browser.");
      return;
    }

    try {
      setCameraMessage("Connecting to camera…");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }

      setActive(true);
      setCameraMessage("Activating Dual-Hand Neural Tracker…");
      await loadMediaPipeHands();
      setCameraMessage("Continuous translation active. Sign naturally with 1 or 2 hands.");

      const detect = async () => {
        if (!videoRef.current || !handsRef.current) return;
        await handsRef.current.send({ image: videoRef.current });
        frameRef.current = window.requestAnimationFrame(detect);
      };
      detect();
    } catch (err: any) {
      console.error(err);
      setCameraMessage("Camera permission required. Please allow access and retry.");
    }
  }, [loadMediaPipeHands]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleCopy = () => {
    navigator.clipboard.writeText(translatedData.activeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    speakText(translatedData.activeText, activeLang, speechRate);
  };

  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === activeLang) || SUPPORTED_LANGUAGES[0];

  return (
    <section className="detector-section section-shell" id="detector">
      <div className="section-heading-row">
        <div>
          <div className="section-index">01 / CONTINUOUS TRANSLATOR</div>
          <h2>
            Continuous Gesture<br />
            <em>to Spoken Sentences.</em>
          </h2>
        </div>
        <div className="detector-top-badges">
          <span className={`status-pill ${active ? "active" : ""}`}>
            <span className={`status-dot ${active ? "status-dot-pulse" : ""}`} />
            {active ? `${handsDetectedCount} Hand(s) Active` : "Camera Standby"}
          </span>
          <span className="badge-calm-teal">Continuous Real-Time Engine</span>
        </div>
      </div>

      <div className="detector-console">
        {/* Left Column: Video Feed & Dual-Hand Canvas */}
        <div className="camera-column">
          <div className="camera-toolbar">
            <div className="source-info">
              <span className="mono text-xs text-teal-400 font-medium">
                {active ? "DUAL-HAND TRACKING · 42 LANDMARKS" : "FEED: READY"}
              </span>
            </div>
            <div className="camera-toggles">
              <button
                className={`toggle-btn ${mirrorVideo ? "active" : ""}`}
                onClick={() => setMirrorVideo(!mirrorVideo)}
                title="Mirror Video"
              >
                <FlipHorizontal size={13} /> Mirror
              </button>
              <button
                className={`toggle-btn ${showSkeleton ? "active" : ""}`}
                onClick={() => setShowSkeleton(!showSkeleton)}
                title="Show Skeleton"
              >
                <Layers size={13} /> Skeleton
              </button>
            </div>
          </div>

          <div className="camera-frame">
            <video
              ref={videoRef}
              className={`camera-video ${active ? "active" : ""}`}
              playsInline
              muted
              style={{ transform: mirrorVideo ? "scaleX(-1)" : "none" }}
            />
            <canvas ref={canvasRef} className="camera-canvas" />

            {!active && (
              <div className="camera-idle">
                <div className="idle-glow-icon">
                  <Camera size={38} className="text-teal-400" />
                </div>
                <strong>Dual-Hand ISL Camera Tracker</strong>
                <p>Sign continuously with one or two hands for real-time sentence translation</p>
                <button className="button button-primary" onClick={startCamera}>
                  <Play size={15} /> Start Camera
                </button>
              </div>
            )}

            {/* Live Real-time Continuous Recognition Overlay Banner */}
            {active && currentGestureId !== "waiting" && (
              <div className="camera-live-ticker">
                <span className="live-ticker-emoji">{activeLabel.emoji}</span>
                <div className="live-ticker-info">
                  <strong>{activeLabel.name}</strong>
                  <span>{MULTILINGUAL_VOCAB[currentGestureId]?.[activeLang] || activeLabel.output}</span>
                </div>
                <div className="live-ticker-meter">
                  <div
                    className="live-ticker-bar"
                    style={{ width: `${holdProgressPercent}%` }}
                  />
                </div>
              </div>
            )}

            <div className="camera-readout camera-readout-top">
              <span>SIGNSPEAK ISL</span>
              <span>CONF: {currentConfidence}%</span>
            </div>

            <div className="camera-readout camera-readout-bottom">
              <span>{cameraMessage}</span>
              <span>
                {handsDetectedCount === 2
                  ? "2 HANDS [TEAL+ROSE]"
                  : handsDetectedCount === 1
                  ? "1 HAND [TEAL]"
                  : "WAITING FOR HANDS"}
              </span>
            </div>
          </div>

          <div className="camera-actions">
            {active ? (
              <button className="button button-ghost" onClick={stopCamera}>
                <CameraOff size={15} /> Stop Camera
              </button>
            ) : (
              <button className="button button-primary" onClick={startCamera}>
                <Play size={15} /> Start Camera
              </button>
            )}

            {/* Hold progress bar */}
            {candidateGesture && candidateGesture !== "waiting" && (
              <div className="candidate-hold-pill">
                <span>Locking: <strong>{candidateGesture}</strong></span>
                <div className="hold-progress-mini">
                  <div style={{ width: `${holdProgressPercent}%` }} />
                </div>
              </div>
            )}

            <button
              className={`continuous-toggle-btn ${continuousMode ? "active" : ""}`}
              onClick={() => setContinuousMode(!continuousMode)}
              title="Continuous live translation"
            >
              <Radio size={13} className={continuousMode ? "text-teal-400 animate-pulse" : ""} />
              <span>Continuous: {continuousMode ? "ON" : "OFF"}</span>
            </button>
          </div>

          {/* Interactive Sentence Builder Bar with Any Language Selection */}
          <div className="sentence-builder-card">
            <div className="builder-header">
              <div className="builder-title">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-teal-400" />
                  <strong>Live Sentence Translation</strong>
                </div>
                <span className="builder-subtitle">
                  Continuously converts accumulated gestures into fluent conversational sentences
                </span>
              </div>

              {/* Any Language Selector Dropdown */}
              <div className="lang-picker-wrap">
                <Globe size={14} className="text-teal-400" />
                <select
                  className="global-lang-dropdown"
                  value={activeLang}
                  onChange={(e) => onLanguageChange(e.target.value)}
                  aria-label="Select output translation language"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name} ({lang.nativeName})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Gesture Stream Queue */}
            <div className="tokens-stream">
              <span className="stream-label">GESTURE STREAM:</span>
              {tokenQueue.length === 0 ? (
                <span className="empty-tokens-hint">
                  Continuous mode active — show gestures to form full sentences…
                </span>
              ) : (
                tokenQueue.map((tok, idx) => {
                  const labelItem = labels.find((l) => l.id === tok);
                  const wordTranslation = MULTILINGUAL_VOCAB[tok]?.[activeLang] || labelItem?.name || tok;
                  return (
                    <span key={`${tok}-${idx}`} className="token-chip">
                      <span className="token-emoji">{labelItem?.emoji || "✋"}</span>
                      <span className="token-name">{wordTranslation}</span>
                      <button
                        className="token-del"
                        onClick={() => setTokenQueue((prev) => prev.filter((_, i) => i !== idx))}
                        aria-label={`Remove ${tok}`}
                      >
                        ×
                      </button>
                    </span>
                  );
                })
              )}
            </div>

            {/* Synthesized Natural Sentence Display */}
            <div className="translated-sentence-box">
              <div className="lang-selector-row">
                <div className="active-lang-badge">
                  <span>{currentLangObj.flag}</span>
                  <strong>{currentLangObj.name}</strong>
                  <span className="text-xs text-slate-400">({currentLangObj.nativeName})</span>
                </div>

                <div className="speech-controls-inline">
                  <button
                    className={`auto-speak-pill ${autoSpeak ? "active" : ""}`}
                    onClick={() => setAutoSpeak(!autoSpeak)}
                    title="Auto-speak sentences"
                  >
                    {autoSpeak ? <Volume2 size={13} /> : <VolumeX size={13} />}
                    <span>Auto-Voice: {autoSpeak ? "ON" : "OFF"}</span>
                  </button>
                  <button
                    className="icon-action-btn"
                    onClick={() => setTokenQueue([])}
                    title="Clear sentence"
                    disabled={tokenQueue.length === 0}
                  >
                    <Trash2 size={13} /> Clear
                  </button>
                </div>
              </div>

              <div className="sentence-display">
                <p className="sentence-text">{translatedData.activeText}</p>
                <div className="sentence-meta-actions">
                  <button
                    className="button button-primary btn-speak"
                    onClick={handleSpeak}
                    disabled={tokenQueue.length === 0}
                  >
                    <Volume2 size={14} /> Speak
                  </button>
                  <button className="button button-ghost" onClick={handleCopy}>
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Multilingual Quick View Cards */}
              {tokenQueue.length > 0 && (
                <div className="multilingual-preview-grid">
                  {SUPPORTED_LANGUAGES.slice(0, 4).map((lang) => (
                    <div
                      key={lang.code}
                      className={`preview-item ${activeLang === lang.code ? "highlight" : ""}`}
                      onClick={() => onLanguageChange(lang.code)}
                      style={{ cursor: "pointer" }}
                    >
                      <small>{lang.flag} {lang.name}</small>
                      <p>{translatedData.translations[lang.code] || ""}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Telemetry & Controls */}
        <div className="telemetry-column">
          <div className="telemetry-label">
            <span>REAL-TIME RECOGNITION</span>
            <span className="mono">{currentConfidence}% MATCH</span>
          </div>

          <div className="gesture-result">
            <div className="gesture-emoji">{activeLabel.emoji}</div>
            <div className="gesture-copy">
              <h3>{activeLabel.name}</h3>
              <p>
                {activeLabel.category} · {activeLabel.handsRequired === 2 ? "🤲 2 Hands" : "✋ 1 Hand"}
              </p>
              <div className="bilingual-badge">
                <span>{MULTILINGUAL_VOCAB[currentGestureId]?.[activeLang] || activeLabel.output}</span>
              </div>
            </div>
          </div>

          {/* Confidence Meter */}
          <div className="confidence-block">
            <div className="meter-heading">
              <span>Confidence Threshold</span>
              <strong>{confidenceThreshold}%</strong>
            </div>
            <div className="meter">
              <span style={{ width: `${currentConfidence}%` }} />
            </div>
            <div className="meter-note">
              <span>Score: {currentConfidence}%</span>
              <span>{currentConfidence >= confidenceThreshold ? "RECOGNIZED" : "SCANNING"}</span>
            </div>
          </div>

          {/* Calibration Sliders */}
          <div className="control-block">
            <div className="control-heading">
              <Sliders size={14} />
              <strong>Continuous Translation Settings</strong>
            </div>

            <label className="range-label">
              <span>Hold Stability Time: {holdTime}ms</span>
              <input
                type="range"
                min={200}
                max={700}
                step={25}
                value={holdTime}
                onChange={(e) => setHoldTime(Number(e.target.value))}
              />
            </label>

            <label className="range-label">
              <span>Sensitivity Threshold: {confidenceThreshold}%</span>
              <input
                type="range"
                min={50}
                max={90}
                step={5}
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
              />
            </label>

            <label className="range-label">
              <span>Voice Speech Rate: {speechRate}x</span>
              <input
                type="range"
                min={0.8}
                max={1.3}
                step={0.1}
                value={speechRate}
                onChange={(e) => setSpeechRate(Number(e.target.value))}
              />
            </label>
          </div>

          {/* Quick Sign Pose Guide */}
          <div className="pose-tip-card">
            <strong>
              <Hand size={14} className="text-teal-400" /> Pose Guide
            </strong>
            <p>{activeLabel.poseGuide || activeLabel.description}</p>
          </div>

          {/* Quick Token Test Palette */}
          <div className="quick-token-adder">
            <span className="mono text-xs text-slate-400">QUICK TEST TOKENS:</span>
            <div className="quick-tokens-chips">
              {["namaste", "help", "water", "food", "where", "hospital", "time", "thank_you"].map((id) => (
                <button
                  key={id}
                  className="quick-chip"
                  onClick={() => setTokenQueue((prev) => [...prev, id])}
                >
                  +{labels.find((l) => l.id === id)?.name.split(" ")[0] || id}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
