# Design Document: VSCode Language Extension

## Overview

This design describes a VSCode extension that integrates a Racket-based language server for the Treason programming language (with `.tsn` file extension). The extension uses the Language Server Protocol (LSP) to provide rich language features like code completion, diagnostics, hover information, and more. The language server is implemented in Racket and communicates via stdin/stdout.

The extension will be built using TypeScript and the VSCode Extension API, leveraging the `vscode-languageclient` library to handle LSP communication. The architecture follows the standard LSP client-server pattern where the extension acts as the client and spawns the Racket language server as a child process.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────┐
│           VSCode Editor                 │
│  ┌───────────────────────────────────┐  │
│  │   Extension Host Process          │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │  TSN Extension              │  │  │
│  │  │  - Extension Activation     │  │  │
│  │  │  - Configuration Manager    │  │  │
│  │  │  - LSP Client               │  │  │
│  │  └──────────┬──────────────────┘  │  │
│  │             │ LSP Protocol         │  │
│  │             │ (JSON-RPC)           │  │
│  │  ┌──────────▼──────────────────┐  │  │
│  │  │  Language Server Process    │  │  │
│  │  │  (racket server.rkt)        │  │  │
│  │  │  - stdin/stdout             │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Component Interaction Flow

1. User opens a `.tsn` file
2. VSCode activates the extension
3. Extension spawns the Racket language server process
4. LSP Client establishes communication via stdin/stdout
5. Language server provides features (completion, diagnostics, etc.)
6. Extension forwards LSP responses to VSCode UI

## Components and Interfaces

### 1. Extension Entry Point (`extension.ts`)

The main entry point that handles extension lifecycle:

```typescript
interface ExtensionContext {
  subscriptions: Disposable[];
  extensionPath: string;
  workspaceState: Memento;
  globalState: Memento;
}

function activate(context: ExtensionContext): void
function deactivate(): Promise<void>
```

**Responsibilities:**
- Register activation events
- Initialize the language client
- Manage extension lifecycle
- Clean up resources on deactivation

### 2. Language Client Manager

Manages the LSP client and server process:

```typescript
interface ServerOptions {
  command: string;        // "racket"
  args: string[];         // ["../treason/server.rkt"]
  options?: {
    cwd?: string;
    env?: Record<string, string>;
  };
}

interface ClientOptions {
  documentSelector: DocumentSelector;
  synchronize?: {
    configurationSection?: string;
    fileEvents?: FileSystemWatcher;
  };
  outputChannel?: OutputChannel;
}

class LanguageClientManager {
  private client: LanguageClient | null;
  
  start(serverOptions: ServerOptions, clientOptions: ClientOptions): Promise<void>
  stop(): Promise<void>
  restart(): Promise<void>
  isRunning(): boolean
}
```

**Responsibilities:**
- Spawn and manage the language server process
- Configure LSP client with server options
- Handle server lifecycle (start, stop, restart)
- Monitor server health

### 3. Configuration Manager

Handles extension configuration:

```typescript
interface ExtensionConfig {
  racketPath: string;           // Path to racket executable
  serverScriptPath: string;     // Path to server.rkt
  trace: {
    server: 'off' | 'messages' | 'verbose';
  };
}

class ConfigurationManager {
  getConfig(): ExtensionConfig
  onConfigChange(callback: (config: ExtensionConfig) => void): Disposable
}
```

**Responsibilities:**
- Read configuration from VSCode settings
- Provide default values
- Notify listeners of configuration changes
- Validate configuration values

### 4. Error Handler

Manages error handling and recovery:

```typescript
interface ErrorContext {
  error: Error;
  phase: 'startup' | 'runtime' | 'shutdown';
  serverOutput?: string;
}

class ErrorHandler {
  handleServerStartupError(context: ErrorContext): void
  handleServerCrash(context: ErrorContext): void
  handleCommunicationError(context: ErrorContext): void
  shouldRestart(error: Error): boolean
}
```

**Responsibilities:**
- Log errors with context
- Display user-friendly error messages
- Determine restart strategy
- Track error frequency to prevent restart loops

### 5. Output Channel Manager

Manages logging and diagnostics:

```typescript
class OutputChannelManager {
  private channel: OutputChannel;
  
  log(message: string, level: 'info' | 'warn' | 'error'): void
  logServerOutput(output: string): void
  show(): void
  clear(): void
}
```

**Responsibilities:**
- Create and manage VSCode output channel
- Format log messages
- Provide visibility into server communication
- Support debugging

