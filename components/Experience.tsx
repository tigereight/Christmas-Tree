import React, { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { Stars, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { AppMode, GestureState, PhotoData } from '../types';
import { Particles } from './Particles';
import { PhotoCloud } from './PhotoCloud';

interface ExperienceProps {
  mode: AppMode;
  photos: PhotoData[];
  selectedPhotoId: string | null;
  gestureState: GestureState;
}

const CameraController: React.FC<{ gestureState: GestureState; mode: AppMode }> = ({ gestureState, mode }) => {
  const { camera } = useThree();
  const angleRef = useRef(0);
  const heightRef = useRef(0);
  
  useFrame((state, delta) => {
    // ZOOM MODE: Lock Camera to fixed position to ensure photo is centered
    if (mode === AppMode.ZOOM) {
      // Position camera far back at Z=35 so we can put the photo at Z=25 (10 units distance)
      const targetPos = new THREE.Vector3(0, 0, 35);
      camera.position.lerp(targetPos, 0.1);
      camera.lookAt(0, 0, 0);
      return; 
    }

    // HAND CONTROL (Active in Tree & Scatter)
    if (gestureState.isHandDetected) {
       // Map Hand X (0..1) to Rotation Angle (-PI .. PI)
       // We use a wider range (multiply by 6) so small movements cover more ground
       // 0.5 is center. 
       const targetAngle = (gestureState.handPosition.x - 0.5) * 6; 
       
       // Map Hand Y (0..1) to Height (-15 .. 15)
       // 0 is top (high Y), 1 is bottom (low Y) in MediaPipe
       const targetHeight = (0.5 - gestureState.handPosition.y) * 30;

       // Smoothly interpolate towards the hand target
       angleRef.current += (targetAngle - angleRef.current) * 0.1;
       heightRef.current += (targetHeight - heightRef.current) * 0.1;
    } else {
       // IDLE ANIMATION when no hand
       angleRef.current += delta * 0.15;
       // Slowly return height to 0
       heightRef.current += (0 - heightRef.current) * 0.05;
    }

    // Calculate Orbit Position based on angle and height
    const radius = 32;
    const x = Math.sin(angleRef.current) * radius;
    const z = Math.cos(angleRef.current) * radius;
    const y = heightRef.current;

    camera.position.lerp(new THREE.Vector3(x, y, z), 0.1);
    camera.lookAt(0, 0, 0);
  });

  return null;
};

export const Experience: React.FC<ExperienceProps> = ({ mode, photos, selectedPhotoId, gestureState }) => {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 0, 32], fov: 45 }}
      gl={{ toneMapping: THREE.ReinhardToneMapping }}
    >
      <color attach="background" args={['#050505']} />
      
      {/* Lighting for that "Golden" cinematic feel */}
      <ambientLight intensity={1.0} />
      <pointLight position={[10, 10, 10]} intensity={4.0} color="#FFD700" />
      <pointLight position={[-10, -5, -10]} intensity={2.0} color="#FF4500" />
      <spotLight 
        position={[0, 30, 0]} 
        angle={0.5} 
        penumbra={1} 
        intensity={6} 
        castShadow 
        color="#FFFFE0"
      />

      {/* Environment */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <Sparkles count={400} scale={25} size={3} speed={0.4} opacity={0.5} color="#FFD700" />

      <CameraController gestureState={gestureState} mode={mode} />

      {/* Centered Group */}
      <group position={[0, 0, 0]}>
        <Particles mode={mode} />
        <PhotoCloud photos={photos} mode={mode} selectedId={selectedPhotoId} />
      </group>

      <EffectComposer disableNormalPass>
        <Bloom luminanceThreshold={0.4} mipmapBlur intensity={1.8} radius={0.5} />
        <Noise opacity={0.05} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>
    </Canvas>
  );
};