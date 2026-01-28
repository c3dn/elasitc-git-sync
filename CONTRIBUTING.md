# Contributing to Elastic Git Sync

Thank you for your interest in contributing to Elastic Git Sync! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful, inclusive, and professional in all interactions.

## How to Contribute

### Reporting Bugs

Before creating a bug report:
1. Check existing issues to avoid duplicates
2. Ensure you're using the latest version
3. Collect relevant information (logs, screenshots, etc.)

Create a bug report with:
- Clear, descriptive title
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Docker version, etc.)
- Relevant logs or screenshots

### Suggesting Features

Feature requests are welcome! Please include:
- Clear description of the feature
- Use case and benefits
- Proposed implementation (if applicable)

### Pull Requests

1. **Fork the repository** and create a feature branch
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make your changes** following our coding standards

3. **Test your changes** thoroughly
   - Ensure existing functionality still works
   - Add tests for new features
   - Test with different configurations

4. **Commit your changes**
   ```bash
   git commit -m "Add amazing feature"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```

6. **Open a Pull Request** with:
   - Clear description of changes
   - Reference to related issues
   - Screenshots (if UI changes)

## Development Setup

### Prerequisites
- Node.js 20+
- Docker and Docker Compose
- Git

### Local Development

1. Clone your fork
   ```bash
   git clone https://github.com/yourusername/elastic-git-sync.git
   cd elastic-git-sync
   ```

2. Install frontend dependencies
   ```bash
   cd frontend
   npm install
   ```

3. Start development environment
   ```bash
   # Terminal 1: Backend
   docker-compose up pocketbase

   # Terminal 2: Frontend
   cd frontend
   npm run dev
   ```

4. Access the application
   - Frontend: http://localhost:3000
   - PocketBase: http://localhost:8090/_/

## Coding Standards

### TypeScript/JavaScript
- Use TypeScript for type safety
- Follow existing code style
- Use meaningful variable names
- Add comments for complex logic
- Keep functions small and focused

### Svelte Components
- One component per file
- Use reactive statements appropriately
- Keep components small and reusable
- Follow naming conventions

### CSS/Tailwind
- Use Tailwind utility classes
- Keep custom CSS minimal
- Follow responsive design principles
- Ensure accessibility (WCAG AA)

### PocketBase Hooks
- Keep hooks focused and modular
- Add error handling
- Log important operations
- Test with various scenarios

## Testing

Currently, the project is in early stages. Testing contributions are welcome:
- Unit tests for utility functions
- Integration tests for API endpoints
- E2E tests for critical user flows

## Documentation

Help improve documentation:
- Fix typos or unclear explanations
- Add examples
- Improve setup instructions
- Document new features
- Add troubleshooting tips

## Commit Message Guidelines

Use clear, descriptive commit messages:

```
feat: Add support for GitHub pull requests
fix: Resolve sync conflict resolution bug
docs: Update installation instructions
refactor: Simplify rule comparison logic
test: Add tests for sync job creation
```

Prefixes:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

## Project Structure

```
elastic-git-sync/
├── backend/           # PocketBase backend
│   ├── pb_hooks/     # Custom API logic
│   └── pb_migrations/ # Database schema
├── frontend/         # SvelteKit frontend
│   ├── src/
│   │   ├── routes/   # Pages
│   │   └── lib/      # Components
└── shared/           # Shared types
```

## Getting Help

- Check existing documentation
- Search closed issues
- Ask in GitHub Discussions
- Open a new issue for bugs

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Elastic Git Sync! 🎉
