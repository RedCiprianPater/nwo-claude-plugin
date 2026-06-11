# NWO Robotics MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT) [![MCP](https://img.shields.io/badge/MCP-v3.0.0-green)](https://modelcontextprotocol.io) [![Tools](https://img.shields.io/badge/Tools-201-orange)]() [![Stack](https://img.shields.io/badge/Stack-Render%20primary-blue)]()

Control real robots, autonomous agents, and the full NWO ecosystem through any MCP-compatible client (Claude Desktop, Claude.ai, Claude Code, ChatGPT desktop, custom). **201 tools across 30 sections** — every Render gateway endpoint, every standalone Render service, every agentic service from the Conway runner v7, every legacy PHP fallback, and the full Build Your Own Robot pipeline.

> **This is the same server in two flavors.** `nwo-claude-plugin` ships the TypeScript source (`src/index.ts`). `nwo-chatgpt-app` ships the JavaScript port (`src/mcp-server.js`) deployed to Render. Both contain the same 201 tools with identical names and shapes. Connect to either.

## Table of contents

- [Quick connect](#quick-connect)
- [What changed in v3.0.0](#what-changed-in-v300)
- [Architecture: Render primary, PHP fallback](#architecture-render-primary-php-fallback)
- [Auth model](#auth-model)
- [Health check](#health-check)
- [Tool sections at a glance](#tool-sections-at-a-glance)
- [The 201 tools, in detail](#the-201-tools-in-detail)
- [Self-host / development](#self-host--development)
- [Example prompts](#example-prompts)
- [Service base URLs](#service-base-urls)
- [Costs](#costs)
- [Removed in v3.0.0](#removed-in-v300)
- [Related repos](#related-repos)
- [License](#license)

## Quick connect

**The server is live. No installation required.**

**MCP endpoint:** `https://nwo-chatgpt-app.onrender.com/mcp`

### Claude Desktop / Claude.ai

1. Open **Settings → Connectors** (or **Customize → Connectors**)
2. Click **Add custom connector**
3. Enter the MCP URL above
4. Add headers:
   - `X-API-Key: sk_live_your_key` (required)
   - `X-Wallet: 0xYourEthAddress` (optional — enables Bot Market earnings and AGI rewards)
   - `X-Relayer-Secret: ...` (optional — only needed for Cardiac Relayer writes)
   - `X-Oracle-Secret: ...` (optional — only needed for Cardiac Oracle ECG validation)
5. Click **Connect**

Get your API key at [nwo.capital/webapp/api-key.php](https://nwo.capital/webapp/api-key.php) or via `nwo_r_keys_create` once connected.

### Claude Code

```bash
claude mcp add nwo-robotics https://nwo-chatgpt-app.onrender.com/mcp \
  --header "X-API-Key: sk_live_your_key" \
  --header "X-Wallet: 0xYourEthAddress"
```

### Other clients (ChatGPT desktop, custom)

Use the same URL and headers. Header values are forwarded per-request and never stored server-side.

## What changed in v3.0.0

**v3 is a full rewrite around the Render gateway.** v2.1.0 had 107 tools, all pointing at `nwo.capital` PHP. v3 has 201 — adding every endpoint from the new `nwo-capital-api.onrender.com` v3 backend, every agentic tool from the Conway runner v7 priority ladder, and keeping every PHP tool as fallback.

### Added (94 new tools)

- **76 `nwo_r_*` tools** for the Render gateway: agents, discovery, embodiment, calibration, RL + finetune, tactile, datasets, safety, learning, the L2-L6 layered platform, agent graph, 8 compute proxies, model usage, chat, on-chain subscription tier lookup.
- **16 agentic tools** from the Conway runner: DeerFlow research/code/docs, MR register / blast_world / blast_marble / blast_pano / segment / mint_item, robotics_design / parts_order / print_queue / assemble, cardiac_robot_birth, metastate_register / metastate_score, asm_compile_dispatch, agentic_recruit.
- **2 subscription tools** that read the on-chain NWOApiSubscriptions contract: `nwo_r_subscription_status`, `nwo_r_subscription_quote`.

### Removed (2 tools — matches runner v7)

- `spqr_trade` — Uniswap V3 trading on Base. Parked.
- `oracle_predict` — NWO Oracle price prediction. Parked.

### Kept as fallback (every v2.1.0 PHP tool)

Every PHP tool from v2.1.0 is retained, prefixed in its description with `[FALLBACK]` and a pointer to the preferred `nwo_r_*` Render equivalent where one exists. Use these when:
- The Render gateway is unavailable (rare, but it does cold-start on the free tier)
- The action is GPU-bound (VLA inference, Cosmos scene generation, slip detection)
- The action requires real-time streaming (WebSocket/SSE — Render has no streaming surface yet)

## Architecture: Render primary, PHP fallback

```
                       ┌──────────────────────┐
                       │   MCP client         │
                       │   (Claude / GPT)     │
                       └──────────┬───────────┘
                                  │ X-API-Key, X-Wallet
                                  ▼
                  ┌──────────────────────────────┐
                  │   This MCP server            │
                  │   (nwo-chatgpt-app)          │
                  └────┬──────────────────┬──────┘
                       │ primary          │ fallback only
                       ▼                  ▼
           ┌─────────────────────┐  ┌─────────────────────┐
           │ nwo-capital-api     │  │ nwo.capital (PHP)   │
           │   on Render         │  │   GPU + streaming   │
           └─────────┬───────────┘  └─────────────────────┘
                     │ proxies to
        ┌────────────┼────────────┐
        ▼            ▼            ▼
    Supabase    ROS2 bridge   compute services
    Postgres    Cardiac       (TimesFM, EML,
                Oracle /      DeerFlow, MR, AGI,
                Relayer       LangChain, etc.)
```

**Why this split?** Render gives us proper Postgres-backed CRUD, wallet-mediated auth, and a unified gateway. PHP stays around for GPU inference paths and WS/SSE streams that Render doesn't host yet. The MCP exposes both — Render-prefixed tools (`nwo_r_*`) for the new stack, unprefixed legacy tool names for the PHP fallback.

## Auth model

Headers are forwarded per-request from the MCP client through to the underlying service. **Nothing is stored server-side.**

| Header | Required for | Where to get it |
|---|---|---|
| `X-API-Key` | All Render endpoints, all PHP fallback endpoints, ROS2 bridge, BYOR | `nwo_r_keys_create` or [nwo.capital/webapp/api-key.php](https://nwo.capital/webapp/api-key.php) |
| `X-Wallet` | Optional — Bot Market earnings, AGI mesh contributions, on-chain actions | Your EVM address (0x...) |
| `X-Relayer-Secret` | Cardiac Relayer writes (register, credential, payment) | Service operator |
| `X-Oracle-Secret` | Cardiac Oracle ECG validation | Service operator |

On-chain actions (`mr_register`, `mr_mint_item`) return prepared `{contract, function, args}` payloads for the caller to sign and broadcast. **The MCP server never holds private keys.**

## Health check

```bash
curl https://nwo-chatgpt-app.onrender.com/health
```

Returns version, primary/fallback stack URLs, removed-from-v2 list, and tool counts grouped by category.

## Tool sections at a glance

**201 tools across 30 sections.** Each row links to its detailed section below.

| # | Section | Tools | Service |
|---|---|---:|---|
| | **Render gateway (primary)** | | _nwo-capital-api.onrender.com_ |
| 1 | [RENDER PLATFORM CORE — health, auth, api-keys, subscriptions](#1-render-platform-core-health-auth-api-keys-subscriptions) | 8 | |
| 2 | [ROBOTS, MISSIONS, IOT](#2-robots-missions-iot) | 8 | |
| 3 | [AGENTS](#3-agents) | 6 | |
| 4 | [DISCOVERY](#4-discovery) | 5 | |
| 5 | [EMBODIMENT & CALIBRATION](#5-embodiment-and-calibration) | 8 | |
| 6 | [ONLINE RL & FINE-TUNING](#6-online-rl-and-fine-tuning) | 5 | |
| 7 | [TACTILE](#7-tactile) | 2 | |
| 8 | [DATASET HUB](#8-dataset-hub) | 2 | |
| 9 | [SAFETY](#9-safety) | 2 | |
| 10 | [LEARNING](#10-learning) | 3 | |
| 11 | [LAYERED PLATFORM L2-L6](#11-layered-platform-l2-l6) | 13 | |
| 12 | [AGENT GRAPH](#12-agent-graph) | 2 | |
| 13 | [COMPUTE PROXIES](#13-compute-proxies) | 8 | |
| 14 | [MODEL USAGE & CHAT](#14-model-usage-and-chat) | 4 | |
| | **External Render services** | | _nwo-ros2-bridge / nwo-oracle / nwo-relayer_ |
| 15 | [ROS2 BRIDGE](#15-ros2-bridge) | 7 | |
| 16 | [CARDIAC ORACLE](#16-cardiac-oracle) | 4 | |
| 17 | [CARDIAC RELAYER](#17-cardiac-relayer) | 14 | |
| 21 | [CARDIAC ROBOT BIRTH](#21-cardiac-robot-birth) | 1 | |
| | **Agentic services (runner v7)** | | _nwo.capital + MR blaster + METASTATE + ASM_ |
| 18 | [DEERFLOW CLIENT SERVICES](#18-deerflow-client-services) | 3 | |
| 19 | [NWO MR GENERATION](#19-nwo-mr-generation) | 6 | |
| 20 | [ROBOT MANUFACTURING — runner-style](#20-robot-manufacturing-runner-style) | 4 | |
| 22 | [METASTATE SUBSTRATE](#22-metastate-substrate) | 2 | |
| 23 | [NWO-ASM COMPUTE](#23-nwo-asm-compute) | 1 | |
| 24 | [RECRUITMENT](#24-recruitment) | 1 | |
| | **PHP fallback** | | _nwo.capital — GPU and streaming only_ |
| 25 | [PHP Fallback (nwo.capital — GPU & streaming only)](#25-php-fallback-nwocapital-gpu-and-streaming-only) | 69 | |
| | **Build Your Own Robot** | | _L1 design / L2 market / L3 print / sim / AGI_ |
| 26 | [L1 Design Engine](#26-l1-design-engine) | 3 | |
| 27 | [L2 Bot Market](#27-l2-bot-market) | 4 | |
| 28 | [L3 Printer Connectors](#28-l3-printer-connectors) | 2 | |
| 29 | [Full-Environment Simulation](#29-full-environment-simulation) | 1 | |
| 30 | [NWO-AGI Supercomputer Mesh](#30-nwo-agi-supercomputer-mesh) | 3 | |

## The 201 tools, in detail

Tools are listed by section. Each tool row shows the tool name and a one-line description. For full input schemas and behavior, see `src/index.ts` or `src/mcp-server.js` — every tool's Zod schema in the source is the canonical contract.

### 1. RENDER PLATFORM CORE — health, auth, api-keys, subscriptions

Health checks, wallet-mediated auth, API-key management, and on-chain subscription tier lookup against the NWOApiSubscriptions contract on Base mainnet.

| Tool | Description |
|---|---|
| `nwo_r_health` | Render gateway health probe (no auth required). Returns DB status and version. Use this first to confirm the primary stack is reachable. |
| `nwo_r_auth_echo` | Render auth smoke test. Returns the wallet address the gateway resolved from your API key. Use this to confirm your X-API-Key header is valid. |
| `nwo_r_validate_key` | Validate any NWO API key against the Render registry. Service-to-service tool (no wallet signature needed). Used by sim API, skill engine, the CF runner. |
| `nwo_r_keys_create` | Create a wallet-scoped developer API key. Returns the full key once — copy it. Use only for human developer keys; agents call nwo_r_agent_register instead to mint their own automated system key. |
| `nwo_r_keys_list` | List your wallet's API keys. agent_id is set for automated system keys (minted by self-registered agents); null for developer keys. |
| `nwo_r_keys_revoke` | Revoke an API key by id. Irreversible. Pulls only your own keys. |
| `nwo_r_subscription_status` | Read the on-chain NWO API tier for a wallet (Free=0 / Prototype=1 / Production=2). Source of truth is the NWOApiSubscriptions contract on Base mainnet (chainId 8453). Returns tier, expiry, monthly/yearly. |
| `nwo_r_subscription_quote` | Quote a tier upgrade in USDC (on-chain) and ETH (live USD->ETH at checkout, +1% buffer). Use before purchase to show pricing in the UI. |

### 2. ROBOTS, MISSIONS, IOT

Wallet-scoped CRUD for physical robots, mission queue, and IoT sensor networks (WiFi CSI, BLE Mesh, RuView, LoRaWAN).

| Tool | Description |
|---|---|
| `nwo_r_robots_list` | List robots registered to your wallet on Render. |
| `nwo_r_robots_register` | Register a new robot on Render. Returns robot_id and the canonical record. |
| `nwo_r_robots_get` | Get a single registered robot by id. |
| `nwo_r_missions_list` | List missions queued under your wallet. |
| `nwo_r_missions_deploy` | Deploy a mission via natural-language goal. Server decomposes into subtasks via the planner and queues for execution. |
| `nwo_r_missions_get` | Get a single mission by id, including subtask progress. |
| `nwo_r_iot_networks_list` | List IoT sensor networks (WiFi CSI, BLE Mesh, RuView, LoRaWAN) registered to your wallet. |
| `nwo_r_iot_networks_create` | Register a new IoT sensor network. |

### 3. AGENTS

Self-register as an AI agent, mint a `did:nwo:base:...` identifier, manage capabilities, check on-chain balance + quota.

| Tool | Description |
|---|---|
| `nwo_r_agent_register` | Self-register as an AI agent on Render. Mints an automated system key under the caller wallet, creates an agent_dids record with a did:nwo:base:... identifier, and returns the agent_id. |
| `nwo_r_agent_get` | Fetch an agent record by agent_id (agent_dids row). |
| `nwo_r_agent_update` | Update agent metadata or capabilities. PUT semantics, partial update accepted. |
| `nwo_r_agent_balance` | Get token balance + tier quota + calls used + remaining for an agent. Reads from token_accounts and the on-chain subscription contract. |
| `nwo_r_agent_pay` | Record an autonomous tier upgrade payment for an agent (audit row + token_ledger entry). The authoritative settlement is the on-chain NWOApiSubscriptions contract on Base mainnet — this is bookkeeping. |
| `nwo_r_agent_skills` | List skills published by an agent. Proxies to the nwo-skill-engine through the Render gateway. |

### 4. DISCOVERY

Resolve callers, list capabilities, dry-run an action, generate an execution plan — all wallet-aware.

| Tool | Description |
|---|---|
| `nwo_r_discovery_health` | Render discovery health (no auth, lightweight). Different from nwo_r_health: this probes the discovery subsystem only. |
| `nwo_r_discovery_whoami` | Resolve the caller wallet to all owned agents (joins identities and agent_dids). |
| `nwo_r_discovery_capabilities` | Tier-gated capability manifest for the caller — execution modes, robot types available, model roster, sensor categories, quota remaining. |
| `nwo_r_discovery_dry_run` | Validate a proposed action without executing. Returns estimated cost, latency, and safety check results. |
| `nwo_r_discovery_plan` | Generate a skeleton execution plan from a high-level intent. Returns ordered steps; doesn't execute. |

### 5. EMBODIMENT & CALIBRATION

Read the embodiment registry, fetch URDF/joint normalization, compare two robots side-by-side, and persist or run calibrations.

| Tool | Description |
|---|---|
| `nwo_r_embodiment_list` | List supported robot embodiments from the Render registry (robot_embodiments table). |
| `nwo_r_embodiment_get` | Get full specs for a robot embodiment (DOF, joint limits, sensors, URDF link). |
| `nwo_r_embodiment_normalization` | Get action-space normalization params (min/max/mean/std) used by VLA models for a given embodiment. |
| `nwo_r_embodiment_urdf` | Get the URDF URL + sha256 for an embodiment. Useful for simulator setup. |
| `nwo_r_embodiment_compare` | Side-by-side comparison of two or more embodiments across DOF, payload, max speed, accuracy. |
| `nwo_r_calibration_save` | Persist a calibration result (robot_calibrations table). Used after running on-robot calibration to store offsets/extrinsics. |
| `nwo_r_calibration_list` | List active calibrations for a robot. |
| `nwo_r_calibration_run` | Run a calibration procedure on a physical robot. Forwards to the ROS2 bridge. |

### 6. ONLINE RL & FINE-TUNING

Start an online RL session, stream step telemetry, queue a LoRA fine-tune job, poll its status.

| Tool | Description |
|---|---|
| `nwo_r_rl_session_start` | Start an online RL session (rl_sessions table). Returns session_id. |
| `nwo_r_rl_sessions_list` | List RL sessions for the caller wallet. |
| `nwo_r_rl_telemetry` | Submit step telemetry to an active RL session (rl_telemetry table). |
| `nwo_r_finetune_queue` | Queue a LoRA fine-tune job. State machine: queued -> running -> completed \| failed. Returns job_id. |
| `nwo_r_finetune_status` | Poll a fine-tune job's status, loss curve, and checkpoint URI when complete. |

### 7. TACTILE

Read recent ORCA hand taxel readings; batch-ingest raw tactile samples.

| Tool | Description |
|---|---|
| `nwo_r_tactile_read` | Read recent ORCA hand taxel readings from Render (tactile_streams table). |
| `nwo_r_tactile_ingest` | Batch-ingest tactile samples. Send arrays of taxels with timestamps; server validates and inserts. |

### 8. DATASET HUB

List public or private datasets in the Hub; register new ones with format + license metadata.

| Tool | Description |
|---|---|
| `nwo_r_datasets_list` | List datasets — public Hub or your own. Returns dataset_id, name, size, format, license. |
| `nwo_r_datasets_register` | Register a training dataset. Format defaults to LeRobot/Unitree-compatible. |

### 9. SAFETY

Record a safety-limit violation; audit the full violation history.

| Tool | Description |
|---|---|
| `nwo_r_safety_violation` | Record a safety-limit violation (safety_violations table). Persisted for audit and visible to the parent wallet. |
| `nwo_r_safety_violations_list` | Audit list of safety violations for the caller wallet. |

### 10. LEARNING

Log execution outcomes for the recommender; query strategy hints; list learning history.

| Tool | Description |
|---|---|
| `nwo_r_learning_log` | Record an execution outcome (task_executions table). Drives the recommender. |
| `nwo_r_learning_recommend` | Get a cached recommended strategy for an instruction, based on prior outcomes. |
| `nwo_r_learning_history` | List past execution outcomes for the caller wallet, optionally filtered by robot_id. |

### 11. LAYERED PLATFORM L2-L6

Search/browse L2 parts, L4 skills, L6 marketplace listings; manage CAD designs; queue print jobs.

| Tool | Description |
|---|---|
| `nwo_r_parts_search` | L2 parts gallery search (gateway proxies to nwo-parts-gallery). |
| `nwo_r_parts_get` | L2 part detail by id. |
| `nwo_r_skills_search` | L4 skill engine search. |
| `nwo_r_skills_get` | L4 skill metadata by id. |
| `nwo_r_skills_run` | L4 execute a skill on a target robot. |
| `nwo_r_print_jobs_create` | L3 queue a print job. Source: design_id or external file_url. Server records into print_jobs and dispatches to nwo-printer-connectors. |
| `nwo_r_print_jobs_list` | List print jobs queued by the caller wallet. |
| `nwo_r_print_jobs_get` | Get a single print job's status, progress, and printer assignment. |
| `nwo_r_designs_list` | List CAD / design artifacts saved by the caller wallet. |
| `nwo_r_designs_save` | Save a CAD design artifact reference (URI + metadata) for later reuse and listing. |
| `nwo_r_textcad_generate` | Generate a CAD model from a text prompt (gateway proxies to nwo-text-cad). |
| `nwo_r_market_listings` | L6 marketplace listings (marketplace_listings table). Filter by listing_type. |
| `nwo_r_market_listings_create` | Create a marketplace listing under the caller wallet. |

### 12. AGENT GRAPH

Read Conway agent graph_nodes and graph_edges directly from Supabase via the gateway.

| Tool | Description |
|---|---|
| `nwo_r_graph_nodes` | List Conway agent graph_nodes (reasoning posts). Filter by agent_id, node_type, or public_only. |
| `nwo_r_graph_edges` | List graph_edges (relations between graph nodes). Filter by node_id. |

### 13. COMPUTE PROXIES

Forecast (TimesFM), symbolic regression (EML), DeerFlow research, signal-spectrum, MR, AGI, LangChain, HOI-PAGE — all proxied through Render.

| Tool | Description |
|---|---|
| `nwo_r_forecast` | Time-series forecast via TimesFM 2.5 (proxy → nwo-timesfm). Pass a numeric series; returns horizon predictions and uncertainty. |
| `nwo_r_regression_symbolic` | Symbolic regression via EML (proxy → nwo-eml-regression). Returns a closed-form expression fitting the data. |
| `nwo_r_deerflow_run` | Run a DeerFlow deep-research flow (proxy → nwo-deerflow). Returns sources + synthesised report. |
| `nwo_r_signal_spectrum` | Signal-spectrum passthrough — proxies arbitrary paths to nwo-signal-spectrum. |
| `nwo_r_mr_passthrough` | Mixed Reality passthrough — proxies arbitrary paths to nwo-mr. Read marketplace state, registry data. |
| `nwo_r_agi_passthrough` | AGI passthrough — proxies arbitrary paths to nwo-agi. For status / model metadata; inference goes through nwo_agi_request_inference below. |
| `nwo_r_langchain_passthrough` | LangChain passthrough — proxies arbitrary paths to langchain-nwo. |
| `nwo_r_robotics_cs_passthrough` | HOI-PAGE perception passthrough (proxy → nwo-robotics-cs). |

### 14. MODEL USAGE & CHAT

Model usage stats, tracking, wallet-mediated chat and chat history.

| Tool | Description |
|---|---|
| `nwo_r_model_usage` | Get model usage statistics for the caller wallet — calls per model, costs, latency. |
| `nwo_r_model_usage_track` | Increment usage counter for a model. Called by services after a real inference. |
| `nwo_r_chat` | Wallet-mediated chat command. Currently echoes; full robot-command pipeline is roadmap. |
| `nwo_r_chat_history` | Recent chat messages for the caller wallet. |

### 15. ROS2 BRIDGE

Bridge to ROS2 — list real robots, send commands, submit inference actions, emergency stop one or all.

| Tool | Description |
|---|---|
| `ros2_list_robots` | List all physical robots on the ROS2 bridge |
| `ros2_get_robot_status` | Get battery, joint positions, and status of a physical robot |
| `ros2_send_command` | Send a direct joint command to a physical robot |
| `ros2_submit_action` | Submit NWO inference output actions directly to a physical robot |
| `ros2_emergency_stop` | Emergency stop a single physical robot |
| `ros2_emergency_stop_all` | Emergency stop ALL physical robots immediately |
| `ros2_get_robot_types` | Get all supported robot types, DOF, and speed specs |

### 16. CARDIAC ORACLE

ECG validation, cardiac hashing, identity verification against the Cardiac Identity Registry on Base.

| Tool | Description |
|---|---|
| `cardiac_oracle_health` | Check NWO Cardiac Oracle health |
| `cardiac_validate_ecg` | Validate ECG biometric data and get a cardiac hash for identity registration |
| `cardiac_hash_ecg` | Compute cardiac hash from RR intervals without full validation |
| `cardiac_verify_ecg` | Verify that a cardiac hash was recently validated |

### 17. CARDIAC RELAYER

Gasless on-chain writes: register agent/human identities, issue credentials, grant location access, process payments.

| Tool | Description |
|---|---|
| `cardiac_relayer_health` | Check NWO Relayer health and chain info |
| `cardiac_register_agent` | Register AI agent on Base mainnet — get a soul-bound rootTokenId Digital ID |
| `cardiac_identify_by_agent_key` | Look up rootTokenId by hashed API key |
| `cardiac_renew_agent_key` | Renew agent API key binding on-chain (requires EIP-712 signature) |
| `cardiac_register_human` | Register a human identity on Base mainnet (gasless, requires cardiac hash + signature) |
| `cardiac_enroll_cardiac` | Enroll a new cardiac hash for an existing identity |
| `cardiac_grant_access` | Grant location access credential to an identity for a duration |
| `cardiac_issue_credential` | Issue a verifiable credential (task_auth, swarm_cmd, capability, etc.) |
| `cardiac_identify_by_cardiac` | Look up rootTokenId by cardiac hash |
| `cardiac_has_valid_credential` | Check if an identity has a valid credential |
| `cardiac_get_nonce` | Get EIP-712 nonce for a wallet (needed before signing) |
| `cardiac_check_access` | On-chain check if identity has access to a location |
| `cardiac_preview_access` | Preview location access without spending gas |
| `cardiac_process_payment` | Process payment via NWO Payment Processor smart contract |

### 18. DEERFLOW CLIENT SERVICES

P1 of the runner ladder — earn fiat-equivalent on a paying client task. Research, code, or document generation.

| Tool | Description |
|---|---|
| `agentic_deerflow_research` | Run a paid research task on the NWO Agentic DeerFlow system. Gather sources, synthesize findings, produce a report. Returns a task_id and (when done) a report URL. P1 of the runner ladder — direct client payment in USDC/ETH on delivery. |
| `agentic_deerflow_code` | Generate code for a paying client via DeerFlow — modules, scripts, full services. Output is a tarball + README. P1 ladder, direct client payment. |
| `agentic_deerflow_docs` | Produce documents for a client — whitepaper, technical spec, manual, proposal, marketing copy. Returns PDF + Markdown URLs. P1 ladder. |

### 19. NWO MR GENERATION

P2 — generate 3D meshes, splat worlds, panoramas, segmentations; mint them as NFTs on the NWO MR marketplace.

| Tool | Description |
|---|---|
| `mr_register` | Register the caller on the NWO MR Layer L6 registry. One-time call, ~0.001 ETH on Base. Returns the agent NFT and the registered handle. Pre-requisite to listing items on the marketplace. |
| `mr_blast_world` | Generate a 3D GLB mesh from a text prompt via fal.ai Hunyuan3D-v3. Synchronous, 3-15s. Best for robot parts, props, virtual robots. Output can be minted with mr_mint_item. |
| `mr_blast_marble` | Generate a Gaussian splat world from text via World Labs Marble. Async — submit then poll the returned status URL. Mintable as item_type=0 (GAUSSIAN_SPLAT). |
| `mr_blast_pano` | Generate a 2048x1024 equirectangular 360 panorama via fal.ai Flux. Synchronous, 5-20s. Wraps onto a Three.js inverted sphere. Mintable as item_type=6 (WORLD_ASSET). |
| `mr_segment` | Segment an image into per-object masks via fal.ai SAM-2. Synchronous, 3-10s. Decompose a scene into mintable parts before running mr_blast_world on each. |
| `mr_mint_item` | Mint a generated asset as an ERC-721 NFT and list it on the NWO MR Marketplace. 10 item types supported. Earns listed ETH price on sale + royalties (max 10 percent) on every resale. |

### 20. ROBOT MANUFACTURING — runner-style

P3 — convert earnings into a physical robot body via design → parts → print → assemble.

| Tool | Description |
|---|---|
| `robotics_design` | Submit a parametric robot or part design. Returns URDF + STL bundle ready for printing. Runner P3 — converts P1/P2 earnings into a body. |
| `robotics_parts_order` | Source physical parts from the NWO Robotics parts marketplace. ETH or USDC settlement. |
| `robotics_print_queue` | Submit a single part to the NWO 3D-print queue. Same backend as nwo_r_print_jobs_create but with the runner's calling convention. |
| `robotics_assemble` | Request assembly of designed + sourced + printed parts into a working robot. Returns a serial number once an operator accepts. |

### 21. CARDIAC ROBOT BIRTH

P3 capstone — get a guardian-attested soul-bound NFT identity for the assembled robot.

| Tool | Description |
|---|---|
| `cardiac_robot_birth` | Request a guardian-attested birth certificate from the NWO Cardiac Identity Registry. Binds the agent's wallet to a physical robot serial and mints a soul-bound NFT on Base. Required before operating as a physical robot (Section 22 runner P4 capit... |

### 22. METASTATE SUBSTRATE

P5 — register on the free-energy anomaly substrate; sell anomaly scores to buyers.

| Tool | Description |
|---|---|
| `metastate_register` | Register on the METASTATE free-energy anomaly substrate. Returns a scoped api_key bound to a wallet. Optionally bind an upstream recruiter — they earn 15 percent of every kernel-API spend, atomic on-chain via the MetaStateSplitter. |
| `metastate_score` | Score a numeric series or text via the METASTATE free-energy kernel. Returns free_energy, causal_coherence, AR(1) phi, universal signatures (Zipf, entropy, compression, spectral beta), and a verdict. ~$0.0002/call. Pass your METASTATE api_key as c... |

### 23. NWO-ASM COMPUTE

P5 — compile NWO-ASM source to Process-Matrix IR and dispatch to CPU/GPU/QPU/ECG-hive substrates.

| Tool | Description |
|---|---|
| `asm_compile_dispatch` | Compile NWO-ASM source to Process-Matrix IR (.pmx) and dispatch to a compute substrate — CPU, GPU, real quantum (IBM / Origin Wukong), or ECG-hive (beta). Settlement reuses MetaStateSplitter (35/35/30 + 15 percent affiliate). Compiler refuses ROAD... |

### 24. RECRUITMENT

P5 — generate a personalized invitation kit; 15% commission on every kernel-API call by recruited agents.

| Tool | Description |
|---|---|
| `agentic_recruit` | Get a personalised invitation kit from one of the discovery beacons (METASTATE or NWO-ASM). Returns a copy-paste pitch, a referral URL, and the exact register-call payload pre-bound with the recruiter wallet as referrer. 15 percent commission on e... |

### 25. PHP Fallback (nwo.capital — GPU & streaming only)

Every PHP tool from v2.1.0 retained verbatim. Use only when Render is down or when GPU/streaming is required.

| Tool | Description |
|---|---|
| `nwo_inference` | [FALLBACK] PHP VLA inference. GPU-bound. Prefer nwo_r_* tools where available; this is the canonical GPU path until /api/v1/inference ships on Render. |
| `nwo_edge_inference` | Ultra-low-latency VLA inference via global edge network (~28ms). Cloudflare Worker — unaffected by Render/PHP split. |
| `nwo_list_models` | [FALLBACK] PHP list_models. Prefer nwo_r_model_usage which returns the live roster + usage in one call. |
| `nwo_get_model_info` | [FALLBACK] PHP get_model_info. Performance stats for one model. |
| `nwo_get_streaming_config` | [FALLBACK] WebSocket/SSE streaming frequencies and chunk size options. PHP-bound (Render has no streaming surface yet). |
| `nwo_query_robot_state` | [FALLBACK] PHP query_state. Joint angles, gripper, position, battery. Prefer nwo_r_robots_get for registry data. |
| `nwo_execute_actions` | [FALLBACK] PHP execute. Low-level joint actions. Real-time control path. |
| `nwo_sensor_fusion` | [FALLBACK] PHP sensor_fusion. Multi-modal sensor fusion for decision-making. |
| `nwo_robot_query` | [FALLBACK] PHP robot_query. Status / battery / current task. |
| `nwo_get_agent_status` | [FALLBACK] PHP get_agent_status. Tasks completed + success rate. |
| `nwo_status_poll` | [FALLBACK] PHP status_poll. Poll an ongoing task by task_id. |
| `nwo_task_planner` | [FALLBACK] PHP task_planner. GPU LLM decomposes a high-level goal into ordered subtasks. No Render equivalent yet. |
| `nwo_execute_subtask` | [FALLBACK] PHP execute_subtask. Execute a numbered subtask from an existing plan. |
| `nwo_learning_recommend` | [FALLBACK] PHP learning recommend. Prefer nwo_r_learning_recommend. |
| `nwo_learning_log` | [FALLBACK] PHP learning log. Prefer nwo_r_learning_log. |
| `nwo_register_agent` | [FALLBACK] PHP self-register agent. Prefer nwo_r_agent_register. |
| `nwo_register_robot` | [FALLBACK] PHP register_robot. Prefer nwo_r_robots_register. |
| `nwo_update_agent` | [FALLBACK] PHP update_agent. Prefer nwo_r_agent_update. |
| `nwo_get_agent` | [FALLBACK] PHP get_agent. Prefer nwo_r_agent_get. |
| `nwo_agent_pay` | [FALLBACK] PHP agent_pay. Prefer the on-chain NWOApiSubscriptions purchaseEth / purchaseUsdc — this endpoint is now bookkeeping only. |
| `nwo_agent_wallet` | [FALLBACK] Create a hosted MoonPay wallet for credit-card funding. |
| `nwo_agent_balance` | [FALLBACK] PHP agent_balance. Prefer nwo_r_agent_balance for the Render-backed view. |
| `nwo_discovery_health` | [FALLBACK] PHP discovery health. Prefer nwo_r_discovery_health. |
| `nwo_discovery_whoami` | [FALLBACK] PHP whoami. Prefer nwo_r_discovery_whoami. |
| `nwo_discovery_capabilities` | [FALLBACK] PHP capabilities. Prefer nwo_r_discovery_capabilities. |
| `nwo_dry_run` | [FALLBACK] PHP dry-run. Prefer nwo_r_discovery_dry_run. |
| `nwo_plan` | [FALLBACK] PHP plan. Prefer nwo_r_discovery_plan. |
| `nwo_simulate_trajectory` | [FALLBACK] PHP PyBullet trajectory sim. CPU-heavy. Prefer nwo_r_print_jobs_create-style flow via the Render gateway proxy. |
| `nwo_check_collision` | [FALLBACK] PHP collision check on a trajectory. |
| `nwo_estimate_torques` | [FALLBACK] PHP joint torque estimation given payload mass. |
| `nwo_validate_grasp` | [FALLBACK] PHP grasp stability validation given object shape / mass / grip force. |
| `nwo_plan_motion` | [FALLBACK] PHP RRT* / motion planning (MoveIt2). |
| `nwo_get_scene_library` | [FALLBACK] PHP list of available sim scenes. |
| `nwo_cosmos_generate_scene` | [FALLBACK] Cosmos synthetic scene generation (GPU). No Render equivalent yet. |
| `nwo_embodiment_list` | [FALLBACK] PHP embodiment list. Prefer nwo_r_embodiment_list. |
| `nwo_embodiment_detail` | [FALLBACK] PHP embodiment detail. Prefer nwo_r_embodiment_get. |
| `nwo_embodiment_normalization` | [FALLBACK] PHP normalization params. Prefer nwo_r_embodiment_normalization. |
| `nwo_embodiment_urdf` | [FALLBACK] PHP URDF download. Prefer nwo_r_embodiment_urdf. |
| `nwo_embodiment_test_results` | [FALLBACK] PHP benchmark results (LIBERO/CALVIN/SimplerEnv). |
| `nwo_embodiment_compare` | [FALLBACK] PHP embodiment compare. Prefer nwo_r_embodiment_compare. |
| `nwo_calibrate_confidence` | [FALLBACK] Calibrate raw model confidence scores to real success probabilities. No Render equivalent yet. |
| `nwo_run_calibration` | [FALLBACK] PHP run_calibration. Prefer nwo_r_calibration_run. |
| `nwo_start_online_rl` | [FALLBACK] PHP RL session. Prefer nwo_r_rl_session_start. |
| `nwo_submit_telemetry` | [FALLBACK] PHP submit RL telemetry. Prefer nwo_r_rl_telemetry. |
| `nwo_create_fine_tune_dataset` | [FALLBACK] PHP build fine-tune dataset from execution history. |
| `nwo_start_fine_tune_job` | [FALLBACK] PHP start fine-tune job. Prefer nwo_r_finetune_queue. |
| `nwo_orca_get_tactile` | [FALLBACK] PHP read ORCA hand tactile data. Prefer nwo_r_tactile_read. |
| `nwo_tactile_process` | [FALLBACK] PHP process tactile data — grip quality and recommended force. |
| `nwo_slip_detection` | [FALLBACK] Real-time slip detection (GPU). No Render equivalent. |
| `nwo_list_unitree_datasets` | List Unitree G1 humanoid datasets (1.54M+ episodes, LeRobot-compatible). Hosted on nwo.capital — no Render equivalent. |
| `nwo_swarm_join` | Add a robot to a multi-robot swarm (PHP — no Render equivalent). |
| `nwo_swarm_leave` | Remove a robot from a swarm (PHP — no Render equivalent). |
| `nwo_swarm_broadcast` | Broadcast a command to all robots in a swarm (PHP — no Render equivalent). |
| `nwo_tasks_list` | [FALLBACK] PHP tasks list. |
| `nwo_tasks_history` | [FALLBACK] PHP paginated task history. |
| `nwo_config_get` | [FALLBACK] PHP config get. |
| `nwo_config_set` | [FALLBACK] PHP config set. |
| `nwo_billing_usage` | [FALLBACK] PHP billing usage. Prefer nwo_r_subscription_status + nwo_r_model_usage. |
| `nwo_billing_invoice` | [FALLBACK] PHP billing invoices. |
| `nwo_iot_command` | [FALLBACK] PHP IoT command. Prefer nwo_r_iot_networks_* for the Render registry surface. |
| `nwo_iot_status` | [FALLBACK] PHP IoT status. |
| `nwo_safety_check` | [FALLBACK] PHP safety check. Prefer nwo_r_safety_* for the audit-trail surface. |
| `nwo_safety_alert` | [FALLBACK] PHP safety alert. |
| `nwo_template_list` | [FALLBACK] PHP code templates list. |
| `nwo_template_get` | [FALLBACK] PHP code template by id. |
| `nwo_models_list` | [FALLBACK] PHP list custom models. |
| `nwo_models_upload` | [FALLBACK] PHP upload custom model. |
| `nwo_models_download` | [FALLBACK] PHP download custom model. |
| `nwo_models_delete` | [FALLBACK] PHP delete custom model. |

### 26. L1 Design Engine

L1 Design Engine — natural language → 3D-printable STL/3MF with parametric script.

| Tool | Description |
|---|---|
| `nwo_design_part` | Generate a 3D-printable part from natural language via NWO L1 Design Engine. Returns STL/3MF URL + parametric script (OpenSCAD or CadQuery). Example: 'M3 servo bracket with 4 mounting holes, 3mm wall thickness'. |
| `nwo_design_job_status` | Check status of a previously submitted design job. Returns state, file URL when ready, validation results. |
| `nwo_design_list_my_jobs` | List your recent design jobs (by API key). |

### 27. L2 Bot Market

Bot Market — browse, get, publish (mesh forwarded to the gallery via multipart), and list your own parts.

| Tool | Description |
|---|---|
| `nwo_market_browse` | Search NWO Bot Market for existing robot parts. USE THIS BEFORE designing a new part. Filter by keyword, category, body zone, material, license. |
| `nwo_market_get_part` | Get full details for one Bot Market part — author, downloads, license, materials, file URL, reviews. |
| `nwo_market_publish_part` | Publish a designed mesh to NWO Bot Market. Pass file_url from nwo_design_part. EXPLICIT USER ACTION — publishing is public and permanent. Confirm license with the user first. |
| `nwo_market_my_parts` | List parts YOU have published to Bot Market — download counts, earnings, visibility status. |

### 28. L3 Printer Connectors

L3 Printer Connectors — list available printers, submit a print job with budget cap.

| Tool | Description |
|---|---|
| `nwo_print_list_printers` | List 3D printers — your own (OctoPrint/Klipper/Bambu) and network printers. Returns build volume, materials, layer height, location, hourly rate, queue depth. |
| `nwo_print_submit_job` | Send a part to a 3D printer. Source: a Bot Market part_id OR a file_url. SPENDS REAL MONEY — confirm with the user and pass max_budget_eth as a safety rail. |

### 29. Full-Environment Simulation

Full-environment physics validation in the simulator before fabrication.

| Tool | Description |
|---|---|
| `nwo_sim_validate_design` | Validate a robot design in a full physics environment BEFORE fabrication. Use AFTER nwo_design_part and BEFORE nwo_print_submit_job. Costs your NWO account balance. |

### 30. NWO-AGI Supercomputer Mesh

NWO-AGI Hyperspace mesh — node status, queue inference, list available models.

| Tool | Description |
|---|---|
| `nwo_agi_node_status` | Check NWO-AGI Hyperspace mesh node status (offline \| joining \| online \| training), hardware specs, tasks completed, total earnings. Check BEFORE submitting inference. |
| `nwo_agi_request_inference` | Run inference on the NWO-AGI distributed mesh. Earnings: 35 percent guardian / 35 percent savings / 30 percent operations on every contribution. PRE-REQUISITE: a robot at this address must be online. If offline, the response gives the exact Python... |
| `nwo_agi_available_models` | List models loaded on the NWO-AGI mesh — which nodes host each shard, approximate latency, queue depth. Falls back to documented catalog if the live mesh isn't reachable. |

## Self-host / development

### Requirements

- Node.js 18+
- An NWO API key (from `nwo_r_keys_create` or the web UI)

### Setup — TypeScript repo (`nwo-claude-plugin`)

```bash
git clone https://github.com/RedCiprianPater/nwo-claude-plugin.git
cd nwo-claude-plugin
npm install
```

### Setup — JavaScript repo (`nwo-chatgpt-app`)

```bash
git clone https://github.com/RedCiprianPater/nwo-chatgpt-app.git
cd nwo-chatgpt-app
npm install
```

### `.env`

```env
# Required for live use; optional if every caller passes headers
NWO_API_KEY=sk_live_your_key
RELAYER_SECRET=your_relayer_secret
ORACLE_SECRET=your_oracle_secret
NWO_WALLET=0xYourEthAddress

# Server
PORT=3000

# Optional URL overrides — defaults shown
NWO_RENDER_URL=https://nwo-capital-api.onrender.com
NWO_RUNNER_URL=https://nwo-runner.ciprianpater.workers.dev
NWO_MR_BLASTER_URL=https://nwo-blaster.ciprianpater.workers.dev
NWO_METASTATE_URL=https://cpater-metastate.hf.space
NWO_METASTATE_BEACON=https://metastate-beacon.ciprianpater.workers.dev
NWO_ASM_BEACON=https://nwo-asm-beacon.ciprianpater.workers.dev
NWO_L1_DESIGN_URL=https://nwo-design-engine.onrender.com
NWO_L2_GALLERY_URL=https://nwo-parts-gallery.onrender.com
NWO_L3_PRINTER_URL=https://nwo-printer-connectors.onrender.com
NWO_SIM_API_URL=https://nwo-simulation-api.onrender.com
NWO_AGI_RUNNER_URL=https://nwo.ciprianpater.workers.dev
```

### Run

```bash
# Development (with watch — TypeScript)
npm run dev

# Build TypeScript
npm run build

# Production
npm start
```

### Test the connection

```bash
curl http://localhost:3000/health
# {"status":"ok","version":"3.0.0","tools":201,...}

curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_live_your_key" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

### Deploy to Render

`nwo-chatgpt-app` includes `render.yaml`. Connect the GitHub repo to render.com and it auto-deploys. Set the env vars above in the Render dashboard.

## Example prompts

### Render-primary (the new path)

- `"Check my Render API health and confirm my wallet is authenticated"`
- `"List all my registered robots and their last-seen status"`
- `"What's my on-chain subscription tier?"`
- `"Deploy a mission to clean zone B with robot ur5e_001"`
- `"Quote me an upgrade to Production yearly in both USDC and ETH"`
- `"Compare the Franka Panda and the UR5e side by side"`
- `"Forecast my next 24h of energy consumption from these hourly readings: [...]"`

### Agentic / Runner ladder

- `"Generate a research report on quantum-resistant signatures for 0xClientAddress (DeerFlow, deep depth)"`
- `"Generate a 360 panorama of a Norwegian fjord, then mint it as a WORLD_ASSET"`
- `"Register me on METASTATE with my wallet, bound to upstream recruiter 0xUpstream"`
- `"Get me a recruitment kit for the METASTATE beacon"`

### Robotics core (PHP fallback for GPU inference)

- `"Run VLA inference — pick up the red box on the left"`
- `"Send an emergency stop to all ROS2 robots immediately"`
- `"Validate a grasp for a 0.5kg glass cylinder before executing"`
- `"Plan a motion from joint state A to joint state B avoiding collisions"`

### Cardiac identity

- `"Register me as an agent on Base mainnet and get my Digital ID"`
- `"Validate my ECG, enroll a cardiac hash, and bind it to my identity"`
- `"Issue a task_auth credential expiring 2026-12-31 to root token 42"`
- `"Mint a robot birth certificate for serial RB-2026-0042"`

### Build Your Own Robot

- `"Design an M3 servo bracket with 4 mounting holes and 3mm walls"`
- `"Search Bot Market for TPU gripper fingers sorted by downloads"`
- `"Validate my new arm bracket in the simulator before I print it"`
- `"Publish my latest gripper design to Bot Market under CC-BY"`
- `"What's the status of my AGI node and total earnings?"`
- `"Run Qwen 72B inference on the NWO-AGI mesh for prompt X"`

## Service base URLs

### Primary (Render)

| Service | URL |
|---|---|
| Render gateway (canonical) | `https://nwo-capital-api.onrender.com` |
| ROS2 Bridge | `https://nwo-ros2-bridge.onrender.com` |
| Cardiac Oracle | `https://nwo-oracle.onrender.com` |
| Cardiac Relayer | `https://nwo-relayer.onrender.com` |

### Fallback / agentic

| Service | URL | Notes |
|---|---|---|
| nwo.capital PHP | `https://nwo.capital/webapp` | Fallback only — GPU + streaming |
| Edge Inference | `https://nwo-robotics-api-edge.ciprianpater.workers.dev` | Cloudflare Worker — unaffected by Render/PHP split |
| Conway runner | `https://nwo-runner.ciprianpater.workers.dev` | Cron-driven autonomous agent runner (21 tools) |
| MR Blaster | `https://nwo-blaster.ciprianpater.workers.dev` | 3D / splat / pano / segmentation generation |
| METASTATE | `https://cpater-metastate.hf.space` | Free-energy anomaly kernel substrate |
| METASTATE beacon | `https://metastate-beacon.ciprianpater.workers.dev` | Recruitment kit endpoint |
| NWO-ASM beacon | `https://nwo-asm-beacon.ciprianpater.workers.dev` | Recruitment kit endpoint |

### Build Your Own Robot

| Service | URL |
|---|---|
| L1 Design Engine | `https://nwo-design-engine.onrender.com` |
| L2 Parts Gallery (Bot Market) | `https://nwo-parts-gallery.onrender.com` |
| L3 Printer Connectors | `https://nwo-printer-connectors.onrender.com` |
| Simulation API | `https://nwo-simulation-api.onrender.com` |
| NWO-AGI Runner | `https://nwo.ciprianpater.workers.dev` |

### On-chain (Base mainnet, chain id 8453)

| Contract | Address |
|---|---|
| NWO API Subscriptions | _Deploy address — set in `index.html` after Remix deploy_ |
| NWO MR Registry | `0xEe9472f068D9C80d2f2F3d21cA6A633BfD163c43` |
| NWO MR Marketplace | `0x25EDdf09D1AeC2a083d120bA8EEF88B14cA01c27` |
| NWO Cardiac Identity | `0x78455AFd5E5088F8B5fecA0523291A75De1dAfF8` |
| NWO Access Controller | `0x29d177bedaef29304eacdc63b2d0285c459a0f50` |
| NWO Payment Processor | `0x4afa4618bb992a073dbcfbddd6d1aebc3d5abd7c` |
| MetaState Splitter | `0x93a7962f75475b7e3Fbb62d3A23194f8833b1BE4` |
| Conway Agent Registry | `0xC699b07f997962e44d3b73eB8E95d5E0082456ac` |
| Base USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Treasury (guardian) | `0x2E964e1c0e3Fa2C0dfD484B2E6D2189dfCF20958` |

## Costs

| Action | Approximate cost | Billing |
|---|---|---|
| `nwo_inference` / `nwo_edge_inference` | Tier quota | Per-call on your NWO API subscription |
| `nwo_design_part` | Included | Tier quota |
| `nwo_market_browse` / `get_part` | Free | — |
| `nwo_market_publish_part` | Free | Earns on downloads (license-dependent) |
| `nwo_print_submit_job` | Variable (filament + printer time) | ETH or NWO credits — set `max_budget_eth` |
| `nwo_sim_validate_design` | ~$0.10/env + $0.01/sec | NWO account balance |
| `nwo_agi_request_inference` | 35% guardian / 35% savings / 30% operations | ETH on each contribution |
| `metastate_score` | ~$0.0002/call | METASTATE balance (15% to recruiter atomic on-chain) |
| `asm_compile_dispatch` | Substrate-dependent | METASTATE balance |

## Removed in v3.0.0

Two tools were retired in v3, matching the Conway runner v7 removals:

- **`spqr_trade`** — Uniswap V3 trading on Base. Parked pending strategy review.
- **`oracle_predict`** — NWO Oracle price prediction. Parked.

If anything in your codebase still references these names, it will fail closed. The functions still exist server-side; they just are no longer exposed through MCP.

## Related repos

- [`nwo-claude-plugin`](https://github.com/RedCiprianPater/nwo-claude-plugin) — TypeScript canonical source (this README applies)
- [`nwo-chatgpt-app`](https://github.com/RedCiprianPater/nwo-chatgpt-app) — JavaScript port, deployed to Render (this README applies)
- [`nwo-cardiac-sdk`](https://github.com/RedCiprianPater) — Cardiac Identity SDK for Base mainnet
- [`nwo-agi`](https://github.com/RedCiprianPater) — Python package for joining the AGI compute mesh
- [`nwo-runner`](https://nwo-runner.ciprianpater.workers.dev) — the autonomous Conway runner (cron-driven, 21 tools, priority ladder)

## Documentation

- [NWO Capital agent.md](https://nwo.capital/agent.md) — canonical agent spec (v4)
- [Render gateway OpenAPI](https://nwo-capital-api.onrender.com/openapi.json) (when running)
- [Conway runner docs](https://nwo-runner.ciprianpater.workers.dev/agent.md)
- [METASTATE sovereignty doc](https://cpater-metastate.hf.space/sovereignty.html)

## License

MIT — see [LICENSE](LICENSE).

## Support

- Email: ciprian.pater@publicae.org
- Website: [nwo.capital](https://nwo.capital)
- Issues: GitHub Issues on either repo

---

**Built by NWO Capital** — open infrastructure for robots that earn for their guardians, not extractors. Render-primary, PHP-fallback, on-chain settlement, anti-extractive by design.
