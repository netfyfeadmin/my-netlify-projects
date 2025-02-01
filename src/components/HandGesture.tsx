import React, { useRef, useEffect, useState, useCallback, memo } from 'react';
import Webcam from 'react-webcam';
import { Camera, Loader2, Settings2, AlertCircle } from 'lucide-react';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as handpose from '@tensorflow-models/handpose';

interface HandGestureProps {
  onGesture: (fingers: number) => void;
}

const FRAME_RATE = 30;
const MAX_INIT_ATTEMPTS = 3;
const BUFFER_SIZE = 3;
const CONFIDENCE_THRESHOLD = 0.6;
const GESTURE_COOLDOWN = 500;

// Global state for TensorFlow.js
let tfInitialized = false;
let tfModel: handpose.HandPose | null = null;
let initializationPromise: Promise<handpose.HandPose> | null = null;

const initTF = async (): Promise<handpose.HandPose> => {
  // Return existing initialization promise if one is in progress
  if (initializationPromise) {
    return initializationPromise;
  }

  // Return existing model if already initialized
  if (tfInitialized && tfModel) {
    return tfModel;
  }

  // Create new initialization promise
  initializationPromise = (async () => {
    try {
      console.log('Starting TensorFlow.js initialization...');
      
      // Initialize TensorFlow.js with WebGL backend
      await tf.setBackend('webgl');
      await tf.ready();

      // Configure WebGL context for optimal performance
      const gl = (tf.backend() as any).getGPGPUContext().gl;
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.STENCIL_TEST);
      gl.disable(gl.BLEND);
      gl.disable(gl.DITHER);
      
      // Pre-warm GPU with a small tensor operation
      const warmupTensor = tf.zeros([1, 1, 1, 1]);
      warmupTensor.dispose();
      
      console.log('Loading handpose model...');
      tfModel = await handpose.load({
        maxContinuousChecks: 1,
        detectionConfidence: 0.8,
        iouThreshold: 0.3,
        scoreThreshold: 0.75
      });

      tfInitialized = true;
      console.log('TensorFlow.js and model initialized successfully');
      return tfModel;
    } catch (err) {
      console.error('TensorFlow.js initialization error:', err);
      tfInitialized = false;
      tfModel = null;
      throw err;
    } finally {
      initializationPromise = null;
    }
  })();

  return initializationPromise;
};

