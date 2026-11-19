import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  Crop,
  Square,
  RectangleHorizontal,
  Maximize2,
  Loader2
} from 'lucide-react';

const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1 Square', ratio: 1, icon: Square, desc: 'Best for App Icon, Monogram & Navbar' },
  { id: '4:3', label: '4:3 Classic', ratio: 4 / 3, icon: RectangleHorizontal, desc: 'Balanced standard emblem' },
  { id: '16:9', label: '16:9 Wide', ratio: 16 / 9, icon: RectangleHorizontal, desc: 'Best for horizontal brand wordmarks' },
  { id: 'original', label: 'Original Fit', ratio: null, icon: Maximize2, desc: 'Uses natural photo aspect ratio' }
];

export const ImageCropperModal = ({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
  title = 'Crop & Position Gym Brand Logo',
  initialAspectRatio = '1:1'
}) => {
  const [selectedAspect, setSelectedAspect] = useState(initialAspectRatio);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(null);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imageObjRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const activePointersRef = useRef(new Map());
  const pinchStartDistRef = useRef(null);
  const pinchStartZoomRef = useRef(1);

  // Load image object whenever imageSrc changes
  useEffect(() => {
    if (!isOpen || !imageSrc) {
      setImageLoaded(false);
      setImageError(null);
      imageObjRef.current = null;
      return;
    }

    setImageLoaded(false);
    setImageError(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setSelectedAspect(initialAspectRatio);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageObjRef.current = img;
      setImageLoaded(true);
    };
    img.onerror = () => {
      setImageError('Failed to load image. Please try another file.');
      setImageLoaded(false);
    };
    img.src = imageSrc;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [isOpen, imageSrc, initialAspectRatio]);

  // Handle body scroll lock & Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, onClose]);

  // Non-passive wheel zoom listener
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isOpen) return;

    const handleWheel = (e) => {
      e.preventDefault();
      const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
      setZoom((prevZoom) => {
        const nextZoom = Math.min(3.5, Math.max(0.5, prevZoom + zoomDelta));
        return Number(nextZoom.toFixed(2));
      });
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [isOpen, imageLoaded]);

  // Compute crop box geometry based on viewport size and selected aspect ratio
  const getCropBox = useCallback((viewportWidth, viewportHeight, naturalWidth, naturalHeight) => {
    const padding = 20;
    const availWidth = Math.max(120, viewportWidth - padding * 2);
    const availHeight = Math.max(120, viewportHeight - padding * 2);

    let targetRatio = 1;
    if (selectedAspect === 'original' && naturalWidth && naturalHeight) {
      targetRatio = naturalWidth / naturalHeight;
    } else {
      const found = ASPECT_RATIOS.find((a) => a.id === selectedAspect);
      targetRatio = found?.ratio || 1;
    }

    let cropWidth = availWidth;
    let cropHeight = cropWidth / targetRatio;

    if (cropHeight > availHeight) {
      cropHeight = availHeight;
      cropWidth = cropHeight * targetRatio;
    }

    const cropX = (viewportWidth - cropWidth) / 2;
    const cropY = (viewportHeight - cropHeight) / 2;

    return {
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight,
      centerX: viewportWidth / 2,
      centerY: viewportHeight / 2
    };
  }, [selectedAspect]);

  // Render preview canvas
  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageObjRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const viewWidth = rect.width;
    const viewHeight = rect.height;

    // Adjust canvas buffer dimensions for sharp high-DPI display
    if (canvas.width !== Math.round(viewWidth * dpr) || canvas.height !== Math.round(viewHeight * dpr)) {
      canvas.width = Math.round(viewWidth * dpr);
      canvas.height = Math.round(viewHeight * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, viewWidth, viewHeight);

    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;
    const cropBox = getCropBox(viewWidth, viewHeight, naturalW, naturalH);

    // 1. Draw subtle transparency checkerboard pattern inside crop box
    ctx.save();
    ctx.beginPath();
    ctx.rect(cropBox.x, cropBox.y, cropBox.width, cropBox.height);
    ctx.clip();
    const checkSize = 12;
    for (let x = cropBox.x; x < cropBox.x + cropBox.width; x += checkSize) {
      for (let y = cropBox.y; y < cropBox.y + cropBox.height; y += checkSize) {
        const isDark = (Math.floor(x / checkSize) + Math.floor(y / checkSize)) % 2 === 0;
        ctx.fillStyle = isDark ? '#f8fafc' : '#f1f5f9';
        ctx.fillRect(x, y, checkSize, checkSize);
      }
    }
    ctx.restore();

    // 2. Draw transformed image
    const isRotated90 = rotation === 90 || rotation === 270;
    const effectiveImgW = isRotated90 ? naturalH : naturalW;
    const effectiveImgH = isRotated90 ? naturalW : naturalH;

    const baseScale = Math.max(cropBox.width / effectiveImgW, cropBox.height / effectiveImgH);
    const currentScale = baseScale * zoom;

    ctx.save();
    ctx.translate(cropBox.centerX + pan.x, cropBox.centerY + pan.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(currentScale, currentScale);
    ctx.drawImage(img, -naturalW / 2, -naturalH / 2, naturalW, naturalH);
    ctx.restore();

    // 3. Dark backdrop mask with cutout over the crop box
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.beginPath();
    ctx.rect(0, 0, viewWidth, viewHeight);
    ctx.rect(cropBox.x, cropBox.y, cropBox.width, cropBox.height);
    ctx.fill('evenodd');
    ctx.restore();

    // 4. Rule-of-thirds grid lines
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cropBox.x + cropBox.width / 3, cropBox.y);
    ctx.lineTo(cropBox.x + cropBox.width / 3, cropBox.y + cropBox.height);
    ctx.moveTo(cropBox.x + (2 * cropBox.width) / 3, cropBox.y);
    ctx.lineTo(cropBox.x + (2 * cropBox.width) / 3, cropBox.y + cropBox.height);
    ctx.moveTo(cropBox.x, cropBox.y + cropBox.height / 3);
    ctx.lineTo(cropBox.x + cropBox.width, cropBox.y + cropBox.height / 3);
    ctx.moveTo(cropBox.x, cropBox.y + (2 * cropBox.height) / 3);
    ctx.lineTo(cropBox.x + cropBox.width, cropBox.y + (2 * cropBox.height) / 3);
    ctx.stroke();

    // Outer crop border
    ctx.strokeStyle = '#10b981'; // emerald-500
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cropBox.x, cropBox.y, cropBox.width, cropBox.height);

    // Modern corner brackets
    const bracketSize = Math.min(16, cropBox.width / 5);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    // Top-left
    ctx.moveTo(cropBox.x, cropBox.y + bracketSize);
    ctx.lineTo(cropBox.x, cropBox.y);
    ctx.lineTo(cropBox.x + bracketSize, cropBox.y);
    // Top-right
    ctx.moveTo(cropBox.x + cropBox.width - bracketSize, cropBox.y);
    ctx.lineTo(cropBox.x + cropBox.width, cropBox.y);
    ctx.lineTo(cropBox.x + cropBox.width, cropBox.y + bracketSize);
    // Bottom-left
    ctx.moveTo(cropBox.x, cropBox.y + cropBox.height - bracketSize);
    ctx.lineTo(cropBox.x, cropBox.y + cropBox.height);
    ctx.lineTo(cropBox.x + bracketSize, cropBox.y + cropBox.height);
    // Bottom-right
    ctx.moveTo(cropBox.x + cropBox.width - bracketSize, cropBox.y + cropBox.height);
    ctx.lineTo(cropBox.x + cropBox.width, cropBox.y + cropBox.height);
    ctx.lineTo(cropBox.x + cropBox.width, cropBox.y + cropBox.height - bracketSize);
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  }, [imageLoaded, zoom, pan, rotation, selectedAspect, getCropBox]);

  // Redraw preview whenever transforms or container dimensions change
  useEffect(() => {
    if (!isOpen || !imageLoaded) return;
    let animId;
    const render = () => {
      drawPreview();
    };
    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, imageLoaded, drawPreview]);

  // Pointer / Touch interaction handlers
  const handlePointerDown = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture?.(e.pointerId);
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointersRef.current.size === 1) {
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      panStartRef.current = { ...pan };
    } else if (activePointersRef.current.size === 2) {
      isDraggingRef.current = false;
      const pts = Array.from(activePointersRef.current.values());
      pinchStartDistRef.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchStartZoomRef.current = zoom;
    }
  };

  const handlePointerMove = (e) => {
    if (!activePointersRef.current.has(e.pointerId)) return;
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Multi-touch pinch zoom
    if (activePointersRef.current.size === 2 && pinchStartDistRef.current) {
      const pts = Array.from(activePointersRef.current.values());
      const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (currentDist > 0 && pinchStartDistRef.current > 0) {
        const factor = currentDist / pinchStartDistRef.current;
        const newZoom = Math.min(3.5, Math.max(0.5, pinchStartZoomRef.current * factor));
        setZoom(Number(newZoom.toFixed(2)));
      }
      return;
    }

    // Single touch or mouse dragging
    if (isDraggingRef.current && activePointersRef.current.size === 1) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPan({
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy
      });
    }
  };

  const handlePointerUp = (e) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size === 0) {
      isDraggingRef.current = false;
      pinchStartDistRef.current = null;
    } else if (activePointersRef.current.size === 1) {
      // Transition back to single drag with remaining pointer
      const remaining = Array.from(activePointersRef.current.values())[0];
      dragStartRef.current = { x: remaining.x, y: remaining.y };
      panStartRef.current = { ...pan };
      isDraggingRef.current = true;
    }
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  };

  const handleRotate = () => {
    setRotation((r) => (r + 90) % 360);
  };

  // Perform the high-resolution crop export to offscreen Canvas
  const handleApplyCrop = async () => {
    const canvas = canvasRef.current;
    const img = imageObjRef.current;
    if (!canvas || !img || !imageLoaded) return;

    try {
      setIsProcessing(true);

      const rect = canvas.getBoundingClientRect();
      const naturalW = img.naturalWidth;
      const naturalH = img.naturalHeight;
      const cropBox = getCropBox(rect.width, rect.height, naturalW, naturalH);

      // Determine output export dimensions (high res, capped at 1024px)
      const maxDim = 1024;
      const cropRatio = cropBox.width / cropBox.height;
      let exportWidth = Math.min(maxDim, Math.round(cropBox.width * 2.5));
      let exportHeight = Math.round(exportWidth / cropRatio);

      if (exportHeight > maxDim) {
        exportHeight = maxDim;
        exportWidth = Math.round(exportHeight * cropRatio);
      }

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = exportWidth;
      exportCanvas.height = exportHeight;
      const eCtx = exportCanvas.getContext('2d');
      if (!eCtx) throw new Error('Could not create export canvas context');

      eCtx.imageSmoothingEnabled = true;
      eCtx.imageSmoothingQuality = 'high';

      const exportScaleFactor = exportWidth / cropBox.width;
      const isRotated90 = rotation === 90 || rotation === 270;
      const effectiveImgW = isRotated90 ? naturalH : naturalW;
      const effectiveImgH = isRotated90 ? naturalW : naturalH;

      const baseScale = Math.max(cropBox.width / effectiveImgW, cropBox.height / effectiveImgH);
      const currentScale = baseScale * zoom;

      eCtx.save();
      // Translate to center of export canvas + scaled user pan offset
      eCtx.translate(
        exportWidth / 2 + pan.x * exportScaleFactor,
        exportHeight / 2 + pan.y * exportScaleFactor
      );
      eCtx.rotate((rotation * Math.PI) / 180);
      eCtx.scale(currentScale * exportScaleFactor, currentScale * exportScaleFactor);
      eCtx.drawImage(img, -naturalW / 2, -naturalH / 2, naturalW, naturalH);
      eCtx.restore();

      const croppedDataUrl = exportCanvas.toDataURL('image/png');
      onCropComplete?.(croppedDataUrl);
      onClose?.();
    } catch (err) {
      console.error('Error generating cropped logo:', err);
      alert('Failed to crop image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-fadeIn select-none">
      <div
        ref={containerRef}
        className="w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh] animate-slideUp"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Crop className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 truncate">{title}</h2>
              <p className="text-2xs text-slate-500 truncate">
                Drag to position, pinch or scroll to zoom, rotate and select framing
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 overflow-y-auto flex-1">
          {/* Aspect Ratio Presets */}
          <div>
            <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Crop Aspect Ratio
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
              {ASPECT_RATIOS.map((aspect) => {
                const IconComponent = aspect.icon;
                const isSelected = selectedAspect === aspect.id;
                return (
                  <button
                    key={aspect.id}
                    type="button"
                    onClick={() => {
                      setSelectedAspect(aspect.id);
                      setPan({ x: 0, y: 0 });
                    }}
                    className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs ring-1 ring-emerald-500/30'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                    title={aspect.desc}
                  >
                    <IconComponent className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="truncate">{aspect.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Crop Viewport */}
          <div className="relative w-full aspect-square max-h-[340px] sm:max-h-[380px] mx-auto bg-slate-950 rounded-xl overflow-hidden shadow-inner flex items-center justify-center touch-none">
            {!imageLoaded && !imageError && (
              <div className="flex flex-col items-center gap-2 text-white/80">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                <span className="text-xs font-medium">Loading image...</span>
              </div>
            )}

            {imageError && (
              <div className="p-4 text-center text-rose-300 text-xs">
                {imageError}
              </div>
            )}

            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={`w-full h-full cursor-grab active:cursor-grabbing touch-none ${imageLoaded ? 'block' : 'hidden'}`}
            />

            {/* Gesture Hint Badge */}
            {imageLoaded && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-xs text-white/90 text-2xs font-medium pointer-events-none border border-white/10 shadow-sm flex items-center gap-1.5">
                <span>Drag to pan</span>
                <span className="text-slate-400">•</span>
                <span>Scroll/Pinch to zoom</span>
              </div>
            )}
          </div>

          {/* Transform Controls: Zoom, Rotate & Reset */}
          <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between text-2xs font-bold text-slate-600">
              <span className="flex items-center gap-1.5">
                <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
                <span>Zoom Scale</span>
              </span>
              <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.1).toFixed(2))))}
                className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer shrink-0"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <input
                type="range"
                min="0.5"
                max="3.5"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(Number(parseFloat(e.target.value).toFixed(2)))}
                className="flex-1 accent-emerald-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />

              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3.5, Number((z + 0.1).toFixed(2))))}
                className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer shrink-0"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <div className="h-5 w-px bg-slate-200 mx-0.5" />

              <button
                type="button"
                onClick={handleRotate}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-2xs font-semibold transition-colors cursor-pointer shrink-0"
                title="Rotate 90° Clockwise"
              >
                <RotateCw className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">90°</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer shrink-0"
                title="Reset Position & Zoom"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 sm:flex-initial h-10 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApplyCrop}
            disabled={!imageLoaded || isProcessing}
            className="flex-1 sm:flex-initial h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Apply &amp; Set Logo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
