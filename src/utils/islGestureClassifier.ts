// Dual-Hand Indian Sign Language (ISL) Classifier: Normalization, TensorFlow.js & kNN

export type LandmarkPoint = { x: number; y: number; z?: number };

export type ISLHandLandmarks = {
  hand1?: LandmarkPoint[]; // 21 landmarks
  hand2?: LandmarkPoint[]; // 21 landmarks
};

/**
 * Normalizes a single 21-point hand relative to its wrist.
 * Returns a 63-element scale-invariant vector.
 */
export function normalizeSingleHand(points?: LandmarkPoint[]): number[] {
  if (!points || points.length < 21) {
    return new Array(63).fill(0);
  }

  const wrist = points[0];
  const wx = wrist.x;
  const wy = wrist.y;
  const wz = wrist.z || 0;

  const relPoints: number[] = [];
  let maxDist = 0;

  for (let i = 0; i < 21; i++) {
    const p = points[i] || wrist;
    const dx = p.x - wx;
    const dy = p.y - wy;
    const dz = (p.z || 0) - wz;
    relPoints.push(dx, dy, dz);
    const dist = Math.hypot(dx, dy, dz);
    if (dist > maxDist) maxDist = dist;
  }

  const scale = maxDist > 1e-6 ? maxDist : 1.0;
  return relPoints.map((val) => val / scale);
}

/**
 * Normalizes two hands into a 126-dimensional vector:
 * [0..62]   = Hand 1 (wrist-relative, scale invariant)
 * [63..125] = Hand 2 (wrist-relative, scale invariant)
 * If only one hand is present, Hand 2 is filled with 0s.
 */
export function normalizeTwoHands(
  hand1?: LandmarkPoint[],
  hand2?: LandmarkPoint[]
): number[] {
  const vec1 = normalizeSingleHand(hand1);
  const vec2 = normalizeSingleHand(hand2);

  // If hand2 is missing, vector length is still 126
  return [...vec1, ...vec2];
}

// Dynamically load TensorFlow.js from CDN if not already loaded
let tfPromise: Promise<any> | null = null;
export function loadTensorFlowJS(): Promise<any> {
  if ((window as any).tf) return Promise.resolve((window as any).tf);
  if (tfPromise) return tfPromise;

  tfPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js";
    script.async = true;
    script.onload = () => resolve((window as any).tf);
    script.onerror = () => {
      tfPromise = null;
      reject(new Error("TensorFlow.js failed to load from CDN"));
    };
    document.head.appendChild(script);
  });

  return tfPromise;
}

export type TrainingResult = {
  overallAccuracy: number;
  valSamplesCount: number;
  perClassAccuracy: Record<string, number>;
  confusionMatrix: number[][];
  classes: string[];
};

export class ISLTFClassifier {
  private model: any = null;
  private isTrained = false;
  private inputDim = 126;

  public get trained(): boolean {
    return this.isTrained;
  }

