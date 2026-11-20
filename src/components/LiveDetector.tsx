import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  Camera,
  CameraOff,
  Copy,
  Check,
  FlipHorizontal,
  Layers,
  Hand,
  Play,
  MessageSquareText,
  Trash2,
  Volume2,
  Globe,
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
  emoji?: string;
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
  tokenQueue?: string[];
  onTokenQueueChange?: Dispatch<SetStateAction<string[]>>;
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
  tokenQueue: externalTokenQueue,
  onTokenQueueChange,
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
  const confidenceThreshold = 70;
  const holdTime = 500;
  const [cameraMessage, setCameraMessage] = useState("Camera is ready. Start when you are.");

  // Sign recognition state
  const [handsDetectedCount, setHandsDetectedCount] = useState(0);
  const [currentGestureId, setCurrentGestureId] = useState<string>("waiting");
  const [currentConfidence, setCurrentConfidence] = useState<number>(0);
  const [candidateGesture, setCandidateGesture] = useState<string>("");
  const candidateGestureRef = useRef<string>("");
  const candidateSinceRef = useRef<number>(0);
  const lastAddedTokenRef = useRef<string>("");
  const [holdProgressPercent, setHoldProgressPercent] = useState<number>(0);

  // Sentence Builder State
  const [internalTokenQueue, setInternalTokenQueue] = useState<string[]>([]);
  const tokenQueue = externalTokenQueue ?? internalTokenQueue;

  const updateTokenQueue = useCallback(
    (updater: string[] | ((previous: string[]) => string[])) => {
      if (onTokenQueueChange) {
        const nextValue =
          typeof updater === "function"
            ? (updater as (previous: string[]) => string[])(externalTokenQueue ?? internalTokenQueue)
            : updater;

        onTokenQueueChange(nextValue);
        return;
      }

      setInternalTokenQueue((previous) =>
        typeof updater === "function" ? updater(previous) : updater
      );
    },
    [externalTokenQueue, internalTokenQueue, onTokenQueueChange]
  );

  const [translatedData, setTranslatedData] = useState<TranslatedResult>(() =>
    synthesizeSentenceInAllLanguages([], activeLang)
  );
  const [editedMessage, setEditedMessage] = useState("");
  const [copied, setCopied] = useState(false);

  // Active label definition
  const activeLabel = labels.find((l) => l.id === currentGestureId) || {
    id: "waiting",
    name: active ? "Detecting hands…" : "Detector Standby",
    output: "",
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
    setEditedMessage(result.activeText);
  }, [tokenQueue, activeLang]);

  // Continuous frame evaluation
  const processFrame = useCallback(
    (hand1?: LandmarkPoint[], hand2?: LandmarkPoint[]) => {
      const now = performance.now();
      const handsCount = (hand1 ? 1 : 0) + (hand2 ? 1 : 0);
      setHandsDetectedCount(handsCount);

      if (handsCount === 0) {
        candidateSinceRef.current = 0;
        candidateGestureRef.current = "";
        lastAddedTokenRef.current = "";
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

        if (candidateGestureRef.current === finalId) {
          const elapsed = now - candidateSinceRef.current;
          const progress = Math.min(100, Math.round((elapsed / holdTime) * 100));
          setHoldProgressPercent(progress);

          // Once held for the required duration, add token in continuous stream
          if (elapsed >= holdTime && lastAddedTokenRef.current !== finalId) {
            lastAddedTokenRef.current = finalId;
            updateTokenQueue((prev) => [...prev, finalId]);
            setHoldProgressPercent(100);
          }
        } else {
          // Gesture transition detected
          candidateGestureRef.current = finalId;
          setCandidateGesture(finalId);
          candidateSinceRef.current = now;
          setHoldProgressPercent(10);
        }
      } else {
        candidateGestureRef.current = "";
        setCandidateGesture("");
        candidateSinceRef.current = 0;
        setCurrentGestureId("waiting");
        setCurrentConfidence(0);
        setHoldProgressPercent(0);
        lastAddedTokenRef.current = "";
      }
    },
    [classifier, confidenceThreshold, dataset, holdTime, labels, updateTokenQueue]
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
    setCameraMessage("Camera is off.");

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
      setCameraMessage("Loading hand tracking…");
      await loadMediaPipeHands();
      setCameraMessage("Pause briefly on each supported sign.");

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
    navigator.clipboard.writeText(editedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    speakText(editedMessage, activeLang);
  };

  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === activeLang) || SUPPORTED_LANGUAGES[0];

  return (
    <section className="detector-section section-shell" id="detector">
      <div className="section-heading-row">
        <div>
            <div className="section-index">01 / LIVE ISL TRANSLATOR</div>
          <h2>
              Translate a sign.<br />
              <em>Review the message.</em>
          </h2>
        </div>
        <div className="detector-top-badges">
          <span className={`status-pill ${active ? "active" : ""}`}>
            <span className={`status-dot ${active ? "status-dot-pulse" : ""}`} />
            {active ? `${handsDetectedCount} Hand(s) Active` : "Camera Standby"}
          </span>
          <span className="badge-calm-teal">Supported sign patterns</span>
        </div>
      </div>

      <div className="detector-console">
        {/* Left Column: Video Feed & Dual-Hand Canvas */}
        <div className="camera-column">
          <div className="camera-toolbar">
            <div className="source-info">
              <span className="mono text-xs text-teal-400 font-medium">
                {active ? "CAMERA ON · HAND TRACKING" : "CAMERA READY"}
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
                <strong>Start with a supported sign</strong>
                <p>Pause briefly on one supported sign at a time to build your message.</p>
              </div>
            )}

            {/* Current possible sign */}
            {active && currentGestureId !== "waiting" && (
              <div className="camera-live-ticker">
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
              <span>EST. MATCH: {currentConfidence}%</span>
            </div>

            <div className="camera-readout camera-readout-bottom">
              <span>{cameraMessage}</span>
              <span>
                {handsDetectedCount === 2
                  ? "2 hands detected"
                  : handsDetectedCount === 1
                  ? "1 hand detected"
                  : "Waiting for hands"}
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

          </div>

            {/* Editable draft message */}
          <div className="sentence-builder-card">
            <div className="builder-header">
              <div className="builder-title">
                <div className="flex items-center gap-2">
                  <MessageSquareText size={16} className="text-teal-400" />
                  <strong>Your message</strong>
                </div>
                <span className="builder-subtitle">
                  Review the message before sharing it.
                </span>
              </div>

              {/* Output language */}
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
                      {lang.nativeName} ({lang.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Gesture Stream Queue */}
            <div className="tokens-stream">
              <span className="stream-label">SIGNS SELECTED</span>
              {tokenQueue.length === 0 ? (
                  <span className="empty-tokens-hint">
                  Recognized signs will appear here.
                </span>
              ) : (
                tokenQueue.map((tok, idx) => {
                  const labelItem = labels.find((l) => l.id === tok);
                  const wordTranslation = MULTILINGUAL_VOCAB[tok]?.[activeLang] || labelItem?.name || tok;
                  return (
                    <span key={`${tok}-${idx}`} className="token-chip">
                      <span className="token-name">{wordTranslation}</span>
                      <button
                        className="token-del"
                        onClick={() => updateTokenQueue((prev) => prev.filter((_, i) => i !== idx))}
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
                  <strong>{currentLangObj.name}</strong>
                  <span className="text-xs text-slate-400">({currentLangObj.nativeName})</span>
                </div>

                <div className="speech-controls-inline">
                  <button
                    className="icon-action-btn"
                    onClick={() => updateTokenQueue([])}
                    title="Clear sentence"
                    disabled={tokenQueue.length === 0}
                  >
                    <Trash2 size={13} /> Clear
                  </button>
                </div>
              </div>

              <div className="sentence-display">
                <textarea
                  className="sentence-text"
                  value={editedMessage}
                  onChange={(event) => setEditedMessage(event.target.value)}
                  aria-label="Edit translated message"
                  rows={2}
                />
                <div className="sentence-meta-actions">
                  <button
                    className="button button-primary btn-speak"
                    onClick={handleSpeak}
                    disabled={!editedMessage.trim() || tokenQueue.length === 0}
                  >
                    <Volume2 size={14} /> Speak
                  </button>
                  <button className="button button-ghost" onClick={handleCopy} disabled={!editedMessage.trim() || tokenQueue.length === 0}>
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Right Column: Telemetry & Controls */}
        <div className="telemetry-column">
          <div className="telemetry-label">
            <span>Current sign</span>
            <span className="mono">Estimated {currentConfidence}% match</span>
          </div>

          <div className="gesture-result">
            <div className="gesture-emoji"><Hand size={26} aria-hidden="true" /></div>
            <div className="gesture-copy">
              <h3>{activeLabel.name}</h3>
              <p>
                {activeLabel.category} · {activeLabel.handsRequired === 2 ? "Two hands" : "One hand"}
              </p>
              <div className="bilingual-badge">
                <span>{MULTILINGUAL_VOCAB[currentGestureId]?.[activeLang] || activeLabel.output}</span>
              </div>
            </div>
          </div>

          {/* Confidence Meter */}
          <div className="confidence-block">
            <div className="meter-heading">
              <span>Estimated pose match</span>
              <strong>{currentConfidence}%</strong>
            </div>
            <div className="meter">
              <span style={{ width: `${currentConfidence}%` }} />
            </div>
            <div className="meter-note">
              <span>Score: {currentConfidence}%</span>
              <span>{currentConfidence >= confidenceThreshold ? "POSSIBLE MATCH" : "LOOKING"}</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
