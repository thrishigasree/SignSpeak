// Dual-Hand Indian Sign Language (ISL) Heuristic Classifier & Baseline Dataset

import { LandmarkPoint, normalizeTwoHands } from "./islGestureClassifier";

export type HandPoseConfig = {
  thumb: "extended" | "curled" | "up" | "down" | "across" | "touch_index" | "touch_middle" | "touch_ring" | "touch_pinky";
  index: "extended" | "curled" | "bent" | "touch_thumb";
  middle: "extended" | "curled" | "bent" | "touch_thumb";
  ring: "extended" | "curled" | "bent" | "touch_thumb";
  pinky: "extended" | "curled" | "bent" | "touch_thumb";
  handOrientation?: "up" | "down" | "sideways";
};

// Base MCP joint offsets relative to wrist (0,0,0)
const MCP_POS = {
  thumb: { x: -0.28, y: -0.2, z: 0 },
  index: { x: -0.18, y: -0.58, z: 0 },
  middle: { x: 0.0, y: -0.63, z: 0 },
  ring: { x: 0.18, y: -0.58, z: 0 },
  pinky: { x: 0.32, y: -0.48, z: 0 },
};

function generateSingleHandLandmarks(config: HandPoseConfig, variationAngle = 0, wristOffset = { x: 0, y: 0, z: 0 }): LandmarkPoint[] {
  const pts: LandmarkPoint[] = new Array(21);
  pts[0] = { x: wristOffset.x, y: wristOffset.y, z: wristOffset.z };

  const cos = Math.cos(variationAngle);
  const sin = Math.sin(variationAngle);
  const rotate = (x: number, y: number, z: number) => ({
    x: wristOffset.x + (x * cos - y * sin),
    y: wristOffset.y + (x * sin + y * cos),
    z: wristOffset.z + z,
  });

  const buildFinger = (mcp: { x: number; y: number; z: number }, dirX: number, dirY: number, state: string, startIndex: number) => {
    let dx = dirX;
    let dy = dirY;
    let dz = 0;

    if (state === "curled") {
      dx *= 0.2;
      dy = 0.2;
      dz = 0.3;
    } else if (state === "bent") {
      dx *= 0.5;
      dy *= 0.5;
      dz = 0.2;
    }

    const p1 = { x: mcp.x + dx * 0.3, y: mcp.y + dy * 0.3, z: mcp.z + dz * 0.3 };
    const p2 = { x: mcp.x + dx * 0.6, y: mcp.y + dy * 0.6, z: mcp.z + dz * 0.6 };
    const p3 = { x: mcp.x + dx * 1.0, y: mcp.y + dy * 1.0, z: mcp.z + dz * 1.0 };

    pts[startIndex] = rotate(mcp.x, mcp.y, mcp.z);
    pts[startIndex + 1] = rotate(p1.x, p1.y, p1.z);
    pts[startIndex + 2] = rotate(p2.x, p2.y, p2.z);
    pts[startIndex + 3] = rotate(p3.x, p3.y, p3.z);
  };

  buildFinger(MCP_POS.index, -0.15, -0.4, config.index, 5);
  buildFinger(MCP_POS.middle, 0, -0.45, config.middle, 9);
  buildFinger(MCP_POS.ring, 0.15, -0.4, config.ring, 13);
  buildFinger(MCP_POS.pinky, 0.3, -0.35, config.pinky, 17);

  const tMcp = MCP_POS.thumb;
  let tDirX = -0.4;
  let tDirY = -0.3;
  let tDirZ = 0;

  if (config.thumb === "up") {
    tDirX = -0.1;
    tDirY = -0.6;
  } else if (config.thumb === "down") {
    tDirX = -0.1;
    tDirY = 0.6;
  } else if (config.thumb === "curled" || config.thumb === "across") {
    tDirX = 0.2;
    tDirY = -0.1;
    tDirZ = 0.2;
  } else if (config.thumb === "touch_index") {
    tDirX = pts[8].x - tMcp.x;
    tDirY = pts[8].y - tMcp.y;
  }

  pts[1] = rotate(tMcp.x, tMcp.y, tMcp.z);
  pts[2] = rotate(tMcp.x + tDirX * 0.3, tMcp.y + tDirY * 0.3, tMcp.z + tDirZ * 0.3);
  pts[3] = rotate(tMcp.x + tDirX * 0.6, tMcp.y + tDirY * 0.6, tMcp.z + tDirZ * 0.6);
  pts[4] = rotate(tMcp.x + tDirX * 1.0, tMcp.y + tDirY * 1.0, tMcp.z + tDirZ * 1.0);

  return pts;
}

