
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LogEntry, LogLevel } from '../types';
import { COLORS } from '../constants';

// Declare intrinsic elements as variables to bypass JSX.IntrinsicElements errors in strict TS environments
const Group = 'group' as any;
const InstancedMesh = 'instancedMesh' as any;
const SphereGeometry = 'sphereGeometry' as any;
const MeshBasicMaterial = 'meshBasicMaterial' as any;
const Mesh = 'mesh' as any;
const CylinderGeometry = 'cylinderGeometry' as any;

interface Particle {
  id: string;
  position: THREE.Vector3;
  velocity: number;
  color: string;
  level: LogLevel;
}

export const Tunnel: React.FC<{ logs: LogEntry[]; speedMultiplier: number }> = ({ logs, speedMultiplier }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const particles = useRef<Particle[]>([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Sync particles with new logs
  useEffect(() => {
    if (logs.length > 0) {
      const latestLog = logs[0];
      // Only add if not already in particles (rough check by ID)
      if (!particles.current.find(p => p.id === latestLog.id)) {
        particles.current.push({
          id: latestLog.id,
          position: new THREE.Vector3(
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            -20 // Start deep in the tunnel
          ),
          velocity: 0.1 * speedMultiplier,
          color: COLORS[latestLog.level],
          level: latestLog.level
        });
      }
    }
  }, [logs, speedMultiplier]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Move particles forward
    particles.current.forEach((p, i) => {
      p.position.z += p.velocity + (speedMultiplier * 0.05);
      
      // Reset or remove if passed camera
      if (p.position.z > 5) {
        particles.current.splice(i, 1);
      }
    });

    // Update instances
    particles.current.forEach((p, i) => {
      dummy.position.copy(p.position);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      meshRef.current!.setColorAt(i, new THREE.Color(p.color));
    });

    meshRef.current.count = particles.current.length;
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <Group>
      <InstancedMesh ref={meshRef} args={[undefined, undefined, 500]}>
        <SphereGeometry args={[0.08, 8, 8]} />
        <MeshBasicMaterial transparent opacity={0.8} />
      </InstancedMesh>
      
      {/* Tunnel Wireframe */}
      <Mesh rotation={[0, 0, 0]}>
        <CylinderGeometry args={[5, 5, 100, 32, 1, true]} />
        <MeshBasicMaterial wireframe color="#1e293b" transparent opacity={0.1} side={THREE.DoubleSide} />
      </Mesh>
    </Group>
  );
};
