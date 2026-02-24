import React, { useMemo, useRef, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

// ===== PARTICLES WITH CONNECTIONS =====
const ParticleNetwork: React.FC<{ scrollY: number }> = ({ scrollY }) => {
  const particlesRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const particleCount = 600;
  const connectionDistance = 4;

  const particles = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;

      const r = Math.random();
      if (r < 0.4) {
        colors[i * 3] = 0.23; colors[i * 3 + 1] = 0.51; colors[i * 3 + 2] = 0.96;
      } else if (r < 0.7) {
        colors[i * 3] = 0.02; colors[i * 3 + 1] = 0.71; colors[i * 3 + 2] = 0.83;
      } else {
        colors[i * 3] = 0.55; colors[i * 3 + 1] = 0.36; colors[i * 3 + 2] = 0.96;
      }
    }
    return { positions, colors };
  }, []);

  // Connection lines between nearby particles
  const lineGeometry = useMemo(() => {
    const maxLines = 300;
    const linePositions = new Float32Array(maxLines * 6);
    const lineColors = new Float32Array(maxLines * 6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));
    geo.setDrawRange(0, 0);
    return geo;
  }, []);

  useFrame((state) => {
    if (!particlesRef.current) return;
    const t = state.clock.elapsedTime;

    particlesRef.current.rotation.y = t * 0.015 + scrollY * 0.0002;
    particlesRef.current.rotation.x = Math.sin(t * 0.04) * 0.12 + scrollY * 0.00008;
    particlesRef.current.position.y = -scrollY * 0.002;

    // Update some particle positions for subtle movement
    const posArray = particlesRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < Math.min(50, particleCount); i++) {
      posArray[i * 3 + 1] += Math.sin(t * 0.5 + i) * 0.003;
    }
    particlesRef.current.geometry.attributes.position.needsUpdate = true;

    // Update connection lines
    if (linesRef.current) {
      const linePos = lineGeometry.attributes.position.array as Float32Array;
      const lineCol = lineGeometry.attributes.color.array as Float32Array;
      let lineCount = 0;
      const maxLines = 300;

      for (let i = 0; i < Math.min(80, particleCount) && lineCount < maxLines; i++) {
        for (let j = i + 1; j < Math.min(80, particleCount) && lineCount < maxLines; j++) {
          const dx = posArray[i * 3] - posArray[j * 3];
          const dy = posArray[i * 3 + 1] - posArray[j * 3 + 1];
          const dz = posArray[i * 3 + 2] - posArray[j * 3 + 2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < connectionDistance) {
            const idx = lineCount * 6;
            linePos[idx] = posArray[i * 3];
            linePos[idx + 1] = posArray[i * 3 + 1];
            linePos[idx + 2] = posArray[i * 3 + 2];
            linePos[idx + 3] = posArray[j * 3];
            linePos[idx + 4] = posArray[j * 3 + 1];
            linePos[idx + 5] = posArray[j * 3 + 2];

            const alpha = 1 - dist / connectionDistance;
            lineCol[idx] = 0.23 * alpha; lineCol[idx + 1] = 0.51 * alpha; lineCol[idx + 2] = 0.96 * alpha;
            lineCol[idx + 3] = 0.23 * alpha; lineCol[idx + 4] = 0.51 * alpha; lineCol[idx + 5] = 0.96 * alpha;
            lineCount++;
          }
        }
      }
      lineGeometry.setDrawRange(0, lineCount * 2);
      lineGeometry.attributes.position.needsUpdate = true;
      lineGeometry.attributes.color.needsUpdate = true;
      linesRef.current.position.copy(particlesRef.current.position);
      linesRef.current.rotation.copy(particlesRef.current.rotation);
    }
  });

  return (
    <>
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={particleCount} array={particles.positions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={particleCount} array={particles.colors} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.12} vertexColors transparent opacity={0.8} sizeAttenuation blending={THREE.AdditiveBlending} />
      </points>
      <lineSegments ref={linesRef} geometry={lineGeometry}>
        <lineBasicMaterial vertexColors transparent opacity={0.15} blending={THREE.AdditiveBlending} />
      </lineSegments>
    </>
  );
};

// ===== GLOWING HERO ORB =====
const GlowingOrb: React.FC<{ scrollY: number }> = ({ scrollY }) => {
  const groupRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 0.4) * 0.5 - scrollY * 0.005;
      groupRef.current.rotation.y = t * 0.2;

      // Fade out as user scrolls past hero
      const opacity = Math.max(0, 1 - scrollY / 800);
      groupRef.current.scale.setScalar(1 + Math.sin(t * 0.5) * 0.05);
      groupRef.current.visible = opacity > 0.05;
    }
    if (innerRef.current) {
      innerRef.current.rotation.x = t * 0.3;
      innerRef.current.rotation.z = t * 0.2;
    }
    if (ringRef.current) {
      ringRef.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.3) * 0.3;
      ringRef.current.rotation.z = t * 0.15;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x = Math.PI / 3 + Math.cos(t * 0.25) * 0.2;
      ring2Ref.current.rotation.y = t * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, -2]}>
      {/* Core glow sphere */}
      <mesh ref={innerRef}>
        <icosahedronGeometry args={[1.5, 1]} />
        <meshBasicMaterial color="#3b82f6" wireframe transparent opacity={0.25} />
      </mesh>

      {/* Outer shell */}
      <mesh ref={outerRef}>
        <icosahedronGeometry args={[2, 0]} />
        <meshBasicMaterial color="#06b6d4" wireframe transparent opacity={0.08} />
      </mesh>

      {/* Orbital ring 1 */}
      <mesh ref={ringRef}>
        <torusGeometry args={[2.8, 0.02, 16, 64]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.5} />
      </mesh>

      {/* Orbital ring 2 */}
      <mesh ref={ring2Ref}>
        <torusGeometry args={[3.2, 0.015, 16, 64]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.3} />
      </mesh>

      {/* Center glow point */}
      <pointLight color="#3b82f6" intensity={2} distance={10} />
    </group>
  );
};

