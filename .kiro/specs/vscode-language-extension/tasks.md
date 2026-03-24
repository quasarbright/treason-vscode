# Implementation Plan: VSCode Language Extension

## Overview

This implementation plan breaks down the development of a VSCode extension for the Treason programming language into discrete, incremental tasks. The extension will integrate a Racket-based language server using the Language Server Protocol (LSP). Each task builds on previous work, with testing integrated throughout to catch errors early.

## Tasks

- [x] 1. Set up project structure and dependencies
  - Initialize VSCode extension project with TypeScript
  - Install required dependencies: vscode-languageclient, @types/vscode, @types/node
  - Install dev dependencies: @vscode/test-electron, fast-check, typescript, esbuild
  - Configure TypeScript with tsconfig.json
  - Set up build scripts in package.json
  - Create basic directory structure (src/, test/, out/)
  - _Requirements: 5.1, 5.3, 5.4_

- [x] 2. Create package.json with extension metadata
  - Define extension metadata (name, displayName, description, version)
  - Configure activation events for "onLanguage:treason"
  - Register language contribution for .tsn files
  - Add configuration schema for treason.racketPath and treason.serverScriptPath
  - Add configuration for treason.trace.server
  - Set main entry point to ./out/extension.js
  - _Requirements: 5.1, 5.2, 4.1, 4.2_

- [x] 2.1 Write unit tests for package.json validation
  - Test that package.json exists and is valid JSON
  - Test that required fields are present
  - Test that activation events include "onLanguage:treason"
  - Test that language contribution includes .tsn extension
  - _Requirements: 5.1, 5.2_

- [x] 3. Implement configuration manager
  - [x] 3.1 Create ConfigurationManager class
    - Implement getConfig() to read VSCode workspace configuration
    - Provide default values for racketPath ("racket") and serverScriptPath ("../treason/server.rkt")
    - Implement onConfigChange() to listen for configuration updates
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 3.2 Write property test for configuration override
    - **Property 6: Configuration Override**
    - **Validates: Requirements 4.3**
    - Generate random configuration values
    - Verify custom values override defaults

  - [x] 3.3 Write unit tests for configuration manager
    - Test reading configuration with defaults
    - Test configuration change notifications
    - Test invalid configuration handling
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 4. Implement output channel manager
  - [x] 4.1 Create OutputChannelManager class
    - Create VSCode output channel named "Treason Language Server"
    - Implement log() method with severity levels (info, warn, error)
    - Implement logServerOutput() for server communication logs
    - Implement show() and clear() methods
    - _Requirements: 6.4_

  - [x] 4.2 Write unit tests for output channel manager
    - Test output channel creation
    - Test log message formatting
    - Test severity level handling
    - _Requirements: 6.4_

- [x] 5. Implement error handler
  - [x] 5.1 Create ErrorHandler class
    - Implement handleServerStartupError() with detailed logging and user notification
    - Implement handleServerCrash() with logging and restart logic
    - Implement handleCommunicationError() with graceful error handling
    - Implement shouldRestart() with exponential backoff logic (max 5 attempts)
    - Track restart count and reset after successful 5-minute run
    - _Requirements: 1.4, 2.3, 6.1, 6.2, 6.3_

  - [x] 5.2 Write property test for graceful error handling
    - **Property 3: Graceful Error Handling**
    - **Validates: Requirements 2.3, 6.2, 6.3**
    - Generate random error conditions
    - Verify extension doesn't crash and logs errors

  - [x] 5.3 Write property test for startup error logging
    - **Property 8: Startup Error Logging**
    - **Validates: Requirements 6.1**
    - Generate random startup failure scenarios
    - Verify detailed error information is logged

  - [x] 5.4 Write unit tests for error handler
    - Test error message formatting
    - Test restart backoff logic
    - Test restart count limits
    - _Requirements: 1.4, 2.3, 6.1, 6.2_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement language client manager
  - [x] 7.1 Create LanguageClientManager class
    - Implement start() to spawn language server process with racket command
    - Configure ServerOptions with command, args, and working directory
    - Configure ClientOptions with document selector for .tsn files
    - Implement stop() to terminate language server process cleanly
    - Implement restart() to stop and start with new configuration
    - Implement isRunning() to check server state
    - Track server state (Stopped, Starting, Running, Stopping, Error)
    - _Requirements: 1.2, 1.3, 2.1, 2.2, 2.4, 4.4_

  - [x] 7.2 Write property test for process spawning
    - **Property 1: Process Spawning with Correct Command**
    - **Validates: Requirements 1.2**
    - Generate random configuration values
    - Verify spawned process uses correct command and arguments

  - [x] 7.3 Write property test for clean process termination
    - **Property 4: Clean Process Termination**
    - **Validates: Requirements 2.4**
    - Generate random server states
    - Verify process is terminated after deactivation

  - [x] 7.4 Write property test for configuration change restart
    - **Property 7: Configuration Change Triggers Restart**
    - **Validates: Requirements 4.4**
    - Generate random configuration changes
    - Verify server restarts with new configuration

  - [x] 7.5 Write unit tests for language client manager
    - Test server process spawning
    - Test server state transitions
    - Test stop and restart logic
    - _Requirements: 1.2, 2.4, 4.4_