export const HandGesture = memo(function HandGesture({ onGesture }: HandGestureProps) {
  const webcamRef = useRef<Webcam>(null);
  const modelRef = useRef<handpose.HandPose | null>(null);
  const requestRef = useRef<number>();
  const lastGestureTime = useRef<number>(0);
  const gestureBufferRef = useRef<number[]>([]);
  const isDetectingRef = useRef(false);
  const modelLoadingRef = useRef(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFingers, setCurrentFingers] = useState<number>(0);
  const [initAttempts, setInitAttempts] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);

  // Get available cameras
  useEffect(() => {
    async function getCameras() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setCameras(videoDevices);
        if (videoDevices.length > 0 && !selectedCamera) {
          setSelectedCamera(videoDevices[0].deviceId);
        }
      } catch (err) {
        console.error('Error getting cameras:', err);
        setError('Failed to access camera list');
      }
    }

    getCameras();
  }, []);

  const countExtendedFingers = useCallback((landmarks: number[][]): number => {
    let count = 0;
    const fingerTips = [4, 8, 12, 16, 20]; // Thumb, Index, Middle, Ring, Pinky
    const fingerBases = [2, 5, 9, 13, 17];

    // For thumb
    const thumbTip = landmarks[4];
    const thumbBase = landmarks[2];
    if (thumbTip[0] < thumbBase[0]) {
      count++;
    }

    // For other fingers
    for (let i = 1; i < fingerTips.length; i++) {
      const tip = landmarks[fingerTips[i]];
      const base = landmarks[fingerBases[i]];
      const middle = landmarks[fingerBases[i] - 1];

      if (tip[1] < base[1] && middle[1] < base[1]) {
        count++;
      }
    }

    return count;
  }, []);

  // Initialize TensorFlow.js and load model
  useEffect(() => {
    let isMounted = true;
    let cleanup = false;

    async function initModel() {
      if (modelLoadingRef.current || cleanup) return;
      modelLoadingRef.current = true;

      try {
        setInitAttempts(prev => prev + 1);
        console.log('Starting initialization...');

        const model = await initTF();
        
        if (!isMounted || cleanup) return;
        
        console.log('Model loaded successfully');
        modelRef.current = model;
        setIsLoading(false);
      } catch (err) {
        console.error('Model loading error:', err);
        if (isMounted && !cleanup) {
          if (initAttempts < MAX_INIT_ATTEMPTS) {
            modelLoadingRef.current = false;
            setTimeout(initModel, 1000);
          } else {
            setError('Failed to initialize hand tracking. Please refresh the page and try again.');
            setIsLoading(false);
          }
        }
      }
    }

    initModel();

    return () => {
      cleanup = true;
      isMounted = false;
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [initAttempts]);

  // Start detection loop once model is loaded
  useEffect(() => {
    if (isLoading || !modelRef.current || !webcamRef.current?.video) return;

    let lastFrameTime = 0;
    const frameInterval = 1000 / FRAME_RATE;

    async function detect(timestamp: number) {
      if (!modelRef.current || !webcamRef.current?.video || isDetectingRef.current) {
        requestRef.current = requestAnimationFrame(detect);
        return;
      }

      const elapsed = timestamp - lastFrameTime;
      if (elapsed < frameInterval) {
        requestRef.current = requestAnimationFrame(detect);
        return;
      }

      try {
        isDetectingRef.current = true;
        lastFrameTime = timestamp;
        
        const video = webcamRef.current.video;
        
        if (video.readyState === 4) {
          const predictions = await modelRef.current.estimateHands(video);
          
          if (predictions.length > 0) {
            const fingers = countExtendedFingers(predictions[0].landmarks);
            setCurrentFingers(fingers);
            
            gestureBufferRef.current.push(fingers);
            if (gestureBufferRef.current.length > BUFFER_SIZE) {
              gestureBufferRef.current.shift();
            }

            if (gestureBufferRef.current.length === BUFFER_SIZE) {
              const counts: Record<number, number> = {};
              gestureBufferRef.current.forEach(f => {
                counts[f] = (counts[f] || 0) + 1;
              });

              const [mostCommon] = Object.entries(counts)
                .sort(([, a], [, b]) => b - a);
              
              const value = Number(mostCommon[0]);
              const confidence = counts[value] / BUFFER_SIZE;

              if (confidence >= CONFIDENCE_THRESHOLD) {
                const now = Date.now();
                if (now - lastGestureTime.current >= GESTURE_COOLDOWN) {
                  onGesture(value);
                  lastGestureTime.current = now;
                  gestureBufferRef.current = [];
                }
              }
            }
          } else {
            setCurrentFingers(0);
            gestureBufferRef.current = [];
          }
        }
      } catch (err) {
        console.error('Detection error:', err);
      } finally {
        isDetectingRef.current = false;
        requestRef.current = requestAnimationFrame(detect);
      }
    }

    requestRef.current = requestAnimationFrame(detect);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isLoading, countExtendedFingers, onGesture]);

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-2 text-white/80">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>
              {initAttempts > 0 
                ? `Initializing... (Attempt ${initAttempts}/${MAX_INIT_ATTEMPTS})`
                : 'Initializing...'}
            </span>
            {initAttempts > 0 && (
              <span className="text-xs text-white/60">
                This may take a few moments...
              </span>
            )}
          </div>
        </div>
      )}
      
      <div className="relative w-64 h-48 bg-black rounded-lg overflow-hidden">
        <Webcam
          ref={webcamRef}
          mirrored
          videoConstraints={{
            deviceId: selectedCamera,
            width: 320,
            height: 240,
            facingMode: "user",
            aspectRatio: 4/3,
            frameRate: { ideal: FRAME_RATE }
          }}
          className="w-full h-full object-cover"
          onUserMediaError={(err) => {
            console.error('Camera error:', err);
            setError('Failed to access camera. Please make sure you have granted camera permissions.');
          }}
        />
      </div>

      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded flex items-center gap-2">
        <Camera className="h-3 w-3" />
        <span>Fingers: {currentFingers || '–'}</span>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1 hover:bg-white/10 rounded transition-colors"
          title="Camera settings"
        >
          <Settings2 className="h-3 w-3" />
        </button>
      </div>

      {showSettings && cameras.length > 0 && (
        <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm rounded p-2 z-20">
          <select
            value={selectedCamera}
            onChange={(e) => setSelectedCamera(e.target.value)}
            className="w-full bg-white/10 rounded px-2 py-1 text-xs"
          >
            {cameras.map(camera => (
              <option key={camera.deviceId} value={camera.deviceId}>
                {camera.label || `Camera ${camera.deviceId.slice(0, 4)}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <div className="absolute top-2 left-2 right-2 bg-red-500/20 text-red-200 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button
            onClick={() => {
              setError(null);
              setInitAttempts(0);
              setIsLoading(true);
              modelLoadingRef.current = false;
            }}
            className="ml-2 px-2 py-1 bg-red-500/20 hover:bg-red-500/30 rounded"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
});