# NWO Robotics — Claude MCP Connector

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/Protocol-MCP-blue)](https://modelcontextprotocol.io)
[![Claude](https://img.shields.io/badge/Works%20with-Claude-orange)](https://claude.ai)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://www.typescriptlang.org)

Control real robots through Claude using the [Model Context Protocol (MCP)](https://modelcontextprotocol.io). This repo contains the **TypeScript source** for the NWO Robotics MCP server — 85 tools across robotics, swarms, IoT, and Cardiac Identity on Base mainnet.

> **Just want to connect?** Use the live hosted server — no setup needed:
> ```
> https://nwo-chatgpt-app.onrender.com/mcp
> ```
> See [nwo-chatgpt-app](https://github.com/RedCiprianPater/nwo-chatgpt-app) for the deployed version.

---

## ⚡ Connect to Claude (Live Server)

### Claude Desktop / Claude.ai

1. Go to **Settings → Connectors → Add custom connector**
2. Enter: `https://nwo-chatgpt-app.onrender.com/mcp`
3. Add header: `X-API-Key: sk_live_your_key`
4. Click Connect

### Claude Code

```bash
claude mcp add nwo-robotics https://nwo-chatgpt-app.onrender.com/mcp \
  --header "X-API-Key: sk_live_your_key"
```

Get your API key at [nwo.capital/webapp/api-key.php](https://nwo.capital/webapp/api-key.php)

---

## 🎮 Example Prompts

```
"Run VLA inference — pick up the red box on the left"
"Plan and execute a warehouse cleaning task"
"Check status of all connected ROS2 robots"
"Deploy swarm to patrol zone B"
"Register me as an agent on Base mainnet and get my Digital ID"
"Validate grasp for a 500g glass cylinder before executing"
"Check my quota and upgrade to prototype tier"
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
| Dataset Hub + Swarm + Tasks | 10 | nwo.capital |
| Config / Billing / IoT / Safety / Templates / Models | 10 | nwo.capital |
| ROS2 Bridge | 7 | nwo-ros2-bridge.onrender.com |
| Cardiac Oracle | 4 | nwo-oracle.onrender.com |
| Cardiac Relayer (Base mainnet) | 14 | nwo-relayer.onrender.com |

---

## 🏗️ Development

### Requirements

- Node.js 18+
- NWO Robotics API key

### Setup

```bash
git clone https://github.com/RedCiprianPater/nwo-claude-plugin.git
cd nwo-claude-plugin
npm install
```

Create `.env`:

```env
NWO_API_KEY=sk_live_your_key
RELAYER_SECRET=your_relayer_secret
ORACLE_SECRET=your_oracle_secret
PORT=3000
```

### Run

```bash
# Development (with watch)
npm run dev

# Build TypeScript
npm run build

# Production
npm start
```

MCP endpoint: `http://localhost:3000/mcp`  
Health check: `http://localhost:3000/health`

### Test the connection

```bash
curl http://localhost:3000/health
# { "status": "ok", "tools": 85 }

curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_live_your_key" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

---

## 📁 Project Structure

```
src/
  index.ts          ← MCP server with all 85 tools
package.json
tsconfig.json
```

---

## 🔐 Authentication

Pass your keys as request headers when connecting:

| Header | Required for |
|---|---|
| `X-API-Key` | All NWO Capital + ROS2 endpoints |
| `X-Oracle-Secret` | Cardiac Oracle endpoints |
| `X-Relayer-Secret` | Cardiac Relayer + on-chain endpoints |

Keys are forwarded per-request and never stored.

---

## 📡 Service Base URLs

| Service | URL |
|---|---|
| NWO Capital API | `https://nwo.capital/webapp` |
| ROS2 Bridge | `https://nwo-ros2-bridge.onrender.com` |
| Edge Inference | `https://nwo-robotics-api-edge.ciprianpater.workers.dev` |
| Cardiac Oracle | `https://nwo-oracle.onrender.com` |
| Cardiac Relayer | `https://nwo-relayer.onrender.com` |

---

## 🔗 Related Repos

- [nwo-chatgpt-app](https://github.com/RedCiprianPater/nwo-chatgpt-app) — live deployed version of this server (JavaScript, hosted on Render)
- [nwo-cardiac-sdk](https://github.com/RedCiprianPater/nwo-cardiac-sdk) — Cardiac Identity SDK for Base mainnet

---

## 📖 Documentation

- [NWO Robotics API Docs](https://nwo.capital/webapp/nwo-robotics.html)
- [Cardiac API Docs](https://nwo.capital/webapp/nwo-cardiac.html)
- [Agent Skill File](https://nwo.capital/agent.md)
- [OpenAPI Spec](https://nwo.capital/openapi.yaml)
- [Privacy Policy](./PRIVACY.md)

---

## 📄 License

MIT — see [LICENSE](./LICENSE)

## 🤝 Support

- Email: [ciprian.pater@publicae.org](mailto:ciprian.pater@publicae.org)
- Website: [nwo.capital](https://nwo.capital)
- Issues: [GitHub Issues](https://github.com/RedCiprianPater/nwo-claude-plugin/issues)

---

Built with ❤️ by [NWO Capital](https://nwo.capital)
