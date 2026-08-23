import { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import { BrowserMultiFormatReader } from '@zxing/library';
import { X, Camera, AlertCircle, Keyboard } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
  title?: string;
}

export function BarcodeScanner({ onScan, onClose, title = 'Scan Barcode' }: BarcodeScannerProps) {
  const webcamRef = useRef<Webcam>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    readerRef.current = new BrowserMultiFormatReader();

    return () => {
      if (readerRef.current) {
        readerRef.current.reset();
      }
    };
  }, []);

  useEffect(() => {
    if (!isScanning) return;

    const scanInterval = setInterval(() => {
      scanBarcode();
    }, 500); // Scan every 500ms

    return () => clearInterval(scanInterval);
  }, [isScanning]);

  const scanBarcode = async () => {
    if (!webcamRef.current || !readerRef.current) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    try {
      const img = new Image();
      img.src = imageSrc;
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const result = await readerRef.current.decodeFromImageElement(img);
      
      if (result && result.getText()) {
        const code = result.getText();
        // Prevent duplicate scans
        if (code !== lastScannedCode) {
          setLastScannedCode(code);
          setIsScanning(false);
          onScan(code);
          // Auto close after successful scan
          setTimeout(() => {
            onClose();
          }, 500);
        }
      }
    } catch (err) {
      // No barcode found in this frame, continue scanning
    }
  };

  const handleCameraError = (error: string | DOMException) => {
    // Silently handle camera permission errors by switching to manual input
    setCameraLoading(false);
    setPermissionDenied(true);
    setError('camera_blocked');
    setIsScanning(false);
    // Auto-switch to manual input when camera is blocked
    setTimeout(() => {
      setShowManualInput(true);
    }, 2000); // Give user time to see the message
  };

  const handleCameraReady = () => {
    setCameraLoading(false);
    setIsScanning(true);
  };

  const handleRequestCamera = async () => {
    setCameraLoading(true);

    // First check if navigator.mediaDevices is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('camera_not_supported');
      setCameraLoading(false);
      setTimeout(() => {
        setShowManualInput(true);
      }, 2000);
      return;
    }

    try {
      // Request camera permission explicitly
      // This WILL trigger the browser's permission popup
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });

      // Stop the stream immediately - we just needed to trigger the permission
      stream.getTracks().forEach(track => track.stop());

      // Now show the actual webcam component
      setShowCamera(true);
    } catch (err: any) {
      // Permission denied or error
      setCameraLoading(false);
      setPermissionDenied(true);
      setError('camera_blocked');
      setTimeout(() => {
        setShowManualInput(true);
      }, 2000);
    }
  };

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full overflow-hidden">
        <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showManualInput ? <Keyboard className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
            <h2 className="text-lg font-semibold">{showManualInput ? 'Manual Entry' : title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative bg-black" style={{ minHeight: '400px' }}>
          {showManualInput ? (
            <div className="flex items-center justify-center p-8" style={{ minHeight: '400px' }}>
              <div className="w-full max-w-md">
                {error === 'camera_blocked' && (
                  <div className="mb-6 p-4 bg-amber-900/50 border border-amber-700 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-100">
                        <p className="font-medium mb-1">Camera access was denied</p>
                        <p className="text-amber-200 text-xs">
                          You clicked "Block" or "Deny" on the camera permission popup. To enable it: Click the camera/lock icon in your browser's address bar and allow camera access, then try again.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {error === 'camera_not_supported' && (
                  <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-red-100">
                        <p className="font-medium mb-1">Camera not supported</p>
                        <p className="text-red-200 text-xs">
                          Your browser or device doesn't support camera access. This might be because you're using HTTP instead of HTTPS, or your browser is outdated.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="text-center mb-6">
                  <Keyboard className="w-12 h-12 mx-auto mb-3 text-blue-500" />
                  <h3 className="text-white text-lg font-medium mb-2">Enter Code Manually</h3>
                  <p className="text-gray-400 text-sm">Type the barcode or SKU number</p>
                </div>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
                    placeholder="Enter code here..."
                    autoFocus
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none text-lg text-center tracking-wide"
                  />
                  <button
                    onClick={handleManualSubmit}
                    disabled={!manualCode.trim()}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    Submit Code
                  </button>
                </div>
              </div>
            </div>
          ) : !showCamera ? (
            <div className="flex items-center justify-center p-8" style={{ minHeight: '400px' }}>
              <div className="text-center text-white max-w-md">
                <div className="mb-8">
                  <Camera className="w-20 h-20 mx-auto mb-4 text-blue-500" />
                  <h3 className="text-xl font-medium mb-3">Scan Barcode</h3>
                  <p className="text-gray-400 text-sm mb-6">
                    Choose how you want to enter the code
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleRequestCamera}
                    className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-3 font-medium"
                  >
                    <Camera className="w-5 h-5" />
                    Use Camera to Scan
                  </button>

                  <button
                    onClick={() => setShowManualInput(true)}
                    className="w-full px-6 py-4 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center gap-3 font-medium"
                  >
                    <Keyboard className="w-5 h-5" />
                    Enter Code Manually
                  </button>
                </div>

                <div className="mt-6 text-xs text-gray-500 bg-gray-900/50 rounded-lg p-4">
                  <p className="mb-2">📱 Camera scanning requires browser permission</p>
                  <p>💡 Manual entry works without any permissions</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {showCamera && <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={{
                  facingMode: 'environment', // Use back camera on mobile
                  width: 1280,
                  height: 720,
                }}
                onUserMedia={handleCameraReady}
                onUserMediaError={handleCameraError}
                className="w-full h-full object-cover"
              />}

              {/* Camera loading overlay */}
              {cameraLoading && !permissionDenied && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                  <div className="text-center text-white max-w-md px-8">
                    <Camera className="w-16 h-16 mx-auto mb-4 animate-pulse" />
                    <h3 className="text-lg font-medium mb-2">🎥 Camera Permission Required</h3>
                    <p className="text-sm text-gray-300 mb-4 font-semibold">
                      LOOK FOR A POPUP asking for camera permission!
                    </p>
                    <div className="text-sm text-gray-300 bg-black/60 rounded-lg p-4 mb-4">
                      <p className="mb-3 font-medium">Your browser should show a popup like:</p>
                      <p className="mb-2 bg-white/10 p-2 rounded italic">"[Website] wants to use your camera"</p>
                      <p className="text-yellow-300 font-medium">👉 Click "Allow" or "Yes"</p>
                    </div>
                    <div className="text-xs text-gray-400 bg-black/40 rounded-lg p-3">
                      <p className="mb-2 font-medium">If you don't see a popup:</p>
                      <p className="mb-1">• Check the TOP of your browser window</p>
                      <p className="mb-1">• Look in the address bar for a camera icon 🎥</p>
                      <p>• The popup may be hiding behind other windows</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Permission denied message */}
              {permissionDenied && !showManualInput && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/90">
                  <div className="text-center text-white max-w-md px-8">
                    <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
                    <h3 className="text-lg font-medium mb-2">Camera Access Blocked</h3>
                    <p className="text-sm text-gray-300 mb-4">
                      Switching to manual entry...
                    </p>
                  </div>
                </div>
              )}
              
              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-2 border-blue-500 w-64 h-40 rounded-lg relative">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
                  
                  {isScanning && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 animate-scan"></div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {!showManualInput && (
          <div className="p-6 bg-gray-50">
            <div className="text-center mb-3">
              <p className="text-sm text-gray-600">
                {isScanning
                  ? 'Position the barcode within the frame'
                  : lastScannedCode
                    ? `Scanned: ${lastScannedCode}`
                    : 'Ready to scan'}
              </p>
            </div>
            {!error && (
              <div className="text-center">
                <button
                  onClick={() => setShowManualInput(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 underline flex items-center gap-1 mx-auto"
                >
                  <Keyboard className="w-3 h-3" />
                  Switch to manual entry
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes scan {
          0% {
            top: 0;
          }
          50% {
            top: 100%;
          }
          100% {
            top: 0;
          }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