/**
 * Check finger extension helper
 */
function analyzeHand(points: LandmarkPoint[]) {
  if (!points || points.length < 21) {
    return {
      extended: [false, false, false, false],
      extendedCount: 0,
      thumbUp: false,
      thumbDown: false,
      pinchIndex: false,
      pinchPinky: false,
      isFist: false,
      wrist: { x: 0, y: 0, z: 0 },
    };
  }

  const wrist = points[0];
  const extended = [[8, 6], [12, 10], [16, 14], [20, 18]].map(
    ([tip, pip]) => points[tip].y < points[pip].y - 0.02
  );
  const [indexExt, middleExt, ringExt, pinkyExt] = extended;
  const extendedCount = extended.filter(Boolean).length;

  const thumbUp = points[4].y < wrist.y - 0.06 && !indexExt && !middleExt && !ringExt && !pinkyExt;
  const thumbDown = points[4].y > wrist.y + 0.08 && !indexExt && !middleExt && !ringExt && !pinkyExt;

  const pinchIndex = Math.hypot(points[4].x - points[8].x, points[4].y - points[8].y) < 0.08;
  const pinchPinky = Math.hypot(points[4].x - points[20].x, points[4].y - points[20].y) < 0.08;
  const isFist = extendedCount === 0 && !thumbUp && !thumbDown;

  return {
    extended,
    extendedCount,
    thumbUp,
    thumbDown,
    pinchIndex,
    pinchPinky,
    isFist,
    wrist,
  };
}

/**
 * Geometric Rule Classifier for Indian Sign Language (ISL):
 * Evaluates both dual-hand and single-hand signatures.
 */
