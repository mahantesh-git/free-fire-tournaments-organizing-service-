import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const squadsCount = 13;
const playersPerSquad = 4;
const data = [];

const squadNames = [
    'ELITE FORCE', 'CYBER NINJAS', 'NEON STRIKE', 'SHADOW REAPERS',
    'TITAN GAMING', 'ALPHA SQUAD', 'OMEGA WARRIORS', 'PHANTOM KINGS',
    'DRAGON SLAYERS', 'VALORANT KNIGHTS', 'BATTLE BEASTS', 'NIGHT WALKERS',
    'GHOST RIDERS'
];

const firstNames = ['Alex', 'Jordan', 'Chris', 'Sam', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Quinn', 'Avery', 'Parker', 'Peyton'];
const lastNames = ['Hunter', 'Blade', 'Neon', 'Shadow', 'Titan', 'Alpha', 'Omega', 'Phantom', 'Dragon', 'Knight', 'Beast', 'Walker', 'Ghost'];

for (let i = 0; i < squadsCount; i++) {
    const sName = squadNames[i] || `SQUAD ${i + 1}`;
    for (let j = 0; j < playersPerSquad; j++) {
        const playerName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        const ffName = `${sName.split(' ')[0]}_${playerName.split(' ')[0]}${Math.floor(Math.random() * 999)}`;
        const ffId = `${Math.floor(10000000 + Math.random() * 900000000)}`;

        data.push({
            squadName: sName,
            playerName: playerName,
            ffName: ffName,
            ffId: ffId
        });
    }
}

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Squads');

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

const filePath = path.join(uploadsDir, 'mock_squads_13.xlsx');
XLSX.writeFile(wb, filePath);
console.log(`Successfully created mock data at: ${filePath}`);
