import React, { useState, useCallback, memo } from 'react';
import { Upload, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { validateImageFile, fileToBase64 } from '../lib/mediaUtils';

interface ImageUploadProps {
  currentImage?: string;
  onImageSelect: (base64: string) => void;
  onImageRemove: () => void;
  className?: string;
  label?: string;
}

export const ImageUpload = memo(function ImageUpload({
  currentImage,
  onImageSelect,
  onImageRemove,
  className = '',
  label = 'Upload Image'
}: ImageUploadProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      setLoading(true);

      // Quick validation first
      if (file.size === 0) {
        throw new Error('Selected file is empty');
      }

      const validationError = validateImageFile(file);
      if (validationError) {
        throw new Error(validationError);
      }

      // Process file in chunks
      const base64 = await fileToBase64(file);
      onImageSelect(base64);
    } catch (err) {
      console.error('Error handling file:', err);
      setError(err instanceof Error ? err.message : 'Failed to process image');
    } finally {
      setLoading(false);
      // Clear input to allow selecting same file again
      e.target.value = '';
    }
  }, [onImageSelect]);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="relative">
        <input
          type="file"
          onChange={handleFileChange}
          accept="image/*"
          disabled={loading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          aria-label={label}
        />
        <div className={`
          flex items-center justify-center gap-2 p-4 border-2 border-dashed
          rounded-lg text-center transition-colors
          ${loading ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-white/20 hover:border-white/40'}
        `}>
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Upload className="h-5 w-5" />
              <span>{label}</span>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 text-red-200 px-3 py-2 rounded text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {currentImage && (
        <div className="relative group">
          <img
            src={currentImage}
            alt="Preview"
            className="max-h-20 rounded object-contain bg-white/10 p-2"
            loading="lazy"
            decoding="async"
          />
          <button
            onClick={onImageRemove}
            className="absolute top-1 right-1 p-1 rounded bg-red-600 hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
            title="Remove image"
            type="button"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
});