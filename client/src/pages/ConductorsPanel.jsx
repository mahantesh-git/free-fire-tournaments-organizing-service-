import { useState, useEffect } from 'react';
import Navbar from '../components/layout/Navbar';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Toast from '../components/common/Toast';
import Modal from '../components/common/Modal';
import {
    getConductors,
    addConductor,
    updateConductor,
    deleteConductor,
    importConductors,
    getExportUrl
} from '../services/conductorService';
import { UserPlus, Search, RefreshCw, Upload, Download, Edit2, Trash2, Shield, User } from 'lucide-react';

const ROLES = ['Organizer', 'Volunteer', 'Referee', 'Technical'];

const RoleBadge = ({ role }) => {
    const styles = {
        Organizer: 'border-cyber-red text-cyber-red bg-cyber-red/10',
        Volunteer: 'border-cyber-neon text-cyber-neon bg-cyber-neon/10',
        Referee: 'border-cyber-yellow text-cyber-yellow bg-cyber-yellow/10',
        Technical: 'border-cyber-purple text-cyber-purple bg-cyber-purple/10'
    };

    return (
        <span className={`px-2 py-0.5 rounded-none text-[10px] font-mono font-bold uppercase tracking-wider border ${styles[role] || 'border-gray-500 text-gray-400'}`}>
            {role}
        </span>
    );
};

