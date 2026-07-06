const crypto   = require('crypto');
const path     = require('path');
const fs       = require('fs');
const User     = require('../models/User');
const Settings = require('../models/Settings');

function generateKey() {
    return 'uf_' + crypto.randomBytes(20).toString('hex');
}

// GET /api/agent/key  — get or create user's agent key
exports.getKey = async (req, res) => {
    try {
        let user = await User.findById(req.user._id);
        if (!user.agentKey) {
            user.agentKey = generateKey();
            await user.save();
        }
        const settings = await Settings.get();
        const apiUrl = settings.agentApiUrl || `${req.protocol}://${req.get('host')}`;
        const limit  = settings.infraServers?.[user.plan] ?? 0;
        res.json({ agentKey: user.agentKey, apiUrl, limit });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// POST /api/agent/regenerate  — rotate agent key
exports.regenerateKey = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        user.agentKey = generateKey();
        await user.save();
        res.json({ agentKey: user.agentKey });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /api/agent/download  — serve agent.js
exports.downloadAgent = (req, res) => {
    const agentPath = path.join(__dirname, '../agent/agent.js');
    if (!fs.existsSync(agentPath)) return res.status(404).send('Agent not found');
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Content-Disposition', 'attachment; filename="agent.js"');
    res.sendFile(agentPath);
};

// GET /api/agent/install  — serve bash install script
exports.installScript = async (req, res) => {
    const settings = await Settings.get().catch(() => ({}));
    const apiUrl = settings.agentApiUrl || `${req.protocol}://${req.get('host')}`;

    const script = `#!/bin/bash
set -e

AGENT_KEY="$1"
SERVER_NAME="$2"
API_URL="${apiUrl}"

if [ -z "$AGENT_KEY" ]; then
  echo "Error: Agent key missing. Get it from your UptimeForge dashboard."
  exit 1
fi

if [ -z "$SERVER_NAME" ]; then
  SERVER_NAME=$(hostname)
fi

SERVER_ID=$(echo "$SERVER_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-')

echo ""
echo "================================================"
echo "  UptimeForge Agent Installer"
echo "================================================"
echo ""

# Detect if running as root
IS_ROOT=false
if [ "$(id -u)" = "0" ]; then
  IS_ROOT=true
  INSTALL_DIR="/opt/uptimeforge-agent"
else
  INSTALL_DIR="$HOME/.uptimeforge-agent"
fi

echo "  Server Name : $SERVER_NAME"
echo "  Install Dir : $INSTALL_DIR"
echo "  Running as  : $(id -un)"
echo ""

# ── Step 1: Detect OS ────────────────────────────────
echo "Step 1/6  Detecting OS..."
OS=""
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS=$ID
fi
echo "          OS: \${PRETTY_NAME:-$OS}"

# ── Step 2: Check / Install Node.js ─────────────────
echo "Step 2/6  Checking Node.js..."
NODE_OK=false
if command -v node >/dev/null 2>&1; then
  NODE_VER=$(node -e "process.stdout.write(process.versions.node)" 2>/dev/null || echo "0")
  MAJOR=$(echo "$NODE_VER" | cut -d. -f1)
  if [ "$MAJOR" -ge 16 ] 2>/dev/null; then
    NODE_OK=true
    echo "          Found Node.js $NODE_VER"
  fi
fi

if [ "$NODE_OK" = "false" ]; then
  echo "          Node.js not found — installing..."
  INSTALLED=false

  # Try apt (Ubuntu/Debian)
  if command -v apt-get >/dev/null 2>&1 && [ "$IS_ROOT" = "true" ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1 && \
    apt-get install -y nodejs >/dev/null 2>&1 && INSTALLED=true
  fi

  # Try dnf (RHEL/CentOS 8+)
  if [ "$INSTALLED" = "false" ] && command -v dnf >/dev/null 2>&1 && [ "$IS_ROOT" = "true" ]; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash - >/dev/null 2>&1 && \
    dnf install -y nodejs >/dev/null 2>&1 && INSTALLED=true
  fi

  # Try yum (CentOS 7)
  if [ "$INSTALLED" = "false" ] && command -v yum >/dev/null 2>&1 && [ "$IS_ROOT" = "true" ]; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash - >/dev/null 2>&1 && \
    yum install -y nodejs >/dev/null 2>&1 && INSTALLED=true
  fi

  # Try pacman (Arch Linux)
  if [ "$INSTALLED" = "false" ] && command -v pacman >/dev/null 2>&1 && [ "$IS_ROOT" = "true" ]; then
    pacman -Sy --noconfirm nodejs npm >/dev/null 2>&1 && INSTALLED=true
  fi

  # Try apk (Alpine Linux)
  if [ "$INSTALLED" = "false" ] && command -v apk >/dev/null 2>&1 && [ "$IS_ROOT" = "true" ]; then
    apk add --no-cache nodejs npm >/dev/null 2>&1 && INSTALLED=true
  fi

  # Try zypper (openSUSE)
  if [ "$INSTALLED" = "false" ] && command -v zypper >/dev/null 2>&1 && [ "$IS_ROOT" = "true" ]; then
    zypper install -y nodejs20 npm20 >/dev/null 2>&1 && INSTALLED=true
  fi

  # Try nvm (any user, no root needed)
  if [ "$INSTALLED" = "false" ]; then
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash >/dev/null 2>&1
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
    nvm install --lts >/dev/null 2>&1 && INSTALLED=true
    echo 'export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"' >> "$HOME/.bashrc" 2>/dev/null || true
  fi

  if [ "$INSTALLED" = "false" ]; then
    echo ""
    echo "  Error Code: ERR_001"
    echo "  Could not install Node.js automatically."
    echo "  Please contact support: uptimeforge@gmail.com"
    exit 1
  fi
  echo "          Node.js installed successfully"
fi

# ── Step 3: Create directory and download agent ──────
echo "Step 3/6  Downloading agent..."
mkdir -p "$INSTALL_DIR"
curl -fsSL "$API_URL/api/agent/download" -o "$INSTALL_DIR/agent.js" 2>/dev/null || {
  echo "  Error Code: ERR_002"
  echo "  Could not download agent. Please contact support: uptimeforge@gmail.com"
  exit 1
}

# ── Step 4: Create .env ──────────────────────────────
echo "Step 4/6  Creating config..."
cat > "$INSTALL_DIR/.env" <<ENVEOF
API_URL=$API_URL
AGENT_KEY=$AGENT_KEY
SERVER_ID=$SERVER_ID
SERVER_NAME=$SERVER_NAME
INTERVAL_SEC=30
ENVEOF

# ── Step 5: Install npm dependencies ────────────────
echo "Step 5/6  Installing dependencies..."
cd "$INSTALL_DIR"
npm install dotenv >/dev/null 2>&1 || {
  echo "  Error Code: ERR_003"
  echo "  Could not install dependencies. Please contact support: uptimeforge@gmail.com"
  exit 1
}

# ── Step 6: Setup service ────────────────────────────
echo "Step 6/6  Setting up service..."

NODE_BIN=$(command -v node)
STARTED=false

if [ "$IS_ROOT" = "true" ] && command -v systemctl >/dev/null 2>&1; then
  # System service (root)
  cat > /etc/systemd/system/uptimeforge-agent.service <<SVCEOF
[Unit]
Description=UptimeForge Monitoring Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
ExecStart=$NODE_BIN $INSTALL_DIR/agent.js
Restart=always
RestartSec=10
EnvironmentFile=$INSTALL_DIR/.env

[Install]
WantedBy=multi-user.target
SVCEOF
  systemctl daemon-reload >/dev/null 2>&1
  systemctl enable uptimeforge-agent >/dev/null 2>&1
  systemctl restart uptimeforge-agent >/dev/null 2>&1
  STARTED=true

elif command -v systemctl >/dev/null 2>&1; then
  # User service (non-root)
  mkdir -p "$HOME/.config/systemd/user"
  cat > "$HOME/.config/systemd/user/uptimeforge-agent.service" <<SVCEOF
[Unit]
Description=UptimeForge Monitoring Agent
After=network.target

[Service]
Type=simple
WorkingDirectory=$INSTALL_DIR
ExecStart=$NODE_BIN $INSTALL_DIR/agent.js
Restart=always
RestartSec=10
EnvironmentFile=$INSTALL_DIR/.env

[Install]
WantedBy=default.target
SVCEOF
  systemctl --user daemon-reload >/dev/null 2>&1
  systemctl --user enable uptimeforge-agent >/dev/null 2>&1
  systemctl --user restart uptimeforge-agent >/dev/null 2>&1
  loginctl enable-linger "$(id -un)" >/dev/null 2>&1 || true
  STARTED=true
fi

# Fallback: nohup
if [ "$STARTED" = "false" ]; then
  pkill -f "uptimeforge-agent/agent.js" 2>/dev/null || true
  nohup "$NODE_BIN" "$INSTALL_DIR/agent.js" >> "$INSTALL_DIR/agent.log" 2>&1 &
  STARTED=true
fi

echo ""
echo "================================================"
echo "  Installation complete!"
echo "  Your server will appear in dashboard in ~30s"
echo "================================================"
echo ""
`;

    res.setHeader('Content-Type', 'text/plain');
    res.send(script);
};
