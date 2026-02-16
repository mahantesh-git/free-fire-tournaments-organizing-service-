import { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';
import {
    Settings,
    Download,
    Copy,
    MessageCircle,
    Send,
    Instagram,
    Check
} from 'lucide-react';
import Card from '../common/Card';

const QRCodeCard = ({ registrationUrl, tournamentName, mode, tournamentId, stats }) => {
    const [copied, setCopied] = useState(false);
    const qrCodeRef = useRef(null);

    // Copy to clipboard
    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(registrationUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    };

    // Download QR Code as PNG
    const downloadQRCode = async () => {
        try {
            // Wait for next frame to ensure QR code is rendered
            await new Promise(resolve => setTimeout(resolve, 100));
            const element = qrCodeRef.current;
            if (!element) return;

            const canvas = await html2canvas(element, {
                backgroundColor: '#ffffff',
                scale: 3,
                logging: false,
                useCORS: true
            });

            const link = document.createElement('a');
            link.download = `${tournamentName.replace(/\s+/g, '-')}-QR-Code.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error('Failed to download QR code:', error);
        }
    };

    // Social Media Share Functions
    const shareMessage = `🎮 Join ${tournamentName}!\n\nMode: ${mode}\n\nRegister now: ${registrationUrl}`;

    const shareWhatsApp = () => {
        const url = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
        window.open(url, '_blank');
    };

    const shareTelegram = () => {
        const url = `https://t.me/share/url?url=${encodeURIComponent(registrationUrl)}&text=${encodeURIComponent(`🎮 Join ${tournamentName}!\nMode: ${mode}`)}`;
        window.open(url, '_blank');
    };

    const shareInstagram = async () => {
        try {
            await navigator.clipboard.writeText(shareMessage);
            alert('✅ Link copied to clipboard!\n\nOpen Instagram and paste in your story or post.');
        } catch (error) {
            console.error('Failed to copy for Instagram:', error);
        }
    };

    return (
        <Card className="bg-cyber-charcoal border-cyber-border p-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-cyber-border">
                <Settings className="w-4 h-4 text-cyber-red" />
                <h3 className="text-sm font-oswald uppercase tracking-wider text-white">
                    Tournament Control
                </h3>
            </div>

            {/* Tournament Info Section */}
            <div className="bg-cyber-black border border-cyber-border rounded-lg p-4 mb-4">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-oswald font-bold text-white uppercase leading-tight">
                            {tournamentName}
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-cyber-muted font-mono bg-cyber-charcoal px-2 py-0.5 rounded border border-cyber-border">
                                ID: {tournamentId.slice(-6)}
                            </span>
                            <span className="px-2 py-0.5 bg-cyber-red text-white text-[10px] font-bold uppercase rounded">
                                {mode}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Tournament Stats Grid */}
                {stats && (
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-cyber-border/50">
                        <div>
                            <p className="text-[10px] text-cyber-muted uppercase tracking-wider mb-0.5">Max Players</p>
                            <p className="text-sm font-mono font-bold text-white">{stats.maxPlayersPerRoom}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-cyber-muted uppercase tracking-wider mb-0.5">Total Rooms</p>
                            <p className="text-sm font-mono font-bold text-white">{stats.totalRooms}</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-[10px] text-cyber-muted uppercase tracking-wider mb-0.5">Created</p>
                            <p className="text-sm font-mono font-bold text-white">{new Date(stats.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* QR Code & Actions Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* QR Code */}
                <div
                    ref={qrCodeRef}
                    className="bg-white p-2 rounded-lg flex flex-col items-center justify-center min-h-[200px]"
                >
                    <QRCodeCanvas
                        value={registrationUrl}
                        size={256}
                        level="H"
                        includeMargin={true}
                        bgColor="#FFFFFF"
                        fgColor="#000000"
                        style={{ width: '100%', height: 'auto', maxWidth: '256px' }}
                    />
                    <p className="text-[10px] text-cyber-charcoal font-bold mt-2 uppercase tracking-wide">
                        Scan to Join
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 justify-center">
                    <button
                        onClick={downloadQRCode}
                        className="w-full px-3 py-2 bg-gradient-to-r from-cyber-red to-red-600 hover:from-cyber-red/90 hover:to-red-600/90 text-white font-oswald uppercase tracking-wider rounded text-xs flex items-center justify-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Download QR
                    </button>

                    <div className="bg-cyber-black/50 p-2 rounded border border-cyber-border/50 mt-1">
                        <p className="text-[10px] text-cyber-muted mb-2 font-oswald uppercase tracking-wider text-center">
                            Share via
                        </p>
                        <div className="grid grid-cols-3 gap-1.5">
                            <button
                                onClick={shareWhatsApp}
                                className="p-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors flex justify-center"
                                title="WhatsApp"
                            >
                                <MessageCircle className="w-4 h-4" />
                            </button>
                            <button
                                onClick={shareTelegram}
                                className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors flex justify-center"
                                title="Telegram"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                            <button
                                onClick={shareInstagram}
                                className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded transition-colors flex justify-center"
                                title="Instagram"
                            >
                                <Instagram className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Registration Link Footer */}
            <div className="border-t border-cyber-border pt-3">
                <label className="block text-[10px] text-cyber-muted mb-1 font-oswald uppercase tracking-wider">
                    Registration Link
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={registrationUrl}
                        readOnly
                        className="flex-1 bg-cyber-black border border-cyber-border rounded px-3 py-1.5 text-white text-xs font-mono truncate focus:outline-none focus:border-cyber-red/50 transition-colors"
                    />
                    <button
                        onClick={copyToClipboard}
                        className="px-3 py-1.5 bg-cyber-red hover:bg-cyber-red/80 text-white rounded transition-colors flex items-center gap-1 text-xs font-medium"
                    >
                        {copied ? (
                            <>
                                <Check className="w-3 h-3" />
                                <span className="hidden sm:inline">Copied</span>
                            </>
                        ) : (
                            <>
                                <Copy className="w-3 h-3" />
                                <span className="hidden sm:inline">Copy</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Card>
    );
};

export default QRCodeCard;