const ConductorsPanel = () => {
    // State
    const [conductors, setConductors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('');

    // Form State
    const [formData, setFormData] = useState({ name: '', phone: '', rollNo: '', role: 'Organizer' });
    const [isEditMode, setIsEditMode] = useState(false);
    const [editId, setEditId] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Initial Load
    useEffect(() => {
        loadConductors();
    }, []);

    const loadConductors = async () => {
        setLoading(true);
        try {
            const data = await getConductors(search, filterRole);
            setConductors(data);
        } catch (error) {
            Toast.error('Failed to load conductors');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        loadConductors();
    };

    const handleReset = () => {
        setSearch('');
        setFilterRole('');
        getConductors().then(setConductors); // Load all without filters
    };

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.phone || !formData.rollNo) {
            Toast.error('Please fill all required fields');
            return;
        }

        try {
            await addConductor(formData);
            Toast.success('Conductor added successfully');
            setFormData({ name: '', phone: '', rollNo: '', role: 'Organizer' });
            loadConductors();
        } catch (error) {
            Toast.error(error.message);
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            await updateConductor(editId, formData);
            Toast.success('Conductor updated successfully');
            setIsEditModalOpen(false);
            setFormData({ name: '', phone: '', rollNo: '', role: 'Organizer' });
            setEditId(null);
            setIsEditMode(false);
            loadConductors();
        } catch (error) {
            Toast.error(error.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this conductor?')) {
            try {
                await deleteConductor(id);
                Toast.success('Conductor deleted');
                loadConductors();
            } catch (error) {
                Toast.error(error.message);
            }
        }
    };

    const openEditModal = (conductor) => {
        setFormData({
            name: conductor.name,
            phone: conductor.phone,
            rollNo: conductor.rollNo,
            role: conductor.role
        });
        setEditId(conductor._id);
        setIsEditMode(true);
        setIsEditModalOpen(true);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            await importConductors(file);
            Toast.success('Conductors imported successfully');
            loadConductors();
        } catch (error) {
            Toast.error(error.message);
        }
        e.target.value = ''; // Reset input
    };

    const handleExport = () => {
        window.open(getExportUrl(), '_blank');
    };

    return (
        <div className="min-h-screen bg-cyber-black text-white font-inter overflow-x-hidden selection:bg-cyber-red selection:text-white relative">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_100%_0%,rgba(0,240,255,0.05),transparent_50%)]"></div>
                <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(circle_at_0%_100%,rgba(255,0,110,0.05),transparent_50%)]"></div>
                <div className="absolute inset-0 bg-[url('/grid-pattern.png')] opacity-5"></div>
            </div>

            <Navbar />

            <div className="p-4 md:p-8 pb-32 relative z-10 w-full max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Add Conductor Form */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card className="p-6 sticky top-6 bg-cyber-card border-l-4 border-l-cyber-purple border-y border-r border-white/5">
                            <h2 className="text-xl font-oswald font-bold text-white mb-6 pb-2 border-b border-white/10 flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-cyber-purple" />
                                REGISTER PERSONNEL
                            </h2>
                            <form onSubmit={handleAddSubmit} className="space-y-4">
                                <Input
                                    label="FULL NAME"
                                    placeholder="Enter Name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                                <Input
                                    label="CONTACT"
                                    placeholder="Phone Number"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                                <Input
                                    label="ID NUMBER"
                                    placeholder="Roll No"
                                    value={formData.rollNo}
                                    onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                                />
                                <div className="flex flex-col gap-1">
                                    <label className="text-gray-400 text-xs font-mono font-bold uppercase tracking-widest mb-1">
                                        ASSIGNMENT
                                    </label>
                                    <select
                                        className="w-full bg-cyber-black/80 border border-white/10 rounded-none px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-cyber-purple focus:shadow-[0_0_10px_rgba(139,92,246,0.3)] transition-all clip-path-slant"
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                                    </select>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button type="submit" variant="primary" icon="plus" className="flex-1 bg-cyber-purple hover:bg-cyber-purple/90 border-cyber-purple">
                                        REGISTER
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => setFormData({ name: '', phone: '', rollNo: '', role: 'Organizer' })}
                                    >
                                        CLEAR
                                    </Button>
                                </div>
                            </form>

                            {/* Import/Export Area */}
                            <div className="mt-8 pt-6 border-t border-white/10">
                                <div className="border border-dashed border-gray-700 rounded-none p-6 text-center hover:border-cyber-purple/50 transition-all bg-black/20 cursor-pointer relative group">
                                    <input
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={handleFileUpload}
                                    />
                                    <div className="text-4xl mb-2 grayscale group-hover:grayscale-0 transition-all transform group-hover:scale-110 duration-300">📥</div>
                                    <p className="text-gray-400 text-sm font-mono tracking-wide">DRAG & DROP DATA FILE</p>
                                    <p className="text-gray-600 text-[10px] mt-1 font-mono uppercase">.XLSX / .CSV SUPPORTED</p>
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <Button variant="secondary" className="flex-1 text-xs" icon="upload" onClick={() => document.querySelector('input[type=file]').click()}>
                                        UPLOAD
                                    </Button>
                                    <Button variant="secondary" className="flex-1 text-xs" icon="download" onClick={handleExport}>
                                        EXPORT
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Conductors List */}
                    <div className="lg:col-span-2">
                        <Card className="p-0 overflow-hidden min-h-[600px] flex flex-col bg-cyber-card border border-white/5">
                            {/* Header & Filter */}
                            <div className="p-4 border-b border-white/10 bg-black/40 flex flex-col md:flex-row justify-between gap-4 items-center">
                                <div>
                                    <h2 className="text-xl font-oswald font-bold text-white flex items-center gap-2">
                                        <Shield className="w-5 h-5 text-cyber-neon" />
                                        PERSONNEL DIRECTORY
                                    </h2>
                                    <p className="text-gray-500 text-xs font-mono mt-1">Found {conductors.length} registered staff members.</p>
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                    <Input
                                        placeholder="SEARCH ID/NAME..."
                                        className="min-w-[150px]"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        sanitize={false}
                                    />
                                    <Button size="sm" onClick={handleSearch} icon="search" variant="secondary">FIND</Button>
                                    <Button size="sm" variant="ghost" onClick={handleReset} icon="refresh"></Button>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto flex-1 custom-scrollbar">
                                <table className="w-full text-left">
                                    <thead className="bg-black/40 text-gray-400 text-xs font-mono uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm">
                                        <tr>
                                            <th className="px-6 py-4 font-bold border-b border-white/10">Name</th>
                                            <th className="px-6 py-4 font-bold border-b border-white/10">Phone</th>
                                            <th className="px-6 py-4 font-bold border-b border-white/10">ID No</th>
                                            <th className="px-6 py-4 font-bold border-b border-white/10">Role</th>
                                            <th className="px-6 py-4 font-bold border-b border-white/10 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {conductors.map((conductor) => (
                                            <tr key={conductor._id} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="font-oswald font-bold text-white tracking-wide">{conductor.name}</div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-400 font-mono text-sm">{conductor.phone}</td>
                                                <td className="px-6 py-4 text-gray-500 font-mono text-xs">{conductor.rollNo}</td>
                                                <td className="px-6 py-4">
                                                    <RoleBadge role={conductor.role} />
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => openEditModal(conductor)}
                                                            className="p-2 rounded-none hover:bg-cyber-neon/10 text-gray-400 hover:text-cyber-neon transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(conductor._id)}
                                                            className="p-2 rounded-none hover:bg-cyber-red/10 text-gray-400 hover:text-cyber-red transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {conductors.length === 0 && !loading && (
                                            <tr>
                                                <td colSpan="5" className="py-20 text-center text-gray-500 font-mono italic">
                                                    NO PERSONNEL RECORDS FOUND
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Edit Modal */}
                <Modal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    title="EDIT PERSONNEL"
                    size="sm"
                >
                    <form onSubmit={handleEditSubmit} className="space-y-4">
                        <Input
                            label="FULL NAME"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                        <Input
                            label="PHONE"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                        <Input
                            label="ID NUMBER"
                            value={formData.rollNo}
                            onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                        />
                        <div className="flex flex-col gap-1">
                            <label className="text-gray-400 text-xs font-mono font-bold uppercase tracking-widest mb-1">
                                ASSIGNMENT
                            </label>
                            <select
                                className="w-full bg-cyber-black/80 border border-white/10 rounded-none px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-cyber-purple focus:shadow-[0_0_10px_rgba(139,92,246,0.3)] transition-all clip-path-slant"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            >
                                {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                            </select>
                        </div>

                        <div className="flex gap-2 pt-4 border-t border-white/10 mt-4">
                            <Button
                                type="button"
                                variant="secondary"
                                className="flex-1"
                                onClick={() => {
                                    setIsEditModalOpen(false);
                                    setFormData({ name: '', phone: '', rollNo: '', role: 'Organizer' });
                                }}
                            >
                                CANCEL
                            </Button>
                            <Button type="submit" variant="success" className="flex-1" icon="save">
                                SAVE CHANGES
                            </Button>
                        </div>
                    </form>
                </Modal>
            </div>
        </div>
    );
};

export default ConductorsPanel;
