# Elastic Git Sync

A powerful self-hosted tool for synchronizing Elastic Security detection rules with Git repositories. Built with PocketBase and SvelteKit, it provides a beautiful web interface for managing bidirectional sync between Elastic Security and your version control system.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)

## Features

- **Bidirectional Sync**: Synchronize rules from Elastic to Git and vice versa
- **Multi-Environment Support**: Manage test, staging, and production environments
- **GitLab Integration**: Create merge requests directly from the UI for approval workflows
- **Conflict Resolution**: Visual conflict resolution interface when rules differ
- **Scheduled Syncs**: Automatic synchronization at configurable intervals
- **Rule Validation**: Validate rules before committing to Git or deploying to Elastic
- **Audit Logging**: Complete history of all sync operations
- **Multiple Spaces**: Support for multiple Elastic spaces and Git repositories
- **Beautiful Dashboard**: Clean, modern UI built with Tailwind CSS
- **Self-Hosted**: Complete control over your data and infrastructure

## Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │         │                 │
│  Elastic        │◄───────►│  Elastic Git    │◄───────►│  Git            │
│  Security       │         │  Sync           │         │  Repository     │
│                 │         │  (PocketBase +  │         │                 │
└─────────────────┘         │   SvelteKit)    │         └─────────────────┘
                            │                 │
                            └─────────────────┘
```

## Prerequisites

- Docker and Docker Compose
- Elastic Security instance with API access
- Git repository (GitLab, GitHub, or generic)
- Network access between the tool, Elastic, and Git

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/elastic-git-sync.git
cd elastic-git-sync
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set your encryption key:

```env
ENCRYPTION_KEY=your-secure-random-string-here
PUBLIC_POCKETBASE_URL=http://localhost:8090
ORIGIN=http://localhost:3000
```

### 3. Start the Application

```bash
docker-compose up -d
```

The application will be available at:
- Frontend: http://localhost:3000
- PocketBase Admin: http://localhost:8090/_/

### 4. Initial Setup

1. Open http://localhost:3000 in your browser
2. Navigate to Settings → Elastic Instances
3. Add your Elastic instance with API key
4. Navigate to Settings → Git Repositories
5. Add your Git repository with access token
6. Create a new Project linking Elastic space with Git repo
7. Trigger your first sync!

## Configuration

### Elastic API Key

Create an API key in Kibana:
1. Go to Stack Management → Security → API Keys
2. Click "Create API Key"
3. Grant necessary permissions for detection rules
4. Copy the API key

### Git Access Token

#### GitLab
1. Go to Settings → Access Tokens
2. Create a project access token with:
   - `api` scope
   - `write_repository` scope
3. Copy the token

#### GitHub
1. Go to Settings → Developer Settings → Personal Access Tokens
2. Create a token with `repo` scope
3. Copy the token

### Project Configuration

When creating a project, you can configure:
- **Elastic Space**: Which Kibana space to sync
- **Git Path**: Subdirectory in the repo for rules (e.g., `rules/production/`)
- **Auto-sync**: Enable automatic synchronization
- **Sync Interval**: How often to sync (in minutes)

## Usage

### Manual Sync

1. Navigate to Projects
2. Click "Sync Now" on your project
3. Monitor progress in the Dashboard or History page

### Scheduled Sync

1. Edit your project
2. Enable "Auto Sync"
3. Set the interval (minimum 5 minutes)
4. Rules will sync automatically

### Creating Merge Requests

For production deployments:
1. Sync rules to a test branch
2. Review changes in the diff viewer
3. Click "Create Merge Request"
4. Add title and description
5. Submit to GitLab/GitHub for approval
6. Merge when approved

### Conflict Resolution

When conflicts occur:
1. Navigate to Conflicts page
2. Click "Resolve" on the conflict
3. Compare Elastic vs Git versions side-by-side
4. Choose which version to keep
5. Conflict is resolved and sync continues

## Rule Storage Format

Rules are stored as individual JSON files in Git:

```
repository/
├── rules/
│   ├── rule-123-suspicious-powershell.json
│   ├── rule-456-malware-detection.json
│   └── rule-789-credential-access.json
```

Each file contains the complete rule definition from Elastic Security.

## Multi-Environment Workflow

Recommended workflow for managing rules across environments:

```
Test Environment (Elastic Space: test)
    ↓ Sync to Git
