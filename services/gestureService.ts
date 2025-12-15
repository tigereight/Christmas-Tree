import { FilesetResolver, HandLandmarker, DrawingUtils } from "@mediapipe/tasks-vision";
import { GestureState } from "../types";

export class GestureService {
  private handLandmarker: HandLandmarker | null = null;
  private video: HTMLVideoElement | null = null;
  private lastVideoTime = -1;
  private requestRef: number | null = null;
  private onResult: (state: GestureState) => void;

  constructor(onResult: (state: GestureState) => void) {
    this.onResult = onResult;
  }

  async initialize() {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );

    this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numHands: 1
    });
  }

  start(videoElement: HTMLVideoElement) {
    this.video = videoElement;
    this.loop();
  }

  stop() {
    if (this.requestRef) {
      cancelAnimationFrame(this.requestRef);
    }
  }

  private loop = () => {
    if (this.video && this.handLandmarker) {
      // Ensure video is ready and has valid dimensions before processing
      if (this.video.readyState >= 2 && 
          this.video.videoWidth > 0 && 
          this.video.videoHeight > 0 && 
          this.video.currentTime !== this.lastVideoTime) {
        
        this.lastVideoTime = this.video.currentTime;
        try {
          const detections = this.handLandmarker.detectForVideo(this.video, performance.now());
          this.processDetections(detections);
        } catch (error) {
          console.warn("Gesture detection skipped frame:", error);
        }
      }
    }
    this.requestRef = requestAnimationFrame(this.loop);
  };

  private processDetections(result: any) {
    if (!result.landmarks || result.landmarks.length === 0) {
      this.onResult({
        isHandDetected: false,
        gesture: 'None',
        handPosition: { x: 0.5, y: 0.5 }
      });
      return;
    }

    const landmarks = result.landmarks[0];
    
    // Calculate basic centroid for hand position (normalized 0-1)
    let xSum = 0, ySum = 0;
    landmarks.forEach((l: any) => { xSum += l.x; ySum += l.y; });
    const handX = xSum / landmarks.length;
    const handY = ySum / landmarks.length;

    // Gesture Logic
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    const wrist = landmarks[0];

    // Distance helpers
    const dist = (p1: any, p2: any) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

    // 1. Pinch Detection (Thumb + Index close)
    const pinchDist = dist(thumbTip, indexTip);
    
    // 2. Fist Detection (Fingertips close to wrist)
    const isFist = 
      dist(indexTip, wrist) < 0.2 && 
      dist(middleTip, wrist) < 0.2 &&
      dist(ringTip, wrist) < 0.2 &&
      dist(pinkyTip, wrist) < 0.2;

    // 3. Open Palm (Fingertips far from wrist)
    const isOpen = 
      dist(indexTip, wrist) > 0.3 && 
      dist(middleTip, wrist) > 0.3 &&
      dist(ringTip, wrist) > 0.3 &&
      dist(pinkyTip, wrist) > 0.3;

    let detectedGesture: GestureState['gesture'] = 'None';

    if (isFist) {
      detectedGesture = 'Closed_Fist';
    } else if (pinchDist < 0.08) { // Relaxed from 0.05 for easier triggering
      detectedGesture = 'Pinch';
    } else if (isOpen) {
      detectedGesture = 'Open_Palm';
    }

    this.onResult({
      isHandDetected: true,
      gesture: detectedGesture,
      handPosition: { x: 1 - handX, y: handY } // Mirror X for intuitive control
    });
  }
}