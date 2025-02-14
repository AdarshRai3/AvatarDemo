import React, { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";

const Avatar = ({ glbUrl }) => {
  const { scene, nodes } = useGLTF(glbUrl);
  const avatarRef = useRef(null);
  const eyeRef = useRef(null);
  const mouthRef = useRef(null);
  const [eyeDirection, setEyeDirection] = useState({ x: 0, y: 0 });
  const [mouthOpen, setMouthOpen] = useState(0);

  useEffect(() => {
    console.log("Nodes available:", nodes);
    Object.keys(nodes).forEach((key) => {
      console.log(`Mesh: ${key}`, nodes[key].morphTargetDictionary);
    });
  }, [nodes]);

  useEffect(() => {
    if (!scene) return;
    avatarRef.current = scene;

    scene.traverse((child) => {
      if (child.isMesh && child.morphTargetDictionary) {
        if ("eyeLookLeft" in child.morphTargetDictionary) {
          eyeRef.current = child;
          console.log("Found Eye Blend Shapes:", child.morphTargetDictionary);
        }
        if ("mouthOpen" in child.morphTargetDictionary) {
          mouthRef.current = child;
          console.log("Found Mouth Blend Shapes:", child.morphTargetDictionary);
        }
      }
    });
  }, [scene]);

  useFrame(() => {
    if (eyeRef.current) {
      const { morphTargetInfluences, morphTargetDictionary } = eyeRef.current;

      morphTargetInfluences[morphTargetDictionary["eyeLookLeft"]] = Math.max(0, eyeDirection.x);
      morphTargetInfluences[morphTargetDictionary["eyeLookRight"]] = Math.max(0, -eyeDirection.x);
      morphTargetInfluences[morphTargetDictionary["eyeLookUp"]] = Math.max(0, eyeDirection.y);
      morphTargetInfluences[morphTargetDictionary["eyeLookDown"]] = Math.max(0, -eyeDirection.y);
    }

    if (mouthRef.current) {
      const { morphTargetInfluences, morphTargetDictionary } = mouthRef.current;
      morphTargetInfluences[morphTargetDictionary["mouthOpen"]] = mouthOpen;
    }
  });

  // Random eye movement every 3-5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setEyeDirection({
        x: (Math.random() - 0.5) * 0.4,
        y: (Math.random() - 0.5) * 0.4,
      });
    }, Math.random() * 2000 + 3000);

    return () => clearInterval(interval);
  }, []);

  // Mouth movement every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMouthOpen(Math.random() * 0.8);
      setTimeout(() => setMouthOpen(0), 500); // Close mouth after 0.5 sec
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return <primitive object={scene} position={[0, -1.2, 0]} scale={1.6} />;
};

const AvatarViewer = ({ glbUrl }) => {
  return (
    <div
      style={{
        width: "600px",
        height: "450px",
        borderRadius: "10px",
        overflow: "hidden",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#ffffff",
      }}
    >
      <Canvas camera={{ position: [0, 1.6, 1.2], fov: 25 }}>
        <ambientLight intensity={1} />
        <directionalLight position={[2, 2, 2]} intensity={1} />
        <Suspense fallback={null}>
          <Avatar glbUrl={glbUrl} />
        </Suspense>
        <OrbitControls
          enableZoom={false}
          minPolarAngle={Math.PI / 2.3}
          maxPolarAngle={Math.PI / 2.3}
          target={[0, 1.4, 0]}
        />
      </Canvas>
    </div>
  );
};

export default AvatarViewer;
