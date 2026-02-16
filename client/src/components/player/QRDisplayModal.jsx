import { QRCodeSVG } from 'qrcode.react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Toast from '../common/Toast';

const QRDisplayModal = ({ isOpen, onClose }) => {
    // Generate the registration link based on current location
    const registrationLink = `${window.location.origin}/register`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(registrationLink)
            .then(() => Toast.success('Link copied to clipboard!'))
            .catch(() => Toast.error('Failed to copy link'));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Registration QR Code" size="sm">
            <div className="flex flex-col items-center space-y-6 py-4">
                <div className="bg-white p-4 rounded-xl shadow-2xl">
                    <QRCodeSVG
                        value={registrationLink}
                        size={256}
                        level="H"
                        includeMargin={true}
                    />
                </div>

                <div className="text-center space-y-2">
                    <p className="text-gray-400 text-sm">
                        Players can scan this code to access the registration page
                    </p>
                    <div className="bg-black/40 border border-white/10 rounded-lg p-3 w-full break-all font-mono text-xs text-gaming-blue">
                        {registrationLink}
                    </div>
                </div>

                <div className="flex gap-3 w-full">
                    <Button
                        variant="secondary"
                        onClick={copyToClipboard}
                        className="flex-1"
                    >
                        📋 Copy Link
                    </Button>
                    <Button
                        variant="primary"
                        onClick={onClose}
                        className="flex-1"
                    >
                        Close
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default QRDisplayModal;
