import React, { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { X, Check, Image as ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  value: string | Blob | null;
  onChange: (fileOrUrl: string | Blob | null) => void;
  requireCrop?: boolean;
  aspectRatio?: number;
}

export function ImageUploader({ value, onChange, requireCrop = false, aspectRatio = 1 }: ImageUploaderProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Safely handle Blob to ObjectURL conversion for previews
  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }
    if (typeof value === 'string') {
      setPreviewUrl(value);
    } else if (value instanceof Blob) {
      const url = URL.createObjectURL(value);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [value]);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (requireCrop) {
        // Load into memory for the cropper
        const reader = new FileReader();
        reader.addEventListener('load', () => setSelectedImage(reader.result as string));
        reader.readAsDataURL(file);
      } else {
        // Skip crop, pass the raw file directly to the form state
        onChange(file);
      }
    }
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<Blob> => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => (image.onload = resolve));

    const canvas = document.createElement('canvas');
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    const ctx = canvas.getContext('2d');

    ctx?.drawImage(
      image,
      pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
      0, 0, pixelCrop.width, pixelCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.9);
    });
  };

  const handleConfirmCrop = async () => {
    if (!selectedImage || !croppedAreaPixels) return;
    const croppedBlob = await getCroppedImg(selectedImage, croppedAreaPixels);
    onChange(croppedBlob);
    setSelectedImage(null); // Close crop modal
  };

  // 1. Render Active Image Preview
  if (previewUrl && !selectedImage) {
    return (
      <div className="relative w-full h-32 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden group">
        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button
            type="button"
            onClick={() => onChange(null)}
            className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2"
          >
            <X size={14} /> Remove
          </button>
        </div>
      </div>
    );
  }

  // 2. Render Crop Modal
  if (selectedImage && requireCrop) {
    return (
      <div className="fixed inset-0 z-[60] bg-slate-900/90 flex flex-col">
        <div className="relative flex-1">
          <Cropper
            image={selectedImage}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="h-24 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-6 shrink-0">
          <button type="button" onClick={() => setSelectedImage(null)} className="px-6 py-3 text-slate-300 font-bold uppercase text-xs tracking-widest">
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleConfirmCrop} 
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-bold uppercase text-xs tracking-widest flex items-center gap-2"
          >
            <Check size={16} /> Confirm Crop
          </button>
        </div>
      </div>
    );
  }

  // 3. Render File Picker
  return (
    <div className="w-full relative">
      <input
        type="file"
        accept="image/jpeg, image/png, image/webp"
        onChange={onFileChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />
      <div className="w-full p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 hover:border-emerald-500/50 transition-colors flex flex-col items-center justify-center gap-2 text-slate-500">
        <ImageIcon size={24} className="text-slate-400" />
        <span className="text-xs font-black uppercase tracking-widest">Tap to Upload Image</span>
      </div>
    </div>
  );
}