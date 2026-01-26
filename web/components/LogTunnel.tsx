"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text, OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import { useMotionValue } from "framer-motion";

// Configuration
const TUNNEL_LENGTH = 100;
const PARTICLE_COUNT = 200; // Max concurrent logs visible

interface LogParticleProps {
    position: [number, number, number];
    color: string;
    message: string;
    speed: number;
    onDispose: () => void;
}

function LogParticle({ position, color, message, speed, onDispose }: LogParticleProps) {
    const ref = useRef<THREE.Group>(null);
    const [active, setActive] = useState(true);

    useFrame((state, delta) => {
        if (!ref.current || !active) return;

        // Move towards camera (Z axis positive)
        ref.current.position.z += speed * delta * 10;

        // If passed the camera, recycle
        if (ref.current.position.z > 5) {
            setActive(false);
            onDispose();
        }
    });

    if (!active) return null;

    return (
        <group ref={ref} position={position}>
            <mesh>
                <sphereGeometry args={[0.2, 16, 16]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
            </mesh>
            {/* Short Message Text tied to particle */}
            <Text
                position={[0, 0.4, 0]}
                fontSize={0.2}
                color="white"
                anchorX="center"
                anchorY="middle"
            >
                {message.substring(0, 15)}
            </Text>
        </group>
    );
}

interface LogData {
    id: string;
    level: string;
    message: string;
    timestamp: number;
}

export default function LogTunnel({ logs }: { logs: LogData[] }) {
    // We need to map logs to visual particles
    // This is a simple visualizer: new logs spawn at the back

    const [particles, setParticles] = useState<any[]>([]);

    useEffect(() => {
        // When a new log arrives, spawn a particle
        if (logs.length === 0) return;

        const latestLog = logs[logs.length - 1];

        // Determine Color
        let color = "#4ade80"; // Green/Info
        if (latestLog.level === "ERROR") color = "#ef4444"; // Red
        else if (latestLog.level === "WARN") color = "#eab308"; // Yellow

        const newParticle = {
            id: Math.random().toString(),
            position: [
                (Math.random() - 0.5) * 10, // X: Random spread
                (Math.random() - 0.5) * 10, // Y: Random spread
                -TUNNEL_LENGTH              // Z: Start far away
            ] as [number, number, number],
            color: color,
            message: latestLog.message,
            speed: 2 + Math.random() * 2 // Speed variation
        };

        setParticles((prev) => [...prev, newParticle].slice(-PARTICLE_COUNT));

    }, [logs]);

    const removeParticle = (id: string) => {
        // In a real optimized system we wouldn't filter arrays this often, 
        // but for <1000 items it's fine for MVP
        setParticles(prev => prev.filter(p => p.id !== id));
    }

    return (
        <div className="h-[600px] w-full bg-black rounded-lg overflow-hidden border border-gray-800">
            <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />

                {/* The Digital Tunnel Grid */}
                <gridHelper args={[100, 50, 0x00ffff, 0x222222]} position={[0, -2, -50]} scale={[1, 1, 5]} />

                {particles.map((p) => (
                    <LogParticle
                        key={p.id}
                        {...p}
                        onDispose={() => removeParticle(p.id)}
                    />
                ))}

                <OrbitControls enableZoom={false} />
                <Environment preset="city" />

                {/* Effect: Bloom/Glow would go here with PostProcessing */}
            </Canvas>
        </div>
    );
}