// ===== FLOATING WIREFRAME SHAPES =====
const FloatingShape: React.FC<{
  position: [number, number, number];
  geometry: 'icosahedron' | 'torus' | 'octahedron' | 'dodecahedron';
  color: string;
  speed: number;
  scrollY: number;
  size?: number;
}> = ({ position, geometry, color, speed, scrollY, size = 1 }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const t = state.clock.elapsedTime;
      meshRef.current.rotation.x = t * speed * 0.3 + scrollY * 0.0002;
      meshRef.current.rotation.y = t * speed * 0.5;
      meshRef.current.position.y = position[1] + Math.sin(t * speed * 0.5) * 0.8 - scrollY * 0.003;
    }
  });

  const geo = useMemo(() => {
    switch (geometry) {
      case 'torus': return <torusGeometry args={[size, size * 0.35, 16, 32]} />;
      case 'octahedron': return <octahedronGeometry args={[size, 0]} />;
      case 'dodecahedron': return <dodecahedronGeometry args={[size, 0]} />;
      default: return <icosahedronGeometry args={[size, 0]} />;
    }
  }, [geometry, size]);

  return (
    <mesh ref={meshRef} position={position}>
      {geo}
      <meshBasicMaterial color={color} wireframe transparent opacity={0.12} />
    </mesh>
  );
};

// ===== ANIMATED GRID FLOOR =====
const GridFloor: React.FC<{ scrollY: number }> = ({ scrollY }) => {
  const gridRef = useRef<THREE.GridHelper>(null);

  useFrame((state) => {
    if (gridRef.current) {
      gridRef.current.position.z = (state.clock.elapsedTime * 1.5 + scrollY * 0.008) % 2;
    }
  });

  return (
    <gridHelper
      ref={gridRef}
      args={[120, 60, '#1e40af', '#0f172a']}
      position={[0, -10, 0]}
    />
  );
};

// ===== SPEED LINES (when scrolling) =====
const SpeedLines: React.FC<{ scrollY: number }> = ({ scrollY }) => {
  const linesRef = useRef<THREE.Points>(null);
  const lineCount = 200;

  const lines = useMemo(() => {
    const positions = new Float32Array(lineCount * 3);
    for (let i = 0; i < lineCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 10;
    }
    return positions;
  }, []);

  useFrame(() => {
    if (linesRef.current) {
      linesRef.current.position.y = -scrollY * 0.01;
    }
  });

  return (
    <points ref={linesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={lineCount} array={lines} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#3b82f6"
        transparent
        opacity={Math.min(0.5, scrollY * 0.001)}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
};

// ===== MAIN SCENE =====
interface Landing3DSceneProps {
  scrollY: number;
}

const Landing3DScene: React.FC<Landing3DSceneProps> = ({ scrollY }) => {
  return (
    <div className="fixed inset-0 z-0" style={{ pointerEvents: 'none' }}>
      <Canvas camera={{ position: [0, 0, 15], fov: 60 }} dpr={[1, 1.5]}>
        <color attach="background" args={['#020617']} />
        <fog attach="fog" args={['#020617', 25, 70]} />

        <ambientLight intensity={0.15} />
        <pointLight position={[10, 10, 10]} intensity={0.4} color="#3b82f6" />
        <pointLight position={[-10, -5, -10]} intensity={0.3} color="#8b5cf6" />
        <pointLight position={[0, 10, 5]} intensity={0.2} color="#06b6d4" />

        <ParticleNetwork scrollY={scrollY} />
        <GlowingOrb scrollY={scrollY} />
        <GridFloor scrollY={scrollY} />
        <SpeedLines scrollY={scrollY} />

        <FloatingShape position={[-10, 5, -8]} geometry="icosahedron" color="#3b82f6" speed={0.6} scrollY={scrollY} size={1.2} />
        <FloatingShape position={[11, -3, -10]} geometry="torus" color="#06b6d4" speed={0.5} scrollY={scrollY} size={1} />
        <FloatingShape position={[-7, -7, -12]} geometry="octahedron" color="#8b5cf6" speed={0.8} scrollY={scrollY} size={0.9} />
        <FloatingShape position={[8, 8, -15]} geometry="dodecahedron" color="#06b6d4" speed={0.4} scrollY={scrollY} size={1.1} />
        <FloatingShape position={[0, -12, -8]} geometry="torus" color="#3b82f6" speed={0.6} scrollY={scrollY} size={0.8} />
        <FloatingShape position={[-12, -1, -6]} geometry="dodecahedron" color="#8b5cf6" speed={0.7} scrollY={scrollY} size={0.7} />

        {/* Post-processing effects */}
        <EffectComposer>
          <Bloom
            intensity={0.8}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.1} darkness={0.8} />
        </EffectComposer>
      </Canvas>
    </div>
  );
};

export default Landing3DScene;
