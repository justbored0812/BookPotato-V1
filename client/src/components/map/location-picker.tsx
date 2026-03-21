import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Navigation } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LocationPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (location: { address: string; coordinates: [number, number] }) => void;
  initialLocation?: { lat: number; lng: number };
  city?: string;
}

export default function LocationPicker({ 
  isOpen, 
  onClose, 
  onLocationSelect, 
  city 
}: LocationPickerProps) {
  const [manualAddress, setManualAddress] = useState<string>('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<[number, number] | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>('');

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by this browser.');
      return;
    }

    setIsGettingLocation(true);
    setLocationStatus('Getting your location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentCoords([longitude, latitude]);
        setLocationStatus(`Location found: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        setIsGettingLocation(false);
      },
      (error) => {
        setIsGettingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationStatus('Location access denied by user.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationStatus('Location information is unavailable.');
            break;
          case error.TIMEOUT:
            setLocationStatus('Location request timed out.');
            break;
          default:
            setLocationStatus('An unknown error occurred.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleConfirmLocation = () => {
    if (manualAddress.trim()) {
      const coords = currentCoords || [77.2090, 28.6139]; // Default to Delhi
      onLocationSelect({
        address: manualAddress.trim(),
        coordinates: coords
      });
      onClose();
      setManualAddress('');
      setCurrentCoords(null);
      setLocationStatus('');
    }
  };

  const handleCancel = () => {
    onClose();
    setManualAddress('');
    setCurrentCoords(null);
    setLocationStatus('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <MapPin className="w-5 h-5" />
            <span>Select Location</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Manual Address Input */}
          <div className="space-y-2">
            <Label htmlFor="address">Complete Address</Label>
            <Input
              id="address"
              placeholder={`Enter detailed address${city ? ` in ${city}` : ''}...`}
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
            />
            <p className="text-sm text-gray-500">
              Include building name, street, area, and landmarks
            </p>
          </div>

          {/* Current Location Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Use Current Location</Label>
              <Button
                type="button"
                onClick={getCurrentLocation}
                disabled={isGettingLocation}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <Navigation className="w-4 h-4" />
                <span>{isGettingLocation ? 'Getting...' : 'Get Location'}</span>
              </Button>
            </div>

            {locationStatus && (
              <Alert>
                <AlertDescription className="text-sm">
                  {locationStatus}
                </AlertDescription>
              </Alert>
            )}

            {currentCoords && (
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">GPS Coordinates Captured</p>
                      <p className="text-xs text-gray-500">
                        Latitude: {currentCoords[1].toFixed(6)}, Longitude: {currentCoords[0].toFixed(6)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Info */}
          <Alert>
            <MapPin className="w-4 h-4" />
            <AlertDescription>
              Enter the complete address manually. Optionally, use "Get Location" to capture GPS coordinates for precise positioning.
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex justify-between space-x-3">
            <Button variant="outline" onClick={handleCancel} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmLocation}
              disabled={!manualAddress.trim()}
              className="flex-1"
            >
              Use This Location
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}