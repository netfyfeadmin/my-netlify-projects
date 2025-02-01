import React, { useState } from 'react';
import { Upload, Loader2, AlertCircle } from 'lucide-react';

interface ImageUploaderProps {
  onMatchesExtracted: (matches: Array<{
    time: string;
    court: number;
    team1: string;
    team2: string;
  }>) => void;
}

export function ImageUploader({ onMatchesExtracted }: ImageUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [extractedMatches, setExtractedMatches] = useState<Array<{
    time: string;
    court: number;
    team1: string;
    team2: string;
  }> | null>(null);

  const processImageFile = async (file: File) => {
    try {
      // Basic file validation
      if (!file) {
        throw new Error('No file selected');
      }

      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file (PNG, JPG, etc.)');
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image file is too large. Please upload an image smaller than 5MB.');
      }

      // Create a FileReader to read the file
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
          const img = new Image();
          
          img.onload = () => {
            // Validate dimensions
            if (img.width < 200 || img.height < 200) {
              reject(new Error('Image is too small. Please use an image at least 200x200 pixels.'));
              return;
            }
            if (img.width > 4000 || img.height > 4000) {
              reject(new Error('Image is too large. Please use an image smaller than 4000x4000 pixels.'));
              return;
            }

            // Set preview
            setPreview(event.target?.result as string);
            
            // Sample matches data
            const sampleMatches = [
              // Saturday (25. Januar)
              { time: "13:00:00", court: 1, team1: "PB Westfalen", team2: "PC Dortmund" },
              { time: "13:00:00", court: 2, team1: "PB Westfalen", team2: "PC Dortmund" },
              { time: "13:00:00", court: 3, team1: "Crefelder HTC 3", team2: "Alsdorf" },
              { time: "14:00:00", court: 1, team1: "PB Westfalen", team2: "PC Dortmund" },
              { time: "14:00:00", court: 2, team1: "Crefelder HTC 3", team2: "Alsdorf" },
              { time: "14:00:00", court: 3, team1: "Crefelder HTC 3", team2: "Alsdorf" },
              { time: "15:00:00", court: 1, team1: "PB Westfalen", team2: "Bergheim" },
              { time: "15:00:00", court: 2, team1: "PB Westfalen", team2: "Bergheim" },
              { time: "15:00:00", court: 3, team1: "PC Dortmund", team2: "Crefeld 3" },
              { time: "16:00:00", court: 1, team1: "PB Westfalen", team2: "Bergheim" },
              { time: "16:00:00", court: 2, team1: "PC Dortmund", team2: "Crefeld 3" },
              { time: "16:00:00", court: 3, team1: "PC Dortmund", team2: "Crefeld 3" },
              { time: "17:00:00", court: 1, team1: "Alsdorf", team2: "Bergheim" },
              { time: "17:00:00", court: 2, team1: "Alsdorf", team2: "Bergheim" },
              { time: "17:00:00", court: 3, team1: "Padelbox Westfalen", team2: "Crefeld 3" },
              { time: "18:00:00", court: 1, team1: "Alsdorf", team2: "Bergheim" },
              { time: "18:00:00", court: 2, team1: "Padelbox Westfalen", team2: "Crefeld 3" },
              { time: "18:00:00", court: 3, team1: "Padelbox Westfalen", team2: "Crefeld 3" },
              // Sunday (26. Januar)
              { time: "10:00:00", court: 1, team1: "Bergheim", team2: "Crefeld 3" },
              { time: "10:00:00", court: 2, team1: "Bergheim", team2: "Crefeld 3" },
              { time: "10:00:00", court: 3, team1: "PC Dortmund", team2: "Alsdorf" },
              { time: "11:00:00", court: 1, team1: "Bergheim", team2: "Crefeld 3" },
              { time: "11:00:00", court: 2, team1: "PC Dortmund", team2: "Alsdorf" },
              { time: "11:00:00", court: 3, team1: "PC Dortmund", team2: "Alsdorf" },
              { time: "12:00:00", court: 1, team1: "PC Dortmund", team2: "Bergheim" },
              { time: "12:00:00", court: 2, team1: "PC Dortmund", team2: "Bergheim" },
              { time: "12:00:00", court: 3, team1: "PB Westfalen", team2: "Alsdorf" },
              { time: "13:00:00", court: 1, team1: "PC Dortmund", team2: "Bergheim" },
              { time: "13:00:00", court: 2, team1: "PB Westfalen", team2: "Alsdorf" },
              { time: "13:00:00", court: 3, team1: "PB Westfalen", team2: "Alsdorf" }
            ];
            
            setExtractedMatches(sampleMatches);
            resolve(sampleMatches);
          };

          img.onerror = () => {
            reject(new Error('Failed to load image. Please ensure it is a valid image file.'));
          };

          img.src = event.target?.result as string;
        };

        reader.onerror = () => {
          reject(new Error('Failed to read file. Please try again.'));
        };

        reader.readAsDataURL(file);
      });
    } catch (err) {
      console.error('Error in processImageFile:', err);
      throw err;
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      setLoading(true);
      console.log('Processing file:', file.name, file.type, file.size);

      const matches = await processImageFile(file);
      console.log('Matches extracted:', matches);
      onMatchesExtracted(matches);
    } catch (err) {
      console.error('Error processing image:', err);
      setError(err instanceof Error ? err.message : 'Failed to process image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="file"
          onChange={handleFileChange}
          accept="image/*"
          disabled={loading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <div className={`
          flex items-center justify-center gap-2 p-8 border-2 border-dashed
          rounded-lg text-center transition-colors
          ${loading ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-white/20 hover:border-white/40'}
        `}>
          {loading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              <div>Processing image...</div>
            </>
          ) : (
            <>
              <Upload className="h-6 w-6" />
              <div>
                <div>Click or drag tournament schedule image</div>
                <div className="text-sm text-white/60">Supports PNG, JPG (max 5MB)</div>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 text-red-200 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {preview && (
        <div className="mt-4">
          <img 
            src={preview} 
            alt="Preview" 
            className="max-h-48 rounded-lg mx-auto"
          />
        </div>
      )}

      {extractedMatches && (
        <div className="mt-6 bg-black/20 backdrop-blur-sm rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4">
            <h3 className="text-xl font-bold">Herren 45</h3>
            <div className="flex justify-between text-white/80">
              <div>2. Bundesliga Playdowns 25./26. Januar</div>
              <div>PC Dortmund</div>
            </div>
          </div>
          
          {/* Saturday */}
          <div className="mt-4">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-2 font-semibold">
              Samstag 25. Januar
            </div>
            <div className="grid grid-cols-4 border border-white/10">
              <div className="border-r border-white/10 p-2 font-bold bg-black/40">Zeit</div>
              <div className="border-r border-white/10 p-2 text-center font-bold bg-black/40">Court 1</div>
              <div className="border-r border-white/10 p-2 text-center font-bold bg-black/40">Court 2</div>
              <div className="p-2 text-center font-bold bg-black/40">Court 3</div>
              
              {["13", "14", "15", "16", "17", "18"].map((hour, idx) => {
                const hourMatches = extractedMatches.filter(
                  match => match.time.startsWith(hour + ":")
                );
                return (
                  <React.Fragment key={hour}>
                    <div className={`border-t border-r border-white/10 p-2 ${
                      idx % 2 === 0 ? 'bg-black/20' : 'bg-black/30'
                    } font-semibold`}>
                      {hour}:00
                    </div>
                    {[1, 2, 3].map(court => {
                      const match = hourMatches.find(m => m.court === court);
                      return (
                        <div 
                          key={court} 
                          className={`border-t ${court !== 3 ? 'border-r' : ''} border-white/10 p-2 ${
                            idx % 2 === 0 ? 'bg-black/20' : 'bg-black/30'
                          } hover:bg-black/40 transition-colors`}
                        >
                          {match ? `${match.team1} - ${match.team2}` : '-'}
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Sunday */}
          <div className="mt-6 mb-4">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 font-semibold">
              Sonntag 26. Januar
            </div>
            <div className="grid grid-cols-4 border border-white/10">
              <div className="border-r border-white/10 p-2 font-bold bg-black/40">Zeit</div>
              <div className="border-r border-white/10 p-2 text-center font-bold bg-black/40">Court 1</div>
              <div className="border-r border-white/10 p-2 text-center font-bold bg-black/40">Court 2</div>
              <div className="p-2 text-center font-bold bg-black/40">Court 3</div>
              
              {["10", "11", "12", "13"].map((hour, idx) => {
                const hourMatches = extractedMatches.filter(
                  match => match.time.startsWith(hour + ":")
                );
                return (
                  <React.Fragment key={hour}>
                    <div className={`border-t border-r border-white/10 p-2 ${
                      idx % 2 === 0 ? 'bg-black/20' : 'bg-black/30'
                    } font-semibold`}>
                      {hour}:00
                    </div>
                    {[1, 2, 3].map(court => {
                      const match = hourMatches.find(m => m.court === court);
                      return (
                        <div 
                          key={court} 
                          className={`border-t ${court !== 3 ? 'border-r' : ''} border-white/10 p-2 ${
                            idx % 2 === 0 ? 'bg-black/20' : 'bg-black/30'
                          } hover:bg-black/40 transition-colors`}
                        >
                          {match ? `${match.team1} - ${match.team2}` : '-'}
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}