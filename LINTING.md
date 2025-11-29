# Linting and Formatting Guide

This project uses ESLint and Prettier to maintain code quality and consistent formatting.

## Tools

- **ESLint**: Linting for TypeScript/JavaScript (detects bugs, code quality issues)
- **Prettier**: Code formatting (consistent style)
- **lint-staged**: Run linters on staged files only
- **Husky**: Git hooks (when git is initialized)

## Quick Commands

### Backend Linting

```bash
# Check for lint errors
npm run lint

# Auto-fix lint errors
npm run lint:fix

# Format all code
npm run format

# Check formatting without changing files
npm run format:check

# Type check without emitting files
npm run type-check
```

### All Workspaces

```bash
# From root directory
npm run lint              # Lint all workspaces
npm run lint:fix          # Fix all workspaces
npm run format            # Format all workspaces
npm run format:check      # Check formatting in all workspaces
```

## What Gets Auto-Fixed

### ESLint (Auto-fixable)

✅ **Fixes automatically:**
- Unused variables (removes or prefixes with `_`)
- Missing semicolons
- Quote style inconsistencies
- Spacing issues
- Import order (with plugins)

❌ **Requires manual fix:**
- Type errors
- Logic errors
- Missing imports
- Complex refactors

### Prettier (Auto-formats)

✅ **Formats automatically:**
- Indentation (2 spaces)
- Line length (100 chars)
- Quote style (single quotes)
- Semicolons (always add)
- Trailing commas (ES5 compatible)
- Arrow function parentheses

## VSCode Integration

### Setup

1. Install VSCode extensions:
   - **ESLint** (`dbaeumer.vscode-eslint`)
   - **Prettier** (`esbenp.prettier-vscode`)

2. The `.vscode/settings.json` is already configured to:
   - Format on save
   - Auto-fix ESLint issues on save
   - Use Prettier as default formatter

### Manual Actions

- **Format Document**: `Shift+Option+F` (Mac) or `Shift+Alt+F` (Windows/Linux)
- **Fix ESLint Issues**: `Cmd+.` (Mac) or `Ctrl+.` (Windows/Linux)

## Pre-commit Hooks (Optional)

### Enabling Git Hooks

If you want code to be auto-linted before commits:

```bash
# Initialize git (if not already)
git init

# Initialize Husky
npx husky init

# Create pre-commit hook
cat > .husky/pre-commit << 'EOF'
#!/bin/sh
npx lint-staged
EOF

chmod +x .husky/pre-commit
```

Now every `git commit` will:
1. Run ESLint with auto-fix on staged `.ts/.js` files
2. Run Prettier on all staged files
3. Only commit if no unfixable errors

### Skipping Hooks

If you need to skip pre-commit hooks:

```bash
git commit --no-verify -m "your message"
```

## Configuration Files

### ESLint

- **Config**: `apps/backend/eslint.config.js`
- **Rules**:
  - Integrates TypeScript linting
  - Integrates Prettier
  - Allows `console.log` (for server-side code)
  - Warns on unused variables
  - Disabled strict type checking (to allow compilation)

### Prettier

- **Config**: `apps/backend/.prettierrc.json`
- **Ignore**: `apps/backend/.prettierignore`
- **Settings**:
  - Single quotes
  - Semicolons always
  - 2 space indentation
  - 100 character line width
  - ES5 trailing commas

### lint-staged

- **Config**: `.lintstagedrc.json` (root)
- **Runs on**:
  - Backend: ESLint + Prettier
  - Frontends: Prettier only

## Common Workflows

### Before Committing

```bash
# Format everything
npm run format

# Fix lint issues
npm run lint:fix

# Check for type errors
npm run type-check

# If all good, commit
git add .
git commit -m "your message"
```

### After Pulling Changes

```bash
# Install any new dependencies
npm install

# Format code to match team style
npm run format
```

### CI/CD Integration

Add to your CI pipeline:

```yaml
# Example GitHub Actions
- name: Lint code
  run: npm run lint

- name: Check formatting
  run: npm run format:check

- name: Type check
  run: npm run type-check
```

## Ignoring Files

### ESLint Ignore

Already configured in `eslint.config.js`:
- `node_modules/**`
- `dist/**`
- `**/*.test.ts`
- `**/*.e2e.test.ts`
- `coverage/**`
- `prisma/migrations/**`

### Prettier Ignore

Configured in `.prettierignore`:
- `node_modules`
- `dist`
- `coverage`
- `*.env*`
- `prisma/migrations`
- `package-lock.json`

### Adding More Ignores

**For ESLint:**
Edit `apps/backend/eslint.config.js` and add to the `ignores` array.

**For Prettier:**
Add patterns to `apps/backend/.prettierignore`.

## Troubleshooting

### ESLint Not Working

```bash
# Restart ESLint server in VSCode
Cmd+Shift+P → "ESLint: Restart ESLint Server"

# Clear ESLint cache
rm -rf node_modules/.cache
```

### Prettier Not Formatting

```bash
# Check if file is ignored
npx prettier --check path/to/file.ts

# Check Prettier config
cat apps/backend/.prettierrc.json
```

### Format on Save Not Working

Check VSCode settings (Cmd+,):
- `Editor: Format On Save` should be checked
- `Editor: Default Formatter` should be "Prettier"

### Conflicting Rules

ESLint and Prettier are configured to work together via `eslint-config-prettier`, which disables conflicting ESLint rules. If you see conflicts:

```bash
# Update dependencies
npm update -w backend
```

## Best Practices

### 1. Run Linters Before Pushing

```bash
npm run lint:fix
npm run format
npm run type-check
```

### 2. Fix Issues Incrementally

Don't run `lint:fix` on the entire codebase at once. Fix files as you work on them.

### 3. Use `// eslint-disable-next-line` Sparingly

Only disable rules when absolutely necessary:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = await fetchData();
```

### 4. Configure Editor to Show Errors

In VSCode, errors should show as:
- Red squiggly: ESLint errors
- Yellow squiggly: ESLint warnings
- Blue squiggly: TypeScript errors

## Adding New Rules

### ESLint Rule

Edit `apps/backend/eslint.config.js`:

```javascript
rules: {
  // Add your rule
  'no-var': 'error',
  'prefer-const': 'warn',
}
```

### Prettier Setting

Edit `apps/backend/.prettierrc.json`:

```json
{
  "semi": true,
  "singleQuote": true,
  "printWidth": 100
}
```

## Resources

- [ESLint Rules](https://eslint.org/docs/rules/)
- [TypeScript ESLint Rules](https://typescript-eslint.io/rules/)
- [Prettier Options](https://prettier.io/docs/en/options.html)
- [lint-staged](https://github.com/okonet/lint-staged)

---

**Keep your code clean!** 🧹✨