## Data Models

### Extension Configuration Schema

```typescript
interface ExtensionConfiguration {
  "treason.racketPath": string;              // Default: "racket"
  "treason.serverScriptPath": string;        // Default: "../treason/server.rkt"
  "treason.trace.server": string;            // Default: "off"
  "treason.maxRestartAttempts": number;      // Default: 5
  "treason.restartDelay": number;            // Default: 2000 (ms)
}
```

### Language Server State

```typescript
enum ServerState {
  Stopped = 'stopped',
  Starting = 'starting',
  Running = 'running',
  Stopping = 'stopping',
  Error = 'error'
}

interface ServerStatus {
  state: ServerState;
  pid?: number;
  startTime?: Date;
  restartCount: number;
  lastError?: Error;
}
```

### Package.json Structure

```json
{
  "name": "treason-language-support",
  "displayName": "Treason Language Support",
  "description": "Language support for Treason programming language",
  "version": "0.1.0",
  "engines": {
    "vscode": "^1.75.0"
  },
  "categories": ["Programming Languages"],
  "activationEvents": [
    "onLanguage:treason"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "languages": [{
      "id": "treason",
      "extensions": [".tsn"],
      "aliases": ["Treason", "treason"]
    }],
    "configuration": {
      "type": "object",
      "title": "Treason Language Configuration",
      "properties": {
        "treason.racketPath": {
          "type": "string",
          "default": "racket",
          "description": "Path to the racket executable"
        },
        "treason.serverScriptPath": {
          "type": "string",
          "default": "../treason/server.rkt",
          "description": "Path to the language server script"
        },
        "treason.trace.server": {
          "type": "string",
          "enum": ["off", "messages", "verbose"],
          "default": "off",
          "description": "Traces the communication between VS Code and the language server"
        }
      }
    }
  }
}
```


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Process Spawning with Correct Command

*For any* extension activation, the spawned language server process should use the command "racket" with the configured server script path as an argument.

**Validates: Requirements 1.2**

### Property 2: LSP Communication Round Trip

*For any* valid LSP request sent to the language server, the extension should successfully write it to stdin and receive a corresponding response from stdout.

**Validates: Requirements 2.1, 2.2**

### Property 3: Graceful Error Handling

*For any* communication error or server crash, the extension should handle it without crashing itself and should log the error details.

**Validates: Requirements 2.3, 6.2, 6.3**

### Property 4: Clean Process Termination

*For any* extension deactivation, the language server process should be terminated and no longer running after deactivation completes.

**Validates: Requirements 2.4**

### Property 5: LSP Feature Forwarding

*For any* LSP response from the language server (completion, diagnostics, hover), the extension should forward it to VSCode for display.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 6: Configuration Override

*For any* custom configuration value provided by the user, the extension should use that value instead of the default when spawning the language server.

**Validates: Requirements 4.3**

### Property 7: Configuration Change Triggers Restart

*For any* configuration change event, the extension should restart the language server with the new configuration values.

**Validates: Requirements 4.4**

### Property 8: Startup Error Logging

*For any* language server startup failure, the extension should log detailed error information to the output channel.

**Validates: Requirements 6.1**

## Error Handling

### Error Categories

1. **Startup Errors**
   - Racket executable not found
   - Server script not found or not readable
   - Process spawn failure
   - Initial LSP handshake failure

2. **Runtime Errors**
   - Server process crash
   - Communication timeout
   - Invalid LSP messages
   - Unexpected server termination

3. **Configuration Errors**
   - Invalid configuration values
   - Missing required configuration
   - Configuration validation failures

### Error Handling Strategy

**Startup Errors:**
- Log detailed error with context (command, arguments, working directory)
- Show user notification with actionable message
- Do not attempt automatic restart for startup failures
- Provide troubleshooting guidance in error message

**Runtime Errors:**
- Log error with server output and stack trace
- Attempt automatic restart with exponential backoff
- Maximum 5 restart attempts within 5 minutes
- After max attempts, show user notification and stop retrying
- Clear restart counter after successful 5-minute run

**Configuration Errors:**
- Validate configuration on change
- Show warning for invalid values
- Fall back to defaults for invalid configuration
- Log validation errors to output channel

### Error Recovery Flow

```
Error Detected
     ↓
Log Error Details
     ↓
Is Recoverable? ──No──→ Notify User & Stop
     ↓ Yes
Check Restart Count
     ↓
< Max Attempts? ──No──→ Notify User & Stop
     ↓ Yes
Wait (Exponential Backoff)
     ↓
Restart Server
     ↓
Monitor for Success
```

