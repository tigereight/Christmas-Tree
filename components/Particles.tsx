import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { AppMode } from '../types';

interface ParticlesProps {
  mode: AppMode;
}

const COUNT = 1200;
const TREE_HEIGHT = 20;
const TREE_RADIUS_BASE = 8;

// Reusable geometries and materials for performance
// Emissive intensity increased for brightness
const sphereGeo = new THREE.SphereGeometry(0.15, 16, 16);
const boxGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
const goldMat = new THREE.MeshStandardMaterial({ 
  color: '#FFD700', 
  roughness: 0.2, 
  metalness: 1.0,
  emissive: '#FFD700',
  emissiveIntensity: 0.8
});
const redMat = new THREE.MeshStandardMaterial({ 
  color: '#8B0000', 
  roughness: 0.3, 
  metalness: 0.6,
  emissive: '#FF0000',
  emissiveIntensity: 0.6
});
const greenMat = new THREE.MeshStandardMaterial({ 
  color: '#2F4F4F', 
  roughness: 0.8, 
  metalness: 0.2,
  emissive: '#2F4F4F',
  emissiveIntensity: 0.2
});

export const Particles: React.FC<ParticlesProps> = ({ mode }) => {
  const meshRefs = [
    useRef<THREE.InstancedMesh>(null!),
    useRef<THREE.InstancedMesh>(null!),
    useRef<THREE.InstancedMesh>(null!)
  ];

  // Generate data for all particles
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < COUNT; i++) {
      // Tree Position (Cone)
      const h = (Math.random() - 0.5) * TREE_HEIGHT; // -10 to 10
      const hNorm = (h + (TREE_HEIGHT/2)) / TREE_HEIGHT; // 0 to 1
      const r = (1 - hNorm) * TREE_RADIUS_BASE * Math.random(); 
      const theta = Math.random() * Math.PI * 2;
      
      const xTree = r * Math.cos(theta);
      const zTree = r * Math.sin(theta);
      const yTree = h;

      // Scatter Position (Chaos)
      const spread = 30; // Slightly wider spread
      const xScatter = (Math.random() - 0.5) * spread;
      const yScatter = (Math.random() - 0.5) * spread;
      const zScatter = (Math.random() - 0.5) * spread;

      // Type assignment (0: Gold Sphere, 1: Red Sphere, 2: Green Box)
      const type = Math.floor(Math.random() * 3);
      
      // Speed factor for animation variety - Increased base speed
      const speed = 0.05 + Math.random() * 0.05;

      temp.push({
        posTree: new THREE.Vector3(xTree, yTree, zTree),
        posScatter: new THREE.Vector3(xScatter, yScatter, zScatter),
        currentPos: new THREE.Vector3(xTree, yTree, zTree),
        type,
        speed
      });
    }
    return temp;
  }, []);

  const dummy = new THREE.Object3D();

  useFrame((state, delta) => {
    // Determine Target based on Mode
    const targetKey = mode === AppMode.TREE ? 'posTree' : 'posScatter';

    let idx0 = 0, idx1 = 0, idx2 = 0;

    for (let i = 0; i < COUNT; i++) {
      const p = particles[i];
      const target = p[targetKey];

      // FAST Transition: Increased multiplier from 0.1 to 0.8
      // p.speed is around 0.075 on average. 0.075 * 60 * 0.8 ~= 3.6 units per second relative lerp
      p.currentPos.lerp(target, p.speed * (delta * 60) * 0.8);

      // Add some floating noise in Scatter mode
      if (mode !== AppMode.TREE) {
        p.currentPos.y += Math.sin(state.clock.elapsedTime + i) * 0.01;
      } else {
        // Rotation in tree mode
        const angle = delta * 0.2;
        const x = p.currentPos.x;
        const z = p.currentPos.z;
        p.currentPos.x = x * Math.cos(angle) - z * Math.sin(angle);
        p.currentPos.z = x * Math.sin(angle) + z * Math.cos(angle);
      }

      dummy.position.copy(p.currentPos);
      
      // Scale animation
      const scale = mode === AppMode.TREE ? 1 : 0.8 + Math.sin(state.clock.elapsedTime * 2 + i) * 0.2;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();

      // Update appropriate instanced mesh
      if (p.type === 0) {
        meshRefs[0].current.setMatrixAt(idx0++, dummy.matrix);
      } else if (p.type === 1) {
        meshRefs[1].current.setMatrixAt(idx1++, dummy.matrix);
      } else {
        meshRefs[2].current.setMatrixAt(idx2++, dummy.matrix);
      }
    }

    meshRefs[0].current.instanceMatrix.needsUpdate = true;
    meshRefs[1].current.instanceMatrix.needsUpdate = true;
    meshRefs[2].current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={meshRefs[0]} args={[sphereGeo, goldMat, COUNT / 3]} />
      <instancedMesh ref={meshRefs[1]} args={[sphereGeo, redMat, COUNT / 3]} />
      <instancedMesh ref={meshRefs[2]} args={[boxGeo, greenMat, COUNT / 3]} />
    </group>
  );
};