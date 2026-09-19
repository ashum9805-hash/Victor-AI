// Gemini Multimodal Live API Client Service
// Handles bidirectional real-time audio streaming (16kHz PCM In, 24kHz PCM Out) with barge-in support.

import { formatMemoriesForSystemInstruction } from './personalizationService';

export type LiveSessionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'speaking'
  | 'interrupted'
  | 'error'
  | 'closed';

export interface LiveSessionCallbacks {
  onStatusChange: (status: LiveSessionStatus, detail?: string) => void;
  onAudioLevels: (inputLevel: number, outputLevel: number) => void;
  onTranscript?: (text: string, isModel: boolean) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
}

export class GeminiLiveSession {
  private ws: WebSocket | null = null;
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private status: LiveSessionStatus = 'idle';
  private callbacks: LiveSessionCallbacks;
  private nextPlayTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private isMuted: boolean = false;
  private voiceName: string = 'Zephyr';

  constructor(callbacks: LiveSessionCallbacks) {
    this.callbacks = callbacks;
  }

  public getStatus(): LiveSessionStatus {
    return this.status;
  }

  private setStatus(status: LiveSessionStatus, detail?: string) {
    this.status = status;
    this.callbacks.onStatusChange(status, detail);
  }

  // Convert Float32Array (-1.0 to 1.0) to 16-bit PCM Base64 string
  private floatTo16BitPCMBase64(input: Float32Array): string {
    const int16 = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const bytes = new Uint8Array(int16.buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // Convert 16-bit PCM Base64 string to Float32Array for Web Audio playback
  private base64ToFloat32PCM(base64: string): Float32Array {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / (int16[i] < 0 ? 32768 : 32767);
    }
    return float32;
  }

  // Calculate volume root-mean-square (RMS)
  private calculateRMS(data: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    const rms = Math.sqrt(sum / data.length);
    return Math.min(1, rms * 5); // Boost scale for responsive visualizer
  }

  public async connect(voiceName: string = 'Zephyr'): Promise<void> {
    this.voiceName = voiceName;
    this.setStatus('connecting', 'Establishing secure link to Gemini Live...');

    try {
      // 1. Request microphone permission first
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      // 2. Initialize Audio Contexts
      // Input Audio Context at 16,000Hz (Native Gemini PCM Input rate)
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.inputAudioCtx = new AudioCtx({ sampleRate: 16000 });
      // Output Audio Context at 24,000Hz (Native Gemini Live output rate)
      this.outputAudioCtx = new AudioCtx({ sampleRate: 24000 });

      // Resume if suspended by browser policy
      if (this.inputAudioCtx.state === 'suspended') {
        await this.inputAudioCtx.resume();
      }
      if (this.outputAudioCtx.state === 'suspended') {
        await this.outputAudioCtx.resume();
      }

      this.nextPlayTime = this.outputAudioCtx.currentTime;

      // 3. Connect to server WebSocket bridge
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const memoriesParam = encodeURIComponent(formatMemoriesForSystemInstruction());
      const wsUrl = `${protocol}//${window.location.host}/api/live?voice=${encodeURIComponent(voiceName)}&memories=${memoriesParam}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.setStatus('connected', 'Live channel open. Initializing audio pipeline...');
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleServerMessage(msg);
        } catch (err) {
          console.warn('[Live WS] Failed to parse message:', err);
        }
      };

      this.ws.onerror = (err) => {
        console.error('[Live WS Error]:', err);
        this.setStatus('error', 'Connection error occurred with Live service');
        if (this.callbacks.onError) {
          this.callbacks.onError('Connection error with the Gemini Live service.');
        }
      };

      this.ws.onclose = () => {
        this.setStatus('closed', 'Live session closed');
        if (this.callbacks.onClose) {
          this.callbacks.onClose();
        }
      };

      // 4. Setup Microphone Pipeline
      this.setupMicrophonePipeline();

    } catch (err: any) {
      console.error('[Live Connect Failed]:', err);
      const errMsg = err?.name === 'NotAllowedError'
        ? 'Microphone permission denied. Please allow microphone access to talk live with Victor.'
        : `Could not start live session: ${err?.message || err}`;
      this.setStatus('error', errMsg);
      if (this.callbacks.onError) {
        this.callbacks.onError(errMsg);
      }
      this.disconnect();
      throw err;
    }
  }

  private setupMicrophonePipeline() {
    if (!this.inputAudioCtx || !this.micStream) return;

    this.sourceNode = this.inputAudioCtx.createMediaStreamSource(this.micStream);
    // 2048 samples at 16kHz = ~128ms chunks for low-latency streaming
    this.processorNode = this.inputAudioCtx.createScriptProcessor(2048, 1, 1);

    this.processorNode.onaudioprocess = (e) => {
      if (this.isMuted || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.callbacks.onAudioLevels(0, 0);
        return;
      }

      const channelData = e.inputBuffer.getChannelData(0);
      const inputLevel = this.calculateRMS(channelData);

      // Report input level for visualizer
      this.callbacks.onAudioLevels(inputLevel, 0);

      // Convert and send PCM chunk to Gemini
      const base64Data = this.floatTo16BitPCMBase64(channelData);
      this.ws.send(JSON.stringify({
        type: 'audio',
        data: base64Data,
      }));
    };

    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.inputAudioCtx.destination);
    this.setStatus('listening', 'Connected! Speak naturally with Victor...');
  }

  private handleServerMessage(msg: any) {
    if (msg.type === 'ready') {
      this.setStatus('listening', `Victor is ready (${msg.voice || this.voiceName})`);
    } else if (msg.type === 'audio' && msg.audio) {
      this.playAudioChunk(msg.audio);
    } else if (msg.type === 'text' && msg.text) {
      if (this.callbacks.onTranscript) {
        this.callbacks.onTranscript(msg.text, true);
      }
    } else if (msg.type === 'interrupted') {
      // Barge-in: user spoke, model cuts off immediately
      this.handleInterruption();
    } else if (msg.type === 'turn_complete') {
      // Model finished current speech turn
      if (this.activeSources.length === 0) {
        this.setStatus('listening', 'Listening...');
      }
    } else if (msg.type === 'error') {
      this.setStatus('error', msg.error || 'Live service reported an error');
      if (this.callbacks.onError) {
        this.callbacks.onError(msg.error);
      }
    }
  }

  // Plays incoming 24kHz PCM audio chunk smoothly scheduled
  private playAudioChunk(base64Pcm: string) {
    if (!this.outputAudioCtx) return;

    try {
      const float32Data = this.base64ToFloat32PCM(base64Pcm);
      const outputLevel = this.calculateRMS(float32Data);
      this.callbacks.onAudioLevels(0, outputLevel);

      const buffer = this.outputAudioCtx.createBuffer(1, float32Data.length, 24000);
      buffer.getChannelData(0).set(float32Data);

      const source = this.outputAudioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.outputAudioCtx.destination);

      const currentTime = this.outputAudioCtx.currentTime;
      // If next scheduled time is in the past, reset to current time
      if (this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime;
      }

      source.start(this.nextPlayTime);
      this.nextPlayTime += buffer.duration;

      this.activeSources.push(source);
      this.setStatus('speaking', 'Victor is speaking...');

      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx !== -1) {
          this.activeSources.splice(idx, 1);
        }
        if (this.activeSources.length === 0) {
          this.setStatus('listening', 'Listening...');
        }
      };
    } catch (err) {
      console.warn('[Audio Playback Error]:', err);
    }
  }

  // Handle user barge-in / interruption
  private handleInterruption() {
    this.setStatus('interrupted', 'Interrupted');

    // Immediately stop all active & queued audio playback
    for (const src of this.activeSources) {
      try {
        src.stop();
        src.disconnect();
      } catch {}
    }
    this.activeSources = [];

    if (this.outputAudioCtx) {
      this.nextPlayTime = this.outputAudioCtx.currentTime;
    }

    setTimeout(() => {
      if (this.status === 'interrupted') {
        this.setStatus('listening', 'Listening...');
      }
    }, 200);
  }

  public sendTextMessage(text: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'text',
        text,
      }));
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.micStream) {
      this.micStream.getAudioTracks().forEach((t) => {
        t.enabled = !muted;
      });
    }
  }

  public isMicrophoneMuted(): boolean {
    return this.isMuted;
  }

  public disconnect() {
    this.setStatus('closed', 'Disconnected');

    // Stop and disconnect microphone
    if (this.processorNode) {
      try {
        this.processorNode.disconnect();
      } catch {}
      this.processorNode = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }

    // Stop audio sources
    for (const src of this.activeSources) {
      try {
        src.stop();
        src.disconnect();
      } catch {}
    }
    this.activeSources = [];

    // Close AudioContexts
    if (this.inputAudioCtx) {
      try {
        this.inputAudioCtx.close();
      } catch {}
      this.inputAudioCtx = null;
    }

    if (this.outputAudioCtx) {
      try {
        this.outputAudioCtx.close();
      } catch {}
      this.outputAudioCtx = null;
    }

    // Close WebSocket
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
  }
}
