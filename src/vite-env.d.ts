/// <reference types="vite/client" />

declare module '@tensorflow-models/handpose' {
  export interface HandPose {
    estimateHands(input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): Promise<any[]>;
  }
  export function load(config?: {
    maxContinuousChecks?: number;
    detectionConfidence?: number;
    iouThreshold?: number;
    scoreThreshold?: number;
  }): Promise<HandPose>;
}

declare module 'colorthief' {
  export default class ColorThief {
    getColor(img: HTMLImageElement | HTMLCanvasElement): [number, number, number];
    getPalette(img: HTMLImageElement | HTMLCanvasElement, colorCount?: number): [number, number, number][];
  }
}