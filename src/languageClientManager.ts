import * as vscode from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from 'vscode-languageclient/node';
import { ExtensionConfig } from './configurationManager';
import { OutputChannelManager } from './outputChannelManager';
import { ErrorHandler } from './errorHandler';

export enum ServerState {
  Stopped = 'stopped',
  Starting = 'starting',
  Running = 'running',
  Stopping = 'stopping',
  Error = 'error'
}

/**
 * Manages the Language Server Protocol client and server process lifecycle.
 * Handles spawning, stopping, and restarting the Racket-based language server.
 * 
 * Requirements: 1.2, 1.3, 2.1, 2.2, 2.4, 4.4
 */
export class LanguageClientManager {
  private client: LanguageClient | null = null;
  private state: ServerState = ServerState.Stopped;

  constructor(
    private outputManager: OutputChannelManager,
    private errorHandler: ErrorHandler
  ) {}

  /**
   * Starts the language server process with the given configuration.
   * Spawns a Racket process and establishes LSP communication via stdin/stdout.
   * 
   * Requirements: 1.2, 1.3, 2.1, 2.2
   * 
   * @param config The extension configuration containing server paths
   */
  async start(config: ExtensionConfig): Promise<void> {
    if (this.state === ServerState.Running || this.state === ServerState.Starting) {
      this.outputManager.log('Language server is already running or starting', 'warn');
      return;
    }

    try {
      this.state = ServerState.Starting;
      this.outputManager.log('Starting language server...', 'info');
      this.outputManager.log(`Racket path: ${config.racketPath}`, 'info');
      this.outputManager.log(`Server script path: ${config.serverScriptPath}`, 'info');

      // Configure server options to spawn the Racket language server
      const serverOptions: ServerOptions = {
        command: config.racketPath,
        args: [config.serverScriptPath],
        transport: TransportKind.stdio,
        options: {
          cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
        }
      };

      // Configure client options for .tsn files
      const clientOptions: LanguageClientOptions = {
        documentSelector: [
          { scheme: 'file', language: 'treason' },
          { scheme: 'file', pattern: '**/*.tsn' }
        ],
        synchronize: {
          configurationSection: 'treason'
        },
        outputChannel: this.outputManager['channel'], // Access the underlying channel
        traceOutputChannel: config.trace.server !== 'off' ? this.outputManager['channel'] : undefined
      };

      // Create and start the language client
      this.client = new LanguageClient(
        'treasonLanguageServer',
        'Treason Language Server',
        serverOptions,
        clientOptions
      );

      // Register error handlers
      this.client.onDidChangeState((event) => {
        this.outputManager.log(`Client state changed: ${event.oldState} -> ${event.newState}`, 'info');
      });

      // Start the client (this will also launch the server)
      await this.client.start();

      this.state = ServerState.Running;
      this.errorHandler.recordSuccessfulStart();
      this.outputManager.log('Language server started successfully', 'info');
    } catch (error) {
      this.state = ServerState.Error;
      const err = error instanceof Error ? error : new Error(String(error));
      
      this.errorHandler.handleServerStartupError({
        error: err,
        phase: 'startup'
      });
      
      throw err;
    }
  }

  /**
   * Stops the language server process cleanly.
   * Terminates the server process and cleans up resources.
   * 
   * Requirements: 2.4
   */
  async stop(): Promise<void> {
    if (this.state === ServerState.Stopped || this.state === ServerState.Stopping) {
      this.outputManager.log('Language server is already stopped or stopping', 'warn');
      return;
    }

    if (!this.client) {
      this.state = ServerState.Stopped;
      return;
    }

    try {
      this.state = ServerState.Stopping;
      this.outputManager.log('Stopping language server...', 'info');

      await this.client.stop();
      this.client = null;

      this.state = ServerState.Stopped;
      this.outputManager.log('Language server stopped successfully', 'info');
    } catch (error) {
      this.state = ServerState.Error;
      const err = error instanceof Error ? error : new Error(String(error));
      
      this.errorHandler.handleCommunicationError({
        error: err,
        phase: 'shutdown'
      });
      
      // Even if there's an error, clean up the client
      this.client = null;
      this.state = ServerState.Stopped;
    }
  }

  /**
   * Restarts the language server with new configuration.
   * Stops the current server and starts a new one.
   * 
   * Requirements: 4.4
   * 
   * @param config The new extension configuration
   */
  async restart(config: ExtensionConfig): Promise<void> {
    this.outputManager.log('Restarting language server with new configuration...', 'info');
    
    await this.stop();
    await this.start(config);
  }

  /**
   * Checks if the language server is currently running.
   * 
   * @returns true if the server is running, false otherwise
   */
  isRunning(): boolean {
    return this.state === ServerState.Running;
  }

  /**
   * Gets the current server state.
   * 
   * @returns The current server state
   */
  getState(): ServerState {
    return this.state;
  }

  /**
   * Disposes the language client and releases resources.
   */
  async dispose(): Promise<void> {
    await this.stop();
  }
}
