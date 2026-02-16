import { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import Button from '../common/Button';
import Modal from '../common/Modal';

const QRScanner = ({ isOpen, onClose, onScan }) => {
    const [scanning, setScanning] = useState(false);
    const [scanner, setScanner] = useState(null);

    useEffect(() => {
        if (isOpen && !scanner) {
            // Initialize scanner
            const qrScanner = new Html5QrcodeScanner(
                'qr-reader',
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                },
                false
            );

            qrScanner.render(
                (decodedText) => {
                    // Success callback
                    onScan(decodedText);
                    qrScanner.clear();
                    setScanning(false);
                    onClose();
                },
                (error) => {
                    // Error callback - ignore errors, they happen frequently
                    console.debug('QR scan error:', error);
                }
            );

            setScanner(qrScanner);
            setScanning(true);
        }

        return () => {
            if (scanner) {
                scanner.clear().catch(console.error);
            }
        };
    }, [isOpen]);

    const handleClose = () => {
        if (scanner) {
            scanner.clear().catch(console.error);
            setScanner(null);
        }
        setScanning(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Scan QR Code" size="md">
            <div className="space-y-4">
                <div className="text-gray-400 text-sm text-center mb-4">
                    Position the QR code within the frame to scan the Free Fire ID
                </div>

                <div
                    id="qr-reader"
                    className="rounded-lg overflow-hidden"
                    style={{ width: '100%' }}
                />

                <div className="flex gap-3 mt-6">
                    <Button variant="secondary" onClick={handleClose} className="flex-1">
                        Cancel
                    </Button>
                </div>

                <div className="text-xs text-gray-500 text-center mt-4">
                    💡 Tip: Make sure the QR code is well-lit and in focus
                </div>
            </div>
        </Modal>
    );
};

export default QRScanner;
