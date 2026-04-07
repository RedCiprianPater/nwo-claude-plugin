# Quick Start Guide

Get started with NWO Robotics Claude Plugin in 5 minutes.

## Prerequisites

- Claude Desktop or Claude Code installed
- Node.js 18+ (for development)
- NWO Robotics API key

## Step 1: Get Your API Key

1. Visit [nwo.capital/api-key.php](https://nwo.capital/webapp/api-key.php)
2. Connect your wallet
3. Copy your API key

## Step 2: Install the Plugin

### Claude Desktop

1. Open Claude Desktop
2. Go to Settings → Plugins
3. Click "Install Plugin"
4. Select the `nwo-claude-plugin` folder

### Claude Code

```bash
claude plugins install /path/to/nwo-claude-plugin
```

## Step 3: Configure

When prompted, enter:
- **API Key**: Your key from step 1
- **Base URL**: `https://nwo.capital/webapp` (default)
- **Default Robot ID**: (optional) Your primary robot

## Step 4: Start Using

Try these commands:

```
"List all available robots"
"Query the status of robot unitree-001"
"Send robot arm-001 to pick up the box"
"Plan a navigation task through the warehouse"
```

## Example Conversations

### Basic Robot Control

**You:** "Move the robot to position x:10, y:20"

**Claude:** I'll send that command to your robot...

### Task Planning

**You:** "Plan a task to sort items by color"

**Claude:** I'll break this down into steps...

### Swarm Control

**You:** "Have all robots in zone A move to charging stations"

**Claude:** Broadcasting command to swarm...

## Troubleshooting

### "API Key Invalid"
- Verify your key at nwo.capital/api-key.php
- Check that the key is entered correctly

### "Robot Not Found"
- Verify the robot ID is correct
- Check that the robot is online

### "Rate Limit Exceeded"
- Upgrade your tier at nwo.capital/api-key.php
- Wait for quota reset

## Next Steps

- Read the [full documentation](README.md)
- Check [advanced examples](examples/advanced.md)
- Review [API endpoints](API_ENDPOINTS.md)

## Support

- Email: ciprian.pater@publicae.org
- Issues: [GitHub](https://github.com/RedCiprianPater/nwo-claude-plugin/issues)