Git Branch: test
    ↓ Create Merge Request
Git Branch: main (after review)
    ↓ Sync to Elastic
Production Environment (Elastic Space: production)
```

## API Endpoints

PocketBase exposes custom API endpoints:

- `POST /api/connection/test` - Test Elastic/Git connection
- `POST /api/sync/trigger` - Trigger a sync job
- `POST /api/conflict/resolve` - Resolve a conflict
- `POST /api/merge-request/create` - Create a merge request
- `GET /api/rules/diff/:projectId` - Get rule diffs
- `GET /api/dashboard/stats` - Get dashboard statistics

## Database Schema

The application uses PocketBase with the following collections:
- `elastic_instances` - Elastic cluster configurations
- `git_repositories` - Git repository configurations
- `projects` - Links between Elastic spaces and Git repos
- `environments` - Environment configurations (test/prod)
- `sync_jobs` - Sync operation history
- `rules_cache` - Cached rule metadata
- `conflicts` - Conflict tracking

## Development

### Local Development Setup

```bash
# Backend (PocketBase)
cd backend
./pocketbase serve

# Frontend (SvelteKit)
cd frontend
npm install
npm run dev
```

### Project Structure

```
elastic-git-sync/
├── backend/
│   ├── pb_migrations/     # Database migrations
│   ├── pb_hooks/          # PocketBase hooks (API logic)
│   └── pb_data/           # Runtime data (gitignored)
├── frontend/
│   ├── src/
│   │   ├── routes/        # SvelteKit pages
│   │   └── lib/           # Components and utilities
│   └── static/            # Static assets
├── shared/
│   └── types.ts           # Shared TypeScript types
└── docker-compose.yml
```

## Troubleshooting

### Connection Issues

**Elastic connection fails:**
- Verify API key has correct permissions
- Check network connectivity
- Ensure Elastic URL is correct (include protocol)

**Git connection fails:**
- Verify access token is valid
- Check repository URL format
- Ensure token has necessary scopes

### Sync Issues

**Rules not syncing:**
- Check sync job status in History page
- Verify Elastic space name is correct
- Ensure Git branch exists

**Conflicts not resolving:**
- Make sure you selected a resolution
- Check if sync job completed after resolution
- Try re-syncing the project

### Performance

**Slow syncs:**
- Reduce number of rules synced at once
- Increase sync interval
- Check network latency to Elastic/Git

## Security Considerations

- Store API keys and tokens securely (use environment variables)
- Run behind a reverse proxy with HTTPS
- Restrict network access to trusted IPs
- Regularly rotate API keys and tokens
- Use read-only tokens where possible
- Enable audit logging in PocketBase

## Roadmap

- [ ] Support for GitHub and generic Git providers (MR creation)
- [ ] Advanced diff viewer with syntax highlighting
- [ ] Bulk rule operations
- [ ] Rule templates library
- [ ] Webhook support for automatic syncs
- [ ] Slack/Teams notifications
- [ ] Rule testing framework
- [ ] Multi-user support with RBAC
- [ ] Export/import configurations

## Contributing

Contributions are welcome! Please follow these guidelines:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or contributions:
- GitHub Issues: https://github.com/yourusername/elastic-git-sync/issues
- Discussions: https://github.com/yourusername/elastic-git-sync/discussions

## Acknowledgments

Built with:
- [PocketBase](https://pocketbase.io/) - Backend and database
- [SvelteKit](https://kit.svelte.dev/) - Frontend framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Lucide Icons](https://lucide.dev/) - Icons

---

Made with ❤️ for the security community
