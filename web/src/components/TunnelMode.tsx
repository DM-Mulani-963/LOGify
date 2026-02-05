import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Tunnel } from '../../components/Tunnel';
import { LogEntry } from '../../types';

interface TunnelModeProps {
  logs: LogEntry[];
  onClose: () => void;
}

const TunnelMode: React.FC<TunnelModeProps> = ({ logs, onClose }) => {
  const [selectedLog, setSelectedLog] = React.useState<LogEntry | null>(null);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950">
      {/* 3D Canvas */}
      <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
        <color attach="background" args={['#020617']} />
        <Tunnel logs={logs} speedMultiplier={1} interactive={true} onBallClick={setSelectedLog} />
        <OrbitControls enableZoom={true} enablePan={true} autoRotate autoRotateSpeed={0.3} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
      </Canvas>

      {/* HUD Overlay */}
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-blue-500/20 rounded-lg p-4 pointer-events-auto">
          <h2 className="text-xl font-bold text-blue-400 font-orbitron">TUNNEL MODE</h2>
          <p className="text-xs text-slate-400 mt-1">Drag to rotate • Scroll to zoom • ESC to exit</p>
        </div>
        <button
          onClick={onClose}
          className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg px-6 py-3 font-bold text-red-400 transition-all pointer-events-auto"
        >
          EXIT TUNNEL MODE
        </button>
      </div>

      {/* Log Info Panel */}
      {selectedLog && (
        <div className="absolute bottom-0 right-0 m-6 w-96 bg-slate-900/90 backdrop-blur-xl border border-blue-500/20 rounded-lg p-6 pointer-events-auto">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-bold text-blue-400">Log Details</h3>
            <button
              onClick={() => setSelectedLog(null)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-3 text-sm">
            <div>
              <label className="text-xs text-slate-500 uppercase">Level</label>
              <p className={`font-bold ${
                selectedLog.level === 'ERROR' ? 'text-red-400' :
                selectedLog.level === 'WARN' ? 'text-yellow-400' :
                'text-blue-400'
              }`}>{selectedLog.level}</p>
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase">Source</label>
              <p className="text-slate-300 font-mono">{selectedLog.source}</p>
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase">Timestamp</label>
              <p className="text-slate-300 font-mono">
                {new Date(selectedLog.timestamp).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase">Message</label>
              <p className="text-slate-200 font-mono text-xs break-all">{selectedLog.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TunnelMode;
