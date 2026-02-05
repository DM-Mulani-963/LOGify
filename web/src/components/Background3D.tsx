import React, { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

const Background3D: React.FC = () => {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = 500;

  const particles = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      // Random positions in a cube
      positions[i * 3] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
      
      // Blue-ish colors
      colors[i * 3] = 0.2 + Math.random() * 0.3; // R
      colors[i * 3 + 1] = 0.4 + Math.random() * 0.4; // G
      colors[i * 3 + 2] = 0.8 + Math.random() * 0.2; // B
    }
    
    return { positions, colors };
  }, []);

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y += 0.0005;
      particlesRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={particles.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={particles.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.1} vertexColors transparent opacity={0.6} sizeAttenuation />
    </points>
  );
};

export default Background3D;
