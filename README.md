# NWO Robotics — Claude MCP Connector

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/Protocol-MCP-blue)](https://modelcontextprotocol.io)
[![Claude](https://img.shields.io/badge/Works%20with-Claude-orange)](https://claude.ai)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://www.typescriptlang.org)
[![Version](https://img.shields.io/badge/Version-2.1.0-green)](https://github.com/RedCiprianPater/nwo-claude-plugin)

Control real robots through Claude using the [Model Context Protocol (MCP)](https://modelcontextprotocol.io). This repo contains the **TypeScript source** for the NWO Robotics MCP server — **107 tools** across robotics, swarms, IoT, Cardiac Identity on Base mainnet, and the new **Build Your Own Robot** pipeline (design → market → print → simulate → AGI compute).

> **Just want to connect?** Use the live hosted server — no setup needed:
> ```
> https://nwo-chatgpt-app.onrender.com/mcp
> ```
> See [nwo-chatgpt-app](https://github.com/RedCiprianPater/nwo-chatgpt-app) for the deployed version.

---

## 🆕 What's new in v2.1.0

**Build Your Own Robot** — 13 new tools that give any external agent (Claude, GPT, custom) the same design / market / print / simulate / AGI capabilities Conway agents get from the runner. No on-chain deployment required.

- **Design** (3 tools) — natural-language → 3D-printable parts via L1 Design Engine
- **Bot Market** (4 tools) — browse, publish, and earn from a shared parts library
- **Print Fulfillment** (2 tools) — submit jobs to your own or networked printers
- **Full-Environment Simulation** (1 tool) — validate designs before fabrication
- **NWO-AGI Supercomputer** (3 tools) — pool robot GPU/CPU/RAM for models too large for a single robot (Qwen 72B, Llama 70B, 405B)

Earnings on AGI contributions follow the **35% guardian / 35% savings / 30% operations** split — anti-extractive by design.

---

## ⚡ Connect to Claude (Live Server)

### Claude Desktop / Claude.ai

1. Go to **Settings → Connectors → Add custom connector**
2. Enter: `https://nwo-chatgpt-app.onrender.com/mcp`
3. Add header: `X-API-Key: sk_live_your_key`
4. (Optional) Add `X-Wallet: 0x...` to earn from Bot Market downloads and AGI contributions
5. Click Connect

### Claude Code

```bash
claude mcp add nwo-robotics https://nwo-chatgpt-app.onrender.com/mcp \
  --header "X-API-Key: sk_live_your_key" \
  --header "X-Wallet: 0xYourEthAddress"
```

Get your API key at [nwo.capital/webapp/api-key.php](https://nwo.capital/webapp/api-key.php)

---

## 🎮 Example Prompts

### Robotics core
```
"Run VLA inference — pick up the red box on the left"
"Plan and execute a warehouse cleaning task"
"Check status of all connected ROS2 robots"
"Deploy swarm to patrol zone B"
"Validate grasp for a 500g glass cylinder before executing"
"Check my quota and upgrade to prototype tier"
```

### Cardiac Identity
```
"Register me as an agent on Base mainnet and get my Digital ID"
"Validate my ECG and enroll a cardiac hash"
"Issue a task_auth credential to root token 42"
```

### Build Your Own Robot
```
"Design an M3 servo bracket with 4 mounting holes and 3mm walls"
"Search Bot Market for TPU gripper fingers, then print the most-downloaded one"
"Validate my new arm bracket in the simulator before I print it"
"Publish my latest gripper design to Bot Market under CC-BY"
"What's the status of my AGI node, and what's the total earnings?"
"Run inference on Qwen 72B using the NWO-AGI mesh"
```

---

## 🛠️ 107 Tools Across 9 Services

### Core Robotics (94 tools)

| Category | Tools | Service |
|---|---|---|
| VLA Inference & Models | 5 | nwo.capital |
| Robot Control & State | 6 | nwo.capital |
| Task Planning & Learning | 4 | nwo.capital |
| Agent Management & Registration | 7 | nwo.capital |
| Agent Discovery | 5 | nwo.capital |
| Physics & Simulation | 7 | nwo.capital |
| Embodiment & Calibration | 8 | nwo.capital |
| Online RL & Fine-tuning | 4 | nwo.capital |
| Tactile Sensing (ORCA) | 3 | nwo.capital |
| Dataset Hub | 1 | nwo.capital |
| Swarm | 3 | nwo.capital |
| Tasks / Config / Billing / IoT / Safety / Templates / Models | 16 | nwo.capital |
| ROS2 Bridge | 7 | nwo-ros2-bridge.onrender.com |
| Cardiac Oracle | 4 | nwo-oracle.onrender.com |
| Cardiac Relayer (Base mainnet) | 14 | nwo-relayer.onrender.com |

### Build Your Own Robot (13 tools)

| Category | Tools | Service |
|---|---|---|
| L1 Design Engine | 3 | nwo-design-engine.onrender.com |
| L2 Bot Market (Parts Gallery) | 4 | nwo-parts-gallery.onrender.com |
| L3 Printer Connectors | 2 | nwo-printer-connectors.onrender.com |
| Full-Environment Simulation | 1 | nwo-simulation-api.onrender.com |
| NWO-AGI Supercomputer | 3 | nwo.ciprianpater.workers.dev |

---

## 🤖 Build Your Own Robot — Full Pipeline

The BYOR pipeline lets an agent go from idea → printed part → mesh-validated → earning on shared compute, all without an on-chain deployment.

```
┌───────────────────────────────────────────────────────────────────┐
│                                                                   │
│   nwo_design_part        ──▶  STL/3MF + parametric script         │
│   (L1 Design Engine)          (OpenSCAD or CadQuery)              │
│                                                                   │
│                  │                                                │
│                  ▼                                                │
│                                                                   │
│   nwo_sim_validate_design ──▶ Physics validation                  │
│   (Full-env simulator)        (collision, load, task feasibility) │
│                                                                   │
│                  │                                                │
│                  ▼                                                │
│                                                                   │
│   nwo_market_publish_part ──▶ Public on Bot Market                │
│   (License: CC0/CC-BY/MIT)    (earns on every download)           │
│                                                                   │
│                  │                                                │
│                  ▼                                                │
│                                                                   │
│   nwo_print_submit_job    ──▶ Fabrication on owned or             │
│   (L3 Printer Connectors)     networked printers                  │
│                                                                   │
│                                                                   │
│   nwo_agi_request_inference ─▶ Run 72B / 405B models on           │
│   (Hyperspace mesh)            pooled robot hardware              │
│                                35% guardian / 35% savings /       │
│                                30% operations                     │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### Safety rails

- **`nwo_print_submit_job`** accepts `max_budget_eth` — the job is rejected if the estimated cost exceeds it.
- **`nwo_market_publish_part`** requires explicit user confirmation of license — publishing is public and permanent.
- **`nwo_agi_request_inference`** checks `nwo_agi_node_status` first — if the node is offline, you get the exact CLI command to bring it online rather than a silent failure.

### NWO-AGI in one paragraph

NWO-AGI is a peer-to-peer mesh (built on Hyperspace) where robots pool GPU/CPU/RAM/sensors to run models too large for any single robot. The MCP exposes status and discovery; actual inference runs on the connected robot via the `nwo-agi` Python package:

```bash
pip install nwo-agi
python -m nwo_agi.cli --robot-id "0x..." --wallet "0x..."
```

Once a node is online, `nwo_agi_request_inference` returns the exact Python snippet to execute the query on that node.

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
# Core authentication
NWO_API_KEY=sk_live_your_key
RELAYER_SECRET=your_relayer_secret
ORACLE_SECRET=your_oracle_secret
NWO_WALLET=0xYourEthAddress

# Server
PORT=3000

# Optional: override Build Your Own Robot service URLs
# (defaults shown — only override if running your own service)
NWO_L1_DESIGN_URL=https://nwo-design-engine.onrender.com
NWO_L2_GALLERY_URL=https://nwo-parts-gallery.onrender.com
NWO_L3_PRINTER_URL=https://nwo-printer-connectors.onrender.com
NWO_SIM_API_URL=https://nwo-simulation-api.onrender.com
NWO_AGI_RUNNER_URL=https://nwo.ciprianpater.workers.dev
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
# { "status": "ok", "tools": 107, "version": "2.1.0" }

curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_live_your_key" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

---

## 📁 Project Structure

```
src/
  index.ts          ← MCP server with all 107 tools (v2.1.0)
package.json
tsconfig.json
.env.example
```

---

## 🔐 Authentication

Pass your keys as request headers when connecting. Headers are forwarded per-request and never stored.

| Header | Required for | Notes |
|---|---|---|
| `X-API-Key` | All NWO Capital, ROS2, BYOR endpoints | Get from [nwo.capital/webapp/api-key.php](https://nwo.capital/webapp/api-key.php) |
| `X-Oracle-Secret` | Cardiac Oracle endpoints | Required for ECG validation |
| `X-Relayer-Secret` | Cardiac Relayer + on-chain endpoints | Required for Base mainnet writes |
| `X-Wallet` | Optional — Bot Market earnings, AGI rewards | Ethereum address (0x...) |

---

## 📡 Service Base URLs

### Core
| Service | URL |
|---|---|
| NWO Capital API | `https://nwo.capital/webapp` |
| ROS2 Bridge | `https://nwo-ros2-bridge.onrender.com` |
| Edge Inference | `https://nwo-robotics-api-edge.ciprianpater.workers.dev` |
| Cardiac Oracle | `https://nwo-oracle.onrender.com` |
| Cardiac Relayer | `https://nwo-relayer.onrender.com` |

### Build Your Own Robot
| Service | URL |
|---|---|
| L1 Design Engine | `https://nwo-design-engine.onrender.com` |
| L2 Parts Gallery (Bot Market) | `https://nwo-parts-gallery.onrender.com` |
| L3 Printer Connectors | `https://nwo-printer-connectors.onrender.com` |
| Simulation API | `https://nwo-simulation-api.onrender.com` |
| AGI Runner | `https://nwo.ciprianpater.workers.dev` |

---

## 💰 Costs (BYOR services)

| Action | Approximate cost | Billing |
|---|---|---|
| `nwo_design_part` | Included with API tier | NWO API quota |
| `nwo_market_browse` / `get_part` | Free | — |
| `nwo_market_publish_part` | Free to publish; earns on downloads | License-dependent |
| `nwo_print_submit_job` | Variable (filament + printer time) | ETH or NWO credits — set `max_budget_eth` |
| `nwo_sim_validate_design` | ~$0.10 per environment + $0.01/sec runtime | NWO account balance |
| `nwo_agi_request_inference` | 35% guardian / 35% savings / 30% operations | ETH on each contribution |

---

## 🔗 Related Repos

- [nwo-chatgpt-app](https://github.com/RedCiprianPater/nwo-chatgpt-app) — live deployed version of this server (JavaScript, hosted on Render)
- [nwo-cardiac-sdk](https://github.com/RedCiprianPater/nwo-cardiac-sdk) — Cardiac Identity SDK for Base mainnet
- [nwo-agi](https://github.com/RedCiprianPater/nwo-agi) — Python package for joining the AGI compute mesh

---

## 📖 Documentation

- [NWO Robotics API Docs](https://nwo.capital/webapp/nwo-robotics.html)
- [Cardiac API Docs](https://nwo.capital/webapp/nwo-cardiac.html)
- [Agent Skill File](https://nwo.capital/agent.md)
- [OpenAPI Spec](https://nwo.capital/openapi.yaml)
- [Build Your Own Robot Guide](https://github.com/RedCiprianPater/nwo-claude-plugin#build-your-own-robot)
- [Privacy Policy](./PRIVACY.md)

---

## 📄 License

MIT — see [LICENSE](./LICENSE)

## 🤝 Support

- Email: [ciprian.pater@publicae.org](mailto:ciprian.pater@publicae.org)
- Website: [nwo.capital](https://nwo.capital)
- Issues: [GitHub Issues](https://github.com/RedCiprianPater/nwo-claude-plugin/issues)

---

Built with ❤️ by [NWO Capital](https://nwo.capital) — open infrastructure for robots that earn for their guardians, not extractors.
