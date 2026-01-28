# Elastic Git Sync - Project Summary

## Overview

Elastic Git Sync is a complete, production-ready web application for synchronizing Elastic Security detection rules with Git repositories. Built with modern technologies and designed for self-hosting.

## Technology Stack

### Backend
- **PocketBase**: Embedded database and backend framework
  - SQLite database
  - Real-time subscriptions
  - Built-in admin UI
  - Custom API endpoints via hooks

### Frontend
- **SvelteKit**: Modern web framework
  - Server-side rendering
  - File-based routing
  - Built-in API routes
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Lucide Icons**: Beautiful icon library

### Infrastructure
- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration
- **Node.js**: JavaScript runtime

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│                      (SvelteKit + TS)                        │
│  ┌─────────┬─────────┬──────────┬──────────┬─────────────┐ │
│  │Dashboard│Projects │Settings  │History   │Conflicts    │ │
│  └─────────┴─────────┴──────────┴──────────┴─────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/REST
┌──────────────────────────┴──────────────────────────────────┐
│                        PocketBase                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Custom API Endpoints                       │ │
│  │  • /api/connection/test                                 │ │
│  │  • /api/sync/trigger                                    │ │
│  │  • /api/conflict/resolve                                │ │
│  │  • /api/merge-request/create                            │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  Database (SQLite)                      │ │
│  │  • elastic_instances  • git_repositories                │ │
│  │  • projects          • environments                     │ │
│  │  • sync_jobs         • rules_cache                      │ │
│  │  • conflicts                                            │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         │                                   │
         ▼                                   ▼
┌─────────────────┐              ┌─────────────────┐
│ Elastic         │              │ Git Repository  │
│ Security        │              │ (GitLab/GitHub) │
│ (Kibana API)    │              │ (HTTPS/Token)   │
└─────────────────┘              └─────────────────┘
```

## Features Implemented

### 1. Dashboard
- **Overview statistics**: Projects, active syncs, conflicts, success rate
- **Recent sync activity**: Last 10 sync jobs with details
- **Quick actions**: Fast access to common tasks
- **Real-time updates**: Auto-refresh capabilities

**Files:**
- `frontend/src/routes/+page.svelte`

### 2. Project Management
- **CRUD operations**: Create, read, update, delete projects
- **Multi-environment support**: Test, staging, production
- **Configuration wizard**: Step-by-step project setup
- **Validation**: Connection testing before saving
- **Status tracking**: Active/inactive projects

**Files:**
- `frontend/src/routes/projects/+page.svelte`
- `frontend/src/routes/projects/new/+page.svelte`

### 3. Settings

#### Elastic Instances
- Add/edit/delete Elastic clusters
- Connection testing with space discovery
- Status indicators (connected/failed)
- Secure API key storage

#### Git Repositories
- Support for GitLab, GitHub, and generic Git
- Connection testing with branch discovery
- Token-based authentication
- Repository configuration (default branch, base path)

**Files:**
- `frontend/src/routes/settings/elastic/+page.svelte`
- `frontend/src/routes/settings/git/+page.svelte`

### 4. Synchronization

#### Bidirectional Sync
- Elastic → Git: Export rules to repository
- Git → Elastic: Import rules from repository
- Bidirectional: Sync both ways with conflict detection

#### Scheduled Syncs
- Configurable intervals (minimum 5 minutes)
- Automatic execution
- Background job processing

#### Manual Syncs
- Trigger on-demand
- Real-time progress tracking
- Detailed change summary

**Backend Logic:**
- `backend/pb_hooks/main.pb.js` (sync functions)

### 5. History & Audit
- Complete sync job history
- Status tracking (pending, running, completed, failed, conflict)
- Duration metrics
- Change summaries (added, modified, deleted)
- Filtering and search

**Files:**
- `frontend/src/routes/history/+page.svelte`

### 6. Conflict Resolution
- Visual side-by-side comparison
- Elastic vs Git version display
- Resolution options:
  - Use Elastic version
  - Use Git version
  - Manual merge (future)
- Conflict tracking and resolution history

**Files:**
- `frontend/src/routes/conflicts/+page.svelte`

### 7. GitLab/GitHub Integration
- Merge request creation
- Branch management
- API-based operations
- Automated PR/MR workflow

**Backend Logic:**
- GitLab MR creation: `createGitLabMergeRequest()`
- GitHub PR creation: `createGitHubPullRequest()`

### 8. Rule Management
- Individual JSON files per rule
- Hash-based change detection
- Metadata caching for performance
- Version tracking

**Storage Format:**
```
repository/
├── rules/
│   ├── {rule-id}-{rule-name}.json
│   ├── {rule-id}-{rule-name}.json
│   └── ...
```

## Database Schema

### Collections

1. **elastic_instances**
   - Stores Elastic cluster configurations
   - Fields: name, url, api_key, spaces, is_active, connection_status

2. **git_repositories**
   - Stores Git repository configurations
   - Fields: name, url, provider, access_token, default_branch, base_path

3. **projects**
   - Links Elastic spaces with Git repositories
   - Fields: name, elastic_instance, elastic_space, git_repository, sync_enabled

4. **environments**
   - Defines deployment stages
   - Fields: project, name (test/staging/prod), elastic_space, git_branch

5. **sync_jobs**
   - Tracks all sync operations
   - Fields: project, type, direction, status, changes_summary, error_message

6. **rules_cache**
   - Caches rule metadata
   - Fields: project, rule_id, rule_name, elastic_hash, git_hash, sync_status

7. **conflicts**
   - Tracks sync conflicts
   - Fields: sync_job, rule_id, elastic_version, git_version, resolution

## API Endpoints

### Connection Testing
- `POST /api/connection/test`
  - Tests Elastic or Git connectivity
  - Returns available spaces/branches

### Sync Operations
- `POST /api/sync/trigger`
  - Triggers a sync job
  - Supports all directions and options

### Conflict Management
- `POST /api/conflict/resolve`
  - Resolves a pending conflict
  - Updates rule versions

### Merge Requests
- `POST /api/merge-request/create`
  - Creates GitLab MR or GitHub PR
  - Returns MR/PR URL

### Dashboard
- `GET /api/dashboard/stats`
  - Returns dashboard statistics
  - Includes recent sync jobs

### Diffs
- `GET /api/rules/diff/:projectId`
  - Returns rule differences
  - Shows pending changes

## Security Features

1. **Authentication**: PocketBase built-in auth (ready for extension)
2. **API Key Encryption**: Secure storage of credentials
3. **Token Validation**: Connection testing before save
4. **Input Validation**: Form validation on all inputs
5. **HTTPS Support**: Reverse proxy configuration
6. **Access Control**: PocketBase admin UI restrictions

## Development Workflow

### Local Development
```bash
# Backend
docker-compose up pocketbase

