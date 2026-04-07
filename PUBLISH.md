# Publishing to GitHub

Guide for publishing the NWO Robotics Claude Plugin to GitHub.

## Repository Setup

### 1. Create Repository

Go to: https://github.com/new

- Repository name: `nwo-claude-plugin`
- Visibility: Public
- Add README: No (we have our own)
- Add .gitignore: No (we have our own)
- License: No (we have our own)

### 2. Push Your Code

```bash
cd /path/to/nwo-claude-plugin

git init
git add -A
git commit -m "Initial commit: NWO Robotics Claude Plugin v1.0.0"

git remote add origin https://github.com/RedCiprianPater/nwo-claude-plugin.git
git branch -M main
git push -u origin main
```

## Repository Structure

```
nwo-claude-plugin/
├── claude.json          # Main Claude manifest
├── ai-plugin.json       # OpenAI compatibility
├── openapi.yaml         # API specification
├── package.json         # NPM config
├── tsconfig.json        # TypeScript config
├── README.md            # Main documentation
├── LICENSE              # MIT license
├── QUICKSTART.md        # Quick start guide
├── SUBMISSION.md        # Marketplace submission
├── PUBLISH.md           # This file
├── MANIFEST.md          # File listing
├── API_ENDPOINTS.md     # Complete API list
├── ENDPOINT_COUNT.txt   # Summary count
├── .gitignore           # Git ignore rules
├── src/
│   └── index.ts         # MCP server implementation
├── examples/
│   ├── basic.md         # Basic examples
│   └── advanced.md      # Advanced examples
└── assets/
    ├── README.md        # Asset guidelines
    └── icon.png         # Plugin icon (128x128)
```

## Creating Releases

### 1. Tag a Version

```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

### 2. Create GitHub Release

1. Go to: https://github.com/RedCiprianPater/nwo-claude-plugin/releases
2. Click "Draft a new release"
3. Choose tag: `v1.0.0`
4. Title: `NWO Robotics Claude Plugin v1.0.0`
5. Description: Copy from CHANGELOG
6. Click "Publish release"

## Keeping Repository Updated

### Regular Updates

```bash
git add -A
git commit -m "Description of changes"
git push origin main
```

### Version Bumps

Update version in:
- `claude.json`
- `package.json`
- `src/index.ts`

Then:
```bash
git add -A
git commit -m "Bump version to 1.1.0"
git tag -a v1.1.0 -m "Version 1.1.0"
git push origin main --tags
```

## Best Practices

1. **Commit Messages**: Use clear, descriptive messages
2. **Branches**: Use feature branches for major changes
3. **Issues**: Enable GitHub Issues for bug reports
4. **Wiki**: Consider enabling wiki for extended docs
5. **Actions**: Set up CI/CD for automated testing

## Troubleshooting

### Push Rejected

```bash
git pull origin main --rebase
git push origin main
```

### Large Files

If icon.png is too large:
```bash
git rm --cached assets/icon.png
# Optimize the image, then:
git add assets/icon.png
```

### Authentication

Use personal access token:
```bash
git remote set-url origin https://TOKEN@github.com/RedCiprianPater/nwo-claude-plugin.git
```

## Support

- GitHub Docs: https://docs.github.com
- Git Docs: https://git-scm.com/doc
- Email: ciprian.pater@publicae.org