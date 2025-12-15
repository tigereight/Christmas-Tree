import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Image } from '@react-three/drei';
import { AppMode, PhotoData } from '../types';

interface PhotoCloudProps {
  photos: PhotoData[];
  mode: AppMode;
  selectedId: string | null;
}

const PhotoItem: React.FC<{ 
  data: PhotoData; 
  mode: AppMode; 
  isSelected: boolean 
}> = ({ data, mode, isSelected }) => {
  const groupRef = useRef<THREE.Group>(null);
  const targetPos = useRef(new THREE.Vector3());
  const targetScale = useRef(new THREE.Vector3(1, 1, 1));
  const targetRot = useRef(new THREE.Euler(0, 0, 0));

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Calculate targets
    if (isSelected && mode === AppMode.ZOOM) {
      // FORCE CENTER: 
      // Camera is at (0, 0, 35) looking at (0, 0, 0).
      // We place the photo at (0, 0, 25). This is exactly 10 units in front of the camera.
      // This guarantees it is centered on screen.
      targetPos.current.set(0, 0, 25);
      
      // Large scale for impact
      targetScale.current.setScalar(6); 
      
      // Face forward (identity rotation) so it faces the camera perfectly
      targetRot.current.set(0, 0, 0); 
    } else if (mode === AppMode.TREE) {
      targetPos.current.set(...data.position);
      targetScale.current.setScalar(1.5);
      // Face outwards from center (standard tree billboarding)
      const angle = Math.atan2(data.position[0], data.position[2]);
      targetRot.current.set(0, angle, 0);
    } else {
      // Scatter mode
      targetPos.current.set(...data.scatterPosition);
      targetScale.current.setScalar(1.5);
      // Add floating movement
      targetPos.current.y += Math.sin(state.clock.elapsedTime + parseFloat(data.id)) * 0.005;
      
      // Gentle spin
      targetRot.current.set(
         data.rotation[0] + state.clock.elapsedTime * 0.1,
         data.rotation[1] + state.clock.elapsedTime * 0.1,
         data.rotation[2]
      );
    }

    // Fast interpolation
    // If in ZOOM mode, we want it to snap faster so the user feels they 'grabbed' it.
    const lerpFactor = (mode === AppMode.ZOOM && isSelected) ? 0.2 : 0.1;
    
    groupRef.current.position.lerp(targetPos.current, lerpFactor);
    groupRef.current.scale.lerp(targetScale.current, lerpFactor);
    
    // Rotation lerp
    groupRef.current.rotation.x += (targetRot.current.x - groupRef.current.rotation.x) * lerpFactor;
    groupRef.current.rotation.y += (targetRot.current.y - groupRef.current.rotation.y) * lerpFactor;
    groupRef.current.rotation.z += (targetRot.current.z - groupRef.current.rotation.z) * lerpFactor;
  });

  return (
    <group ref={groupRef}>
      {/* Gold frame background */}
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[1.1, 1.1, 0.05]} />
        <meshStandardMaterial color="#FFD700" metalness={1} roughness={0.2} />
      </mesh>
      <Image url={data.url} transparent opacity={1} side={THREE.DoubleSide} />
    </group>
  );
};

export const PhotoCloud: React.FC<PhotoCloudProps> = ({ photos, mode, selectedId }) => {
  return (
    <group>
      {photos.map((photo) => (
        <PhotoItem 
          key={photo.id} 
          data={photo} 
          mode={mode} 
          isSelected={photo.id === selectedId} 
        />
      ))}
    </group>
  );
};