import React, { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import { FonepayMerchantInfo, parseFonepayQr, sounds } from '../utils/fonepayQr';
import { usePWAInstall } from '../utils/usePWAInstall';
import { X, Check, Building2, QrCode, Camera, Upload, AlertCircle, CheckCircle2, Download, Smartphone, Copy } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  merchant: FonepayMerchantInfo;
  onSave: (updated: FonepayMerchantInfo) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  merchant,
  onSave,
}) => {
  const [formData, setFormData] = useState<FonepayMerchantInfo>(merchant);
  const [isScanningCamera, setIsScanningCamera] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccessMsg, setScanSuccessMsg] = useState<string | null>(null);
  const [showInstallGuide, setShowInstallGuide] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  const { isInstallable, isInstalled, install } = usePWAInstall();

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        sounds.playSuccess();
        return;
      }
    }
    setShowInstallGuide(true);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera on unmount or close
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setScanError(null);
      setScanSuccessMsg(null);
    } else {
      setFormData(merchant);
    }
  }, [isOpen, merchant]);

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanningCamera(false);
  };

  const handleScanResult = (decodedText: string) => {
    const extracted = parseFonepayQr(decodedText);
    if (extracted && extracted.terminalId) {
      sounds.playSuccess();
      setFormData((prev) => ({
        ...prev,
        terminalId: extracted.terminalId || prev.terminalId,
        merchantName: extracted.merchantName || prev.merchantName,
        city: extracted.city || prev.city,
        terminalLabel: extracted.terminalLabel || prev.terminalLabel,
        mcc: extracted.mcc || prev.mcc,
        currency: extracted.currency || prev.currency,
        country: extracted.country || prev.country,
      }));
      setScanSuccessMsg(`Scanned: ${extracted.merchantName || 'Store'} (${extracted.terminalId})`);
      setScanError(null);
      stopCamera();
      setTimeout(() => setScanSuccessMsg(null), 4000);
    } else {
      setScanError('QR code scanned, but could not detect valid Fonepay merchant data.');
      setTimeout(() => setScanError(null), 4000);
    }
  };

  const startCamera = async () => {
    setScanError(null);
    setScanSuccessMsg(null);
    setIsScanningCamera(true);

    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        scanVideoFrame();
      }
    } catch {
      setScanError('Camera access denied or unavailable. You can also upload a QR photo below.');
      stopCamera();
    }
  };

  const scanVideoFrame = () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        handleScanResult(code.data);
        return;
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            handleScanResult(code.data);
          } else {
            setScanError('Could not find a valid QR code in the uploaded image.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    // Reset input
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-neutral-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-100 text-[#BA1A1A] flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-neutral-900 text-sm sm:text-base leading-tight">
                Destination Settings
              </h2>
              <p className="text-[11px] text-neutral-500">
                Configure where payments are received
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Quick Scan Section */}
          <div className="bg-neutral-50 rounded-2xl p-3.5 border border-neutral-200/90 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                <QrCode className="w-4 h-4 text-[#BA1A1A]" />
                <span>Auto-Fill from QR Standee</span>
              </div>
              <span className="text-[10px] text-neutral-400 font-medium">Instant</span>
            </div>

            <p className="text-[11px] text-neutral-600 leading-relaxed">
              Scan your printed business QR or upload a photo to automatically extract and set your receiving account details.
            </p>

            {/* Camera Viewfinder (when active) */}
            {isScanningCamera ? (
              <div className="relative w-full rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                <video ref={videoRef} className="w-full h-full object-cover" />
                <div className="absolute inset-0 border-2 border-red-500/80 rounded-xl pointer-events-none flex items-center justify-center">
                  <div className="w-40 h-40 border-2 border-white rounded-lg animate-pulse" />
                </div>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-black/60 text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={startCamera}
                  className="py-2.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:scale-97 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-amber-300" />
                  <span>Scan with Camera</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="py-2.5 px-3 rounded-xl bg-white hover:bg-neutral-100 active:scale-97 text-neutral-800 font-bold text-xs border border-neutral-300 flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-neutral-600" />
                  <span>Upload QR Photo</span>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}

            {/* Success Message Banner */}
            {scanSuccessMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">{scanSuccessMsg}</span>
              </div>
            )}

            {/* Error Message Banner */}
            {scanError && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{scanError}</span>
              </div>
            )}
          </div>

          {/* Form Fields */}
          <form id="settings-form" onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Destination Terminal ID (PAN)
              </label>
              <input
                type="text"
                value={formData.terminalId}
                onChange={(e) => setFormData({ ...formData, terminalId: e.target.value.trim() })}
                placeholder="e.g. 2222020017969383"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm font-mono font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]/30 focus:border-[#BA1A1A]"
                required
              />
              <p className="text-[10px] text-neutral-500 mt-1">
                Your receiving Fonepay terminal number where funds will be credited.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Store / Business Name
              </label>
              <input
                type="text"
                value={formData.merchantName}
                onChange={(e) => setFormData({ ...formData, merchantName: e.target.value })}
                placeholder="e.g. Giri Kirana Store"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]/30 focus:border-[#BA1A1A]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                City / Location
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g. Kathmandu MP"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]/30 focus:border-[#BA1A1A]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Terminal Label (Optional)
              </label>
              <input
                type="text"
                value={formData.terminalLabel}
                onChange={(e) => setFormData({ ...formData, terminalLabel: e.target.value.trim() })}
                placeholder="e.g. 1844524"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm font-mono text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#BA1A1A]/30 focus:border-[#BA1A1A]"
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-3 px-4 sm:px-5 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between gap-2 shrink-0">
          {/* Left side: Download as APK button */}
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            title="Download or install this app on Android"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">{isInstalled ? 'App Installed ✓' : 'Download APK'}</span>
          </button>

          {/* Right side: Cancel and Save Changes */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 sm:px-4 sm:py-2 rounded-xl text-neutral-600 hover:bg-neutral-100 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="settings-form"
              className="px-4 py-2 sm:px-5 sm:py-2 rounded-xl bg-[#BA1A1A] hover:bg-[#9e1616] active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>

      {/* APK & Android Offline Installation Guide Popup */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-neutral-200 flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-neutral-900 leading-tight">
                    Install Offline Android App
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Works 100% offline without internet
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-neutral-50 rounded-2xl p-3 border border-neutral-200 text-xs text-neutral-700 space-y-2">
              <p className="font-bold text-neutral-900">How to install on Android:</p>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-neutral-600 leading-relaxed">
                <li>Open this link in <strong>Google Chrome</strong> on your phone.</li>
                <li>Tap the <strong>three dots menu (⋮)</strong> in the top-right corner.</li>
                <li>Tap <strong>"Install app"</strong> (or <strong>"Add to Home screen"</strong>).</li>
                <li>Android will instantly install the standalone app with the Fonepay icon!</li>
              </ol>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyUrl}
                className="flex-1 py-2 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedUrl ? 'Link Copied!' : 'Copy App Link'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                className="flex-1 py-2 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold text-center cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