  /**
   * Train dual-hand neural network on dataset in browser.
   * Dataset structure: { labelId: number[][] (samples of 126-element vectors) }
   */
  async train(
    dataset: Record<string, number[][]>,
    labelIds: string[],
    epochs = 35,
    onProgress?: (epoch: number, loss: number, acc: number) => void
  ): Promise<TrainingResult> {
    const tf = await loadTensorFlowJS();
    if (!tf) throw new Error("TensorFlow.js not available");

    const activeClasses = labelIds.filter((id) => dataset[id] && dataset[id].length > 0);
    if (activeClasses.length < 2) {
      throw new Error("At least 2 trained classes with recorded samples are required to train");
    }

    const trainXRaw: number[][] = [];
    const trainYRaw: number[] = [];
    const valXRaw: number[][] = [];
    const valYRaw: number[] = [];

    // 85% Train / 15% Validation split
    activeClasses.forEach((labelId, classIdx) => {
      const samples = dataset[labelId] || [];
      const shuffled = [...samples].sort(() => Math.random() - 0.5);
      const splitIdx = Math.max(1, Math.floor(shuffled.length * 0.85));

      const trainSamples = shuffled.slice(0, splitIdx);
      const valSamples = shuffled.slice(splitIdx);

      trainSamples.forEach((vec) => {
        // Ensure 126 dims
        const padded = vec.length === 126 ? vec : [...vec, ...new Array(Math.max(0, 126 - vec.length)).fill(0)].slice(0, 126);
        trainXRaw.push(padded);
        trainYRaw.push(classIdx);
      });

      const valList = valSamples.length > 0 ? valSamples : trainSamples.slice(-1);
      valList.forEach((vec) => {
        const padded = vec.length === 126 ? vec : [...vec, ...new Array(Math.max(0, 126 - vec.length)).fill(0)].slice(0, 126);
        valXRaw.push(padded);
        valYRaw.push(classIdx);
      });
    });

    const numClasses = activeClasses.length;
    const xs = tf.tensor2d(trainXRaw, [trainXRaw.length, this.inputDim]);
    const ys = tf.oneHot(tf.tensor1d(trainYRaw, "int32"), numClasses);

    if (this.model) {
      this.model.dispose();
    }

    const model = tf.sequential();
    model.add(
      tf.layers.dense({
        inputShape: [this.inputDim],
        units: 160,
        activation: "relu",
        kernelInitializer: "glorotNormal",
      })
    );
    model.add(tf.layers.dropout({ rate: 0.2 }));
    model.add(
      tf.layers.dense({
        units: 96,
        activation: "relu",
      })
    );
    model.add(tf.layers.dropout({ rate: 0.15 }));
    model.add(
      tf.layers.dense({
        units: numClasses,
        activation: "softmax",
      })
    );

    model.compile({
      optimizer: tf.train.adam(0.003),
      loss: "categoricalCrossentropy",
      metrics: ["accuracy"],
    });

    await model.fit(xs, ys, {
      epochs,
      batchSize: Math.min(32, Math.max(8, Math.floor(trainXRaw.length / 4))),
      shuffle: true,
      callbacks: {
        onEpochEnd: (epoch: number, logs: any) => {
          if (onProgress) {
            onProgress(epoch + 1, logs?.loss || 0, logs?.acc || 0);
          }
        },
      },
    });

    xs.dispose();
    ys.dispose();
    this.model = model;
    this.isTrained = true;

    // Evaluation on validation set
    let correctCount = 0;
    const confusionMatrix: number[][] = Array.from({ length: numClasses }, () =>
      new Array(numClasses).fill(0)
    );
    const perClassCorrect: number[] = new Array(numClasses).fill(0);
    const perClassTotal: number[] = new Array(numClasses).fill(0);

    tf.tidy(() => {
      const valXs = tf.tensor2d(valXRaw, [valXRaw.length, this.inputDim]);
      const predictions = model.predict(valXs);
      const predArray = predictions.arraySync() as number[][];

      valYRaw.forEach((actualClassIdx, i) => {
        const probs = predArray[i];
        let maxIdx = 0;
        let maxVal = probs[0];
        for (let c = 1; c < numClasses; c++) {
          if (probs[c] > maxVal) {
            maxVal = probs[c];
            maxIdx = c;
          }
        }

        confusionMatrix[actualClassIdx][maxIdx]++;
        perClassTotal[actualClassIdx]++;
        if (maxIdx === actualClassIdx) {
          correctCount++;
          perClassCorrect[actualClassIdx]++;
        }
      });
    });

    const perClassAccuracy: Record<string, number> = {};
    activeClasses.forEach((labelId, idx) => {
      const total = perClassTotal[idx];
      perClassAccuracy[labelId] = total > 0 ? Math.round((perClassCorrect[idx] / total) * 100) : 0;
    });

    return {
      overallAccuracy: Math.round((correctCount / Math.max(1, valYRaw.length)) * 100) || 100,
      valSamplesCount: valYRaw.length,
      perClassAccuracy,
      confusionMatrix,
      classes: activeClasses,
    };
  }

