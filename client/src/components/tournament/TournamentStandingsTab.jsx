import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Trophy,
    RefreshCw,
    Copy,
    Check,
    Shield,
    Users,
    Crosshair,
    Award,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
    Download,
    QrCode,
    ExternalLink,
    Filter,
    Sparkles,
    CheckCircle2,
    X
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import * as XLSX from 'xlsx';
import api from '../../services/api';
import socketService from '../../services/socketService';
import { getTenantSlug } from '../../utils/tenant';
import { toast } from 'react-hot-toast';

const TournamentStandingsTab = ({ tournamentId, tournament }) => {
    const [standings, setStandings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [viewMode, setViewMode] = useState('TEAMS'); // 'TEAMS' or 'PLAYERS'
    const [expandedRows, setExpandedRows] = useState(new Set());

    // Qualification State (Top 1 to N)
    const [cutoffInput, setCutoffInput] = useState(48);
    const [cutoffType, setCutoffType] = useState('PLAYERS'); // 'PLAYERS' or 'SQUADS'
    const [cutoffTitle, setCutoffTitle] = useState('Qualified for Next Round');
    const [savingCutoff, setSavingCutoff] = useState(false);
    const [filterOnlyQualified, setFilterOnlyQualified] = useState(false);
    const [showQrModal, setShowQrModal] = useState(false);
    const [copiedPublicLink, setCopiedPublicLink] = useState(false);

    const isSoloMode = tournament?.mode === 'SOLO' || standings?.mode === 'SOLO';

    // Tenant slug & public verification link
    const tenantSlug = getTenantSlug() || localStorage.getItem('tenantSlug') || '';
    const hasSubdomain = tenantSlug && window.location.hostname.startsWith(`${tenantSlug}.`);
    const tenantParam = !hasSubdomain && tenantSlug ? `?tenant=${tenantSlug}` : '';
    const publicVerificationUrl = `${window.location.protocol}//${window.location.host}/qualification/${tournamentId}${tenantParam}`;

    const fetchStandings = useCallback(async (isSilent = false) => {
        try {
            if (!isSilent) setLoading(true);
            const res = await api.get(`/api/tournaments/${tournamentId}/standings`);
            if (res.data.success && res.data.standing) {
                setStandings(res.data.standing);
                if (res.data.standing.qualification) {
                    if (res.data.standing.qualification.cutoff) setCutoffInput(res.data.standing.qualification.cutoff);
                    if (res.data.standing.qualification.type) setCutoffType(res.data.standing.qualification.type);
                    if (res.data.standing.qualification.customTitle) setCutoffTitle(res.data.standing.qualification.customTitle);
                }
            }
        } catch (error) {
            console.error('Failed to load tournament standings:', error);
            if (!isSilent) {
                toast.error(error.response?.data?.message || 'Failed to load tournament standings', { id: 'tourny-standings-err' });
            }
        } finally {
            if (!isSilent) setLoading(false);
        }
    }, [tournamentId]);

    const handleGenerateStandings = async () => {
        try {
            setGenerating(true);
            const res = await api.post(`/api/tournaments/${tournamentId}/standings/generate`);
            if (res.data.success) {
                setStandings(res.data.standing);
                toast.success(res.data.message || 'Tournament standings compiled successfully!');
            }
        } catch (error) {
            console.error('Error generating tournament standings:', error);
            toast.error(error.response?.data?.message || 'Failed to compile tournament standings');
        } finally {
            setGenerating(false);
        }
    };

    // Save Qualification Cutoff to Backend
    const handleSaveCutoff = async () => {
        const num = parseInt(cutoffInput);
        if (isNaN(num) || num < 1) {
            toast.error('Please enter a valid number of qualified slots (minimum 1)');
            return;
        }

        try {
            setSavingCutoff(true);
            const res = await api.put(`/api/tournaments/${tournamentId}/qualification`, {
                cutoff: num,
                type: isSoloMode ? 'PLAYERS' : cutoffType,
                customTitle: cutoffTitle
            });
            if (res.data.success) {
                toast.success(`Top ${num} qualification cutoff saved!`);
                fetchStandings(true);
            }
        } catch (err) {
            console.error('Failed to save qualification cutoff:', err);
            toast.error(err.response?.data?.message || 'Failed to save qualification cutoff');
        } finally {
            setSavingCutoff(false);
        }
    };

    const handleCopyStandings = () => {
        if (!standings) return;
        const { tournamentName, mode, rankingMetric, killPointsMultiplier, totalRooms, totalMatchesPlayed, teamRankings, playerRankings, isComplete } = standings;

        let text = `🏆 ${tournamentName?.toUpperCase() || 'TOURNAMENT'} STANDINGS — FREE FIRE\n`;
        text += `Status: ${isComplete ? 'OFFICIAL FINAL STANDINGS' : 'PROVISIONAL (MATCHES ONGOING)'}\n`;
        text += `Mode: ${mode} | Metric: ${rankingMetric === 'KILLS' ? 'Total Kills' : 'Total Points'} (1 Kill = ${killPointsMultiplier} Pt)\n`;
        text += `Rooms: ${totalRooms || 0} | Rounds Played: ${totalMatchesPlayed || 0}\n\n`;

        // Solo Mode Champion
        if (mode === 'SOLO' && playerRankings && playerRankings.length > 0) {
            const champ = playerRankings[0];
            const champId = champ.ffId || champ.playerId;
            const champIdStr = champId ? ` [ID: ${champId}]` : '';
            text += `👑 TOURNAMENT CHAMPION: ${champ.playerName || champ.ffName}${champIdStr} (${champ.totalPoints} Pts | ${champ.totalKills} Kills)\n\n`;
        }

        // Squad Standings
        if (mode !== 'SOLO' && teamRankings && teamRankings.length > 0) {
            text += `👑 TOURNAMENT CHAMPION: ${teamRankings[0]?.squadName} (${teamRankings[0]?.totalPoints} Pts | ${teamRankings[0]?.totalKills} Kills)\n\n`;
            text += `📊 SQUAD STANDINGS:\n`;
            teamRankings.forEach((t) => {
                const rankDisplay = t.isDisqualified ? 'DQ' : `#${t.rank}`;
                const roomInfo = t.roomName ? ` [${t.roomName}]` : '';
                text += `${rankDisplay}. ${t.squadName}${roomInfo} — ${t.totalPoints} Pts | ${t.totalKills} Kills | ${t.booyahs} Booyahs\n`;
                if (t.players && t.players.length > 0) {
                    const rosterStr = t.players
                        .map(p => {
                            const pId = p.ffId || p.playerId;
                            return `${p.playerName || p.ffName}${pId ? ` [ID: ${pId}]` : ''} (${p.totalKills || 0}k)`;
                        })
                        .join(', ');
                    text += `   👥 Players: ${rosterStr}\n`;
                }
            });
            text += `\n`;
        }

        // Individual / MVP / Solo Standings
        if (playerRankings && playerRankings.length > 0) {
            const label = mode === 'SOLO' ? '👑 SOLO STANDINGS' : '🎯 TOP PLAYERS (MVP)';
            text += `${label}:\n`;
            playerRankings.slice(0, mode === 'SOLO' ? playerRankings.length : 15).forEach((p) => {
                const rankDisplay = p.isDisqualified ? 'DQ' : `#${p.rank}`;
                const playerIdentifier = p.ffId || p.playerId;
                const idInfo = playerIdentifier ? ` [ID: ${playerIdentifier}]` : '';
                const teamInfo = mode !== 'SOLO' && p.teamName ? ` (${p.teamName})` : '';
                text += `${rankDisplay}. ${p.playerName || p.ffName}${idInfo}${teamInfo} — ${p.totalPoints} Pts | ${p.totalKills} Kills | ${p.booyahs} Wins\n`;
            });
        }

        text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        text += `Generated by Free Fire Tournament Platform`;

        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success('Tournament standings copied to clipboard!');
        setTimeout(() => setCopied(false), 2500);
    };

    // Download Full Standings Excel
    const handleDownloadExcel = () => {
        if (!standings) {
            toast.error('No standings available to export');
            return;
        }

        try {
            const wb = XLSX.utils.book_new();
            const { tournamentName, mode, rankingMetric, killPointsMultiplier, totalRooms, totalMatchesPlayed, teamRankings, playerRankings, isComplete } = standings;

            // Sheet 1: Tournament Overview & Summary
            const summaryData = [
                ['🏆 TOURNAMENT STANDINGS REPORT', ''],
                ['Tournament Name', tournamentName || 'Free Fire Tournament'],
                ['Mode', mode || 'SQUAD'],
                ['Status', isComplete ? 'OFFICIAL FINAL STANDINGS' : 'PROVISIONAL (MATCHES ONGOING)'],
                ['Ranking Metric', rankingMetric === 'KILLS' ? 'Total Kills' : 'Total Points'],
                ['1 Kill Value', `${killPointsMultiplier ?? 1} Point(s)`],
                ['Total Rooms', totalRooms || 0],
                ['Total Rounds Counted', totalMatchesPlayed || 0],
                ['Exported At', new Date().toLocaleString()],
            ];
            const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
            wsSummary['!cols'] = [{ wch: 25 }, { wch: 40 }];
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Overview');

            // Sheet 2: Squad Standings (if not SOLO)
            if (mode !== 'SOLO' && teamRankings && teamRankings.length > 0) {
                const squadRows = teamRankings.map((t) => ({
                    'Rank': t.isDisqualified ? 'DQ' : t.rank,
                    'Squad / Team': t.squadName,
                    'Room': t.roomName || 'Room',
                    'Matches Played': t.matchesPlayed || 0,
                    'Booyahs (Wins)': t.booyahs || 0,
                    'Total Kills': t.totalKills || 0,
                    'Placement Points': t.placementPoints || 0,
                    'Total Points': t.totalPoints || 0,
                    'Status': t.isDisqualified ? `DQ (${t.disqualificationReason || 'Rule violation'})` : 'Active',
                    'Roster': (t.players || []).map(p => `${p.playerName || p.ffName}${(p.ffId || p.playerId) ? ` [ID: ${p.ffId || p.playerId}]` : ''} (${p.totalKills || 0}k)`).join(', ')
                }));
                const wsSquads = XLSX.utils.json_to_sheet(squadRows);
                wsSquads['!cols'] = [
                    { wch: 8 }, { wch: 25 }, { wch: 15 }, { wch: 14 },
                    { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 15 }, { wch: 50 }
                ];
                XLSX.utils.book_append_sheet(wb, wsSquads, 'Squad Standings');
            }

            // Sheet 3: Player Standings / MVP Rankings
            if (playerRankings && playerRankings.length > 0) {
                const playerRows = playerRankings.map((p) => {
                    const row = {
                        'Rank': p.isDisqualified ? 'DQ' : p.rank,
                        'Player Name': p.playerName || p.ffName,
                        'Player ID (UID)': p.ffId || p.playerId || '-',
                    };
                    if (mode !== 'SOLO') {
                        row['Squad / Team'] = p.teamName || '-';
                    }
                    row['Room'] = p.roomName || 'Room';
                    row['Matches Played'] = p.matchesPlayed || 0;
                    row['Wins (Booyahs)'] = p.booyahs || 0;
                    row['Total Kills'] = p.totalKills || 0;
                    row['Placement Points'] = p.placementPoints || 0;
                    row['Total Points'] = p.totalPoints || 0;
                    row['Status'] = p.isDisqualified ? 'DQ' : 'Active';
                    return row;
                });
                const wsPlayers = XLSX.utils.json_to_sheet(playerRows);
                wsPlayers['!cols'] = [
                    { wch: 8 }, { wch: 22 }, { wch: 18 },
                    ...(mode !== 'SOLO' ? [{ wch: 22 }] : []),
                    { wch: 15 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 10 }
                ];
                const sheetTitle = mode === 'SOLO' ? 'Solo Standings' : 'Player MVP Rankings';
                XLSX.utils.book_append_sheet(wb, wsPlayers, sheetTitle);
            }

            const cleanName = (tournamentName || 'Tournament').replace(/[^a-zA-Z0-9_-]/g, '_');
            const fileName = `${cleanName}_Standings_${new Date().toISOString().slice(0, 10)}.xlsx`;
            XLSX.writeFile(wb, fileName);
            toast.success('Excel sheet downloaded successfully!');
        } catch (err) {
            console.error('Error generating Excel sheet:', err);
            toast.error('Failed to export Excel sheet');
        }
    };

    // Download Qualified Only (Top 1 to N) Excel
    const handleDownloadQualifiedExcel = () => {
        const num = parseInt(cutoffInput) || 48;
        const isSquad = !isSoloMode && cutoffType === 'SQUADS';
        const cleanName = (standings?.tournamentName || tournament?.name || 'Tournament').replace(/[^a-zA-Z0-9_-]/g, '_');

        try {
            const wb = XLSX.utils.book_new();

            const overviewData = [
                ['🏆 OFFICIAL QUALIFIED ROSTER (TOP 1 TO ' + num + ')', ''],
                ['Tournament Name', standings?.tournamentName || tournament?.name || 'Free Fire Tournament'],
                ['Mode', standings?.mode || tournament?.mode || 'SQUAD'],
                ['Qualification Title', cutoffTitle || 'Qualified for Next Round'],
                ['Cutoff Rule', `Top ${num} ${isSquad ? 'Squads' : 'Players'} Advance`],
                ['Status', standings?.isComplete ? 'OFFICIAL FINAL STANDINGS' : 'PROVISIONAL (MATCHES ONGOING)'],
                ['Exported At', new Date().toLocaleString()]
            ];
            const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
            wsOverview['!cols'] = [{ wch: 25 }, { wch: 40 }];
            XLSX.utils.book_append_sheet(wb, wsOverview, 'Overview');

            if (isSquad) {
                const qualifiedTeams = (standings?.teamRankings || []).filter(t => !t.isDisqualified).slice(0, num);
                const rows = qualifiedTeams.map((t, idx) => ({
                    'Qualified Seed': `#${idx + 1}`,
                    'Tournament Rank': `#${t.rank}`,
                    'Squad / Team': t.squadName,
                    'Room': t.roomName || 'Room',
                    'Matches Played': t.matchesPlayed || 0,
                    'Booyahs': t.booyahs || 0,
                    'Total Kills': t.totalKills || 0,
                    'Total Points': t.totalPoints || 0,
                    'Status': 'QUALIFIED',
                    'Players': (t.players || []).map(p => `${p.playerName || p.ffName}${p.ffId ? ` [ID: ${p.ffId}]` : ''} (${p.totalKills || 0}k)`).join(', ')
                }));
                const ws = XLSX.utils.json_to_sheet(rows);
                ws['!cols'] = [
                    { wch: 15 }, { wch: 16 }, { wch: 25 }, { wch: 14 },
                    { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 50 }
                ];
                XLSX.utils.book_append_sheet(wb, ws, `Top ${num} Qualified Squads`);
            } else {
                const qualifiedPlayers = (standings?.playerRankings || []).filter(p => !p.isDisqualified).slice(0, num);
                const rows = qualifiedPlayers.map((p, idx) => {
                    const row = {
                        'Qualified Seed': `#${idx + 1}`,
                        'Tournament Rank': `#${p.rank}`,
                        'Player Name': p.playerName || p.ffName,
                        'Free Fire ID (UID)': p.ffId || p.playerId || '-',
                    };
                    if (!isSoloMode) {
                        row['Squad / Team'] = p.teamName || '-';
                    }
                    row['Room'] = p.roomName || 'Room';
                    row['Matches Played'] = p.matchesPlayed || 0;
                    row['Wins'] = p.booyahs || 0;
                    row['Total Kills'] = p.totalKills || 0;
                    row['Total Points'] = p.totalPoints || 0;
                    row['Status'] = 'QUALIFIED';
                    return row;
                });
                const ws = XLSX.utils.json_to_sheet(rows);
                ws['!cols'] = [
                    { wch: 15 }, { wch: 16 }, { wch: 22 }, { wch: 20 },
                    ...(!isSoloMode ? [{ wch: 22 }] : []),
                    { wch: 14 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }
                ];
                XLSX.utils.book_append_sheet(wb, ws, `Top ${num} Qualified Players`);
            }

            const fileName = `${cleanName}_Top_${num}_Qualified_${new Date().toISOString().slice(0, 10)}.xlsx`;
            XLSX.writeFile(wb, fileName);
            toast.success(`Top ${num} Qualified Excel sheet downloaded!`);
        } catch (err) {
            console.error('Failed to export qualified Excel:', err);
            toast.error('Failed to download qualified Excel sheet');
        }
    };

    // Download Branded QR Flyer (PNG)
    const handleDownloadQrFlyer = () => {
        try {
            const qrCanvas = document.querySelector('#tab-qr-canvas canvas');
            const tournamentName = standings?.tournamentName || tournament?.name || 'Free Fire Tournament';
            const num = parseInt(cutoffInput) || 48;
            const cutoffLabel = (!isSoloMode && cutoffType === 'SQUADS') ? 'SQUADS' : 'PLAYERS';

            const canvas = document.createElement('canvas');
            canvas.width = 650;
            canvas.height = 800;
            const ctx = canvas.getContext('2d');

            // Dark cyber gradient background
            const bgGrad = ctx.createLinearGradient(0, 0, 0, 800);
            bgGrad.addColorStop(0, '#0a0d14');
            bgGrad.addColorStop(1, '#05070a');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, 650, 800);

            // Gold & Red border
            ctx.strokeStyle = '#eab308';
            ctx.lineWidth = 4;
            ctx.strokeRect(12, 12, 626, 776);
            ctx.strokeStyle = '#ff003c';
            ctx.lineWidth = 2;
            ctx.strokeRect(18, 18, 614, 764);

            // Header
            ctx.fillStyle = '#111827';
            ctx.fillRect(20, 20, 610, 110);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px "Oswald", sans-serif, system-ui';
            ctx.textAlign = 'center';
            const displayTitle = tournamentName.length > 32 ? tournamentName.slice(0, 30) + '...' : tournamentName;
            ctx.fillText(displayTitle.toUpperCase(), 325, 60);

            ctx.fillStyle = '#ff003c';
            ctx.font = 'bold 15px sans-serif';
            ctx.fillText('NEXT ROUND QUALIFICATION PORTAL', 325, 90);

            ctx.fillStyle = '#eab308';
            ctx.font = 'bold 22px sans-serif';
            ctx.fillText(`★ TOP ${num} ${cutoffLabel} ADVANCE ★`, 325, 165);

            // White box for QR code
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(165, 195, 320, 320);

            if (qrCanvas) {
                ctx.drawImage(qrCanvas, 175, 205, 300, 300);
            }

            // Call to action
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 19px sans-serif';
            ctx.fillText('SCAN TO CHECK YOUR SELECTION STATUS', 325, 555);

            ctx.fillStyle = '#94a3b8';
            ctx.font = '14px sans-serif';
            ctx.fillText('Enter your Player ID (UID) to verify if you made the cut', 325, 585);

            ctx.fillStyle = '#38bdf8';
            ctx.font = '13px monospace';
            const shortUrl = publicVerificationUrl.length > 55 ? publicVerificationUrl.slice(0, 52) + '...' : publicVerificationUrl;
            ctx.fillText(shortUrl, 325, 620);

            ctx.fillStyle = '#64748b';
            ctx.font = '12px sans-serif';
            ctx.fillText('Official Esports Qualification Intimation • Free Fire Tournament Platform', 325, 740);

            const link = document.createElement('a');
            link.download = `${tournamentName.replace(/\s+/g, '_')}_Top_${num}_Qualification_QR.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            toast.success('QR Code Flyer downloaded successfully!');
        } catch (err) {
            console.error('Failed to download flyer:', err);
            toast.error('Failed to download QR flyer');
        }
    };

    const handleCopyPublicLink = () => {
        navigator.clipboard.writeText(publicVerificationUrl);
        setCopiedPublicLink(true);
        toast.success('Public player verification link copied!');
        setTimeout(() => setCopiedPublicLink(false), 2000);
    };

    const toggleRow = (id) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    useEffect(() => {
        fetchStandings();
    }, [fetchStandings]);

    // Socket Listener for real-time standing updates
    useEffect(() => {
        const socket = socketService.connect();
        const tenantSlug = getTenantSlug() || localStorage.getItem('tenantSlug');

        if (tenantSlug) {
            socketService.emit('join_tenant', tenantSlug);
        }

        const handleStandingsUpdate = (data) => {
            if (data.tournamentId?.toString() === tournamentId?.toString()) {
                console.log('📡 [TournamentStandingsTab] Real-time standings update received:', data);
                if (data.standing) {
                    setStandings(data.standing);
                    toast('Tournament standings updated!', { icon: '🏆', id: 'tourny-standings-sync' });
                }
            }
        };

        const handleQualUpdate = (data) => {
            if (data.tournamentId?.toString() === tournamentId?.toString() && data.qualification) {
                if (data.qualification.cutoff) setCutoffInput(data.qualification.cutoff);
                if (data.qualification.type) setCutoffType(data.qualification.type);
                if (data.qualification.customTitle) setCutoffTitle(data.qualification.customTitle);
            }
        };

        socketService.on('tournamentStandingsUpdated', handleStandingsUpdate);
        socketService.on('tournamentCompleted', handleStandingsUpdate);
        socketService.on('qualificationUpdated', handleQualUpdate);

        return () => {
            socketService.off('tournamentStandingsUpdated', handleStandingsUpdate);
            socketService.off('tournamentCompleted', handleStandingsUpdate);
            socketService.off('qualificationUpdated', handleQualUpdate);
        };
    }, [tournamentId]);

    if (loading) {
        return (
            <div className="card-cyber p-12 text-center">
                <RefreshCw className="w-8 h-8 text-cyber-red animate-spin mx-auto mb-4" />
                <p className="text-cyber-muted font-oswald uppercase tracking-wider text-sm">
                    Compiling multi-room tournament standings...
                </p>
            </div>
        );
    }

    const teamRankings = standings?.teamRankings || [];
    const playerRankings = standings?.playerRankings || [];
    const hasData = isSoloMode ? playerRankings.length > 0 : teamRankings.length > 0;

    const rank1 = isSoloMode ? playerRankings[0] : teamRankings[0];
    const rank2 = isSoloMode ? playerRankings[1] : teamRankings[1];
    const rank3 = isSoloMode ? playerRankings[2] : teamRankings[2];

    const currentCutoffNum = parseInt(cutoffInput) || 48;

    // Filter displayed lists based on toggle
    const displayedTeamRankings = filterOnlyQualified
        ? teamRankings.filter(t => !t.isDisqualified).slice(0, currentCutoffNum)
        : teamRankings;

    const displayedPlayerRankings = filterOnlyQualified
        ? playerRankings.filter(p => !p.isDisqualified).slice(0, currentCutoffNum)
        : playerRankings;

    return (
        <div className="space-y-8 font-inter">
            {/* Hidden canvas for tab QR generation */}
            <div id="tab-qr-canvas" className="hidden">
                <QRCodeCanvas value={publicVerificationUrl} size={300} level="H" includeMargin={true} />
            </div>

            {/* Header & Controls */}
            <div className="bg-cyber-charcoal border border-cyber-border p-6 rounded-none flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
                <div>
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="w-8 h-8 bg-yellow-500/10 border border-yellow-500/40 rounded flex items-center justify-center">
                            <Trophy className="w-4 h-4 text-yellow-400" />
                        </span>
                        <h2 className="text-2xl font-black font-oswald text-white uppercase tracking-wider">
                            Tournament Standings
                        </h2>
                        <span className={`text-[11px] font-black font-oswald uppercase px-2.5 py-0.5 border ${
                            standings?.isComplete
                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/50'
                                : 'bg-amber-950/60 text-amber-400 border-amber-500/50'
                        }`}>
                            {standings?.isComplete ? '✓ Official Final Standings' : '● Provisional (Matches Ongoing)'}
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-cyber-muted font-mono">
                        <span>Mode: <strong className="text-white font-oswald">{standings?.mode || tournament?.mode || 'SQUAD'}</strong></span>
                        <span>•</span>
                        <span>Ranking Metric: <strong className="text-yellow-400 font-oswald">{standings?.rankingMetric === 'KILLS' ? 'Total Kills' : 'Total Points'}</strong></span>
                        <span>•</span>
                        <span>1 Kill = <strong className="text-white">{standings?.killPointsMultiplier ?? 1} Pt</strong></span>
                        <span>•</span>
                        <span>Total Rooms: <strong className="text-white">{standings?.totalRooms ?? 0}</strong></span>
                        <span>•</span>
                        <span>Rounds Counted: <strong className="text-white">{standings?.totalMatchesPlayed ?? 0}</strong></span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={handleCopyStandings}
                        disabled={!hasData}
                        className="flex items-center gap-2 px-4 py-2.5 bg-cyber-charcoal hover:bg-cyber-border border border-cyber-border text-white text-xs font-bold font-oswald uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer"
                    >
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        <span>{copied ? 'Copied!' : 'Copy Standings'}</span>
                    </button>

                    <button
                        onClick={handleDownloadExcel}
                        disabled={!hasData}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/50 text-emerald-300 text-xs font-bold font-oswald uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                        title="Download formatted Excel (.xlsx) spreadsheet"
                    >
                        <Download className="w-4 h-4 text-emerald-400" />
                        <span>Download Excel</span>
                    </button>

                    <button
                        onClick={() => fetchStandings()}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2.5 bg-cyber-charcoal hover:bg-cyber-border border border-cyber-border text-white text-xs font-bold font-oswald uppercase tracking-wider transition-all cursor-pointer"
                        title="Reload latest standings"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyber-red' : ''}`} />
                        <span>Refresh</span>
                    </button>

                    <button
                        onClick={handleGenerateStandings}
                        disabled={generating}
                        className="flex items-center gap-2 px-4 py-2.5 bg-cyber-red hover:bg-cyber-red/80 text-white text-xs font-black font-oswald uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(255,0,60,0.3)] disabled:opacity-50 cursor-pointer"
                    >
                        {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                        <span>{generating ? 'Compiling...' : 'Recalculate Standings'}</span>
                    </button>
                </div>
            </div>

            {/* Next Round Qualification Controller (Top 1 to N) */}
            <div className="bg-gradient-to-r from-yellow-500/10 via-cyber-charcoal to-cyber-charcoal border-2 border-yellow-500/60 p-6 shadow-[0_0_30px_rgba(234,179,8,0.12)]">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    {/* Left: Input & Cutoff Controls */}
                    <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-yellow-400" />
                            <h3 className="text-lg font-black font-oswald uppercase text-white tracking-wider">
                                Next Round Qualification (Top 1 to N)
                            </h3>
                            <span className="px-2 py-0.5 bg-yellow-500 text-black text-[10px] font-black font-oswald uppercase rounded">
                                Public Verification
                            </span>
                        </div>
                        <p className="text-xs text-cyber-muted max-w-xl">
                            Select how many top participants qualify for the next round (e.g. 48). Generates a public verification QR code where players scan and check their selection status by entering their Free Fire Player ID.
                        </p>

                        <div className="flex flex-wrap items-center gap-3 pt-1">
                            <div className="flex items-center gap-2 bg-black/60 border border-cyber-border px-3 py-2">
                                <span className="text-xs font-oswald uppercase text-cyber-muted font-bold">Top:</span>
                                <input
                                    type="number"
                                    min="1"
                                    max="999"
                                    value={cutoffInput}
                                    onChange={(e) => setCutoffInput(e.target.value)}
                                    placeholder="48"
                                    className="w-16 bg-transparent text-yellow-400 font-mono font-black text-base text-center focus:outline-none border-b border-yellow-500/50"
                                />
                                <span className="text-xs font-oswald uppercase text-cyber-muted">Advance</span>
                            </div>

                            {!isSoloMode && (
                                <div className="flex items-center bg-black/60 border border-cyber-border p-1">
                                    <button
                                        type="button"
                                        onClick={() => setCutoffType('PLAYERS')}
                                        className={`px-3 py-1 text-xs font-oswald uppercase tracking-wider font-bold transition-all cursor-pointer ${
                                            cutoffType === 'PLAYERS'
                                                ? 'bg-yellow-500 text-black'
                                                : 'text-cyber-muted hover:text-white'
                                        }`}
                                    >
                                        Players (MVP)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCutoffType('SQUADS')}
                                        className={`px-3 py-1 text-xs font-oswald uppercase tracking-wider font-bold transition-all cursor-pointer ${
                                            cutoffType === 'SQUADS'
                                                ? 'bg-yellow-500 text-black'
                                                : 'text-cyber-muted hover:text-white'
                                        }`}
                                    >
                                        Squads
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={handleSaveCutoff}
                                disabled={savingCutoff}
                                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-black font-oswald uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(234,179,8,0.4)] disabled:opacity-50 cursor-pointer"
                            >
                                {savingCutoff ? 'Saving...' : 'Save Cutoff'}
                            </button>

                            <button
                                onClick={() => setFilterOnlyQualified(!filterOnlyQualified)}
                                className={`px-4 py-2 text-xs font-oswald uppercase tracking-wider font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                                    filterOnlyQualified
                                        ? 'bg-emerald-500 text-black border-emerald-400'
                                        : 'bg-cyber-charcoal border-cyber-border text-cyber-muted hover:text-white'
                                }`}
                            >
                                <Filter className="w-3.5 h-3.5" />
                                <span>{filterOnlyQualified ? `Showing Qualified (${currentCutoffNum})` : 'Filter Top Qualified'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Right: Quick Action Buttons & QR Widget */}
                    <div className="flex items-center gap-3 bg-black/70 border border-yellow-500/40 p-4 rounded shrink-0">
                        <div
                            onClick={() => setShowQrModal(true)}
                            className="bg-white p-2 rounded cursor-pointer hover:scale-105 transition-transform"
                            title="Click to view & test QR code"
                        >
                            <QRCodeCanvas value={publicVerificationUrl} size={64} level="M" />
                        </div>

                        <div className="space-y-1.5">
                            <span className="text-[10px] font-black font-oswald uppercase text-yellow-400 tracking-wider block">
                                Player Intimation QR
                            </span>
                            <div className="flex flex-col gap-1.5">
                                <button
                                    onClick={handleDownloadQualifiedExcel}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/60 text-emerald-300 text-[11px] font-bold font-oswald uppercase tracking-wider transition-all cursor-pointer"
                                >
                                    <Download className="w-3 h-3 text-emerald-400" />
                                    <span>Download Qualified Excel</span>
                                </button>

                                <button
                                    onClick={handleDownloadQrFlyer}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/60 text-yellow-300 text-[11px] font-bold font-oswald uppercase tracking-wider transition-all cursor-pointer"
                                >
                                    <QrCode className="w-3 h-3 text-yellow-400" />
                                    <span>Download QR Flyer</span>
                                </button>

                                <a
                                    href={publicVerificationUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1.5 px-3 py-1 bg-cyber-charcoal hover:bg-cyber-border border border-cyber-border text-cyan-400 text-[11px] font-bold font-oswald uppercase tracking-wider transition-all"
                                >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>Open Public Checker</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* QR Code Modal for Organizers */}
            {showQrModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-cyber-charcoal border-2 border-yellow-500 p-6 max-w-md w-full relative shadow-[0_0_50px_rgba(234,179,8,0.3)]">
                        <button
                            onClick={() => setShowQrModal(false)}
                            className="absolute top-4 right-4 text-cyber-muted hover:text-white cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center space-y-4">
                            <span className="text-xs font-black font-oswald uppercase text-yellow-400 tracking-wider">
                                Official Esports Intimation QR
                            </span>
                            <h3 className="text-xl font-black font-oswald uppercase text-white">
                                Top {cutoffInput} Qualification Portal
                            </h3>
                            <p className="text-xs text-cyber-muted">
                                Share this with your players on Discord or WhatsApp. Players can scan this QR code with their mobile cameras and enter their Player ID to see if they made the cut.
                            </p>

                            <div className="bg-white p-4 rounded inline-block shadow-xl my-2">
                                <QRCodeCanvas value={publicVerificationUrl} size={220} level="H" includeMargin={true} />
                            </div>

                            <div className="flex items-center gap-2 bg-black/60 p-2 border border-cyber-border text-xs font-mono text-cyan-400 truncate">
                                <span className="truncate flex-1 text-left">{publicVerificationUrl}</span>
                                <button
                                    onClick={handleCopyPublicLink}
                                    className="px-2.5 py-1 bg-cyber-charcoal hover:bg-cyber-border border border-cyber-border text-white font-oswald uppercase text-[10px] shrink-0 cursor-pointer"
                                >
                                    {copiedPublicLink ? 'Copied' : 'Copy'}
                                </button>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={handleDownloadQrFlyer}
                                    className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-black font-oswald uppercase text-xs tracking-wider shadow-[0_0_15px_rgba(234,179,8,0.4)] cursor-pointer"
                                >
                                    Download QR Graphic
                                </button>
                                
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!hasData && (
                <div className="card-cyber p-12 text-center border-cyber-border/40">
                    <Trophy className="w-12 h-12 text-cyber-muted/30 mx-auto mb-4" />
                    <h3 className="text-xl font-oswald font-bold text-white uppercase tracking-wider mb-2">
                        No Standings Generated Yet
                    </h3>
                    <p className="text-sm text-cyber-muted max-w-md mx-auto mb-6">
                        Standings across all rooms will be compiled automatically as matches conclude in each room. You can also click "Recalculate Standings" above once rooms start playing.
                    </p>
                    <button
                        onClick={handleGenerateStandings}
                        disabled={generating}
                        className="px-6 py-2.5 bg-cyber-red hover:bg-cyber-red/80 text-white font-oswald font-bold text-xs uppercase tracking-wider"
                    >
                        Compile Standings Now
                    </button>
                </div>
            )}

            {hasData && (
                <>
                    {/* Champion & Podium (Top 3) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        {/* 2nd Place (Silver) */}
                        {rank2 && (
                            <div className="order-2 md:order-1 bg-cyber-charcoal border border-slate-400/40 p-5 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-slate-300" />
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-full bg-slate-300 text-black font-black font-oswald flex items-center justify-center text-sm">
                                            2
                                        </span>
                                        <span className="text-[10px] font-black font-oswald text-slate-300 tracking-widest uppercase">
                                            RUNNER-UP
                                        </span>
                                    </div>
                                    <Award className="w-5 h-5 text-slate-300" />
                                </div>
                                <div className="my-3">
                                    <h4 className="text-lg font-black text-white font-oswald uppercase truncate">
                                        {isSoloMode ? (rank2.playerName || rank2.ffName) : rank2.squadName}
                                    </h4>
                                    <p className="text-xs text-cyber-muted font-mono truncate">
                                        {rank2.roomName || 'Room'} • {isSoloMode ? (rank2.ffId || rank2.playerId ? `ID: ${rank2.ffId || rank2.playerId}` : 'Solo') : `${rank2.players?.length || 0} Players`}
                                    </p>
                                </div>
                                <div className="pt-3 border-t border-cyber-border/40 flex items-center justify-between">
                                    <div>
                                        <span className="text-[10px] text-cyber-muted uppercase tracking-wider block font-oswald">Total Pts</span>
                                        <span className="text-xl font-black text-cyan-400 font-mono">{rank2.totalPoints}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] text-cyber-muted uppercase tracking-wider block font-oswald">Kills</span>
                                        <span className="text-lg font-bold text-cyber-red font-mono">{rank2.totalKills}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 1st Place (Gold Champion) */}
                        {rank1 && (
                            <div className="order-1 md:order-2 bg-gradient-to-b from-yellow-500/20 via-cyber-charcoal to-black border-2 border-yellow-500 p-6 relative overflow-hidden flex flex-col justify-between min-h-[260px] shadow-[0_0_30px_rgba(234,179,8,0.2)]">
                                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-500" />
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-10 h-10 rounded-full bg-yellow-500 text-black font-black font-oswald flex items-center justify-center text-lg shadow-[0_0_15px_rgba(234,179,8,0.7)]">
                                            1
                                        </span>
                                        <span className="text-xs font-black font-oswald text-yellow-400 tracking-widest uppercase">
                                            🏆 TOURNAMENT CHAMPION
                                        </span>
                                    </div>
                                    <Trophy className="w-7 h-7 text-yellow-400 animate-pulse" />
                                </div>
                                <div className="my-4">
                                    <h4 className="text-2xl font-black text-white font-oswald uppercase tracking-wide truncate">
                                        {isSoloMode ? (rank1.playerName || rank1.ffName) : rank1.squadName}
                                    </h4>
                                    <p className="text-xs text-yellow-400/80 font-mono truncate">
                                        {rank1.roomName || 'Room'} • {isSoloMode ? (rank1.ffId || rank1.playerId ? `ID: ${rank1.ffId || rank1.playerId}` : 'Solo') : `${rank1.players?.length || 0} Players`}
                                    </p>
                                </div>
                                <div className="pt-3 border-t border-yellow-500/40 flex items-center justify-between">
                                    <div>
                                        <span className="text-[10px] text-yellow-400 uppercase tracking-wider block font-oswald">Total Pts</span>
                                        <span className="text-2xl font-black text-yellow-400 font-mono">{rank1.totalPoints}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] text-cyber-muted uppercase tracking-wider block font-oswald">Kills</span>
                                        <span className="text-xl font-bold text-cyber-red font-mono">{rank1.totalKills}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3rd Place (Bronze) */}
                        {rank3 && (
                            <div className="order-3 bg-cyber-charcoal border border-amber-600/40 p-5 relative overflow-hidden flex flex-col justify-between min-h-[200px]">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-amber-600" />
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-full bg-amber-600 text-white font-black font-oswald flex items-center justify-center text-sm">
                                            3
                                        </span>
                                        <span className="text-[10px] font-black font-oswald text-amber-500 tracking-widest uppercase">
                                            3RD PLACE
                                        </span>
                                    </div>
                                    <Award className="w-5 h-5 text-amber-600" />
                                </div>
                                <div className="my-3">
                                    <h4 className="text-lg font-black text-white font-oswald uppercase truncate">
                                        {isSoloMode ? (rank3.playerName || rank3.ffName) : rank3.squadName}
                                    </h4>
                                    <p className="text-xs text-cyber-muted font-mono truncate">
                                        {rank3.roomName || 'Room'} • {isSoloMode ? (rank3.ffId || rank3.playerId ? `ID: ${rank3.ffId || rank3.playerId}` : 'Solo') : `${rank3.players?.length || 0} Players`}
                                    </p>
                                </div>
                                <div className="pt-3 border-t border-cyber-border/40 flex items-center justify-between">
                                    <div>
                                        <span className="text-[10px] text-cyber-muted uppercase tracking-wider block font-oswald">Total Pts</span>
                                        <span className="text-xl font-black text-cyan-400 font-mono">{rank3.totalPoints}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] text-cyber-muted uppercase tracking-wider block font-oswald">Kills</span>
                                        <span className="text-lg font-bold text-cyber-red font-mono">{rank3.totalKills}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Non-Solo Mode: View Toggle Tabs */}
                    {!isSoloMode && (
                        <div className="flex items-center gap-2 border-b border-cyber-border pb-3">
                            <button
                                onClick={() => setViewMode('TEAMS')}
                                className={`px-5 py-2 font-oswald uppercase tracking-wider text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                                    viewMode === 'TEAMS'
                                        ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]'
                                        : 'bg-cyber-charcoal text-cyber-muted hover:text-white border border-cyber-border'
                                }`}
                            >
                                <Shield className="w-3.5 h-3.5" />
                                <span>Squad Standings ({displayedTeamRankings.length}{filterOnlyQualified ? ` / Top ${currentCutoffNum}` : ''})</span>
                            </button>
                            <button
                                onClick={() => setViewMode('PLAYERS')}
                                className={`px-5 py-2 font-oswald uppercase tracking-wider text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                                    viewMode === 'PLAYERS'
                                        ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]'
                                        : 'bg-cyber-charcoal text-cyber-muted hover:text-white border border-cyber-border'
                                }`}
                            >
                                <Users className="w-3.5 h-3.5" />
                                <span>Individual MVP Rankings ({displayedPlayerRankings.length}{filterOnlyQualified ? ` / Top ${currentCutoffNum}` : ''})</span>
                            </button>
                        </div>
                    )}

                    {/* Table View: SQUAD / TEAM RANKINGS */}
                    {(!isSoloMode && viewMode === 'TEAMS') && (
                        <div className="bg-cyber-charcoal border border-cyber-border overflow-hidden shadow-xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-black/60 border-b border-cyber-border text-[11px] font-bold text-cyber-muted uppercase tracking-widest font-oswald">
                                            <th className="py-3.5 px-4 text-center w-16">Rank</th>
                                            <th className="py-3.5 px-4">Squad / Team</th>
                                            <th className="py-3.5 px-4">Room</th>
                                            <th className="py-3.5 px-4 text-center">Matches</th>
                                            <th className="py-3.5 px-4 text-center">Booyahs</th>
                                            <th className="py-3.5 px-4 text-center">Total Kills</th>
                                            <th className="py-3.5 px-4 text-center">Placement Pts</th>
                                            <th className="py-3.5 px-4 text-right pr-6">Total Points</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-cyber-border/30 text-sm">
                                        {displayedTeamRankings.map((team, idx) => {
                                            const isTop1 = team.rank === 1;
                                            const isTop2 = team.rank === 2;
                                            const isTop3 = team.rank === 3;
                                            const isDq = team.isDisqualified;
                                            const isExpanded = expandedRows.has(team.squadId || idx);
                                            const isQualified = !isDq && idx < currentCutoffNum;

                                            return (
                                                <React.Fragment key={team.squadId || idx}>
                                                    <tr
                                                        onClick={() => toggleRow(team.squadId || idx)}
                                                        className={`transition-colors cursor-pointer hover:bg-white/5 ${
                                                            isTop1 ? 'bg-yellow-500/5' : isTop2 ? 'bg-slate-400/5' : isTop3 ? 'bg-amber-600/5' : ''
                                                        } ${isDq ? 'opacity-60 bg-red-950/10' : ''}`}
                                                    >
                                                        <td className="py-3 px-4 text-center">
                                                            {isDq ? (
                                                                <span className="px-2 py-0.5 bg-red-900/40 text-red-400 text-xs font-black font-oswald border border-red-500/40">DQ</span>
                                                            ) : isTop1 ? (
                                                                <span className="w-7 h-7 rounded-full bg-yellow-500 text-black font-black font-oswald inline-flex items-center justify-center text-sm shadow-[0_0_10px_rgba(234,179,8,0.6)]">1</span>
                                                            ) : isTop2 ? (
                                                                <span className="w-7 h-7 rounded-full bg-slate-300 text-black font-black font-oswald inline-flex items-center justify-center text-sm">2</span>
                                                            ) : isTop3 ? (
                                                                <span className="w-7 h-7 rounded-full bg-amber-600 text-white font-black font-oswald inline-flex items-center justify-center text-sm">3</span>
                                                            ) : (
                                                                <span className="font-mono font-bold text-cyber-muted">#{team.rank}</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-black text-white font-oswald uppercase text-base tracking-wide">
                                                                    {team.squadName}
                                                                </span>
                                                                {isQualified && (
                                                                    <span className="px-2 py-0.5 bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 font-oswald text-[10px] font-black uppercase">
                                                                        QUALIFIED
                                                                    </span>
                                                                )}
                                                                {isExpanded ? <ChevronUp className="w-4 h-4 text-cyber-muted" /> : <ChevronDown className="w-4 h-4 text-cyber-muted" />}
                                                            </div>
                                                            {isDq && (
                                                                <div className="text-[11px] text-red-400 font-mono mt-0.5 flex items-center gap-1">
                                                                    <AlertTriangle className="w-3 h-3" />
                                                                    <span>{team.disqualificationReason || 'Disqualified'}</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <span className="px-2 py-0.5 bg-cyber-card border border-cyber-border text-cyber-muted font-mono text-xs">
                                                                {team.roomName || 'Room'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-center font-mono font-bold text-white">
                                                            {team.matchesPlayed}
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            {team.booyahs > 0 ? (
                                                                <span className="inline-flex items-center gap-1 text-yellow-400 font-bold font-mono">
                                                                    <Trophy className="w-3.5 h-3.5 fill-current" />
                                                                    {team.booyahs}
                                                                </span>
                                                            ) : (
                                                                <span className="text-cyber-muted font-mono">0</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-4 text-center font-mono font-bold text-cyber-red">
                                                            {team.totalKills}
                                                        </td>
                                                        <td className="py-3 px-4 text-center font-mono text-cyber-muted">
                                                            {team.placementPoints}
                                                        </td>
                                                        <td className="py-3 px-4 text-right pr-6 font-mono font-black text-cyan-400 text-base">
                                                            {team.totalPoints}
                                                        </td>
                                                    </tr>

                                                    {/* Qualification Cutoff Divider Line */}
                                                    {!filterOnlyQualified && idx === currentCutoffNum - 1 && idx < teamRankings.length - 1 && (
                                                        <tr className="bg-yellow-500/20 border-y-2 border-yellow-500">
                                                            <td colSpan={8} className="py-2.5 px-4 text-center">
                                                                <span className="text-xs font-black font-oswald text-yellow-400 uppercase tracking-widest flex items-center justify-center gap-2">
                                                                    <span>▲ TOP {currentCutoffNum} QUALIFIED FOR NEXT ROUND ▲</span>
                                                                    <span className="text-cyber-muted">•</span>
                                                                    <span className="text-cyber-muted">▼ WAITING LIST / ELIMINATED BELOW ▼</span>
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    )}

                                                    {/* Expanded Roster Breakdown */}
                                                    {isExpanded && team.players && team.players.length > 0 && (
                                                        <tr className="bg-black/40">
                                                            <td colSpan={8} className="py-3 px-8 border-l-2 border-l-yellow-500">
                                                                <div className="text-[11px] font-bold text-cyber-muted uppercase tracking-wider font-oswald mb-2">
                                                                    Player Roster Performance
                                                                </div>
                                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                                    {team.players.map((p, pIdx) => (
                                                                        <div key={p.ffId || pIdx} className="bg-cyber-charcoal/70 border border-cyber-border/40 p-2.5 rounded">
                                                                            <div className="font-bold text-white text-xs truncate">
                                                                                {p.playerName || p.ffName}
                                                                            </div>
                                                                            <div className="text-[10px] text-cyber-muted font-mono truncate">
                                                                                ID: {p.ffId || p.playerId || '-'}
                                                                            </div>
                                                                            <div className="mt-1 flex justify-between text-[11px] font-mono">
                                                                                <span className="text-cyber-red font-bold">{p.totalKills || 0} kills</span>
                                                                                <span className="text-cyan-400 font-bold">{p.totalPoints || 0} pts</span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Table View: SOLO / PLAYER RANKINGS */}
                    {(isSoloMode || viewMode === 'PLAYERS') && (
                        <div className="bg-cyber-charcoal border border-cyber-border overflow-hidden shadow-xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-black/60 border-b border-cyber-border text-[11px] font-bold text-cyber-muted uppercase tracking-widest font-oswald">
                                            <th className="py-3.5 px-4 text-center w-16">Rank</th>
                                            <th className="py-3.5 px-4">Player</th>
                                            {!isSoloMode && <th className="py-3.5 px-4">Squad / Team</th>}
                                            <th className="py-3.5 px-4">Room</th>
                                            <th className="py-3.5 px-4 text-center">Matches</th>
                                            <th className="py-3.5 px-4 text-center">Wins</th>
                                            <th className="py-3.5 px-4 text-center">Total Kills</th>
                                            <th className="py-3.5 px-4 text-center">Placement Pts</th>
                                            <th className="py-3.5 px-4 text-right pr-6">Total Points</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-cyber-border/30 text-sm">
                                        {displayedPlayerRankings.map((player, idx) => {
                                            const isTop1 = player.rank === 1;
                                            const isTop2 = player.rank === 2;
                                            const isTop3 = player.rank === 3;
                                            const isDq = player.isDisqualified;
                                            const isQualified = !isDq && idx < currentCutoffNum;

                                            return (
                                                <React.Fragment key={player.ffId || player.playerId || idx}>
                                                    <tr
                                                        className={`transition-colors hover:bg-white/5 ${
                                                            isTop1 ? 'bg-yellow-500/5' : isTop2 ? 'bg-slate-400/5' : isTop3 ? 'bg-amber-600/5' : ''
                                                        } ${isDq ? 'opacity-60 bg-red-950/10' : ''}`}
                                                    >
                                                        <td className="py-3 px-4 text-center">
                                                            {isDq ? (
                                                                <span className="px-2 py-0.5 bg-red-900/40 text-red-400 text-xs font-black font-oswald border border-red-500/40">DQ</span>
                                                            ) : isTop1 ? (
                                                                <span className="w-7 h-7 rounded-full bg-yellow-500 text-black font-black font-oswald inline-flex items-center justify-center text-sm shadow-[0_0_10px_rgba(234,179,8,0.6)]">1</span>
                                                            ) : isTop2 ? (
                                                                <span className="w-7 h-7 rounded-full bg-slate-300 text-black font-black font-oswald inline-flex items-center justify-center text-sm">2</span>
                                                            ) : isTop3 ? (
                                                                <span className="w-7 h-7 rounded-full bg-amber-600 text-white font-black font-oswald inline-flex items-center justify-center text-sm">3</span>
                                                            ) : (
                                                                <span className="font-mono font-bold text-cyber-muted">#{player.rank}</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-black text-white font-oswald uppercase text-base tracking-wide">
                                                                    {player.playerName || player.ffName}
                                                                </span>
                                                                {isQualified && (
                                                                    <span className="px-2 py-0.5 bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 font-oswald text-[10px] font-black uppercase">
                                                                        QUALIFIED
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-[11px] text-cyber-muted font-mono">
                                                                ID: {player.ffId || player.playerId || '-'}
                                                            </div>
                                                        </td>
                                                        {!isSoloMode && (
                                                            <td className="py-3 px-4 text-cyber-muted font-oswald uppercase text-sm">
                                                                {player.teamName || '-'}
                                                            </td>
                                                        )}
                                                        <td className="py-3 px-4">
                                                            <span className="px-2 py-0.5 bg-cyber-card border border-cyber-border text-cyber-muted font-mono text-xs">
                                                                {player.roomName || 'Room'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-center font-mono font-bold text-white">
                                                            {player.matchesPlayed}
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            {player.booyahs > 0 ? (
                                                                <span className="inline-flex items-center gap-1 text-yellow-400 font-bold font-mono">
                                                                    <Trophy className="w-3.5 h-3.5 fill-current" />
                                                                    {player.booyahs}
                                                                </span>
                                                            ) : (
                                                                <span className="text-cyber-muted font-mono">0</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-4 text-center font-mono font-bold text-cyber-red">
                                                            {player.totalKills}
                                                        </td>
                                                        <td className="py-3 px-4 text-center font-mono text-cyber-muted">
                                                            {player.placementPoints}
                                                        </td>
                                                        <td className="py-3 px-4 text-right pr-6 font-mono font-black text-cyan-400 text-base">
                                                            {player.totalPoints}
                                                        </td>
                                                    </tr>

                                                    {/* Qualification Cutoff Divider Line */}
                                                    {!filterOnlyQualified && idx === currentCutoffNum - 1 && idx < playerRankings.length - 1 && (
                                                        <tr className="bg-yellow-500/20 border-y-2 border-yellow-500">
                                                            <td colSpan={isSoloMode ? 8 : 9} className="py-2.5 px-4 text-center">
                                                                <span className="text-xs font-black font-oswald text-yellow-400 uppercase tracking-widest flex items-center justify-center gap-2">
                                                                    <span>▲ TOP {currentCutoffNum} QUALIFIED FOR NEXT ROUND ▲</span>
                                                                    <span className="text-cyber-muted">•</span>
                                                                    <span className="text-cyber-muted">▼ WAITING LIST / ELIMINATED BELOW ▼</span>
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default TournamentStandingsTab;