export function classifyISLRules(hands: {
  hand1?: LandmarkPoint[];
  hand2?: LandmarkPoint[];
}): { id: string; confidence: number; handsDetected: number } {
  const h1 = hands.hand1;
  const h2 = hands.hand2;

  const hasH1 = Boolean(h1 && h1.length >= 21);
  const hasH2 = Boolean(h2 && h2.length >= 21);

  if (!hasH1 && !hasH2) {
    return { id: "no_match", confidence: 0, handsDetected: 0 };
  }

  // TWO HANDS DETECTED
  if (hasH1 && hasH2 && h1 && h2) {
    const a1 = analyzeHand(h1);
    const a2 = analyzeHand(h2);

    const wristDist = Math.hypot(h1[0].x - h2[0].x, h1[0].y - h2[0].y);
    const middleTipDist = Math.hypot(h1[12].x - h2[12].x, h1[12].y - h2[12].y);
    const indexTipDist = Math.hypot(h1[8].x - h2[8].x, h1[8].y - h2[8].y);

    // 1. NAMASTE (Two hands joined vertically in front of chest)
    const bothUpright = h1[12].y < h1[0].y && h2[12].y < h2[0].y;
    if (bothUpright && a1.extendedCount >= 3 && a2.extendedCount >= 3 && middleTipDist < 0.16 && wristDist < 0.3) {
      return { id: "namaste", confidence: 96, handsDetected: 2 };
    }

    // 2. HELP (Left flat palm facing up, Right fist placed on top)
    const h1FlatPalm = a1.extendedCount >= 3 && Math.abs(h1[0].y - h1[9].y) < 0.25;
    const h2FistOnH1 = (a2.isFist || a2.thumbUp) && Math.abs(h2[0].x - h1[0].x) < 0.22 && h2[0].y <= h1[0].y + 0.15;
    const h2FlatPalm = a2.extendedCount >= 3 && Math.abs(h2[0].y - h2[9].y) < 0.25;
    const h1FistOnH2 = (a1.isFist || a1.thumbUp) && Math.abs(h1[0].x - h2[0].x) < 0.22 && h1[0].y <= h2[0].y + 0.15;

    if ((h1FlatPalm && h2FistOnH1) || (h2FlatPalm && h1FistOnH2)) {
      return { id: "help", confidence: 95, handsDetected: 2 };
    }

    // 3. HOUSE / HOME (Fingertips touching forming roof peak ^, wrists separated)
    if (indexTipDist < 0.14 && middleTipDist < 0.15 && wristDist > 0.18 && bothUpright) {
      return { id: "house", confidence: 95, handsDetected: 2 };
    }

    // 4. TIME / WATCH (Right index pointing and touching left wrist)
    const h2IndexOnH1Wrist = a2.extended[0] && Math.hypot(h2[8].x - h1[0].x, h2[8].y - h1[0].y) < 0.16;
    const h1IndexOnH2Wrist = a1.extended[0] && Math.hypot(h1[8].x - h2[0].x, h1[8].y - h2[0].y) < 0.16;
    if (h2IndexOnH1Wrist || h1IndexOnH2Wrist) {
      return { id: "time", confidence: 94, handsDetected: 2 };
    }

    // 5. DOCTOR / HOSPITAL (Index & middle touching wrist pulse)
    const h2PulseOnH1 = a2.extended[0] && a2.extended[1] && Math.hypot(h2[8].x - h1[0].x, h2[8].y - h1[0].y) < 0.18;
    const h1PulseOnH2 = a1.extended[0] && a1.extended[1] && Math.hypot(h1[8].x - h2[0].x, h1[8].y - h2[0].y) < 0.18;
    if (h2PulseOnH1 || h1PulseOnH2) {
      return { id: "doctor", confidence: 94, handsDetected: 2 };
    }

    // 6. STOP (Both hands flat vertical palms facing forward)
    if (a1.extendedCount === 4 && a2.extendedCount === 4 && bothUpright && wristDist > 0.2) {
      return { id: "stop", confidence: 96, handsDetected: 2 };
    }

    // 7. WHERE / WHAT (Both palms up or open moving apart)
    if (a1.extendedCount >= 3 && a2.extendedCount >= 3 && wristDist > 0.28) {
      return { id: "where", confidence: 92, handsDetected: 2 };
    }

    // 8. FRIEND (Both index fingers hooked together)
    if (a1.extended[0] && a2.extended[0] && a1.extendedCount <= 2 && a2.extendedCount <= 2 && indexTipDist < 0.12) {
      return { id: "friend", confidence: 92, handsDetected: 2 };
    }

    // 9. PAIN (Both index fingers pointing towards each other twisting)
    if (a1.extended[0] && a2.extended[0] && a1.extendedCount === 1 && a2.extendedCount === 1 && indexTipDist < 0.18) {
      return { id: "pain", confidence: 93, handsDetected: 2 };
    }

    // 10. BOOK / STUDY (Palms open side by side)
    if (a1.extendedCount >= 3 && a2.extendedCount >= 3 && wristDist < 0.25 && Math.abs(h1[0].y - h2[0].y) < 0.12) {
      return { id: "book", confidence: 91, handsDetected: 2 };
    }

    // 11. EMERGENCY (Both hands spread waving)
    if (a1.extendedCount >= 4 && a2.extendedCount >= 4) {
      return { id: "emergency", confidence: 92, handsDetected: 2 };
    }
  }

  // SINGLE HAND DETECTED (or primary active hand)
  const primaryHand = h1 && h1.length >= 21 ? h1 : h2!;
  const a = analyzeHand(primaryHand);
  const [indexExt, middleExt, ringExt, pinkyExt] = a.extended;

  if (a.pinchIndex && middleExt && ringExt && pinkyExt) return { id: "good", confidence: 94, handsDetected: 1 };
  if (a.pinchIndex && !middleExt && !ringExt && !pinkyExt) return { id: "num_0", confidence: 92, handsDetected: 1 };
  if (a.thumbUp) return { id: "yes", confidence: 95, handsDetected: 1 };
  if (a.thumbDown) return { id: "no", confidence: 95, handsDetected: 1 };

  // ISL Numbers 1-5
  if (indexExt && !middleExt && !ringExt && !pinkyExt) return { id: "num_1", confidence: 93, handsDetected: 1 };
  if (indexExt && middleExt && !ringExt && !pinkyExt) return { id: "num_2", confidence: 93, handsDetected: 1 };
  if (a.thumbUp && indexExt && middleExt && !ringExt && !pinkyExt) return { id: "num_3", confidence: 91, handsDetected: 1 };
  if (indexExt && middleExt && ringExt && !pinkyExt) return { id: "water", confidence: 92, handsDetected: 1 }; // W-hand shape
  if (indexExt && middleExt && ringExt && pinkyExt && !a.thumbUp) return { id: "num_4", confidence: 92, handsDetected: 1 };
  if (a.extendedCount === 4 && Math.hypot(primaryHand[4].x - primaryHand[5].x, primaryHand[4].y - primaryHand[5].y) > 0.12) {
    return { id: "num_5", confidence: 93, handsDetected: 1 };
  }

  // Food / Eat: all fingertips bunched together
  if (a.pinchIndex && !middleExt && !ringExt && !pinkyExt && primaryHand[8].y < primaryHand[0].y - 0.15) {
    return { id: "food", confidence: 91, handsDetected: 1 };
  }

  // I / Me: Index pointing to chest
  if (indexExt && !middleExt && !ringExt && !pinkyExt && primaryHand[8].y > primaryHand[5].y - 0.05) {
    return { id: "i_me", confidence: 90, handsDetected: 1 };
  }

  // Stop single hand
  if (a.extendedCount === 4) return { id: "stop", confidence: 89, handsDetected: 1 };

  return { id: "no_match", confidence: 0, handsDetected: hasH1 && hasH2 ? 2 : 1 };
}

