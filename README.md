# NWO Robotics MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/Protocol-MCP-blue)](https://modelcontextprotocol.io)
[![Live on Render](https://img.shields.io/badge/Deployed-Render-46E3B7)](https://nwo-chatgpt-app.onrender.com/health)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org)

Control robots, IoT devices, and robot swarms through Claude and other AI assistants using the [Model Context Protocol (MCP)](https://modelcontextprotocol.io). This is the **live hosted server** — no installation required.

---

## ⚡ Quick Connect (No Installation)

The server is live. Just paste the MCP URL into your AI client:

```
https://nwo-chatgpt-app.onrender.com/mcp
```

Pass your NWO API key as a request header: `X-API-Key: sk_live_your_key`

Get your API key at [nwo.capital/webapp/api-key.php](https://nwo.capital/webapp/api-key.php)

---

## 🔌 Connect to Claude

### Claude Desktop or Claude.ai (Custom Connector)

1. Open **Settings → Connectors** (or Customize → Connectors)
2. Click **Add custom connector**
3. Enter the MCP URL: `https://nwo-chatgpt-app.onrender.com/mcp`
4. Add your API key header: `X-API-Key: sk_live_your_key`
5. Click Connect

### Claude Code

```bash
claude mcp add nwo-robotics https://nwo-chatgpt-app.onrender.com/mcp \
  --header "X-API-Key: sk_live_your_key"
```

### Health Check

```
GET https://nwo-chatgpt-app.onrender.com/health
```

```json
{ "status": "ok", "name": "NWO Robotics MCP Server", "version": "2.0.0", "tools": 85 }
```

---

## 🎮 Example Prompts

Once connected, control robots with natural language:

```
"Run VLA inference — pick up the red box on the left"
"Check the status of robot ur5e_001"
"Plan a task to clean the entire warehouse"
"Validate grasp for a 0.5kg glass cylinder"
"Deploy swarm_alpha to patrol zone B"
"Check my API quota and tier"
"Register me as an agent on Base mainnet"
"Run a dry-run before executing"
```

---

## 🛠️ 85 Tools Across 5 Services

| Category | Tools | Service |
|---|---|---|
| VLA Inference & Models | 5 | nwo.capital |
| Robot Control & State | 6 | nwo.capital |
| Task Planning & Learning | 4 | nwo.capital |
| Agent Management | 8 | nwo.capital |
| Agent Discovery | 5 | nwo.capital |
| Physics & Simulation | 7 | nwo.capital |
| Embodiment & Calibration | 8 | nwo.capital |
| Online RL & Fine-tuning | 4 | nwo.capital |
| Tactile Sensing (ORCA) | 3 | nwo.capital |
| Dataset Hub | 1 | nwo.capital |
| Swarm | 3 | nwo.capital |
| Tasks / Config / Billing | 6 | nwo.capital |
| IoT / Safety / Templates | 6 | nwo.capital |
| Custom Models | 4 | nwo.capital |
| ROS2 Bridge | 7 | nwo-ros2-bridge.onrender.com |
| Cardiac Oracle | 4 | nwo-oracle.onrender.com |
| Cardiac Relayer (Base mainnet) | 14 | nwo-relayer.onrender.com |

### Tool Highlights

**Inference**
- `nwo_inference` — VLA inference with natural language + images
- `nwo_edge_inference` — ultra-low latency via global edge (~28ms)
- `nwo_dry_run` — validate task feasibility before executing

**Robot Control**
- `nwo_execute_actions` — send joint action vectors to a robot
- `nwo_sensor_fusion` — fuse camera, LiDAR, GPS, force sensor data
- `ros2_emergency_stop_all` — stop all physical robots instantly

**Cardiac Identity (Base Mainnet)**
- `cardiac_register_agent` — get a soul-bound `rootTokenId` Digital ID
- `cardiac_issue_credential` — issue task_auth, swarm_cmd, capability credentials
- `cardiac_process_payment` — on-chain payment via NWO Payment Processor

---

## 🏗️ Self-Host / Development

Clone and run locally:

```bash
git clone https://github.com/RedCiprianPater/nwo-chatgpt-app.git
cd nwo-chatgpt-app
npm install
```

Create a `.env` file:

```env
NWO_API_KEY=sk_live_your_key
RELAYER_SECRET=your_relayer_secret
ORACLE_SECRET=your_oracle_secret
PORT=3000
```

```bash
npm start
# MCP endpoint: http://localhost:3000/mcp
# Health check: http://localhost:3000/health
```

### Deploy to Render

This repo includes `render.yaml` — just connect your GitHub repo to [render.com](https://render.com) and it deploys automatically.

---

## 🔐 Authentication

All NWO Capital endpoints require your API key passed as a header:

```
X-API-Key: sk_live_your_key
```

Cardiac Oracle and Relayer endpoints additionally require their respective secrets:

```
X-Oracle-Secret: your_oracle_secret
X-Relayer-Secret: your_relayer_secret
```

Keys are passed per-request and never stored server-side.

---

## 📡 Services & Base URLs

| Service | URL |
|---|---|
| NWO Capital API | `https://nwo.capital/webapp` |
| ROS2 Bridge | `https://nwo-ros2-bridge.onrender.com` |
| Edge Inference | `https://nwo-robotics-api-edge.ciprianpater.workers.dev` |
| Cardiac Oracle | `https://nwo-oracle.onrender.com` |
| Cardiac Relayer | `https://nwo-relayer.onrender.com` |

---

## 🔗 Related Repos

- [nwo-claude-plugin](https://github.com/RedCiprianPater/nwo-claude-plugin) — TypeScript version of this server
- [nwo-cardiac-sdk](https://github.com/RedCiprianPater/nwo-cardiac-sdk) — Cardiac Identity SDK

---

## 📖 Documentation

- [NWO Robotics API Docs](https://nwo.capital/webapp/nwo-robotics.html)
- [Cardiac API Docs](https://nwo.capital/webapp/nwo-cardiac.html)
- [Agent Skill File](https://nwo.capital/agent.md)
- [OpenAPI Spec](https://nwo.capital/openapi.yaml)
- [Privacy Policy](./PRIVACY.md)
- [Legal](./LEGAL.md)

---

## 📄 License

MIT — see [LICENSE](./LICENSE)

## 🤝 Support

- Email: [support@nwo.capital](mailto:support@nwo.capital)
- Website: [nwo.capital](https://nwo.capital)
- Issues: [GitHub Issues](https://github.com/RedCiprianPater/nwo-chatgpt-app/issues)

---

Built with ❤️ by [NWO Capital](https://nwo.capital)
