import { useState } from "react";
import {
  Brain,
  Download,
  Upload,
  Play,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Hand,
  Sparkles,
  BarChart3,
  Layers,
} from "lucide-react";
import { ISLTFClassifier, TrainingResult } from "../utils/islGestureClassifier";
import { ISLLabel } from "./LiveDetector";

interface ModelTrainerProps {
  classifier: ISLTFClassifier;
  dataset: Record<string, number[][]>;
  labels: ISLLabel[];
  onModelTrained: (result: TrainingResult) => void;
}

export function ModelTrainer({
  classifier,
  dataset,
  labels,
  onModelTrained,
}: ModelTrainerProps) {
  const [isTraining, setIsTraining] = useState(false);
  const [epochProgress, setEpochProgress] = useState({ epoch: 0, loss: 0, acc: 0 });
  const [trainingResult, setTrainingResult] = useState<TrainingResult | null>(null);
  const [epochs, setEpochs] = useState(30);
  const [selectedClass, setSelectedClass] = useState(labels[0]?.id || "namaste");
  const [statusMessage, setStatusMessage] = useState(
    classifier.trained
      ? "Pre-trained ISL Neural Network active."
      : "Baseline ISL dataset ready. Click 'Train ISL Model' to train in-browser."
  );

  const sampleCount = Object.values(dataset).reduce((acc, curr) => acc + curr.length, 0);
  const classCount = Object.keys(dataset).length;

  const handleTrain = async () => {
    setIsTraining(true);
    setStatusMessage("Initializing TensorFlow.js WebGL backend & training ISL model…");

    try {
      const activeClassIds = labels.map((l) => l.id);
      const result = await classifier.train(
        dataset,
        activeClassIds,
        epochs,
        (ep, loss, acc) => {
          setEpochProgress({ epoch: ep, loss, acc });
        }
      );

      setTrainingResult(result);
      onModelTrained(result);
      setStatusMessage(
        `Training complete! Overall Validation Accuracy: ${result.overallAccuracy}% across ${result.classes.length} ISL signs.`
      );
    } catch (err: any) {
      console.error(err);
      setStatusMessage(`Training error: ${err.message || "Unknown error"}`);
    } finally {
      setIsTraining(false);
    }
  };

  const handleExport = async () => {
    try {
      const activeClassIds = labels.map((l) => l.id);
      const json = await classifier.exportModel(activeClassIds);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `signspeak-isl-model-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const res = await classifier.importModel(text);
        if (res.success) {
          setStatusMessage(`Model imported successfully with ${res.classes.length} active classes!`);
        }
      } catch (err: any) {
        alert(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <section className="trainer-section section-shell" id="trainer">
      <div className="section-heading-row">
        <div>
          <div className="section-index">04 / IN-BROWSER ISL NEURAL NETWORK TRAINER</div>
          <h2>
            Train Indian Sign Language<br />
            <em>Inside Your Browser.</em>
          </h2>
        </div>
        <p className="section-intro">
          SignSpeak runs a 126-dimensional deep neural network natively using TensorFlow.js with client-side acceleration. You can retrain weights, inspect validation matrices, or export models with zero cloud latency.
        </p>
      </div>

      <div className="trainer-dashboard">
        {/* Left Side: Stats and Training Trigger */}
        <div className="trainer-card">
          <div className="card-top-icon">
            <Brain size={28} className="text-amber-500" />
            <div>
              <h3>ISL Neural Classifier</h3>
              <p>Dual-Hand 126-Dimensional MLP Architecture</p>
            </div>
          </div>

          <div className="trainer-stats-grid">
            <div className="stat-box">
              <small>Trained Classes</small>
              <strong>{classCount}</strong>
            </div>
            <div className="stat-box">
              <small>Total Landmark Samples</small>
              <strong>{sampleCount}</strong>
            </div>
            <div className="stat-box">
              <small>Model Architecture</small>
              <strong style={{ fontSize: 13, marginTop: 4 }}>126 → 160 → 96 → Softmax</strong>
            </div>
            <div className="stat-box">
              <small>Model Status</small>
              <strong className={classifier.trained ? "text-green-400" : "text-amber-400"}>
                {classifier.trained ? "Trained & Active" : "Untrained"}
              </strong>
            </div>
          </div>

          <div className="training-controls">
            <label className="range-label">
              <span>Training Epochs: {epochs}</span>
              <input
                type="range"
                min={15}
                max={60}
                step={5}
                value={epochs}
                disabled={isTraining}
                onChange={(e) => setEpochs(Number(e.target.value))}
              />
            </label>

            <button
              className="button button-primary"
              onClick={handleTrain}
              disabled={isTraining}
              style={{ width: "100%", marginTop: 16 }}
            >
              {isTraining ? (
                <>
                  <RefreshCw size={15} className="animate-spin" /> Training Epoch {epochProgress.epoch} of {epochs}…
                </>
              ) : (
                <>
                  <Play size={15} /> Train ISL Neural Network
                </>
              )}
            </button>
          </div>

          {/* Epoch Progress indicator */}
          {isTraining && (
            <div className="epoch-progress-card">
              <div className="meter-heading">
                <span>Epoch {epochProgress.epoch} / {epochs}</span>
                <span>Loss: {epochProgress.loss.toFixed(4)} | Acc: {(epochProgress.acc * 100).toFixed(1)}%</span>
              </div>
              <div className="meter">
                <span style={{ width: `${(epochProgress.epoch / epochs) * 100}%` }} />
              </div>
            </div>
          )}

          <div className="status-notice">
            <span>{statusMessage}</span>
          </div>

          {/* Export / Import Buttons */}
          <div className="model-io-actions">
            <button
              className="button button-ghost btn-sm"
              onClick={handleExport}
              disabled={!classifier.trained}
            >
              <Download size={13} /> Export Model (.json)
            </button>
            <label className="button button-ghost btn-sm file-upload-label">
              <Upload size={13} /> Import Model
              <input type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />
            </label>
          </div>
        </div>

        {/* Right Side: Validation Results & Per-Class Accuracy */}
        <div className="trainer-card">
          <div className="card-top-icon">
            <BarChart3 size={28} className="text-amber-500" />
            <div>
              <h3>Validation Metrics</h3>
              <p>15% Per-Class Holdout Accuracy & Evaluation</p>
            </div>
          </div>

          {trainingResult ? (
            <div className="validation-report">
              <div className="overall-score-pill">
                <span>OVERALL VALIDATION ACCURACY:</span>
                <strong>{trainingResult.overallAccuracy}%</strong>
              </div>

              <div className="per-class-list-header">
                <span>ISL SIGN</span>
                <span>HANDS</span>
                <span>ACCURACY</span>
              </div>

              <div className="per-class-scroll-list">
                {trainingResult.classes.map((clsId) => {
                  const labelInfo = labels.find((l) => l.id === clsId);
                  const acc = trainingResult.perClassAccuracy[clsId] ?? 100;
                  return (
                    <div key={clsId} className="per-class-row">
                      <span className="class-name">
                        {labelInfo?.emoji || "✋"} {labelInfo?.name || clsId}
                      </span>
                      <span className="class-hands">
                        {labelInfo?.handsRequired === 2 ? "🤲 2 Hands" : "✋ 1 Hand"}
                      </span>
                      <span className={`class-acc ${acc >= 90 ? "text-green-400" : acc >= 75 ? "text-amber-400" : "text-red-400"}`}>
                        {acc}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="empty-trainer-state">
              <Layers size={36} className="text-gray-500" />
              <strong>No Training Session Yet</strong>
              <p>Click "Train ISL Neural Network" to evaluate validation accuracy on the 42 Indian Sign Language classes.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
