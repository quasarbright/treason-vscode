import * as vscode from 'vscode';
import { ConfigurationManager } from './configurationManager';
import { OutputChannelManager } from './outputChannelManager';
import { ErrorHandler } from './errorHandler';
import { LanguageClientManager } from './languageClientManager';

let outputManager: OutputChannelManager | null = null;
let errorHandler: ErrorHandler | null = null;
let configManager: ConfigurationManager | null = null;
let clientManager: LanguageClientManager | null = null;
let configChangeDisposable: vscode.Disposable | null = null;

/**
 * Activates the Treason Language Server extension.
 * Initializes all components and starts the language server.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.4, 4.4
 * 
 * @param context The extension context provided by VSCode
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  try {
    // Initialize output manager first for logging
    outputManager = new OutputChannelManager();
    outputManager.log('Activating Treason Language Server extension...', 'info');

    // Initialize error handler
    errorHandler = new ErrorHandler(outputManager);

    // Initialize configuration manager
    configManager = new ConfigurationManager();
    const config = configManager.getConfig();

    // Initialize and start language client manager
    clientManager = new LanguageClientManager(outputManager, errorHandler);
    
    // Start the language server
    await clientManager.start(config);

    // Register configuration change listener to restart server
    // Requirements: 4.4
    configChangeDisposable = configManager.onConfigChange(async (newConfig) => {
      outputManager?.log('Configuration changed, restarting language server...', 'info');
      try {
        await clientManager?.restart(newConfig);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        errorHandler?.handleCommunicationError({
          error: err,
          phase: 'runtime'
        });
      }
    });

    // Add disposables to context for cleanup
    context.subscriptions.push(
      { dispose: () => outputManager?.dispose() },
      { dispose: () => clientManager?.dispose() },
      configChangeDisposable
    );

    outputManager.log('Treason Language Server extension activated successfully', 'info');
  } catch (error) {
    // Handle activation errors
    // Requirements: 1.4
    const err = error instanceof Error ? error : new Error(String(error));
    
    if (errorHandler && outputManager) {
      errorHandler.handleServerStartupError({
        error: err,
        phase: 'startup'
      });
    } else {
      // Fallback if error handler isn't initialized
      console.error('Failed to activate Treason Language Server extension:', err);
      vscode.window.showErrorMessage(
        `Failed to activate Treason Language Server: ${err.message}`
      );
    }
    
    throw err;
  }
}

/**
 * Deactivates the Treason Language Server extension.
 * Stops the language server and cleans up all resources.
 * 
 * Requirements: 2.4
 */
export async function deactivate(): Promise<void> {
  try {
    outputManager?.log('Deactivating Treason Language Server extension...', 'info');

    // Dispose configuration change listener
    if (configChangeDisposable) {
      configChangeDisposable.dispose();
      configChangeDisposable = null;
    }

    // Stop language client
    if (clientManager) {
      await clientManager.dispose();
      clientManager = null;
    }

    // Clean up managers
    if (outputManager) {
      outputManager.log('Treason Language Server extension deactivated', 'info');
      outputManager.dispose();
      outputManager = null;
    }

    errorHandler = null;
    configManager = null;
  } catch (error) {
    // Log deactivation errors but don't throw
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('Error during deactivation:', err);
  }
}
