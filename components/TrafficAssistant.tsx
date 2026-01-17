import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, X, Activity, Radio, Volume2 } from 'lucide-react';

// --- Audio Helpers (Encoding/Decoding) ---

function createBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  
  let binary = '';
  const bytes = new Uint8Array(int16.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  return {
    data: base64,
    mimeType: 'audio/pcm;rate=16000',
  };
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// --- Component ---

const TrafficAssistant: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Desconectado');

  // Refs for audio handling
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null); // To store the active session
  const nextStartTimeRef = useRef<number>(0);
  const sourceNodesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const SYSTEM_INSTRUCTION = `
    Eres el "Asistente de Viaje y Tráfico" de Taxi Vero Caldas, operando en Galicia, España.
    
    INSTRUCCIÓN DE INICIO:
    - Tu primera respuesta SIEMPRE debe ser el saludo, independientemente de lo que recibas primero.
    - SALUDA EXACTAMENTE ASÍ: "Hola, soy tu asistente de viaje. Puedes aquí consultar tráficos, accidentes y notificarme en la vida de la carretera."

    COMPORTAMIENTO:
    1. Después del saludo, espera a que el usuario hable.
    2. Si el usuario te pregunta por el tráfico, pregúntale: "¿En qué ruta quieres verificar si hay tráfico o algún accidente?"
    3. Cuando el usuario te diga una ruta (ej: "de Pontevedra a Vigo", "AP-9", "A-55"), USA LA HERRAMIENTA GOOGLE SEARCH INMEDIATAMENTE.
    4. Busca específicamente: "tráfico DGT Galicia [ruta]", "accidentes hoy [ruta]", "twitter tráfico galicia [ruta]".
    5. Informa de manera profesional y concisa sobre incidentes, retenciones, clima o si la vía está despejada. Si no encuentras nada relevante, dilo claramente: "He verificado las redes y sistemas de tráfico y no reportan incidencias en esa ruta ahora mismo."
    6. Sé servicial, rápido y usa un tono profesional de taxista/copiloto.
  `;

  const cleanupAudio = () => {
    // Stop all playing sources
    sourceNodesRef.current.forEach(node => {
      try { node.stop(); } catch (e) {}
    });
    sourceNodesRef.current.clear();

    // Close contexts
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    
    // Close Gemini session if method exists
    sessionRef.current = null;
    
    setIsConnected(false);
    setIsSpeaking(false);
    nextStartTimeRef.current = 0;
  };

  const startSession = async () => {
    setError(null);
    setStatusMessage('Iniciando sistemas...');

    // 1. Browser Capability Check
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
       setError('Tu navegador no soporta acceso al micrófono o la conexión no es segura.');
       return;
    }

    try {
      // 2. Initialize Audio Contexts immediately (User Interaction Context)
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      
      // Initialize Input Context (16kHz for Gemini)
      if (!inputAudioContextRef.current) {
        inputAudioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      }
      
      // Initialize Output Context (24kHz for Gemini)
      if (!audioContextRef.current) {
         audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      }

      // iOS/Mobile Compatibility: Force resume audio context
      if (inputAudioContextRef.current.state === 'suspended') {
        await inputAudioContextRef.current.resume();
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      setStatusMessage('Conectando con satélite...');

      // 3. Get Microphone Access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        } 
      });
      mediaStreamRef.current = stream;

      // 4. Initialize Gemini Client
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // 5. Connect to Live API
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ googleSearch: {} }],
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        },
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Connected');
            setIsConnected(true);
            setStatusMessage('En línea. Escuchando...');
            
            // Setup Microphone Stream Processing
            if (!inputAudioContextRef.current || !stream) return;
            
            const source = inputAudioContextRef.current.createMediaStreamSource(stream);
            const processor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = processor;

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              
              // Send audio chunk to Gemini
              sessionPromise.then(session => {
                sessionRef.current = session;
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(processor);
            processor.connect(inputAudioContextRef.current.destination);

            // --- AUTO-START TRIGGER ---
            // Send 1 second of "silence" to force the model to wake up and say the greeting
            // without waiting for user input.
            const silenceFrame = new Float32Array(16000); // 1 sec at 16k
            const silenceBlob = createBlob(silenceFrame);
            sessionPromise.then(session => {
               session.sendRealtimeInput({ media: silenceBlob });
            });
          },
          onmessage: async (msg: LiveServerMessage) => {
            // Handle Audio Output from Gemini
            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            
            if (base64Audio && audioContextRef.current) {
              setIsSpeaking(true);
              setStatusMessage('Analizando tráfico...');
              
              try {
                // Ensure timing is correct
                const ctx = audioContextRef.current;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                
                const audioBuffer = await decodeAudioData(
                  decode(base64Audio),
                  ctx
                );

                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                
                source.onended = () => {
                  sourceNodesRef.current.delete(source);
                  if (sourceNodesRef.current.size === 0) {
                    setIsSpeaking(false);
                    setStatusMessage('Esperando instrucciones...');
                  }
                };

                source.start(nextStartTimeRef.current);
                sourceNodesRef.current.add(source);
                nextStartTimeRef.current += audioBuffer.duration;
              } catch (err) {
                console.error("Audio decode error", err);
              }
            }

            // Handle interruptions
            if (msg.serverContent?.interrupted) {
              sourceNodesRef.current.forEach(node => node.stop());
              sourceNodesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsSpeaking(false);
            }
          },
          onclose: () => {
            console.log('Gemini Live Disconnected');
            cleanupAudio();
            setStatusMessage('Desconectado');
          },
          onerror: (err) => {
            console.error('Gemini Live Error:', err);
            if (err.toString().includes('permission') || err.toString().includes('denied')) {
                setError('Permiso de micrófono denegado.');
            } else {
                setError('Error de conexión con el satélite.');
            }
            cleanupAudio();
          }
        }
      });

    } catch (err: any) {
      console.error('Initialization Error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Permiso denegado. Habilita el micrófono.');
      } else if (err.name === 'NotFoundError') {
          setError('No se encontró micrófono.');
      } else {
          setError('Error al iniciar audio. Refresca la página.');
      }
      cleanupAudio();
    }
  };

  const toggleAssistant = () => {
    if (isActive) {
      cleanupAudio();
      setIsActive(false);
    } else {
      setIsActive(true);
      startSession();
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={toggleAssistant}
        className={`fixed bottom-6 left-6 z-50 p-4 rounded-full shadow-2xl transition-all duration-300 flex items-center gap-2 group ${
          isActive 
            ? 'bg-red-600 text-white animate-pulse' 
            : 'bg-black border-2 border-yellow-400 text-yellow-400 hover:bg-zinc-900'
        }`}
        title="Asistente de Tráfico"
      >
        {isActive ? <X size={24} /> : <Radio size={24} />}
        {!isActive && <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 whitespace-nowrap font-bold">Asistente Tráfico</span>}
      </button>

      {/* Assistant Interface Modal */}
      {isActive && (
        <div className="fixed bottom-24 left-6 z-50 w-80 bg-zinc-900/95 backdrop-blur-md border-2 border-yellow-400 rounded-2xl shadow-[0_0_30px_rgba(250,204,21,0.2)] overflow-hidden flex flex-col animate-fade-in-up">
          
          {/* Header */}
          <div className="bg-yellow-400 p-3 flex items-center justify-between">
            <h3 className="font-black text-black text-sm uppercase flex items-center gap-2">
              <Activity size={16} /> Radar de Tráfico
            </h3>
            <div className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-600 animate-pulse' : 'bg-red-500'}`}></span>
              <span className="text-[10px] font-bold text-black uppercase">
                {isConnected ? 'LIVE' : 'OFF'}
              </span>
            </div>
          </div>

          {/* Visualizer */}
          <div className="p-6 flex flex-col items-center justify-center min-h-[160px] relative">
            
            {/* Background Grid */}
            <div className="absolute inset-0 opacity-10" 
                 style={{backgroundImage: 'radial-gradient(#F7C948 1px, transparent 1px)', backgroundSize: '10px 10px'}}>
            </div>

            {error ? (
              <p className="text-red-400 text-xs text-center font-bold bg-red-900/20 p-2 rounded">{error}</p>
            ) : (
              <>
                <div className="relative">
                  {/* Outer Rings */}
                  {isConnected && (
                    <>
                      <div className="absolute inset-0 rounded-full border border-yellow-400/30 animate-ping" style={{animationDuration: '2s'}}></div>
                      <div className="absolute inset-0 rounded-full border border-yellow-400/20 animate-ping" style={{animationDuration: '3s', animationDelay: '0.5s'}}></div>
                    </>
                  )}
                  
                  {/* Central Icon */}
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${isSpeaking ? 'bg-yellow-400 scale-110 shadow-[0_0_30px_rgba(250,204,21,0.6)]' : 'bg-zinc-800 border border-zinc-700'}`}>
                    {isSpeaking ? (
                      <Volume2 size={32} className="text-black animate-bounce" />
                    ) : (
                      <Mic size={32} className={`${isConnected ? 'text-yellow-400' : 'text-zinc-500'}`} />
                    )}
                  </div>
                </div>

                <p className="mt-6 text-yellow-400 font-mono text-xs text-center uppercase tracking-widest animate-pulse">
                  {statusMessage}
                </p>
                
                {isSpeaking && (
                   <p className="text-[10px] text-zinc-500 mt-1">Recibiendo datos de DGT...</p>
                )}
              </>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-black p-3 text-[10px] text-zinc-500 border-t border-zinc-800 text-center">
            <p className="mb-2">"¿Hay accidentes en la AP-9?" <br/> "Verifica tráfico a Santiago"</p>
            <p className="text-[9px] text-zinc-700 mt-2 border-t border-zinc-900 pt-1">
              This system was developed by Engineer Orlando Galdames.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default TrafficAssistant;