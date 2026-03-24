# Treason Language Support

A Visual Studio Code extension providing language support for the Treason programming language.

## Features

- Syntax support for `.tsn` files
- Language server integration via Racket
- Configurable Racket executable path
- Configurable language server script path

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14 or higher)
- **npm** (v6 or higher)
- **Racket** - Required for the language server
- **Visual Studio Code** (v1.75.0 or higher)
- **Treason repository** - By default, this extension expects the Treason language implementation to be cloned at `../treason` (relative to this repository). The language server script should be located at `../treason/server.rkt`.

### Project Setup

The expected directory structure is:

```
parent-directory/
├── treason/           # Treason language implementation
│   └── server.rkt     # Language server script
└── treason-vscode/    # This repository
```

If your Treason repository is located elsewhere, you can configure the path using the `treason.serverScriptPath` setting (see [Configuration](#configuration)).

## Installation

### Install Dependencies

```bash
npm install
```

### Build the Extension

```bash
npm run compile
```

## Local Development

### Running the Extension in Development Mode

The extension includes VSCode debug configurations that make local development straightforward.

#### Method 1: Using VSCode Debug (Recommended)

1. Open the project in Visual Studio Code
2. Press `F5` or go to **Run and Debug** in the sidebar
3. Select **"Run Extension"** from the dropdown
4. A new VSCode window (Extension Development Host) will open with the extension loaded

The extension will automatically rebuild when you press `F5` thanks to the `preLaunchTask` configuration.

#### Method 2: Using Watch Mode

For continuous development with automatic rebuilding:

```bash
npm run watch
```

Then press `F5` to launch the Extension Development Host. The extension will automatically reload when you make changes.

### Development Workflow

1. Make changes to the TypeScript source files in `src/`
2. The watch task will automatically recompile
3. Reload the Extension Development Host window (`Ctrl+R` or `Cmd+R`)
4. Test your changes

### Debugging

- Set breakpoints in your TypeScript source files
- Use the Debug Console to inspect variables
- Check the Output panel (select "Treason Language Support" from the dropdown) for extension logs

## Testing

### Run All Tests

```bash
npm test
```

This command will:
1. Compile the extension
2. Compile the tests
3. Run the test suite in a VSCode instance

### Run Unit Tests Only

```bash
npm run test:unit
```

### Run Extension Tests

```bash
npm run pretest && npm test
```

## Building and Packaging

### Compile for Production

```bash
npm run vscode:prepublish
```

This runs the compile script optimized for production.

### Create VSIX Package

To package the extension for distribution:

```bash
npx vsce package
```

This will create a `.vsix` file that can be installed in VSCode.

## Configuration

The extension provides the following configuration options:

### `treason.racketPath`
- **Type**: `string`
- **Default**: `"racket"`
- **Description**: Path to the Racket executable. Set this if Racket is not in your system PATH.

### `treason.serverScriptPath`
- **Type**: `string`
- **Default**: `"../treason/server.rkt"`
- **Description**: Path to the Treason language server script (relative or absolute).

### `treason.trace.server`
- **Type**: `string`
- **Options**: `"off"`, `"messages"`, `"verbose"`
- **Default**: `"off"`
- **Description**: Traces the communication between VS Code and the language server for debugging.

## Project Structure

```
treason-vscode/
├── src/                          # TypeScript source files
│   ├── extension.ts              # Extension entry point
│   ├── languageClientManager.ts  # Language client management
│   ├── configurationManager.ts   # Configuration handling
│   ├── outputChannelManager.ts   # Output channel management
│   └── errorHandler.ts           # Error handling utilities
├── test/                         # Test files
├── out/                          # Compiled JavaScript output
├── .vscode/                      # VSCode configuration
│   ├── launch.json               # Debug configurations
│   └── tasks.json                # Build tasks
├── package.json                  # Extension manifest
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # This file
```

## Available NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run compile` | Compile TypeScript to JavaScript using esbuild |
| `npm run compile:tests` | Compile tests using TypeScript compiler |
| `npm run watch` | Watch for changes and recompile automatically |
| `npm run pretest` | Compile both extension and tests |
| `npm test` | Run all tests in VSCode instance |
| `npm run test:unit` | Run unit tests only |
| `npm run lint` | Lint TypeScript files |
| `npm run clean` | Remove build artifacts and dependencies |
| `npm run vscode:prepublish` | Production build (runs before publishing) |

## Development Tips

- The extension uses **esbuild** for fast compilation
- The language server is written in Racket and runs as a separate process
- Make sure the `treason.serverScriptPath` points to a valid Racket server script
- Use the "Treason Language Support" output channel for debugging language server issues
- Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) and search for "Reload Window" to quickly reload the extension during development

## Troubleshooting

### Language Server Not Starting

1. **Verify the Treason repository is in the correct location**: By default, the extension looks for `../treason/server.rkt`. Make sure the Treason language repository is cloned in the parent directory, or update the `treason.serverScriptPath` setting to point to the correct location.
2. Verify Racket is installed: `racket --version`
3. Check the `treason.racketPath` setting points to the correct executable
4. Ensure `treason.serverScriptPath` points to a valid server script
5. Enable server tracing: Set `treason.trace.server` to `"verbose"` and check the Output panel

### Extension Not Loading

1. Check the "Extension Development Host" window for errors
2. Look in the Output panel under "Treason Language Support"
3. Verify the extension compiled successfully: `npm run compile`

## Author

Mike Delmonaco
Email: mdelmonacochs@gmail.com

## License

MIT License - see the [LICENSE](LICENSE) file for details.
