// Optimize file validation by checking size first (fastest check)
export function validateImageFile(file: File): string | null {
  // Check size first (fastest operation)
  if (file.size > 2 * 1024 * 1024) {
    return 'Image file is too large. Please upload an image smaller than 2MB';
  }

  // Then check type
  if (!file.type.startsWith('image/')) {
    return 'Please upload an image file (PNG, JPG, SVG)';
  }

  return null;
}

// Optimized chunked file reading
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunkSize = 128 * 1024; // Increased to 128KB for better performance
    const reader = new FileReader();
    let offset = 0;
    const chunks: string[] = [];
    let startTime = Date.now();

    reader.onload = (e) => {
      if (e.target?.result) {
        chunks.push(e.target.result as string);
        offset += chunkSize;

        // Check if we've been processing for too long
        if (Date.now() - startTime > 30000) {
          reject(new Error('File processing timed out. Please try a smaller file.'));
          return;
        }

        if (offset < file.size) {
          // Use setTimeout to avoid blocking UI
          setTimeout(readNextChunk, 0);
        } else {
          resolve(chunks.join(''));
        }
      }
    };

    reader.onerror = error => {
      console.error('FileReader error:', error);
      reject(new Error('Failed to read file. Please try again.'));
    };

    function readNextChunk() {
      const chunk = file.slice(offset, offset + chunkSize);
      reader.readAsDataURL(chunk);
    }

    readNextChunk();
  });
}

// Lazy load ColorThief with timeout and error handling
let colorThiefPromise: Promise<typeof import('colorthief')> | null = null;

export async function extractColors(imageUrl: string): Promise<{
  primary: string;
  secondary: string;
  accent: string;
  background: string;
}> {
  try {
    if (!colorThiefPromise) {
      colorThiefPromise = import('colorthief');
    }
    
    const ColorThief = (await Promise.race([
      colorThiefPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('ColorThief loading timed out')), 5000)
      )
    ])) as any;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      
      const timeout = setTimeout(() => {
        reject(new Error('Image loading timed out'));
      }, 10000);

      img.onload = () => {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { alpha: false });
          
          // Scale down image for faster processing
          const maxSize = 100;
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          
          if (!ctx) {
            throw new Error('Could not get canvas context');
          }

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const colorThief = new ColorThief();
          const palette = colorThief.getPalette(canvas, 4);
          
          resolve({
            primary: rgbToHex(palette[0][0], palette[0][1], palette[0][2]),
            secondary: rgbToHex(palette[1][0], palette[1][1], palette[1][2]),
            accent: rgbToHex(palette[2][0], palette[2][1], palette[2][2]),
            background: rgbToHex(palette[3][0], palette[3][1], palette[3][2])
          });

          // Clean up
          canvas.width = 0;
          canvas.height = 0;
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load image'));
      };

      img.src = imageUrl;
    });
  } catch (error) {
    console.error('Error in extractColors:', error);
    throw error;
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}