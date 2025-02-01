import ColorThief from 'colorthief';

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

export function getLuminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export function getContrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export async function extractColors(imageUrl: string): Promise<{
  primary: string;
  secondary: string;
  accent: string;
  background: string;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    img.onload = async () => {
      try {
        const colorThief = new ColorThief();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Could not get canvas context');
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const palette = colorThief.getPalette(img, 5);
        
        // Convert RGB arrays to hex colors
        const colors = palette.map(color => rgbToHex(color[0], color[1], color[2]));
        
        // Calculate luminance for each color
        const luminances = palette.map(color => 
          getLuminance(color[0], color[1], color[2])
        );

        // Find the color with highest contrast against white for background
        const whiteContrasts = luminances.map(l => getContrastRatio(l, 1));
        const backgroundIndex = whiteContrasts.indexOf(Math.max(...whiteContrasts));
        
        // Sort remaining colors by luminance for different roles
        const remainingColors = colors
          .filter((_, i) => i !== backgroundIndex)
          .sort((_, __, i, j) => luminances[i] - luminances[j]);

        resolve({
          primary: colors[0], // Most prominent color
          secondary: colors[1], // Second most prominent
          accent: colors[2], // Third color for accents
          background: colors[backgroundIndex], // Best contrasting color for background
        });
      } catch (error) {
        console.error('Error extracting colors:', error);
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = imageUrl;
  });
}