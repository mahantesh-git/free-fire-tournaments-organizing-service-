// ========== PLAYER FUNCTIONS ==========
async function registerPlayer() {
  const name = pName.value.trim();
  const phone = pPhone.value.trim();
  const freefireId = pFFID.value.trim();

  const res = await fetch('/api/players', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ name, phone, freefireId })
  });
  alert((await res.json()).message);
  loadData();
}

async function updatePlayer(id) {
  const name = prompt("Enter new name:");
  const phone = prompt("Enter new phone:");
  const freefireId = prompt("Enter new FF ID:");
  if (!name || !phone) return;
  await fetch(`/api/players/${id}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ name, phone, freefireId })
  });
  loadData();
}

async function deletePlayer(id) {
  if (!confirm("Delete this player?")) return;
  await fetch(`/api/players/${id}`, { method: 'DELETE' });
  loadData();
}

async function searchPlayers() {
  const q = playerSearch.value.trim();
  const res = await fetch(`/api/players/search?q=${q}`);
  const players = await res.json();
  displayData(players, 'player');
}

// ========== CONDUCTOR FUNCTIONS ==========
async function registerConductor() {
  const name = cName.value.trim();
  const phone = cPhone.value.trim();
  const rollNo = cRoll.value.trim();
  const role = cRole.value.trim();

  const res = await fetch('/api/conductors', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ name, phone, rollNo, role })
  });
  alert((await res.json()).message);
  loadData();
}

async function updateConductor(id) {
  const name = prompt("Enter new name:");
  const phone = prompt("Enter new phone:");
  const rollNo = prompt("Enter new roll no:");
  const role = prompt("Enter new role:");
  if (!name || !phone) return;
  await fetch(`/api/conductors/${id}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ name, phone, rollNo, role })
  });
  loadData();
}

async function deleteConductor(id) {
  if (!confirm("Delete this conductor?")) return;
  await fetch(`/api/conductors/${id}`, { method: 'DELETE' });
  loadData();
}

async function searchConductors() {
  const q = conductorSearch.value.trim();
  const role = roleFilter.value;
  const res = await fetch(`/api/conductors/search?q=${q}&role=${role}`);
  const conductors = await res.json();
  displayData(conductors, 'conductor');
}

async function filterByRole() {
  await searchConductors();
}

// ========== IMPORT/EXPORT ==========
async function importPlayers() {
  const file = playerFile.files[0];
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/players/import', { method: 'POST', body: formData });
  alert((await res.json()).message);
  loadData();
}

async function importConductors() {
  const file = conductorFile.files[0];
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/conductors/import', { method: 'POST', body: formData });
  alert((await res.json()).message);
  loadData();
}

function exportPlayers() { window.open('/api/players/export', '_blank'); }
function exportConductors() { window.open('/api/conductors/export', '_blank'); }

// ========== LOAD ALL ==========
async function loadData() {
  const [players, conductors] = await Promise.all([
    fetch('/api/players').then(r => r.json()),
    fetch('/api/conductors').then(r => r.json())
  ]);
  displayData({ players, conductors });
}

function displayData(data, type) {
  let players = type === 'player' ? data : data.players;
  let conductors = type === 'conductor' ? data : data.conductors;

  output.innerHTML = `
  <h3>Players (${players?.length || 0})</h3>
  <table>
  <tr><th>Name</th><th>Phone</th><th>FF ID</th><th>Actions</th></tr>
  ${players?.map(p => `
    <tr>
      <td>${p.name}</td>
      <td>${p.phone}</td>
      <td>${p.freefireId}</td>
      <td>
        <button onclick="updatePlayer('${p._id}')">✏️</button>
        <button onclick="deletePlayer('${p._id}')">🗑️</button>
      </td>
    </tr>`).join('') || ''}
  </table>

  <h3>Conductors (${conductors?.length || 0})</h3>
  <table>
  <tr><th>Name</th><th>Phone</th><th>RollNo</th><th>Role</th><th>Actions</th></tr>
  ${conductors?.map(c => `
    <tr>
      <td>${c.name}</td>
      <td>${c.phone}</td>
      <td>${c.rollNo}</td>
      <td>${c.role}</td>
      <td>
        <button onclick="updateConductor('${c._id}')">✏️</button>
        <button onclick="deleteConductor('${c._id}')">🗑️</button>
      </td>
    </tr>`).join('') || ''}
  </table>`;
}

loadData();
