export enum AppMode {
  TREE = 'TREE',
  SCATTER = 'SCATTER',
  ZOOM = 'ZOOM',
}

export interface GestureState {
  isHandDetected: boolean;
  gesture: 'Closed_Fist' | 'Open_Palm' | 'Pinch' | 'None';
  handPosition: { x: number; y: number }; // Normalized 0-1
}

export interface PhotoData {
  id: string;
  url: string;
  position: [number, number, number]; // Tree position
  scatterPosition: [number, number, number]; // Random position
  rotation: [number, number, number];
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      instancedMesh: any;
      boxGeometry: any;
      meshStandardMaterial: any;
      pointLight: any;
      ambientLight: any;
      spotLight: any;
      color: any;
      // Allow any HTML/SVG element
      [elemName: string]: any;
    }
  }
}