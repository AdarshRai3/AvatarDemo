// import React, { Suspense } from "react";
// import { Canvas } from "@react-three/fiber";
// import { OrbitControls, useGLTF } from "@react-three/drei";

// const Avatar = ({ glbUrl }) => {
//   const { scene } = useGLTF(glbUrl);
//   return <primitive object={scene} position={[0, -1.2, 0]} scale={1.6} />;
// };

// const AvatarViewer = ({ glbUrl }) => {
//   return (
//     <div
//       style={{
//         width: "500px", // Set a fixed width
//         height: "400px", // Set a fixed height (4:5 aspect ratio)
//         borderRadius: "10px", // Optional: rounded corners
//         overflow: "hidden", // Clip overflowing content
//         // border: "2px solid #ccc", // Optional: border for aesthetics
//         display: "flex",
//         justifyContent: "center",
//         alignItems: "center",
//         backgroundColor: "#ffffff", // Optional: background color
//       }}
//     >
//       <Canvas camera={{ position: [0, 1.6, 1.2], fov: 25 }}>
//         <ambientLight intensity={1} />
//         <directionalLight position={[2, 2, 2]} intensity={1} />
//         <Suspense fallback={null}>
//           <Avatar glbUrl={glbUrl} />
//         </Suspense>
//         <OrbitControls
//           enableZoom={false}
//           minPolarAngle={Math.PI / 2.3}
//           maxPolarAngle={Math.PI / 2.3}
//           target={[0, 1.4, 0]}
//         />
//       </Canvas>
//     </div>
//   );
// };

// export default AvatarViewer;
