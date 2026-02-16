import { useState } from 'react';
import Button from '../common/Button';
import Card from '../common/Card';
import { importPlayersFromExcel } from '../../services/playerService';

const ExcelImport = ({ onImportSuccess, tournamentId }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const handleImport = async () => {
        if (!selectedFile) return;

        setLoading(true);
        try {
            await importPlayersFromExcel(selectedFile, tournamentId);
            setSelectedFile(null);
            // Reset file input
            document.getElementById('excel-file-input').value = '';
            if (onImportSuccess) {
                onImportSuccess();
            }
        } catch (error) {
            console.error('Import failed:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* File Upload Area */}
            <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-gaming-blue transition-colors cursor-pointer">
                <input
                    type="file"
                    id="excel-file-input"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                />
                <label htmlFor="excel-file-input" className="cursor-pointer">
                    <div className="text-6xl mb-4">📁</div>
                    <div className="text-white font-semibold mb-2">Choose Excel File</div>
                    <div className="text-gray-400 text-sm">
                        Click to browse or drag and drop
                    </div>
                </label>
            </div>

            {/* Selected File Info */}
            {selectedFile && (
                <Card className="p-4 bg-green-900 bg-opacity-20 border-green-500">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">✅</span>
                            <div>
                                <div className="text-white font-semibold">{selectedFile.name}</div>
                                <div className="text-gray-400 text-xs">
                                    {(selectedFile.size / 1024).toFixed(2)} KB
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedFile(null)}
                            className="text-red-400 hover:text-red-300"
                        >
                            ✕
                        </button>
                    </div>
                </Card>
            )}

            {/* Import Button */}
            <Button
                variant="primary"
                size="lg"
                onClick={handleImport}
                disabled={!selectedFile || loading}
                loading={loading}
                className="w-full"
            >
                <span className="text-xl mr-2">📤</span>
                {loading ? 'Importing...' : 'Import Players'}
            </Button>

            {/* Format Info */}
            <Card className="p-4 bg-gray-900 bg-opacity-60">
                <div className="text-sm space-y-2">
                    <div className="text-gray-300 font-semibold mb-2">📋 Excel Format:</div>
                    <div className="text-gray-400">
                        Required columns: <code className="bg-gray-800 px-2 py-1 rounded text-gaming-blue">playerName</code>,
                        <code className="bg-gray-800 px-2 py-1 rounded text-gaming-blue mx-1">ffName</code>,
                        <code className="bg-gray-800 px-2 py-1 rounded text-gaming-blue">ffId</code>
                    </div>
                    <div className="text-gray-500 text-xs mt-2">
                        💡 First row should contain column headers
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default ExcelImport;
