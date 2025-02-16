import React, { Suspense, useState, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import axios from "axios";

const AvatarModel = ({ glbUrl, isBlinking, isNodding, mouthOpenValue }) => {
  const { scene } = useGLTF(glbUrl);
  const headRef = useRef();
  const initialHeadRotation = useRef(null);

  useEffect(() => {
    if (scene) {
      const head = scene.getObjectByName("Head");
      if (head) {
        headRef.current = head;
        initialHeadRotation.current = head.rotation.x;
      }
    }
  }, [scene]);

  // Handle blinking
  useEffect(() => {
    if (scene) {
      // Find the morph target index for blinking
      const head = scene.getObjectByName("Head");
      if (head && head.morphTargetDictionary && head.morphTargetInfluences) {
        const blinkIndex = head.morphTargetDictionary["eyesClosed"];
        if (blinkIndex !== undefined) {
          head.morphTargetInfluences[blinkIndex] = isBlinking ? 1 : 0;
        }
      }
    }
  }, [isBlinking, scene]);

  // Handle nodding
  useEffect(() => {
    if (headRef.current && initialHeadRotation.current !== null) {
      if (isNodding) {
        const nodInterval = setInterval(() => {
          headRef.current.rotation.x = initialHeadRotation.current + (Math.sin(Date.now() * 0.01) * 0.1);
        }, 16);
        
        return () => clearInterval(nodInterval);
      } else {
        headRef.current.rotation.x = initialHeadRotation.current;
      }
    }
  }, [isNodding]);

  // Handle mouth movement for lip sync
  useEffect(() => {
    if (scene) {
      const head = scene.getObjectByName("Head");
      if (head && head.morphTargetDictionary && head.morphTargetInfluences) {
        const mouthOpenIndex = head.morphTargetDictionary["mouthOpen"];
        if (mouthOpenIndex !== undefined) {
          head.morphTargetInfluences[mouthOpenIndex] = mouthOpenValue;
        }
      }
    }
  }, [mouthOpenValue, scene]);

  return <primitive object={scene} position={[0, -1.2, 0]} scale={1.6} />;
};

useGLTF.preload("https://models.readyplayer.me/67af11145cbda0313498bf57.glb");

const AvatarViewer = ({ glbUrl }) => {
  const [isBlinking, setIsBlinking] = useState(false);
  const [isNodding, setIsNodding] = useState(false);
  const [mouthOpenValue, setMouthOpenValue] = useState(0);
  const [responseText, setResponseText] = useState("Click the mic and speak");
  const { transcript, listening, resetTranscript } = useSpeechRecognition();
  const isSpeakingRef = useRef(false);

  // Set up automatic blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
    }, 4000 + Math.random() * 2000); // Random blink every 4-6 seconds
    
    return () => clearInterval(blinkInterval);
  }, []);

  // Handle speech recognition
  useEffect(() => {
    if (!listening && transcript) {
      setIsNodding(false);
      setTimeout(() => {
        sendToGemini(transcript);
      }, 500);
    } else if (listening) {
      setIsNodding(true);
    }
  }, [listening, transcript]);

  // Send user input to Gemini API
  const sendToGemini = async (text) => {
    try {
      const response = await axios.post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBeP3MxXlDGJFlYxQnfRiGkjXbJCVE7ZxI",
        {
          contents: [{ parts: [{ text }] }]
        }
      );
      
      if (response.data && response.data.candidates && response.data.candidates[0].content) {
        const aiResponse = response.data.candidates[0].content.parts[0].text;
        setResponseText(aiResponse);
        speak(aiResponse);
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      setResponseText("Sorry, I couldn't get a response from the AI at this time.");
      speak("Sorry, I couldn't get a response from the AI at this time.");
    }
    
    resetTranscript();
  };

  // Text-to-speech with lip sync
  const speak = (text) => {
    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set up lip sync
      isSpeakingRef.current = true;
      
      utterance.onstart = () => {
        const lipSyncInterval = setInterval(() => {
          if (isSpeakingRef.current) {
            setMouthOpenValue(Math.random() * 0.8); // Random mouth movement
          } else {
            clearInterval(lipSyncInterval);
            setMouthOpenValue(0);
          }
        }, 100);
      };
      
      utterance.onend = () => {
        isSpeakingRef.current = false;
        setMouthOpenValue(0);
      };
      
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          width: "500px",
          height: "400px",
          borderRadius: "10px",
          overflow: "hidden",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#ffffff",
          margin: "auto"
        }}
      >
        <Canvas camera={{ position: [0, 1.6, 1.2], fov: 25 }}>
          <ambientLight intensity={1} />
          <directionalLight position={[2, 2, 2]} intensity={1} />
          <Suspense fallback={null}>
            <AvatarModel 
              glbUrl={glbUrl} 
              isBlinking={isBlinking}
              isNodding={isNodding}
              mouthOpenValue={mouthOpenValue}
            />
          </Suspense>
          <OrbitControls enableZoom={false} minPolarAngle={Math.PI / 2.3} maxPolarAngle={Math.PI / 2.3} target={[0, 1.4, 0]} />
        </Canvas>
      </div>
      <button
        onClick={() => {
          if (!isSpeakingRef.current) {
            SpeechRecognition.startListening({ continuous: false })
          }
        }}
        style={{ 
          marginTop: "20px", 
          padding: "10px", 
          fontSize: "16px",
          backgroundColor: listening ? "#ff6b6b" : "#4caf50",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer"
        }}
      >
        {listening ? "🎤 Listening..." : "🎤 Speak"}
      </button>
      <div style={{ 
        marginTop: "20px", 
        padding: "15px", 
        backgroundColor: "#f0f0f0", 
        borderRadius: "5px",
        maxWidth: "500px",
        margin: "20px auto",
        textAlign: "left"
      }}>
        <p><strong>Response:</strong> {responseText}</p>
        {transcript && <p><strong>You said:</strong> {transcript}</p>}
      </div>
    </div>
  );
};

export default AvatarViewer;