  /**
   * Run inference on a 126-element vector using TF.js
   */
  predict(vector: number[], activeClasses: string[]): { id: string; confidence: number } {
    if (!this.model || !this.isTrained || !activeClasses.length) {
      return { id: "no_match", confidence: 0 };
    }

    const tf = (window as any).tf;
    if (!tf) return { id: "no_match", confidence: 0 };

    let topClass = "no_match";
    let confidence = 0;

    tf.tidy(() => {
      const inputVector =
        vector.length === this.inputDim
          ? vector
          : [...vector, ...new Array(Math.max(0, this.inputDim - vector.length)).fill(0)].slice(
              0,
              this.inputDim
            );

      const inputTensor = tf.tensor2d([inputVector], [1, this.inputDim]);
      const prediction = this.model.predict(inputTensor);
      const probs = prediction.dataSync() as Float32Array;

      let maxIdx = 0;
      let maxProb = probs[0] || 0;
      for (let i = 1; i < probs.length; i++) {
        if (probs[i] > maxProb) {
          maxProb = probs[i];
          maxIdx = i;
        }
      }

      topClass = activeClasses[maxIdx] || "no_match";
      confidence = Math.round(maxProb * 100);
    });

    return { id: topClass, confidence };
  }

  /**
   * Export model weights and structure to a serializable JSON format
   */
  async exportModel(activeClasses: string[]): Promise<string> {
    if (!this.model || !this.isTrained) throw new Error("Model is not trained yet");
    const weights: Array<{ name: string; shape: number[]; data: number[] }> = [];

    for (const weight of this.model.weights) {
      const val = await weight.val.data();
      weights.push({
        name: weight.name,
        shape: weight.shape,
        data: Array.from(val),
      });
    }

    const payload = {
      version: 2,
      type: "signspeak_isl_tfjs_model",
      inputDim: this.inputDim,
      activeClasses,
      topology: this.model.toJSON(null, false),
      weights,
    };

    return JSON.stringify(payload, null, 2);
  }

  /**
   * Import model from JSON payload
   */
  async importModel(jsonStr: string): Promise<{ success: boolean; classes: string[] }> {
    const tf = await loadTensorFlowJS();
    if (!tf) throw new Error("TensorFlow.js not available");

    const data = JSON.parse(jsonStr);
    if (!data.topology || (data.type !== "signspeak_isl_tfjs_model" && data.type !== "signspeak_tfjs_model")) {
      throw new Error("Invalid model format");
    }

    if (this.model) this.model.dispose();

    this.model = await tf.models.modelFromJSON(data.topology);

    if (Array.isArray(data.weights)) {
      const weightTensors: Record<string, any> = {};
      data.weights.forEach((w: any) => {
        weightTensors[w.name] = tf.tensor(w.data, w.shape);
      });
      const newWeights = this.model.weights.map((w: any) => weightTensors[w.name]);
      this.model.setWeights(newWeights);

      Object.values(weightTensors).forEach((t) => t.dispose());
    }

    this.isTrained = true;
    return { success: true, classes: data.activeClasses || [] };
  }
}

/**
 * Fallback kNN Classifier using Euclidean distance on 126D vectors
 */
export function knnPredictISL(
  vector: number[],
  dataset: Record<string, number[][]>,
  k = 5
): { id: string; confidence: number } {
  const distances: Array<{ labelId: string; dist: number }> = [];

  const dim = Math.min(126, vector.length);

  Object.entries(dataset).forEach(([labelId, samples]) => {
    samples.forEach((sample) => {
      let sumSq = 0;
      for (let i = 0; i < dim; i++) {
        const diff = (vector[i] || 0) - (sample[i] || 0);
        sumSq += diff * diff;
      }
      distances.push({ labelId, dist: Math.sqrt(sumSq) });
    });
  });

  if (distances.length === 0) {
    return { id: "no_match", confidence: 0 };
  }

  distances.sort((a, b) => a.dist - b.dist);
  const neighbors = distances.slice(0, Math.min(k, distances.length));

  const votes: Record<string, number> = {};
  let totalWeight = 0;

  neighbors.forEach((n) => {
    const weight = 1 / (n.dist + 1e-4);
    votes[n.labelId] = (votes[n.labelId] || 0) + weight;
    totalWeight += weight;
  });

  let topId = "no_match";
  let maxWeight = 0;

  Object.entries(votes).forEach(([id, weight]) => {
    if (weight > maxWeight) {
      maxWeight = weight;
      topId = id;
    }
  });

  const confidence = Math.round((maxWeight / Math.max(1e-4, totalWeight)) * 100);
  return { id: topId, confidence };
}
