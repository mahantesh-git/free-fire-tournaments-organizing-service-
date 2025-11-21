import Kills from '../models/Kills.js'

 export const getTotalPlayers = async () => {
  try {
    const allPlayers = await Kills.find();
    const totalPlayers = allPlayers.length;
    console.log("Total Players:", totalPlayers);
     totalPlayers; // ✅ returns the value
  } catch (err) {
    console.error("Error fetching total players:", err);
      // fallback value
  }
 }

export const authMiddleware = (req, res, next) => {
    const devKey = req.headers['x-developer-key'] || req.query.devKey;
    
    // If no key provided, show auth page
    if (!devKey) {
        return res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔥 Developer Access | Free Fire Tournament</title>
    <style>
        * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
        }
        
        @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-30px) rotate(180deg); }
        }
        
        @keyframes slideInLeft {
            from { opacity: 0; transform: translateX(-100px); }
            to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes slideInRight {
            from { opacity: 0; transform: translateX(100px); }
            to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
        }
        
        @keyframes scanLine {
            0% { top: -100%; }
            100% { top: 100%; }
        }
        
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: linear-gradient(135deg, #0a0a0a, #1a1a2e, #16213e, #0f3460, #000000);
            background-size: 400% 400%;
            animation: gradientShift 20s ease infinite;
            min-height: 100vh;
            overflow: hidden;
            position: relative;
        }
        
        /* Animated particles */
        .particles {
            position: absolute;
            width: 100%;
            height: 100%;
            overflow: hidden;
            z-index: 1;
        }
        
        .particle {
            position: absolute;
            background: rgba(255, 94, 0, 0.6);
            border-radius: 50%;
            animation: float 8s infinite ease-in-out;
        }
        
        /* Scan line effect */
        .scan-line {
            position: absolute;
            width: 100%;
            height: 2px;
            background: linear-gradient(90deg, transparent, rgba(255, 94, 0, 0.8), transparent);
            box-shadow: 0 0 20px rgba(255, 94, 0, 0.8);
            animation: scanLine 4s linear infinite;
            z-index: 2;
        }
        
        /* Main container - fullscreen grid */
        .auth-wrapper {
            display: grid;
            grid-template-columns: 1fr 1fr;
            min-height: 100vh;
            position: relative;
            z-index: 3;
        }
        
        /* Left side - Branding */
        .left-panel {
            background: linear-gradient(135deg, rgba(255, 94, 0, 0.1), rgba(26, 26, 46, 0.95));
            backdrop-filter: blur(20px);
            padding: 60px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: flex-start;
            border-right: 2px solid rgba(255, 94, 0, 0.3);
            position: relative;
            overflow: hidden;
        }
        
        .left-panel::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255, 94, 0, 0.1) 0%, transparent 70%);
            animation: pulse 6s infinite;
        }
        
        .brand-logo {
            font-size: 120px;
            margin-bottom: 30px;
            animation: pulse 3s infinite;
            filter: drop-shadow(0 0 30px rgba(255, 94, 0, 1));
            z-index: 1;
        }
        
        .brand-title {
            font-size: 48px;
            color: #fff;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 4px;
            margin-bottom: 20px;
            text-shadow: 0 0 30px rgba(255, 94, 0, 0.8);
            animation: slideInLeft 1s ease-out;
            z-index: 1;
        }
        
        .brand-subtitle {
            font-size: 24px;
            color: #ff5e00;
            letter-spacing: 2px;
            margin-bottom: 40px;
            animation: slideInLeft 1.2s ease-out;
            z-index: 1;
        }
        
        .features {
            list-style: none;
            z-index: 1;
        }
        
        .features li {
            font-size: 18px;
            color: rgba(255, 255, 255, 0.8);
            margin-bottom: 20px;
            padding-left: 40px;
            position: relative;
            animation: slideInLeft 1.5s ease-out;
        }
        
        .features li::before {
            content: '🔥';
            position: absolute;
            left: 0;
            font-size: 24px;
            animation: pulse 2s infinite;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-top: 60px;
            width: 100%;
            z-index: 1;
        }
        
        .stat-card {
            background: rgba(255, 94, 0, 0.1);
            border: 2px solid rgba(255, 94, 0, 0.3);
            border-radius: 15px;
            padding: 20px;
            text-align: center;
            transition: all 0.3s ease;
        }
        
        .stat-card:hover {
            background: rgba(255, 94, 0, 0.2);
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(255, 94, 0, 0.4);
        }
        
        .stat-number {
            font-size: 36px;
            color: #ff5e00;
            font-weight: bold;
        }
        
        .stat-label {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.7);
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 5px;
        }
        
        /* Right side - Auth form */
        .right-panel {
            background: rgba(15, 52, 96, 0.2);
            backdrop-filter: blur(20px);
            padding: 60px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            position: relative;
        }
        
        .auth-container {
            width: 100%;
            max-width: 500px;
            animation: slideInRight 1s ease-out;
        }
        
        .lock-icon {
            text-align: center;
            font-size: 100px;
            margin-bottom: 30px;
            animation: pulse 2s infinite;
            filter: drop-shadow(0 0 30px rgba(255, 94, 0, 1));
        }
        
        .dev-badge {
            background: linear-gradient(135deg, #ff5e00, #ff9100);
            color: white;
            padding: 12px 30px;
            border-radius: 30px;
            display: inline-block;
            margin-bottom: 30px;
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 2px;
            box-shadow: 0 5px 20px rgba(255, 94, 0, 0.5);
        }
        
        h1 {
            color: #fff;
            text-align: center;
            margin-bottom: 15px;
            font-size: 36px;
            text-transform: uppercase;
            letter-spacing: 3px;
            text-shadow: 0 0 30px rgba(255, 94, 0, 0.8);
        }
        
        .subtitle {
            text-align: center;
            color: #ff5e00;
            margin-bottom: 50px;
            font-size: 16px;
            letter-spacing: 2px;
            font-weight: 600;
        }
        
        .input-wrapper {
            position: relative;
            margin-bottom: 30px;
        }
        
        .input-label {
            display: block;
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
        }
        
        .input-group {
            position: relative;
        }
        
        .input-icon {
            position: absolute;
            left: 20px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 24px;
            color: #ff5e00;
            transition: all 0.3s ease;
        }
        
        input {
            width: 100%;
            padding: 20px 20px 20px 60px;
            border: 2px solid rgba(255, 94, 0, 0.3);
            background: rgba(15, 52, 96, 0.3);
            border-radius: 15px;
            font-size: 18px;
            color: #fff;
            transition: all 0.3s ease;
            outline: none;
        }
        
        input::placeholder {
            color: rgba(255, 255, 255, 0.4);
        }
        
        input:focus {
            border-color: #ff5e00;
            background: rgba(15, 52, 96, 0.6);
            box-shadow: 0 0 30px rgba(255, 94, 0, 0.4);
            transform: translateY(-2px);
        }
        
        input:focus + .input-icon {
            transform: translateY(-50%) scale(1.2);
            color: #ff9100;
        }
        
        .submit-btn {
            width: 100%;
            padding: 20px;
            background: linear-gradient(135deg, #ff5e00, #ff9100);
            color: white;
            border: none;
            border-radius: 15px;
            font-size: 18px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 3px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 10px 30px rgba(255, 94, 0, 0.5);
            position: relative;
            overflow: hidden;
        }
        
        .submit-btn::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            transform: translate(-50%, -50%);
            transition: width 0.6s, height 0.6s;
        }
        
        .submit-btn:hover::before {
            width: 500px;
            height: 500px;
        }
        
        .submit-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 15px 40px rgba(255, 94, 0, 0.7);
        }
        
        .btn-text {
            position: relative;
            z-index: 1;
        }
        
        .security-box {
            margin-top: 40px;
            padding: 25px;
            background: rgba(255, 94, 0, 0.1);
            border: 2px solid rgba(255, 94, 0, 0.3);
            border-radius: 15px;
        }
        
        .security-box h3 {
            color: #ff5e00;
            font-size: 16px;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .security-box p {
            color: rgba(255, 255, 255, 0.8);
            font-size: 14px;
            line-height: 1.6;
        }
        
        /* Responsive */
        @media (max-width: 1024px) {
            .auth-wrapper {
                grid-template-columns: 1fr;
            }
            
            .left-panel {
                display: none;
            }
            
            .right-panel {
                padding: 40px 20px;
            }
        }
    </style>
</head>
<body>
    <div class="particles" id="particles"></div>
    <div class="scan-line"></div>
    
    <div class="auth-wrapper">
        <!-- Left Panel - Branding -->
        <div class="left-panel">
            <div class="brand-logo">🔥</div>
            <h2 class="brand-title">Free Fire</h2>
            <p class="brand-subtitle">Tournament Management System</p>
            
            <ul class="features">
                <li>Real-time Tournament Monitoring</li>
                <li>Player Management Dashboard</li>
                <li>Prize Pool Distribution</li>
                <li>Live Match Statistics</li>
                <li>Advanced Analytics Tools</li>
            </ul>
            
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-number">2</div>
                    <div class="stat-label">Rounds</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">98.5%</div>
                    <div class="stat-label">Uptime</div>
                </div>
            </div>
        </div>
        
        <!-- Right Panel - Auth Form -->
        <div class="right-panel">
            <div class="auth-container">
                <div class="lock-icon">🔐</div>
                <div style="text-align: center;">
                    <div class="dev-badge">⚡ DEVELOPER ACCESS PORTAL ⚡</div>
                </div>
                <h1>Access Control</h1>
                <p class="subtitle">🎮 AUTHENTICATION REQUIRED 🎮</p>
                
                <form id="authForm">
                    <div class="input-wrapper">
                        <label class="input-label">🔑 Developer Access Key</label>
                        <div class="input-group">
                            <input 
                                type="password" 
                                id="devKey" 
                                placeholder="Enter your secure access code"
                                required
                                autocomplete="off"
                            >
                            <span class="input-icon">🔑</span>
                        </div>
                    </div>
                    
                    <button type="submit" class="submit-btn">
                        <span class="btn-text">🚀 UNLOCK DASHBOARD</span>
                    </button>
                </form>
                
                <div class="security-box">
                    <h3>🛡️ SECURE ACCESS ZONE</h3>
                    <p>This portal provides access to tournament management tools, player databases, match schedules, and administrative controls. Only authorized personnel with valid developer credentials can proceed beyond this point.</p>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Create floating particles
        const particlesContainer = document.getElementById('particles');
        for (let i = 0; i < 80; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            const size = Math.random() * 4 + 2;
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 8 + 's';
            particle.style.animationDuration = (Math.random() * 6 + 6) + 's';
            particlesContainer.appendChild(particle);
        }
        
        // Form submission with animation
        document.getElementById('authForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const btn = this.querySelector('.submit-btn');
            const key = document.getElementById('devKey').value;
            
            btn.innerHTML = '<span class="btn-text">⏳ VERIFYING CREDENTIALS...</span>';
            btn.style.background = 'linear-gradient(135deg, #555, #777)';
            btn.style.cursor = 'not-allowed';
            
            setTimeout(() => {
                const currentUrl = window.location.href;
                const separator = currentUrl.includes('?') ? '&' : '?';
                window.location.href = currentUrl + separator + 'devKey=' + encodeURIComponent(key);
            }, 1500);
        });
        
        // Input focus animation
        const input = document.getElementById('devKey');
        const icon = document.querySelector('.input-icon');
        
        input.addEventListener('focus', function() {
            icon.style.transform = 'translateY(-50%) scale(1.3) rotate(20deg)';
        });
        
        input.addEventListener('blur', function() {
            icon.style.transform = 'translateY(-50%) scale(1)';
        });
    </script>
