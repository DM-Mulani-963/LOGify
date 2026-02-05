
import React, { useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { SystemStats } from '../types';

export const AudioEngine: React.FC<{ stats: SystemStats; enabled: boolean }> = ({ stats, enabled }) => {
  const synthRef = useRef<Tone.Oscillator | null>(null);
  const filterRef = useRef<Tone.Filter | null>(null);
  const noiseRef = useRef<Tone.Noise | null>(null);

  useEffect(() => {
    if (enabled) {
      // Start Tone
      Tone.start();
      
      // Base Drone
      const filter = new Tone.Filter(200, "lowpass").toDestination();
      const synth = new Tone.Oscillator(50, "sine").connect(filter).start();
      synth.volume.value = -20;

      // Error Noise
      const noise = new Tone.Noise("white").connect(filter).start();
      noise.volume.value = -100; // Start silent

      synthRef.current = synth;
      filterRef.current = filter;
      noiseRef.current = noise;
    } else {
      synthRef.current?.stop();
      noiseRef.current?.stop();
    }

    return () => {
      synthRef.current?.stop();
      noiseRef.current?.stop();
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !synthRef.current || !filterRef.current || !noiseRef.current) return;

    // Modulate pitch based on logs/sec
    const freq = 40 + (stats.logsPerSecond * 2);
    synthRef.current.frequency.rampTo(freq, 0.5);

    // Modulate noise based on error rate
    const noiseVol = stats.errorRate > 0 ? -30 + (stats.errorRate * 20) : -100;
    noiseRef.current.volume.rampTo(noiseVol, 0.5);

    // Modulate filter based on activity
    filterRef.current.frequency.rampTo(200 + (stats.logsPerSecond * 50), 0.5);

  }, [stats, enabled]);

  return null;
};
