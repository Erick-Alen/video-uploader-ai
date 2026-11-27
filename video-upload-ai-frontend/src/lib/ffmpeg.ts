import { FFmpeg } from '@ffmpeg/ffmpeg';
import coreURL from '../ffmpeg/ffmpeg-core.js?url';
import wasmURL from '../ffmpeg/ffmpeg-core.wasm?url';
import workerURL from '../ffmpeg/ffmpeg-worker.js?url';

let ffmpeg: FFmpeg | null = null;

export const getFFmpeg = async () => {
  if (ffmpeg) {
    return ffmpeg;
  }

  const instance = new FFmpeg();
  await instance.load({ coreURL, wasmURL, workerURL });
  ffmpeg = instance;
  return instance;
};