</body>
</html>
        `);
    }
    
    // Validate the key
    if (devKey === process.env.DEVELOPER_KEY) {
        next();
    } else {
        // Invalid key - Fullscreen error page
        return res.status(403).send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>❌ ACCESS DENIED | Free Fire Tournament</title>
    <style>
        * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
        }
        
        @keyframes glitch {
            0% { transform: translate(0); }
            20% { transform: translate(-5px, 5px); }
            40% { transform: translate(-5px, -5px); }
            60% { transform: translate(5px, 5px); }
            80% { transform: translate(5px, -5px); }
            100% { transform: translate(0); }
        }
        
        @keyframes alert-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.15); }
        }
        
        @keyframes slideBackground {
            0% { background-position: 0% 0%; }
            100% { background-position: 100% 100%; }
        }
        
        @keyframes redFlash {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.8; }
        }
        
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: linear-gradient(135deg, #1a0000, #2d0a0a, #400000, #1a0000);
            background-size: 400% 400%;
            animation: slideBackground 15s ease infinite;
            min-height: 100vh;
            overflow: hidden;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        /* Warning stripes */
        body::before {
            content: '';
            position: absolute;
            width: 200%;
            height: 200%;
            background: repeating-linear-gradient(
                45deg,
                transparent,
                transparent 50px,
                rgba(255, 0, 0, 0.05) 50px,
                rgba(255, 0, 0, 0.05) 100px
            );
            animation: slideBackground 20s linear infinite;
        }
        
        /* Red alert overlay */
        .alert-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(circle, rgba(255, 0, 0, 0.3) 0%, transparent 70%);
            animation: redFlash 2s infinite;
            pointer-events: none;
        }
        
        .error-wrapper {
            display: grid;
            grid-template-columns: 1fr 1fr;
            width: 100%;
            height: 100vh;
            position: relative;
            z-index: 10;
        }
        
        /* Left panel - Big warning */
        .left-error-panel {
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(20px);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 60px;
            border-right: 3px solid #ff0000;
            position: relative;
        }
        
        .warning-icon {
            font-size: 200px;
            margin-bottom: 40px;
            animation: alert-pulse 1.5s infinite;
            filter: drop-shadow(0 0 50px rgba(255, 0, 0, 1));
        }
        
        .error-title {
            font-size: 72px;
            color: #ff0000;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 5px;
            text-shadow: 0 0 30px rgba(255, 0, 0, 0.8);
            animation: glitch 0.3s infinite;
            margin-bottom: 30px;
        }
        
        .error-code {
            background: rgba(255, 0, 0, 0.2);
            border: 3px solid #ff0000;
            color: #ff0000;
            padding: 15px 40px;
            border-radius: 50px;
            font-weight: bold;
            font-size: 28px;
            letter-spacing: 3px;
            box-shadow: 0 0 30px rgba(255, 0, 0, 0.5);
        }
        
        .alert-lines {
            position: absolute;
            width: 100%;
            height: 100%;
            pointer-events: none;
        }
        
        .alert-line {
            position: absolute;
            width: 100%;
            height: 3px;
            background: linear-gradient(90deg, transparent, #ff0000, transparent);
            animation: redFlash 1s infinite;
        }
        
        .alert-line:nth-child(1) { top: 0; animation-delay: 0s; }
        .alert-line:nth-child(2) { top: 33%; animation-delay: 0.3s; }
        .alert-line:nth-child(3) { top: 66%; animation-delay: 0.6s; }
        .alert-line:nth-child(4) { bottom: 0; animation-delay: 0.9s; }
        
        /* Right panel - Details */
        .right-error-panel {
            background: rgba(0, 0, 0, 0.9);
            backdrop-filter: blur(20px);
            padding: 60px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            overflow-y: auto;
        }
        
        .error-header {
            margin-bottom: 40px;
        }
        
        .error-header h2 {
            color: #fff;
            font-size: 42px;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        
        .error-header p {
            color: rgba(255, 255, 255, 0.8);
            font-size: 20px;
            line-height: 1.6;
        }
        
        .error-details {
            background: rgba(255, 0, 0, 0.1);
            border-left: 5px solid #ff0000;
            padding: 30px;
            margin-bottom: 30px;
            border-radius: 10px;
        }
        
        .error-details h3 {
            color: #ff0000;
            font-size: 22px;
            margin-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .error-details ul {
            list-style: none;
            padding: 0;
        }
        
        .error-details li {
            color: rgba(255, 255, 255, 0.9);
            font-size: 16px;
            padding: 12px 0;
            padding-left: 35px;
            position: relative;
            line-height: 1.6;
        }
        
        .error-details li::before {
            content: '⚠️';
            position: absolute;
            left: 0;
            font-size: 20px;
        }
        
        .action-buttons {
            display: flex;
            gap: 20px;
            margin-top: 40px;
        }
        
        .retry-btn, .contact-btn {
            flex: 1;
            padding: 20px;
            border: none;
            border-radius: 15px;
            font-size: 16px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 2px;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            text-align: center;
            display: block;
        }
        
        .retry-btn {
            background: linear-gradient(135deg, #ff0000, #cc0000);
            color: white;
            box-shadow: 0 10px 30px rgba(255, 0, 0, 0.5);
        }
        
        .retry-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 15px 40px rgba(255, 0, 0, 0.7);
        }
        
        .contact-btn {
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border: 2px solid rgba(255, 255, 255, 0.3);
        }
        
        .contact-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: translateY(-3px);
        }
        
        .security-alert {
            margin-top: 40px;
            padding: 25px;
            background: rgba(255, 165, 0, 0.1);
            border: 2px solid rgba(255, 165, 0, 0.3);
            border-radius: 15px;
        }
        
        .security-alert h4 {
            color: #ffaa00;
            font-size: 18px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .security-alert p {
            color: rgba(255, 255, 255, 0.7);
            font-size: 14px;
            line-height: 1.6;
        }
        
        /* Responsive */
        @media (max-width: 1024px) {
            .error-wrapper {
                grid-template-columns: 1fr;
                grid-template-rows: auto 1fr;
            }
            
            .left-error-panel {
                border-right: none;
                border-bottom: 3px solid #ff0000;
                padding: 40px 20px;
            }
            
            .warning-icon {
                font-size: 120px;
                margin-bottom: 20px;
            }
            
            .error-title {
                font-size: 48px;
            }
            
            .right-error-panel {
                padding: 40px 20px;
            }
            
            .action-buttons {
                flex-direction: column;
            }
        }
    </style>
</head>
<body>
    <div class="alert-overlay"></div>
    
    <div class="error-wrapper">
        <!-- Left Panel -->
        <div class="left-error-panel">
            <div class="alert-lines">
                <div class="alert-line"></div>
                <div class="alert-line"></div>
                <div class="alert-line"></div>
                <div class="alert-line"></div>
            </div>
            
            <div class="warning-icon">🚫</div>
            <h1 class="error-title">ACCESS<br>DENIED</h1>
            <div class="error-code">ERROR 403</div>
        </div>
        
        <!-- Right Panel -->
        <div class="right-error-panel">
            <div class="error-header">
                <h2>⛔ UNAUTHORIZED ACCESS ATTEMPT</h2>
                <p>The developer access code you provided is invalid, expired, or has been revoked. Access to the tournament management system has been denied.</p>
            </div>
            
            <div class="error-details">
                <h3>🔒 POSSIBLE REASONS FOR DENIAL:</h3>
                <ul>
                    <li>Invalid or incorrect developer access key entered</li>
                    <li>Access credentials have expired or been revoked</li>
                    <li>Multiple failed authentication attempts detected</li>
                    <li>IP address not whitelisted for developer access</li>
                    <li>Account may have been suspended due to security policy</li>
                    <li>Authorization token mismatch or corruption detected</li>
                </ul>
            </div>
            
            <div class="action-buttons">
                <a href="${req.originalUrl.split('?')[0]}" class="retry-btn">
                    🔄 RETRY AUTHENTICATION
                </a>
                <a href="#" class="contact-btn" onclick="alert('Contact: admin@fftournament.com'); return false;">
                    📧 CONTACT SUPPORT
                </a>
            </div>
            
            <div class="security-alert">
                <h4>
                    <span style="font-size: 24px;">🛡️</span>
                    <span>SECURITY NOTICE</span>
                </h4>
                <p><strong>All unauthorized access attempts are logged and monitored.</strong> Your IP address, timestamp, and attempted credentials have been recorded. Repeated failed authentication attempts may result in temporary IP blocking and automatic notification to the security team. For legitimate access issues, please contact the tournament administrator immediately.</p>
            </div>
            
            <div style="margin-top: 40px; text-align: center; color: rgba(255, 255, 255, 0.5); font-size: 14px;">
                <p>Free Fire Tournament Management System v2.0</p>
                <p style="margin-top: 10px;">Protected by Advanced Security Protocol</p>
            </div>
        </div>
    </div>
    
    <script>
        // Dramatic error sound
        const errorSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0OVqnl77BdGAg+ltryxnYpBSp+zPLaizsIGGS57OihUBELTKXh8bllHAU2jdXzzn0vBSF1xe/glUQMFFmt5O+wXhoKPJLZ8slzKAUme8rx2ow5Bx1qvu7mnEoODlKm4/CwaB0FO5DY88p4KwUmeMnw24VBCRVcsOTwtV0aCD2T2fPIdykFKH3K8dqOPAgXY7nt4Z5KDg5QpuPwr2cfBTyQ2vLKeS0FJHbH79uFQgsUW6zj86xeFgo5jNXzx3kqBSd7y/HajDoHHGe97OGcSQ0NUKXi8K5iHgU6j9n0yHksBSR1x+/bhEILFFqs5POsXhYKOYzV88h4KgUme8rx2Yw6CBxnvezgnkoODU+l4PCuYR4FOY7Y9Mh5KwUkdMfu24RCCxRarOTzrF4VCjmM1fPIeCsFJnrK8dmMOQccZr3s4Z5KDg1PpeLwr2IeBDmO2PTIeSsFI3TH7tuEQgsUWqvj86xeFgo5jNXzyHgqBSZ6yvHZjDkHHGa97OGeSg4NT6Xi8K9iHgQ5jdj0yHkrBSN0x+7bhEILFFqr4/OsXhYKOYzV88h4KwUme8rx2ow5CBxmvezhnkoODU+l4vCvYh4EOY3Y9Mh5KwUjdMfu24RCCxRaq+PzrF4VCjmM1fPIeCsFJnvK8dqMOQgcZr3s4Z5KDg1PpeLwr2IeBDmN2PTIeSsFI3TH7tuEQgsUWqvj86xeFQo5jNXzyHgrBSZ7yvHajDkIHGa97OGeSQ4NT6Xi8K9iHgQ5jdj0yHkrBSN0x+7bhEILFFqr4/OsXhYKOYzV88h4KwUme8rx2ow5CBxmvezhnkoODU+l4vCvYh4EOY3Y9Mh5KwUjdMfu24RCCxRaq+PzrF4VCjmM1fPIeCsFJnvK8dqMOQgcZr3s4Z5KDg1PpeLwr2IeBDmN2PTIeSsFI3TH7tuEQgsUWqvj86xeFgo5jNXzyHgrBSZ7yvHajDkIHGa97OGeSg4NT6Xi8K9iHgQ5jdj0yHkrBSN0x+7bhEILFFqr4/OsXhUKOYzV88h4KwUme8rx2ow5CBxmvezhnkoODU+l4vCvYh4EOY3Y9Mh5KwUjdMfu24RCCxRaq+PzrF4VCjmM1fPIeCsFJnvK8dqMOQgcZr3s4Z5KDg1PpeLwr2IeBDmN2PTIeSsFI3TH7tuEQgsUWqvj86xeFQo5jNXzyHgrBSZ7yvHajDkIHGa97OGeSg4NT6Xi8K9iHgQ5jdj0yHkrBSN0x+7bhEILFFqr4/OsXhUKOYzV88h4KwUme8rx2ow5CBxmvezhnkoODU+l4vCvYh4EOY3Y9Mh5KwUjdMfu24RCCxRaq+PzrF4VCjmM1fPIeCsFJnvK8dqMOQgcZr3s4Z5KDg==');
        errorSound.volume = 0.2;
        errorSound.play().catch(e => {});
        
        // Screen shake effect
        document.body.style.animation = 'glitch 0.3s';
        setTimeout(() => {
            document.body.style.animation = '';
        }, 300);
    </script>
</body>
</html>
        `);
    }
}