import { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Center, useGLTF } from '@react-three/drei';
import { Box, Loader, Text } from '@mantine/core';
import * as THREE from 'three';

interface ModelViewerProps {
  url?: string;
  filePath?: string;
  fallbackUrl?: string;
}

// STL Loader component
function STLMesh({ url }: { url: string }) {
  const meshRef = useRef<THREE.Mesh>(null);

  // For now, create a placeholder box since we don't have direct STL loading in browser
  // In production, use @react-three/drei's useGLTF or a custom STL loader
  return (
    <Center>
      <mesh ref={meshRef}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#3b82f6" metalness={0.3} roughness={0.4} />
      </mesh>
    </Center>
  );
}

function LoadingFallback() {
  return (
    <Center style={{ height: '100%' }}>
      <Loader size="lg" color="blue" />
    </Center>
  );
}

function ErrorFallback() {
  return (
    <Center style={{ height: '100%' }}>
      <Text c="dimmed">Failed to load 3D model</Text>
    </Center>
  );
}

function Scene({ url }: { url?: string }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      // Slow auto-rotation
      groupRef.current.rotation.y += delta * 0.1;
    }
  });

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <directionalLight position={[-10, -10, -5]} intensity={0.3} />

      {/* Grid floor */}
      <Grid
        args={[10, 10]}
        cellSize={0.1}
        cellThickness={0.5}
        cellColor="#cbd5e1"
        sectionSize={0.5}
        sectionThickness={1}
        sectionColor="#94a3b8"
        fadeDistance={25}
        fadeStrength={1}
        position={[0, -0.5, 0]}
      />

      {/* Model */}
      <group ref={groupRef}>
        {url ? (
          <STLMesh url={url} />
        ) : (
          // Placeholder cube when no model
          <Center>
            <mesh>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#3b82f6" transparent opacity={0.5} />
            </mesh>
          </Center>
        )}
      </group>

      {/* Camera controls */}
      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={1}
        maxDistance={10}
      />
    </>
  );
}

export default function ModelViewer({ url, filePath }: ModelViewerProps) {
  // Build the full URL for the file
  // In production, we'd need to handle this differently
  const modelUrl = url || filePath;

  return (
    <Box className="viewer-container" style={{ height: '100%', minHeight: 300 }}>
      <Canvas
        camera={{ position: [2, 2, 2], fov: 50 }}
        shadows
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <Scene url={modelUrl} />
        </Suspense>
      </Canvas>
    </Box>
  );
}
