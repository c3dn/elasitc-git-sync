# Quick Start Guide

Get Elastic Git Sync up and running in 5 minutes!

## Prerequisites

- Docker and Docker Compose installed
- Elastic Security instance with API key
- Git repository with access token

## Installation

### Linux/Mac

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/elastic-git-sync.git
cd elastic-git-sync

# 2. Run the startup script
./start.sh
```

### Windows

```cmd
# 1. Clone the repository
git clone https://github.com/yourusername/elastic-git-sync.git
cd elastic-git-sync

# 2. Run the startup script
start.bat
```

### Manual Setup

```bash
# 1. Create environment file
cp .env.example .env

# 2. Edit .env and set ENCRYPTION_KEY
nano .env

# 3. Start services
docker-compose up -d

# 4. Check status
docker-compose ps
```

## Initial Configuration

### 1. Access the Application

Open your browser and navigate to: **http://localhost:3000**

### 2. Add Elastic Instance

1. Click **Settings** in the sidebar
2. Go to **Elastic Instances** tab
3. Click **Add Elastic Instance**
4. Fill in the form:
   - **Name**: Production Elastic
   - **URL**: https://your-elastic-instance.com
   - **API Key**: your-api-key-here
5. Click **Test Connection** to verify
6. Click **Save**

#### Getting an Elastic API Key

In Kibana:
1. Go to **Stack Management** → **Security** → **API Keys**
2. Click **Create API Key**
3. Name it "Elastic Git Sync"
4. Set appropriate permissions for detection rules
5. Click **Create API Key**
6. Copy the key (you won't see it again!)

### 3. Add Git Repository

1. Stay in **Settings**
2. Go to **Git Repositories** tab
3. Click **Add Git Repository**
4. Fill in the form:
   - **Name**: Security Rules Repo
   - **Provider**: GitLab (or GitHub/Generic)
   - **URL**: https://gitlab.com/your-org/security-rules
   - **Access Token**: your-git-token-here
   - **Default Branch**: main
   - **Base Path**: rules/ (optional)
5. Click **Test Connection** to verify
6. Click **Save**

#### Getting a GitLab Token

In GitLab:
1. Go to your project's **Settings** → **Access Tokens**
2. Create a new token with:
   - Name: "Elastic Git Sync"
   - Role: **Maintainer** or **Developer**
   - Scopes: `api`, `write_repository`
3. Click **Create project access token**
4. Copy the token immediately!

#### Getting a GitHub Token

In GitHub:
1. Go to **Settings** → **Developer Settings** → **Personal Access Tokens**
2. Click **Generate new token (classic)**
3. Name it "Elastic Git Sync"
4. Select scopes: `repo` (full control)
5. Click **Generate token**
6. Copy the token immediately!

### 4. Create Your First Project

1. Click **Projects** in the sidebar
2. Click **New Project**
3. **Step 1 - Basic Information**:
   - **Project Name**: Production Security Rules
   - **Description**: Main production rules sync
   - Click **Next**
4. **Step 2 - Elastic Configuration**:
   - **Elastic Instance**: Select your instance
   - **Elastic Space**: default (or your space name)
   - Click **Next**
5. **Step 3 - Git Configuration**:
   - **Git Repository**: Select your repository
   - **Path in Repository**: rules/production/
   - **Enable automatic sync**: ✓ (optional)
   - **Auto-sync Interval**: 60 minutes (optional)
   - Click **Create Project**

### 5. Run Your First Sync

1. You'll be redirected to the **Projects** page
2. Find your newly created project
3. Click **Sync Now**
4. Watch the magic happen! 🎉

The sync will:
- Fetch rules from Elastic
- Compare with Git
- Show you a summary of changes
- Commit new/changed rules to Git

## Viewing Results

### Dashboard

Go to the **Dashboard** to see:
- Total projects
- Active syncs
- Pending conflicts
- Success rate
- Recent sync activity

### History

Click **History** to see:
- All sync jobs
- Status of each job
- Changes made (added, modified, deleted)
- Duration and timestamps

### Conflicts

If any conflicts occur, click **Conflicts** to:
- See rules that differ in both places
- Compare Elastic vs Git versions side-by-side
- Choose which version to keep

## Common Tasks

### Manual Sync

```
Projects → [Your Project] → Sync Now
```

### Schedule Auto-Sync

```
Projects → [Your Project] → Configure → Enable Auto Sync
```

### Create Merge Request

For production deployments with approval:

```
1. Sync rules to test branch
2. Review changes in Git
3. Projects → [Your Project] → Create MR
4. Fill in title and description
5. Submit for approval
6. Merge when approved
```

### Resolve Conflicts

```
Conflicts → [Conflict] → Resolve → Choose Version
```

## Troubleshooting

### Can't connect to Elastic

- ✅ Verify API key is correct
- ✅ Check Elastic URL includes https://
- ✅ Ensure API key has detection rules permissions
- ✅ Test network connectivity

### Can't connect to Git

- ✅ Verify access token is correct
- ✅ Check token has required scopes
- ✅ Ensure repository URL is correct
- ✅ Verify branch exists

### Sync not working

- ✅ Check sync job status in History
- ✅ Look for error messages
- ✅ Verify Elastic space name
- ✅ Ensure Git branch exists
- ✅ Check Docker logs: `docker-compose logs -f`

### Container won't start

```bash
# Check logs
docker-compose logs

# Verify environment
docker-compose config

# Restart services
docker-compose restart
```

## Next Steps

Now that you're set up:

1. **Explore the Dashboard** - See your sync activity
2. **Set up Multiple Projects** - One per environment
3. **Configure Auto-Sync** - Keep everything in sync automatically
4. **Create Workflows** - Use MRs for production deployments
5. **Read the Docs** - Check README.md for advanced features

## Getting Help

- 📖 **Full Documentation**: README.md
- 🚀 **Deployment Guide**: DEPLOYMENT.md
- 🤝 **Contributing**: CONTRIBUTING.md
- 🐛 **Issues**: https://github.com/yourusername/elastic-git-sync/issues

---

**Happy Syncing! 🎉**
