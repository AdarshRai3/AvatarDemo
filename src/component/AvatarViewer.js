import React, { Suspense, useState, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import axios from "axios";

const AvatarModel = ({ glbUrl, isBlinking, isNodding, mouthOpenValue }) => {
  const { scene } = useGLTF(glbUrl);
  const headRef = useRef();
  const initialHeadRotation = useRef(null);
  const nodAnimationRef = useRef(null);
  const blinkAnimationRef = useRef(null);

  // Initial setup for head reference
  useEffect(() => {
    if (scene) {
      const head = scene.getObjectByName("Head");
      if (head) {
        headRef.current = head;
        initialHeadRotation.current = head.rotation.x;
      }
    }
  }, [scene]);

  // Handle blinking with smooth animation
  useEffect(() => {
    if (scene) {
      const head = scene.getObjectByName("Head");
      if (head && head.morphTargetDictionary && head.morphTargetInfluences) {
        const blinkIndex = head.morphTargetDictionary["eyesClosed"];
        
        if (isBlinking && blinkIndex !== undefined && !blinkAnimationRef.current) {
          const startTime = Date.now();
          const blinkDuration = 200; // Faster, more natural blink duration
          
          blinkAnimationRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / blinkDuration, 1);
            
            // Smooth easing function for natural blink
            const blinkValue = progress <= 0.5 
              ? progress * 2  // Close eyes
              : 2 * (1 - progress); // Open eyes
            
            head.morphTargetInfluences[blinkIndex] = blinkValue;
            
            if (progress >= 1) {
              clearInterval(blinkAnimationRef.current);
              blinkAnimationRef.current = null;
              head.morphTargetInfluences[blinkIndex] = 0;
            }
          }, 16);
        }
      }
    }
    
    return () => {
      if (blinkAnimationRef.current) {
        clearInterval(blinkAnimationRef.current);
        blinkAnimationRef.current = null;
      }
    };
  }, [isBlinking, scene]);

  // Handle nodding with subtle, single nod
  useEffect(() => {
    if (headRef.current && initialHeadRotation.current !== null) {
      if (isNodding && !nodAnimationRef.current) {
        let startTime = Date.now();
        const duration = 800; // Duration for a single, subtle nod
        
        nodAnimationRef.current = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          // Single subtle nod using sine wave
          const nodAngle = Math.sin(progress * Math.PI) * 0.1; // Reduced amplitude for subtlety
          headRef.current.rotation.x = initialHeadRotation.current + nodAngle;
          
          if (progress >= 1) {
            clearInterval(nodAnimationRef.current);
            headRef.current.rotation.x = initialHeadRotation.current;
            nodAnimationRef.current = null;
          }
        }, 16);
      }
    }
    
    return () => {
      if (nodAnimationRef.current) {
        clearInterval(nodAnimationRef.current);
        if (headRef.current) {
          headRef.current.rotation.x = initialHeadRotation.current;
        }
        nodAnimationRef.current = null;
      }
    };
  }, [isNodding]);


  // Handle mouth movement for lip sync
  useEffect(() => {
    if (scene) {
      scene.traverse((object) => {
        if (object.isMesh && object.morphTargetDictionary && object.morphTargetInfluences) {
          const mouthOpenIndex = object.morphTargetDictionary["mouthOpen"];
          if (mouthOpenIndex !== undefined) {
            object.morphTargetInfluences[mouthOpenIndex] = mouthOpenValue;
          }
        }
      });
    }
  }, [mouthOpenValue, scene]);

  return <primitive object={scene} position={[0, -1.2, 0]} scale={1.6} />;
};

// Preload the model
useGLTF.preload("https://models.readyplayer.me/67af11145cbda0313498bf57.glb");

