declare module 'audiobuffer-to-wav' {
  function audioBufferToWav(buffer: AudioBuffer, options?: any): ArrayBuffer;
  export default audioBufferToWav;
}