export const estimateReadingTime = (text: string): number => {
  const wordsPerMinute = 200;
  const noOfWords = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(noOfWords / wordsPerMinute));
};

let audioCtx: AudioContext | null = null;
let noiseSource: AudioBufferSourceNode | null = null;
let gainNode: GainNode | null = null;

export const toggleAmbientNoise = (enable: boolean) => {
  if (typeof window === 'undefined') return;
  
  if (enable) {
    if (noiseSource) return;
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    const bufferSize = audioCtx.sampleRate * 2; 
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; 
    }

    noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    gainNode = audioCtx.createGain();
    gainNode.gain.value = 0; 
    gainNode.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime + 3);

    noiseSource.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    noiseSource.start();
  } else {
    if (gainNode && audioCtx && noiseSource) {
      gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1);
      setTimeout(() => {
        if (noiseSource) {
          noiseSource.stop();
          noiseSource.disconnect();
          noiseSource = null;
        }
      }, 1000);
    }
  }
};

export const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light') => {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    try {
      switch (type) {
        case 'light': window.navigator.vibrate(10); break;
        case 'medium': window.navigator.vibrate(20); break;
        case 'heavy': window.navigator.vibrate(40); break;
        case 'success': window.navigator.vibrate([15, 30, 20]); break;
        case 'error': window.navigator.vibrate([20, 40, 20, 40, 20]); break;
        default: window.navigator.vibrate(10);
      }
    } catch (e) {
      // Ignore vibration errors on unsupported devices/browsers
    }
  }
};
