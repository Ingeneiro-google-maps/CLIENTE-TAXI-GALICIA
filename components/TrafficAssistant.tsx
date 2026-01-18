import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, X, Activity, Radio, Volume2, AlertTriangle, CheckCircle2, RefreshCw, PowerOff, Loader2 } from 'lucide-react';

// --- Audio Helpers (Encoding/Decoding) ---

function downsampleBuffer(buffer: Float32Array, inputRate: number, outputRate: number = 16000): Float32Array {
  if (inputRate === outputRate) return buffer;
  if (!buffer || buffer.length === 0) return new Float32Array(0);
  
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
  // State Machine: 'idle' | 'connecting' | 'connected' | 'error'
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [isActive, setIsActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusText, setStatusText] = useState('Desconectado');

  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null); 
  const nextStartTimeRef = useRef<number>(0);
  const sourceNodesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Force close on unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, []);

  const SYSTEM_INSTRUCTION = `
    Eres el "Asistente de Viaje y Tráfico" de Taxi Vero Caldas.
    Tu objetivo es dar información de tráfico, clima y carreteras en Galicia.
    
    1. AL INICIAR: Di "Hola, soy tu asistente de viaje. ¿Qué ruta comprobamos hoy?".
    2. ESPERA la respuesta del usuario.
    3. USA SIEMPRE la herramienta 'googleSearch' para buscar datos reales de la DGT o accidentes.
    4. Sé breve y profesional.
  `;

  const cleanupAudio = () => {
    // Stop all playing audio
    sourceNodesRef.current.forEach(node => {
      try { node.stop(); } catch (e) {}
    });
    sourceNodesRef.current.clear();

    // Close Contexts
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    audioContextRef.current = null;

    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      inputAudioContextRef.current.close();
    }
    inputAudioContextRef.current = null;

    // Stop Mic Stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    // Disconnect Processor
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    
    if ((window as any)._trafficScriptProcessor) {
      (window as any)._trafficScriptProcessor = null;
    }

    sessionRef.current = null;
    setIsSpeaking(false);
    nextStartTimeRef.current = 0;
  };

  const getApiKey = () => {
    // Priority: Env Var -> Hardcoded Fallback
    const key = process.env.API_KEY || "AIzaSyCYZm2lUlqvPfz34PHocEmqYKiLnX0__pU";
    return key;
  };

  const startSession = async () => {
    cleanupAudio(); // Ensure clean slate
    setErrorMessage(null);
    setStatus('connecting');
    setStatusText('Iniciando sistemas...');

    const apiKey = getApiKey();
    
    if (!apiKey) {
        setErrorMessage("Error: Falta API Key");
        setStatus('error');
        return;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
         throw new Error('Tu navegador no soporta acceso al micrófono.');
      }

      // Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioContextClass();
      const outputCtx = new AudioContextClass();

      // Resume immediately (requires user gesture, which calls this function)
      await Promise.all([inputCtx.resume(), outputCtx.resume()]);

      inputAudioContextRef.current = inputCtx;
      audioContextRef.current = outputCtx;

      setStatusText('Accediendo al micrófono...');

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000 
        } 
      });
      mediaStreamRef.current = stream;

      setStatusText('Conectando con satélite...');

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
            console.log('Gemini Connected Successfully');
            setStatus('connected');
            setStatusText('En línea. Escuchando...');
            
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
              }).catch(() => {});
            };

            source.connect(processor);
            processor.connect(inputAudioContextRef.current.destination);

            // Send initial silence to wake up the model
            setTimeout(() => {
                try {
                  const silenceFrame = new Float32Array(16000); 
                  const silenceBlob = createBlob(silenceFrame);
                  sessionPromise.then(session => {
                    session.sendRealtimeInput({ media: silenceBlob });
                  });
                } catch(e) {}
            }, 500);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            
            if (base64Audio && audioContextRef.current) {
              setIsSpeaking(true);
              setStatusText('Analizando tráfico...');
              try {
                const ctx = audioContextRef.current;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000);
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                source.onended = () => {
                  sourceNodesRef.current.delete(source);
                  if (sourceNodesRef.current.size === 0) {
                    setIsSpeaking(false);
                    setStatusText('Esperando instrucciones...');
                  }
                };
                source.start(nextStartTimeRef.current);
                sourceNodesRef.current.add(source);
                nextStartTimeRef.current += audioBuffer.duration;
              } catch (err) {
                 console.error("Decode error", err);
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
            console.log('Gemini Connection Closed:', e.code, e.reason);
            cleanupAudio();
            setStatus('error');
            
            if (e.code === 1008) {
                setErrorMessage('Error de Dominio: Verifica Google Console.');
            } else {
                setErrorMessage('Conexión perdida con el servidor.');
            }
          },
          onerror: (err) => {
            console.error('Gemini Error Event:', err);
            // We let onclose handle the state transition
          }
        }
      });

    } catch (err: any) {
      console.error('Initialization Error:', err);
      setStatus('error');
      if (err.name === 'NotAllowedError') {
          setErrorMessage('Acceso al micrófono denegado.');
      } else {
         setErrorMessage('No se pudo iniciar el servicio.');
      }
      cleanupAudio();
    }
  };

  const handleToggle = () => {
    if (isActive) {
      // Turn Off
      setIsActive(false);
      setStatus('idle');
      cleanupAudio();
    } else {
      // Turn On
      setIsActive(true);
      startSession();
    }
  };

  const handleRetry = () => {
      startSession();
  };

  return (
    <>
      <button
        onClick={handleToggle}
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
          
          {/* Header */}
          <div className="bg-yellow-400 p-3 flex items-center justify-between">
            <h3 className="font-black text-black text-sm uppercase flex items-center gap-2">
              <Activity size={16} /> Radar de Tráfico
            </h3>
            <div className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-600 animate-pulse' : 'bg-red-500'}`}></span>
              <span className="text-[10px] font-bold text-black uppercase">
                {status === 'connected' ? 'LIVE' : 'OFF'}
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 flex flex-col items-center justify-center min-h-[160px] relative">
            
            <div className="absolute inset-0 opacity-10" 
                 style={{backgroundImage: 'radial-gradient(#F7C948 1px, transparent 1px)', backgroundSize: '10px 10px'}}>
            </div>

            {status === 'error' ? (
              <div className="flex flex-col items-center justify-center p-3 bg-red-900/80 rounded-lg border border-red-500/50 w-full animate-in fade-in zoom-in z-20">
                 <PowerOff className="text-red-400 mb-2 shrink-0" size={24} />
                 <p className="text-red-100 text-xs font-bold text-center mb-3 leading-tight">
                   {errorMessage || "Error desconocido"}
                 </p>
                 <button onClick={handleRetry} className="bg-white text-red-900 hover:bg-zinc-200 text-[10px] px-4 py-2 rounded-full font-bold transition-colors flex items-center gap-2 shadow-lg">
                    <RefreshCw size={12} /> REINTENTAR MANUALMENTE
                 </button>
              </div>
            ) : status === 'connecting' ? (
              <div className="flex flex-col items-center justify-center gap-3">
                 <Loader2 className="animate-spin text-yellow-400" size={32} />
                 <p className="text-xs text-yellow-400 font-mono animate-pulse">{statusText}</p>
              </div>
            ) : (
              <>
                <div className="relative">
                  {status === 'connected' && (
                    <>
                      <div className="absolute inset-0 rounded-full border border-yellow-400/30 animate-ping" style={{animationDuration: '2s'}}></div>
                    </>
                  )}
                  
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${isSpeaking ? 'bg-yellow-400 scale-110 shadow-[0_0_30px_rgba(250,204,21,0.6)]' : 'bg-zinc-800 border border-zinc-700'}`}>
                    {isSpeaking ? (
                      <Volume2 size={32} className="text-black animate-bounce" />
                    ) : (
                      <Mic size={32} className={`${status === 'connected' ? 'text-yellow-400' : 'text-zinc-500'} ${status === 'connected' ? 'animate-pulse' : ''}`} />
                    )}
                  </div>
                </div>

                <p className="mt-6 text-yellow-400 font-mono text-xs text-center uppercase tracking-widest animate-pulse">
                  {statusText}
                </p>
              </>
            )}
          </div>

          <div className="bg-black p-3 text-[10px] text-zinc-500 border-t border-zinc-800 text-center">
            <p><strong>Truco:</strong> Di "Tráfico en AP-9" o "Accidentes cerca de mí"</p>
          </div>
        </div>
      )}
    </>
  );
};

export default TrafficAssistant;