/**
 * Generate 126-dimensional baseline dataset for all ISL gestures
 */
export function generatePrepopulatedISLDataset(): Record<string, number[][]> {
  const dataset: Record<string, number[][]> = {};

  const OPEN_HAND: HandPoseConfig = { thumb: "extended", index: "extended", middle: "extended", ring: "extended", pinky: "extended" };
  const FIST_HAND: HandPoseConfig = { thumb: "curled", index: "curled", middle: "curled", ring: "curled", pinky: "curled" };
  const THUMB_UP: HandPoseConfig = { thumb: "up", index: "curled", middle: "curled", ring: "curled", pinky: "curled" };
  const THUMB_DOWN: HandPoseConfig = { thumb: "down", index: "curled", middle: "curled", ring: "curled", pinky: "curled" };
  const POINT_INDEX: HandPoseConfig = { thumb: "across", index: "extended", middle: "curled", ring: "curled", pinky: "curled" };
  const V_SIGN: HandPoseConfig = { thumb: "across", index: "extended", middle: "extended", ring: "curled", pinky: "curled" };
  const W_SIGN: HandPoseConfig = { thumb: "touch_pinky", index: "extended", middle: "extended", ring: "extended", pinky: "curled" };
  const PINCH_OK: HandPoseConfig = { thumb: "touch_index", index: "touch_thumb", middle: "extended", ring: "extended", pinky: "extended" };

  const ISL_PRESETS: Record<string, { h1: HandPoseConfig; h2?: HandPoseConfig; offset2?: { x: number; y: number; z: number } }> = {
    // 2-Handed Signs
    namaste: { h1: OPEN_HAND, h2: OPEN_HAND, offset2: { x: 0.08, y: 0.0, z: 0.0 } },
    help: { h1: OPEN_HAND, h2: THUMB_UP, offset2: { x: 0.02, y: -0.06, z: 0.05 } },
    house: { h1: OPEN_HAND, h2: OPEN_HAND, offset2: { x: 0.22, y: 0.02, z: 0.0 } },
    book: { h1: OPEN_HAND, h2: OPEN_HAND, offset2: { x: 0.12, y: 0.0, z: 0.0 } },
    school: { h1: OPEN_HAND, h2: OPEN_HAND, offset2: { x: 0.04, y: -0.02, z: 0.03 } },
    family: { h1: PINCH_OK, h2: PINCH_OK, offset2: { x: 0.16, y: 0.0, z: 0.0 } },
    friend: { h1: POINT_INDEX, h2: POINT_INDEX, offset2: { x: 0.06, y: 0.0, z: 0.0 } },
    doctor: { h1: OPEN_HAND, h2: V_SIGN, offset2: { x: -0.05, y: 0.08, z: 0.0 } },
    time: { h1: OPEN_HAND, h2: POINT_INDEX, offset2: { x: -0.05, y: 0.08, z: 0.0 } },
    work: { h1: FIST_HAND, h2: FIST_HAND, offset2: { x: 0.04, y: -0.05, z: 0.0 } },
    where: { h1: OPEN_HAND, h2: OPEN_HAND, offset2: { x: 0.32, y: 0.0, z: 0.0 } },
    what: { h1: OPEN_HAND, h2: OPEN_HAND, offset2: { x: 0.24, y: 0.04, z: 0.0 } },
    how: { h1: OPEN_HAND, h2: OPEN_HAND, offset2: { x: 0.15, y: 0.06, z: 0.0 } },
    stop: { h1: OPEN_HAND, h2: OPEN_HAND, offset2: { x: 0.26, y: 0.0, z: 0.0 } },
    emergency: { h1: OPEN_HAND, h2: OPEN_HAND, offset2: { x: 0.28, y: -0.08, z: 0.0 } },
    pain: { h1: POINT_INDEX, h2: POINT_INDEX, offset2: { x: 0.1, y: 0.0, z: 0.0 } },
    happy: { h1: OPEN_HAND, h2: OPEN_HAND, offset2: { x: 0.18, y: -0.05, z: 0.0 } },
    wait: { h1: OPEN_HAND, h2: OPEN_HAND, offset2: { x: 0.2, y: 0.02, z: 0.0 } },
    welcome: { h1: OPEN_HAND, h2: OPEN_HAND, offset2: { x: 0.2, y: 0.08, z: 0.0 } },
    thank_you: { h1: OPEN_HAND, h2: OPEN_HAND, offset2: { x: 0.08, y: 0.02, z: 0.0 } },
    please: { h1: OPEN_HAND, h2: OPEN_HAND, offset2: { x: 0.14, y: 0.04, z: 0.0 } },
    nice_to_meet_you: { h1: POINT_INDEX, h2: POINT_INDEX, offset2: { x: 0.08, y: 0.0, z: 0.0 } },

    // Single-Handed Signs
    water: { h1: W_SIGN },
    food: { h1: { thumb: "touch_index", index: "bent", middle: "bent", ring: "bent", pinky: "bent" } },
    thirsty: { h1: { thumb: "extended", index: "bent", middle: "bent", ring: "curled", pinky: "curled" } },
    yes: { h1: THUMB_UP },
    no: { h1: THUMB_DOWN },
    good: { h1: PINCH_OK },
    bad: { h1: THUMB_DOWN },
    i_me: { h1: POINT_INDEX },
    you: { h1: POINT_INDEX },
    we: { h1: POINT_INDEX },
    why: { h1: { thumb: "across", index: "bent", middle: "curled", ring: "curled", pinky: "curled" } },
    danger: { h1: POINT_INDEX },
    sad: { h1: OPEN_HAND },
    understand: { h1: POINT_INDEX },
    bathroom: { h1: { thumb: "across", index: "curled", middle: "curled", ring: "curled", pinky: "curled" } },
    come: { h1: OPEN_HAND },
    go: { h1: POINT_INDEX },
    num_0: { h1: { thumb: "touch_index", index: "touch_thumb", middle: "curled", ring: "curled", pinky: "curled" } },
    num_1: { h1: POINT_INDEX },
    num_2: { h1: V_SIGN },
    num_3: { h1: { thumb: "extended", index: "extended", middle: "extended", ring: "curled", pinky: "curled" } },
    num_4: { h1: { thumb: "across", index: "extended", middle: "extended", ring: "extended", pinky: "extended" } },
    num_5: { h1: OPEN_HAND },
  };

  Object.entries(ISL_PRESETS).forEach(([id, preset]) => {
    const samples: number[][] = [];
    for (let i = 0; i < 15; i++) {
      const angle = ((i - 7) * 3.5 * Math.PI) / 180;
      const pts1 = generateSingleHandLandmarks(preset.h1, angle);
      let pts2: LandmarkPoint[] | undefined = undefined;
      if (preset.h2) {
        pts2 = generateSingleHandLandmarks(preset.h2, -angle, preset.offset2);
      }
      samples.push(normalizeTwoHands(pts1, pts2));
    }
    dataset[id] = samples;
  });

  return dataset;
}