- [x] 8. Implement extension entry point
  - [x] 8.1 Create extension.ts with activate() and deactivate()
    - Implement activate() to initialize components
    - Create instances of ConfigurationManager, OutputChannelManager, ErrorHandler
    - Create and start LanguageClientManager
    - Register configuration change listener to restart server
    - Handle activation errors with ErrorHandler
    - Implement deactivate() to stop language client and clean up resources
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.4, 4.4_

  - [x] 8.2 Write property test for LSP communication round trip
    - **Property 2: LSP Communication Round Trip**
    - **Validates: Requirements 2.1, 2.2**
    - Generate random valid LSP requests
    - Verify request is written to stdin and response is received

  - [x] 8.3 Write property test for LSP feature forwarding
    - **Property 5: LSP Feature Forwarding**
    - **Validates: Requirements 3.1, 3.2, 3.3**
    - Generate random LSP responses (completion, diagnostics, hover)
    - Verify responses are forwarded to VSCode

  - [x] 8.4 Write unit tests for extension lifecycle
    - Test activate() initializes all components
    - Test deactivate() cleans up resources
    - Test activation error handling
    - _Requirements: 1.1, 1.4, 2.4_

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Set up integration test infrastructure
  - [x] 10.1 Create integration test setup
    - Create test/runTest.ts with VSCode test runner configuration
    - Create test/suite/index.ts to load and run test suite
    - Create test workspace with sample .tsn files
    - Configure test to use @vscode/test-electron
    - Add test scripts to package.json (test, pretest)
    - _Requirements: 7.1, 7.4_

  - [x] 10.2 Write property test for configuration override
    - **Property 6: Configuration Override**
    - **Validates: Requirements 4.3**
    - Generate random configuration values
    - Verify custom values override defaults
    - Note: This test requires a workspace context and must run as an integration test

  - [x] 10.3 Write integration test for extension activation
    - Open .tsn file in test VSCode instance
    - Verify extension activates
    - Verify language server process is spawned
    - _Requirements: 1.1, 1.2, 7.2_

  - [x] 10.4 Write integration test for language server communication
    - Activate extension with real or mock language server
    - Send LSP initialize request
    - Verify response is received
    - _Requirements: 2.1, 2.2, 7.3_

  - [x] 10.5 Write integration test for language features
    - Open .tsn file with test content
    - Trigger completion at specific position
    - Verify completion items appear (if server supports)
    - Verify diagnostics are displayed (if server provides)
    - _Requirements: 3.1, 3.2, 7.3_

  - [x] 10.6 Write integration test for configuration changes
    - Start extension with default configuration
    - Change configuration setting
    - Verify server restarts
    - _Requirements: 4.4, 7.3_

  - [x] 10.7 Write integration test for error recovery
    - Start extension with invalid server path
    - Verify error notification appears
    - Update configuration with valid path
    - Verify server starts successfully
    - _Requirements: 1.4, 6.1, 7.3_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Run all unit tests, property tests, and integration tests
  - Verify extension can be packaged with vsce
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- Integration tests verify end-to-end behavior in real VSCode environment
- The extension uses TypeScript and the vscode-languageclient library
- All tests should run with minimum 100 iterations for property-based tests
