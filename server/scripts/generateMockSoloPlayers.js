import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const playersCount = 48;
const data = [];

const firstNames = ['Alex', 'Jordan', 'Chris', 'Sam', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Quinn', 'Avery', 'Parker', 'Peyton', 'Skyler', 'Dakota', 'Phoenix', 'Sage', 'River', 'Storm', 'Hunter'];
const lastNames = ['Hunter', 'Blade', 'Neon', 'Shadow', 'Titan', 'Alpha', 'Omega', 'Phantom', 'Dragon', 'Knight', 'Beast', 'Walker', 'Ghost', 'Strike', 'Force', 'Ninja', 'Reaper', 'King', 'Slayer', 'Warrior'];

for (let i = 0; i < playersCount; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    // Appending index to ensure uniqueness to satisfy database constraints
    const playerName = `${firstName} ${lastName} ${i + 1}`;
    const ffName = `${firstName.toUpperCase()}_${100 + i}`;
    const ffId = `9000${String(i + 1).padStart(4, '0')}`;

    data.push({
        playerName: playerName,
        ffName: ffName,
        ffId: ffId
    });
}

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'SoloPlayers');

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

const filePath = path.join(uploadsDir, 'demo_solo_players_48.xlsx');
XLSX.writeFile(wb, filePath);
console.log(`Successfully created demo solo players data at: ${filePath}`);