## Testing Strategy

### Unit Testing

Unit tests will verify specific examples and edge cases:

- **Extension Activation**: Test that activate() is called when .tsn files are opened
- **Configuration Reading**: Test reading configuration values with defaults
- **Error Message Formatting**: Test error message generation for various error types
- **Process Cleanup**: Test that deactivate() properly cleans up resources
- **Package.json Validation**: Test that package.json contains required fields

### Property-Based Testing

Property-based tests will verify universal properties across all inputs using the **fast-check** library for TypeScript. Each test will run a minimum of 100 iterations.

**Test Configuration:**
```typescript
import fc from 'fast-check';

// Minimum 100 iterations per property test
const testConfig = { numRuns: 100 };
```

**Property Tests:**

1. **Process Spawning Property**
   - Generate random configuration values
   - Verify spawned process uses correct command and arguments
   - **Feature: vscode-language-extension, Property 1: Process Spawning with Correct Command**

2. **LSP Communication Round Trip Property**
   - Generate random valid LSP requests
   - Verify request is written to stdin and response is received
   - **Feature: vscode-language-extension, Property 2: LSP Communication Round Trip**

3. **Graceful Error Handling Property**
   - Generate random error conditions
   - Verify extension doesn't crash and logs errors
   - **Feature: vscode-language-extension, Property 3: Graceful Error Handling**

4. **Clean Process Termination Property**
   - Generate random server states
   - Verify process is terminated after deactivation
   - **Feature: vscode-language-extension, Property 4: Clean Process Termination**

5. **LSP Feature Forwarding Property**
   - Generate random LSP responses (completion, diagnostics, hover)
   - Verify responses are forwarded to VSCode
   - **Feature: vscode-language-extension, Property 5: LSP Feature Forwarding**

6. **Configuration Override Property**
   - Generate random configuration values
   - Verify custom values override defaults
   - **Feature: vscode-language-extension, Property 6: Configuration Override**

7. **Configuration Change Restart Property**
   - Generate random configuration changes
   - Verify server restarts with new configuration
   - **Feature: vscode-language-extension, Property 7: Configuration Change Triggers Restart**

8. **Startup Error Logging Property**
   - Generate random startup failure scenarios
   - Verify detailed error information is logged
   - **Feature: vscode-language-extension, Property 8: Startup Error Logging**

### Integration Testing

Integration tests will verify the extension works in a real VSCode environment using the VSCode Extension Test Runner:

**Test Setup:**
- Use `@vscode/test-electron` to download and run VSCode
- Create test workspace with sample `.tsn` files
- Configure test environment with mock or real Racket language server
- Use VSCode Extension API to interact with the extension

**Integration Test Scenarios:**

1. **Extension Activation Test**
   - Open a `.tsn` file in test VSCode instance
   - Verify extension activates
   - Verify language server process is spawned
   - **Validates: Requirements 1.1, 1.2**

2. **Language Server Communication Test**
   - Activate extension with real language server
   - Send LSP requests (initialize, textDocument/didOpen)
   - Verify responses are received
   - **Validates: Requirements 2.1, 2.2**

3. **Language Features Test**
   - Open `.tsn` file with test content
   - Trigger completion at specific position
   - Verify completion items appear
   - Verify diagnostics are displayed
   - **Validates: Requirements 3.1, 3.2, 7.3**

4. **Configuration Change Test**
   - Start extension with default configuration
   - Change configuration setting
   - Verify server restarts with new configuration
   - **Validates: Requirements 4.4**

5. **Error Recovery Test**
   - Start extension with invalid server path
   - Verify error notification appears
   - Update configuration with valid path
   - Verify server starts successfully
   - **Validates: Requirements 1.4, 6.1**

**Test Runner Configuration:**
```typescript
// test/runTest.ts
import { runTests } from '@vscode/test-electron';

async function main() {
  const extensionDevelopmentPath = path.resolve(__dirname, '../../');
  const extensionTestsPath = path.resolve(__dirname, './suite/index');
  
  await runTests({
    extensionDevelopmentPath,
    extensionTestsPath,
    launchArgs: ['--disable-extensions'] // Isolate test environment
  });
}
```

### Testing Balance

- Unit tests focus on specific examples, edge cases, and component behavior
- Property tests provide comprehensive coverage across many inputs
- Integration tests verify real-world behavior in actual VSCode environment
- Together, these approaches ensure both correctness and robustness
