import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, X } from "lucide-react";

interface SimpleBarcodeProps {
  onScan: (code: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function SimpleBarcodeScanner({ onScan, onClose, isOpen }: SimpleBarcodeProps) {
  const [manualCode, setManualCode] = useState("");

  if (!isOpen) return null;

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      setManualCode("");
    }
  };

  const handleCameraRequest = async () => {
    try {
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      
      // If successful, show a simple success message
      alert("Camera access granted! Camera scanning functionality would be implemented here. For now, please enter the barcode manually below.");
      
      // Stop the stream
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      alert("Camera access denied or not available. Please enter the barcode manually below.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Scan Barcode</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
              <Camera className="h-12 w-12 text-gray-400" />
            </div>
            <Button onClick={handleCameraRequest} className="w-full mb-4">
              <Camera className="h-4 w-4 mr-2" />
              Start Camera Scan
            </Button>
          </div>
          
          <div className="border-t pt-4">
            <p className="text-sm text-gray-600 mb-3">Or enter barcode manually:</p>
            <div className="space-y-3">
              <Input
                placeholder="Enter barcode number"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
              />
              <Button 
                onClick={handleManualSubmit} 
                disabled={!manualCode.trim()}
                className="w-full"
              >
                Use This Code
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}