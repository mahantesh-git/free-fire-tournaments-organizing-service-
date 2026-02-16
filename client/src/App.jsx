import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { TournamentProvider } from './context/TournamentContext';

// Pages
import Home from './pages/Home';
import TournamentBlueprint from './pages/TournamentBlueprint';
import PlayerRegistration from './pages/PlayerRegistration';
import PublicRegistration from './pages/PublicRegistration';
import ConductorsPanel from './pages/ConductorsPanel';
import AdminPanel from './pages/AdminPanel';
import SquadScoreboard from './pages/SquadScoreboard';
import IndividualScoreboard from './pages/IndividualScoreboard';
import LiveScoreboard from './pages/LiveScoreboard';
import OrganizerRegister from './pages/organizer/Register';
import OrganizerLogin from './pages/organizer/Login';
import OrganizerDashboard from './pages/organizer/Dashboard';
import RoomManager from './pages/organizer/RoomManager';
import RoomMatchControl from './pages/organizer/RoomMatchControl';
import TournamentDetails from './pages/organizer/TournamentDetails';
import ModeratorManager from './pages/organizer/ModeratorManager';
import ModeratorLogin from './pages/moderator/ModeratorLogin';
import ModeratorPanel from './pages/moderator/ModeratorPanel';

function App() {
  return (
    <AuthProvider>
      <TournamentProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/" element={<Home />} />

              <Route path="/blueprint" element={<TournamentBlueprint />} />
              <Route path="/playerRegistration" element={<PlayerRegistration />} />
              <Route path="/register" element={<PublicRegistration />} />
              <Route path="/conducters" element={<ConductorsPanel />} />
              <Route path="/squadScoreCard" element={<AdminPanel />} />
              <Route path="/scoreboard" element={<IndividualScoreboard />} />
              <Route path="/squadscoreboard" element={<SquadScoreboard />} />
              <Route path="/live/:tournamentId" element={<LiveScoreboard />} />

              {/* Organizer Routes */}
              <Route path="/organizer/register" element={<OrganizerRegister />} />
              <Route path="/organizer/login" element={<OrganizerLogin />} />
              <Route path="/organizer/dashboard" element={<OrganizerDashboard />} />
              <Route path="/organizer/tournament/:tournamentId" element={<TournamentDetails />} />
              <Route path="/organizer/tournament/:tournamentId/rooms" element={<RoomManager />} />
              <Route path="/organizer/room-match/:roomId" element={<RoomMatchControl />} />
              <Route path="/organizer/moderators" element={<ModeratorManager />} />

              {/* Moderator Routes */}
              <Route path="/moderator/login" element={<ModeratorLogin />} />
              <Route path="/moderator/login/:tenantSlug" element={<ModeratorLogin />} />
              <Route path="/moderator/panel" element={<ModeratorPanel />} />
            </Routes>
            <Toaster
              position="bottom-center"
              toastOptions={{
                duration: 3000,
                style: {
                  background: '#1f2937',
                  color: '#fff',
                  border: '1px solid #374151',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  fontSize: '14px',
                },
                success: {
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </div>
        </Router>
      </TournamentProvider>
    </AuthProvider>
  );
}

export default App;