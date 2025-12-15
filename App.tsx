import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AppMode, GestureState, PhotoData } from './types';
import { Experience } from './components/Experience';
import { GestureService } from './services/gestureService';

// Icons
const IconCamera = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
);
const IconHand = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>
);

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.TREE);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [gestureState, setGestureState] = useState<GestureState>({
    isHandDetected: false,
    gesture: 'None',
    handPosition: { x: 0.5, y: 0.5 }
  });
  const [loading, setLoading] = useState(true);
  const [webcamEnabled, setWebcamEnabled] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const gestureServiceRef = useRef<GestureService | null>(null);

  // Initialize MediaPipe
  useEffect(() => {
    const initVision = async () => {
      gestureServiceRef.current = new GestureService((state) => {
        setGestureState(state);
      });
      await gestureServiceRef.current.initialize();
      setLoading(false);
    };
    initVision();
  }, []);

  // Handle Webcam Start
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        gestureServiceRef.current?.start(videoRef.current);
        setWebcamEnabled(true);
      }
    } catch (err) {
      console.error("Webcam error:", err);
      alert("Unable to access webcam. Gesture controls will be disabled.");
    }
  };

  // State Transition Logic based on Gestures
  useEffect(() => {
    // 1. Auto-Revert to Tree if hand is lost
    // We do this check first to ensure safety
    if (!gestureState.isHandDetected) {
      if (mode !== AppMode.TREE) {
        setMode(AppMode.TREE);
        setSelectedPhotoId(null);
      }
      return;
    }

    // 2. Gesture Logic
    if (gestureState.gesture === 'Closed_Fist' && mode !== AppMode.TREE) {
      // Fist always returns to Tree
      setMode(AppMode.TREE);
      setSelectedPhotoId(null);
    } 
    else if (gestureState.gesture === 'Open_Palm') {
      // Open Palm triggers Scatter if currently in Tree
      if (mode === AppMode.TREE) {
        setMode(AppMode.SCATTER);
      }
    } 
    else if (gestureState.gesture === 'Pinch') {
      // Pinch triggers Zoom if we have photos
      // We allow entering Zoom from either Tree or Scatter
      if (mode !== AppMode.ZOOM && photos.length > 0) {
        setMode(AppMode.ZOOM);
        // If no photo is selected, pick a random one
        if (!selectedPhotoId) {
          const randomIdx = Math.floor(Math.random() * photos.length);
          setSelectedPhotoId(photos[randomIdx].id);
        }
      }
    }
  }, [gestureState, mode, photos, selectedPhotoId]);

  // Handle Photo Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newPhotos: PhotoData[] = Array.from(e.target.files).map((file: File) => {
        // Generate random positions
        const h = (Math.random() - 0.5) * 15;
        const hNorm = (h + 10) / 20;
        const r = (1 - hNorm) * 6;
        const theta = Math.random() * Math.PI * 2;
        
        return {
          id: uuidv4(),
          url: URL.createObjectURL(file),
          position: [r * Math.cos(theta), h, r * Math.sin(theta)],
          scatterPosition: [(Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20],
          rotation: [Math.random(), Math.random(), Math.random()]
        };
      });
      setPhotos(prev => [...prev, ...newPhotos]);
    }
  };

  return (
    <div className="relative w-full h-full bg-black font-sans selection:bg-amber-500 selection:text-black">
      
      {/* 3D Canvas */}
      <div className="absolute inset-0 z-0">
        <Experience 
          mode={mode} 
          photos={photos} 
          selectedPhotoId={selectedPhotoId} 
          gestureState={gestureState}
        />
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6">
        
        {/* Header */}
        <div className="flex justify-between items-start pointer-events-auto">
          <div>
            <h1 className="text-4xl font-light tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">
              DEAR PENGJIAYU
            </h1>
            <p className="text-amber-100/60 text-sm mt-1 uppercase tracking-widest">
              Marry Christmas
            </p>
          </div>
          
          <div className="flex gap-4">
            <label className="cursor-pointer group relative overflow-hidden rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-6 py-2 transition-all hover:bg-white/20 hover:border-amber-400/50">
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
              <div className="flex items-center gap-2 text-amber-100 group-hover:text-amber-300">
                 <IconCamera />
                 <span className="text-sm font-medium">Add Memories</span>
              </div>
            </label>
          </div>
        </div>

        {/* Center Hint */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none transition-opacity duration-500" style={{ opacity: loading ? 1 : 0 }}>
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-amber-200 tracking-widest text-lg">INITIALIZING VISION ENGINE...</p>
        </div>

        {/* Footer / Controls */}
        <div className="flex items-end justify-between w-full pointer-events-auto">
          
          {/* Webcam Preview */}
          <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/40 backdrop-blur-md shadow-2xl w-48 h-36">
             <video 
              ref={videoRef} 
              className="w-full h-full object-cover transform -scale-x-100" 
              muted 
              playsInline
            />
            
            {!webcamEnabled && !loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <button 
                  onClick={startWebcam}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-bold py-2 px-4 rounded-full text-xs uppercase tracking-wider transition-colors"
                >
                  Enable Camera
                </button>
              </div>
            )}

            {/* Gesture Feedback */}
            {webcamEnabled && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${gestureState.isHandDetected ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500'}`}></div>
                  <span className="text-xs text-white/80 font-mono uppercase">
                    {gestureState.isHandDetected ? gestureState.gesture.replace('_', ' ') : 'NO HAND'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="flex flex-col gap-2 max-w-md text-right">
             <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-lg p-4 text-amber-100/80">
                <div className="flex items-center justify-end gap-2 mb-2 text-amber-400">
                  <span className="text-xs uppercase tracking-widest font-bold">Controls</span>
                  <IconHand />
                </div>
                <ul className="space-y-2 text-xs font-mono">
                  <li className={`flex justify-between gap-4 transition-colors ${mode === AppMode.TREE ? 'text-green-400 font-bold' : ''}`}>
                    <span>Make a Fist</span>
                    <span>ASSEMBLE TREE</span>
                  </li>
                  <li className={`flex justify-between gap-4 transition-colors ${mode === AppMode.SCATTER ? 'text-blue-400 font-bold' : ''}`}>
                    <span>Open Hand (5 fingers)</span>
                    <span>SCATTER / EXPLODE</span>
                  </li>
                  <li className={`flex justify-between gap-4 transition-colors ${mode === AppMode.ZOOM ? 'text-yellow-400 font-bold' : ''}`}>
                    <span>Pinch (Thumb+Index)</span>
                    <span>GRAB MEMORY</span>
                  </li>
                   <li className="flex justify-between gap-4 opacity-60">
                    <span>Move Hand</span>
                    <span>ROTATE CAMERA</span>
                  </li>
                </ul>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default App;