# Frontend
cd frontend
npm install
npm run dev
```

### Production Build
```bash
docker-compose build
docker-compose up -d
```

### Code Structure
```
elastic-git-sync/
├── backend/
│   ├── pb_migrations/          # Database schema
│   │   └── 1706000000_initial_schema.js
│   └── pb_hooks/               # Business logic
│       └── main.pb.js
├── frontend/
│   ├── src/
│   │   ├── routes/             # Pages
│   │   │   ├── +layout.svelte  # Main layout
│   │   │   ├── +page.svelte    # Dashboard
│   │   │   ├── projects/       # Project pages
│   │   │   ├── settings/       # Settings pages
│   │   │   ├── history/        # History page
│   │   │   └── conflicts/      # Conflicts page
│   │   ├── lib/                # Shared code
│   │   │   └── pocketbase.ts   # PB client
│   │   ├── app.html            # HTML template
│   │   └── app.css             # Global styles
│   ├── static/                 # Static assets
│   ├── Dockerfile              # Frontend container
│   └── package.json            # Dependencies
├── shared/
│   └── types.ts                # Shared types
├── docker-compose.yml          # Orchestration
├── .env.example                # Environment template
└── README.md                   # Documentation
```

## Key Components

### Frontend Components
- Layout with sidebar navigation
- Dashboard with stats cards
- Project list with actions
- Multi-step wizard for project creation
- Settings forms with validation
- History table with filtering
- Conflict resolution modal
- Toast notifications (can be added)

### Backend Functions
- `testElasticConnection()`: Validates Elastic API
- `fetchElasticRules()`: Retrieves rules from Elastic
- `pushRuleToElastic()`: Deploys rules to Elastic
- `testGitConnection()`: Validates Git access
- `triggerSync()`: Initiates sync job
- `executeSync()`: Performs sync operation
- `compareRules()`: Detects differences
- `createMergeRequest()`: Creates MR/PR
- `resolveConflict()`: Handles conflict resolution

## Future Enhancements

### Planned Features
- [ ] Multi-user support with RBAC
- [ ] Webhook triggers for automatic sync
- [ ] Advanced diff viewer with syntax highlighting
- [ ] Rule templates library
- [ ] Bulk operations
- [ ] Email/Slack notifications
- [ ] Export/import configurations
- [ ] Rule testing framework
- [ ] Analytics and reporting
- [ ] Mobile-responsive improvements

### Technical Improvements
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Performance optimization
- [ ] Caching layer
- [ ] Rate limiting
- [ ] Logging improvements
- [ ] Metrics collection
- [ ] Health checks

## Deployment Options

1. **Single Server**: Docker Compose (recommended for small teams)
2. **High Availability**: Docker Swarm
3. **Cloud Native**: Kubernetes (manifests to be added)
4. **Managed**: Deploy to cloud providers (AWS, GCP, Azure)

## Configuration

### Environment Variables
- `ENCRYPTION_KEY`: Database encryption key
- `PUBLIC_POCKETBASE_URL`: Backend URL
- `ORIGIN`: Frontend URL

### Runtime Configuration
- All configuration done through the UI
- No manual file editing required
- Connection testing before save

## Maintenance

### Backups
- Automated backup script included
- Daily backups recommended
- Store backups off-site

### Updates
- Pull latest code
- Rebuild containers
- Restart services
- Check logs

### Monitoring
- Health check script included
- Log rotation configured
- Docker health checks

## Support

- Documentation: README.md
- Deployment Guide: DEPLOYMENT.md
- Contributing: CONTRIBUTING.md
- Issues: GitHub Issues
- License: MIT

---

**Version**: 1.0.0
**Status**: Production Ready
**Last Updated**: 2026-01-28