const AvatarViewer = ({ glbUrl }) => {
  const [isBlinking, setIsBlinking] = useState(false);
  const [isNodding, setIsNodding] = useState(false);
  const [mouthOpenValue, setMouthOpenValue] = useState(0);
  const [responseText, setResponseText] = useState("Click the mic to start a conversation");
  const [conversationActive, setConversationActive] = useState(false);
  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();
  const isSpeakingRef = useRef(false);
  const utteranceRef = useRef(null);
  const lastTranscriptRef = useRef("");
  const userInterruptedRef = useRef(false);
  const selfSpeechTimeoutRef = useRef(null);
  const lastProcessedTranscriptRef = useRef("");
  const processingTimeoutRef = useRef(null);

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
    }, 3000); // Blink every 3 seconds
    
    return () => clearInterval(blinkInterval);
  }, []);
  
  // Replace the existing nodding setup with this:
  useEffect(() => {
    if (listening) {
      setIsNodding(true);
      // Reset nodding after the animation duration
      setTimeout(() => setIsNodding(false), 800);
    }
  }, [listening]);

  // Handle speech recognition with keyword detection
  useEffect(() => {
    const interruptionKeywords = ['stop', 'listen', 'wait', 'pause', 'hold on'];
    
    const handleUserSpeech = () => {
      if (transcript && transcript !== lastTranscriptRef.current) {
        const lowercaseTranscript = transcript.toLowerCase();
        const hasInterruptionKeyword = interruptionKeywords.some(keyword => 
          lowercaseTranscript.includes(keyword)
        );
        
        // Only handle interruption if AI is speaking and user uses an interruption keyword
        if (isSpeakingRef.current && hasInterruptionKeyword) {
          userInterruptedRef.current = true;
          window.speechSynthesis.cancel();
          setResponseText("Yes, I'm listening. What would you like to say?");
          speak("Yes, I'm listening. What would you like to say?", true);
        } else if (!isSpeakingRef.current && transcript.trim().length > 0) {
          // Normal flow - user is speaking when AI is not
          setIsNodding(true);
          setTimeout(() => setIsNodding(false), 100);
          
          // Process after a brief delay to ensure complete sentence
          setTimeout(() => {
            const currentTranscript = transcript;
            lastTranscriptRef.current = currentTranscript;
            resetTranscript();
            sendToGemini(currentTranscript);
          }, 1500);
        }
      }
    };
    
    if (conversationActive) {
      handleUserSpeech();
    }
  }, [transcript, conversationActive, resetTranscript]);
  // Handle the Gemini API call
  const sendToGemini = async (text) => {
    try {
      // Stop any ongoing speech
      if (utteranceRef.current) {
        window.speechSynthesis.cancel();
      }
      
      setResponseText(`Processing: "${text}"`);
      
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
  };

  // Text-to-speech with lip sync and interruption handling
  const speak = (text, isInterruptionResponse = false) => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;
      
      // Disable speech recognition temporarily
      isSpeakingRef.current = true;
      SpeechRecognition.stopListening();
      
      let lipSyncInterval;
      
      utterance.onstart = () => {
        // Clear any existing timeouts
        if (selfSpeechTimeoutRef.current) {
          clearTimeout(selfSpeechTimeoutRef.current);
        }
        
        lipSyncInterval = setInterval(() => {
          setMouthOpenValue(Math.random() * 0.5 + 0.1);
        }, 100);
      };
      
      utterance.onend = () => {
        clearInterval(lipSyncInterval);
        setMouthOpenValue(0);
        
        // Add a small delay before re-enabling speech recognition
        selfSpeechTimeoutRef.current = setTimeout(() => {
          isSpeakingRef.current = false;
          if (conversationActive) {
            SpeechRecognition.startListening({ continuous: true });
          }
          
          if (isInterruptionResponse) {
            userInterruptedRef.current = false;
            resetTranscript();
            lastProcessedTranscriptRef.current = "";
          }
        }, 500); // 500ms delay to avoid self-feedback
        
        utteranceRef.current = null;
      };
      
      utterance.onerror = () => {
        clearInterval(lipSyncInterval);
        setMouthOpenValue(0);
        isSpeakingRef.current = false;
        utteranceRef.current = null;
        
        if (conversationActive) {
          SpeechRecognition.startListening({ continuous: true });
        }
      };
      
      window.speechSynthesis.speak(utterance);
    }
  };


  // Toggle conversation state
  const toggleConversation = () => {
    if (conversationActive) {
      // Stop conversation
      setConversationActive(false);
      if (utteranceRef.current) {
        window.speechSynthesis.cancel();
      }
      SpeechRecognition.stopListening();
      setResponseText("Click the mic to start a conversation");
      lastTranscriptRef.current = "";
      userInterruptedRef.current = false;
    } else {
      // Start conversation
      setConversationActive(true);
      setResponseText("I'm listening... say something!");
      lastTranscriptRef.current = "";
      userInterruptedRef.current = false;
      SpeechRecognition.startListening({ continuous: true });
    }
  };

  if (!browserSupportsSpeechRecognition) {
    return <div>Your browser doesn't support speech recognition. Please try a different browser.</div>;
  }

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
        onClick={toggleConversation}
        style={{ 
          marginTop: "20px", 
          padding: "10px 20px", 
          fontSize: "16px",
          backgroundColor: conversationActive ? "#ff6b6b" : "#4caf50",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer"
        }}
      >
        {conversationActive ? "🛑 End Conversation" : "🎤 Start Conversation"}
      </button>
      <div style={{ 
        marginTop: "20px", 
        padding: "15px", 
        backgroundColor: "#f0f0f0", 
        borderRadius: "5px",
        maxWidth: "500px",
        margin: "20px auto",
        textAlign: "left",
        minHeight: "100px"
      }}>
        <p><strong>{isSpeakingRef.current ? "AI is speaking:" : "AI response:"}</strong> {responseText}</p>
        {transcript && conversationActive && <p><strong>You are saying:</strong> {transcript}</p>}
        {conversationActive && <p className="text-sm text-gray-500" style={{ fontSize: "0.875rem", color: "#6b7280" }}>
          {isSpeakingRef.current ? 
            "Please wait while I'm speaking... (but I'm still listening if you need to interrupt)" : 
            "I'm listening... speak clearly!"}
        </p>}
      </div>
    </div>
  );
};

export default AvatarViewer;