# Contributing to Real-Time DJ Assistant

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to this project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/spotifydj.git`
3. Create a branch: `cd spotifydj && git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes: `npm test`
6. Commit your changes: `git commit -m "Add: your feature description"`
7. Push to your fork: `git push origin feature/your-feature-name`
8. Open a Pull Request

## Development Setup

1. Install dependencies: `npm install`
2. Copy environment template: `cp .env.example .env`
3. Configure your `.env` file with your Spotify API credentials
4. Set up the database: `npm run db:setup`
5. Run the application: `npm start`

## Code Style

- **Formatting**: We use Prettier. Run `npm run format` before committing
- **Linting**: We use ESLint. Run `npm run lint` to check for issues
- **TypeScript**: All code should be properly typed
- **Tests**: Add tests for new features. Maintain or improve test coverage

## Testing

- Run tests: `npm test`
- Run tests with coverage: `npm test -- --coverage`
- Run tests in watch mode: `npm run test:watch`

## Pull Request Guidelines

- Keep PRs focused on a single feature or fix
- Update documentation if needed
- Add tests for new features
- Ensure all tests pass
- Update `TEST_COVERAGE_GAPS.md` if coverage changes significantly
- Write clear commit messages

## Areas for Contribution

- Improving test coverage (see `TEST_COVERAGE_GAPS.md`)
- Adding new audio feature providers
- UI/UX improvements
- Performance optimizations
- Documentation improvements
- Bug fixes

## Questions?

Feel free to open an issue for questions or discussions about potential contributions.
