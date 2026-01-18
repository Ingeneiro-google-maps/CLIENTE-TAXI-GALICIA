import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, X, Activity, Radio, Volume2, AlertCircle, AlertTriangle } from 'lucide-react';

// --- Audio Helpers (Encoding/Decoding) ---

function downsampleBuffer(buffer: Float32Array, inputRate: number, outputRate: number = 16000): Float32Array {
  if (inputRate === outputRate) return buffer;
  
  const sampleRateRatio = inputRate / outputRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  
  for (let i = 0; i < newLength; i++) {
    const nextOffsetBuffer = Math.round((i + 1) * sampleRateRatio);
    const offsetBuffer = Math.round(i * sampleRateRatio);
    
    let accum = 0, count = 0;
    for (let j = offsetBuffer; j < nextOffsetBuffer && j < buffer.length; j++) {
      accum += buffer[j];
      count++;
    }
    if (count === 0 && offsetBuffer < buffer.length) {
       accum = buffer[offsetBuffer];
       count = 1;
    }

    result[i] = count > 0 ? accum / count : 0;
  }
  return result;
}

function createBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    let s = Math.max(-1, Math.min(1, data[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
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

  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null); 
  const nextStartTimeRef = useRef<number>(0);
  const sourceNodesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const SYSTEM_INSTRUCTION = `
    Eres el "Asistente de Viaje y Tráfico" de Taxi Vero Caldas, operando en Galicia, España.
    
    INSTRUCCIÓN DE INICIO:
    - Tu primera respuesta SIEMPRE debe ser el saludo.
    - SALUDA EXACTAMENTE ASÍ: "Hola, soy tu asistente de viaje. Puedes aquí consultar tráficos, accidentes y notificarme en la vida de la carretera."

    COMPORTAMIENTO:
    1. Después del saludo, espera a que el usuario hable.
    2. Si el usuario te pregunta por el tráfico, pregúntale: "¿En qué ruta quieres verificar si hay tráfico o algún accidente?"
    3. Cuando el usuario te diga una ruta (ej: "de Pontevedra a Vigo", "AP-9", "A-55"), USA LA HERRAMIENTA GOOGLE SEARCH INMEDIATAMENTE.
    4. Busca específicamente: "tráfico DGT Galicia [ruta]", "accidentes hoy [ruta]", "twitter tráfico galicia [ruta]".
    5. Informa de manera profesional y concisa sobre incidentes, retenciones, clima o si la vía está despejada.
  `;

  const cleanupAudio = () => {
    sourceNodesRef.current.forEach(node => {
      try { node.stop(); } catch (e) {}
    });
    sourceNodesRef.current.clear();

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
    
    if ((window as any)._trafficScriptProcessor) {
      (window as any)._trafficScriptProcessor = null;
    }

    sessionRef.current = null;
    setIsConnected(false);
    setIsSpeaking(false);
    nextStartTimeRef.current = 0;
  };

  const getApiKey = () => {
    // 1. Try process.env first (Standard/Node/Webpack)
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }

    // 2. Try Vite/Vercel Import Meta (Most likely for this project)
    try {
      // @ts-ignore
      if (typeof import.meta !== 'undefined' && import.meta.env) {
         // @ts-ignore
         if (import.meta.env.VITE_API_KEY) return import.meta.env.VITE_API_KEY;
         // @ts-ignore
         if (import.meta.env.VITE_GOOGLE_API_KEY) return import.meta.env.VITE_GOOGLE_API_KEY;
      }
    } catch (e) {}

    // 3. Fallbacks
    if (typeof process !== 'undefined' && process.env) {
        if (process.env.NEXT_PUBLIC_API_KEY) return process.env.NEXT_PUBLIC_API_KEY;
        if (process.env.REACT_APP_API_KEY) return process.env.REACT_APP_API_KEY;
    }

    return "";
  };

  const startSession = async () => {
    setError(null);
    setStatusMessage('Iniciando sistemas...');

    // 0. Check API Key immediately
    const apiKey = getApiKey();
    if (!apiKey) {
        const isVercel = window.location.hostname.includes('vercel.app');
        const msg = isVercel
            ? "Falta 'VITE_API_KEY' en Vercel. Ve a Settings > Environment Variables y añádela."
            : "Error: No se encontró API Key. Configura VITE_API_KEY en tu archivo .env";
        
        setError(msg);
        console.error("TRAFFIC ASSISTANT ERROR:", msg);
        return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
       setError('Error: Navegador no compatible o falta HTTPS.');
       return;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      
      // 1. Initialize Contexts immediately to capture User Gesture
      const inputCtx = new AudioContextClass();
      const outputCtx = new AudioContextClass();

      // 2. Resume immediately (Critical for mobile)
      await Promise.all([inputCtx.resume(), outputCtx.resume()]);

      inputAudioContextRef.current = inputCtx;
      audioContextRef.current = outputCtx;

      setStatusMessage('Conectando con satélite...');

      // 3. Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1, 
        } 
      });
      mediaStreamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey });
      
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
            
            if (!inputAudioContextRef.current || !stream) return;
            
            const currentSampleRate = inputAudioContextRef.current.sampleRate;
            const source = inputAudioContextRef.current.createMediaStreamSource(stream);
            const processor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            scriptProcessorRef.current = processor;
            (window as any)._trafficScriptProcessor = processor;

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const downsampledData = downsampleBuffer(inputData, currentSampleRate, 16000);
              const pcmBlob = createBlob(downsampledData);
              
              sessionPromise.then(session => {
                sessionRef.current = session;
                session.sendRealtimeInput({ media: pcmBlob });
              }).catch(err => {
                 // Silent catch
              });
            };

            source.connect(processor);
            processor.connect(inputAudioContextRef.current.destination);

            // Wake up signal
            setTimeout(() => {
                const silenceFrame = new Float32Array(16000); 
                const silenceBlob = createBlob(silenceFrame);
                sessionPromise.then(session => {
                   session.sendRealtimeInput({ media: silenceBlob });
                }).catch(e => console.warn("Initial silence failed", e));
            }, 500);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            
            if (base64Audio && audioContextRef.current) {
              setIsSpeaking(true);
              setStatusMessage('Analizando tráfico...');
              
              try {
                const ctx = audioContextRef.current;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                
                const audioBuffer = await decodeAudioData(
                  decode(base64Audio),
                  ctx,
                  24000
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

            if (msg.serverContent?.interrupted) {
              sourceNodesRef.current.forEach(node => node.stop());
              sourceNodesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsSpeaking(false);
            }
          },
          onclose: (e: CloseEvent) => {
            console.log('Gemini Live Disconnected', e);
            cleanupAudio();
            setStatusMessage('Desconectado');
            if (e && e.code !== 1000) {
                 // Common error for missing key or bad permissions
                 setError(`Desconexión (Code ${e.code}). Revisa API Key y Permisos.`);
            }
          },
          onerror: (err) => {
            console.error('Gemini Live Error:', err);
            const errStr = err.toString();
            
            if (errStr.includes('permission') || errStr.includes('denied')) {
                setError('Permiso de micrófono denegado.');
            } else if (errStr.includes('403') || errStr.includes('key')) {
                setError('Error 403: API Key inválida o restringida por dominio.');
            } else {
                setError('Error de conexión con el servidor.');
            }
            cleanupAudio();
          }
        }
      });

    } catch (err: any) {
      console.error('Initialization Error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Permiso de micrófono denegado.');
      } else if (err.name === 'NotFoundError') {
          setError('No se encontró micrófono.');
      } else {
          setError(err.message || 'Error desconocido.');
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

      {isActive && (
        <div className="fixed bottom-24 left-6 z-50 w-80 bg-zinc-900/95 backdrop-blur-md border-2 border-yellow-400 rounded-2xl shadow-[0_0_30px_rgba(250,204,21,0.2)] overflow-hidden flex flex-col animate-fade-in-up">
          
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

          <div className="p-6 flex flex-col items-center justify-center min-h-[160px] relative">
            
            <div className="absolute inset-0 opacity-10" 
                 style={{backgroundImage: 'radial-gradient(#F7C948 1px, transparent 1px)', backgroundSize: '10px 10px'}}>
            </div>

            {error ? (
              <div className="flex flex-col items-center justify-center p-3 bg-red-900/40 rounded-lg border border-red-500/50 w-full animate-in fade-in zoom-in">
                 <AlertTriangle className="text-red-500 mb-2" size={28} />
                 <p className="text-red-400 text-xs text-center font-bold break-words w-full leading-tight">{error}</p>
                 <button onClick={() => { setError(null); toggleAssistant(); }} className="mt-3 bg-red-900/50 text-white text-[10px] px-3 py-1 rounded hover:bg-red-800 transition-colors">
                    Cerrar e Intentar de nuevo
                 </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  {isConnected && (
                    <>
                      <div className="absolute inset-0 rounded-full border border-yellow-400/30 animate-ping" style={{animationDuration: '2s'}}></div>
                      <div className="absolute inset-0 rounded-full border border-yellow-400/20 animate-ping" style={{animationDuration: '3s', animationDelay: '0.5s'}}></div>
                    </>
                  )}
                  
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

          <div className="bg-black p-3 text-[10px] text-zinc-500 border-t border-zinc-800 text-center">
            <p className="mb-2">"¿Hay accidentes en la AP-9?" <br/> "Verifica tráfico a Santiago"</p>
            <p className="text-[9px] text-zinc-700 mt-2 border-t border-zinc-900 pt-1">
              System developed by Engineer Orlando Galdames.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default TrafficAssistant;