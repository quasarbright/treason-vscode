import * as vscode from 'vscode';
import { OutputChannelManager } from './outputChannelManager';

export interface ErrorContext {
  error: Error;
  phase: 'startup' | 'runtime' | 'shutdown';
  serverOutput?: string;
}

/**
 * Manages error handling and recovery for the Treason Language Server extension.
 * Implements exponential backoff for restart attempts and tracks error frequency.
 * 
 * Requirements: 1.4, 2.3, 6.1, 6.2, 6.3
 */
export class ErrorHandler {
  private restartCount: number = 0;
  private lastSuccessfulStart: Date | null = null;
  private readonly maxRestartAttempts: number = 5;
  private readonly successfulRunDuration: number = 5 * 60 * 1000; // 5 minutes in milliseconds
  private readonly baseBackoffDelay: number = 1000; // 1 second base delay

  constructor(private outputManager: OutputChannelManager) {}

  /**
   * Handles errors that occur during language server startup.
   * Logs detailed error information and notifies the user.
   * Does not attempt automatic restart for startup failures.
   * 
   * Requirements: 1.4, 6.1
   * 
   * @param context The error context containing error details and phase
   */
  handleServerStartupError(context: ErrorContext): void {
    const { error, serverOutput } = context;
    
    // Log detailed error information
    this.outputManager.log('Language server startup failed', 'error');
    this.outputManager.log(`Error: ${error.message}`, 'error');
    
    if (error.stack) {
      this.outputManager.log(`Stack trace: ${error.stack}`, 'error');
    }
    
    if (serverOutput) {
      this.outputManager.log(`Server output: ${serverOutput}`, 'error');
    }
    
    // Show the output channel for visibility
    this.outputManager.show();
    
    // Notify user with actionable message
    const message = 'Failed to start Treason language server. Please check that Racket is installed and the server script path is correct.';
    vscode.window.showErrorMessage(message, 'Open Settings', 'View Logs').then(selection => {
      if (selection === 'Open Settings') {
        vscode.commands.executeCommand('workbench.action.openSettings', 'treason');
      } else if (selection === 'View Logs') {
        this.outputManager.show();
      }
    });
  }

  /**
   * Handles language server crashes during runtime.
   * Logs the crash and determines whether to attempt restart based on restart count.
   * Implements exponential backoff for restart attempts.
   * 
   * Requirements: 2.3, 6.2
   * 
   * @param context The error context containing error details
   * @returns Promise that resolves to true if restart should be attempted, false otherwise
   */
  async handleServerCrash(context: ErrorContext): Promise<boolean> {
    const { error, serverOutput } = context;
    
    // Log crash details
    this.outputManager.log('Language server crashed', 'error');
    this.outputManager.log(`Error: ${error.message}`, 'error');
    
    if (error.stack) {
      this.outputManager.log(`Stack trace: ${error.stack}`, 'error');
    }
    
    if (serverOutput) {
      this.outputManager.log(`Server output before crash: ${serverOutput}`, 'error');
    }
    
    // Check if we should attempt restart
    if (!this.shouldRestart(error)) {
      this.outputManager.log(`Maximum restart attempts (${this.maxRestartAttempts}) reached. Not attempting restart.`, 'error');
      this.outputManager.show();
      
      vscode.window.showErrorMessage(
        'Treason language server has crashed multiple times. Please check the logs and restart VSCode.',
        'View Logs'
      ).then(selection => {
        if (selection === 'View Logs') {
          this.outputManager.show();
        }
      });
      
      return false;
    }
    
    // Calculate backoff delay using exponential backoff
    const backoffDelay = this.calculateBackoffDelay();
    this.outputManager.log(`Attempting restart in ${backoffDelay}ms (attempt ${this.restartCount + 1}/${this.maxRestartAttempts})`, 'warn');
    
    // Wait for backoff period
    await new Promise(resolve => setTimeout(resolve, backoffDelay));
    
    this.restartCount++;
    return true;
  }

  /**
   * Handles communication errors between the extension and language server.
   * Logs the error details gracefully without crashing the extension.
   * 
   * Requirements: 2.3, 6.3
   * 
   * @param context The error context containing error details
   */
  handleCommunicationError(context: ErrorContext): void {
    const { error, serverOutput } = context;
    
    // Log communication error
    this.outputManager.log('Communication error with language server', 'warn');
    this.outputManager.log(`Error: ${error.message}`, 'warn');
    
    if (error.stack) {
      this.outputManager.log(`Stack trace: ${error.stack}`, 'warn');
    }
    
    if (serverOutput) {
      this.outputManager.log(`Server output: ${serverOutput}`, 'warn');
    }
    
    // Don't show notification for communication errors as they may be transient
    // Just log them for debugging purposes
  }

  /**
   * Determines whether the server should be restarted based on the error and restart history.
   * Implements exponential backoff logic with a maximum of 5 restart attempts.
   * Resets restart count after a successful 5-minute run.
   * 
   * Requirements: 1.4, 2.3
   * 
   * @param error The error that occurred
   * @returns true if restart should be attempted, false otherwise
   */
  shouldRestart(error: Error): boolean {
    // Check if we've exceeded max restart attempts
    if (this.restartCount >= this.maxRestartAttempts) {
      return false;
    }
    
    // Check if we've had a successful run for 5 minutes
    // If so, reset the restart counter
    if (this.lastSuccessfulStart) {
      const timeSinceLastStart = Date.now() - this.lastSuccessfulStart.getTime();
      if (timeSinceLastStart >= this.successfulRunDuration) {
        this.outputManager.log('Server has been running successfully for 5 minutes. Resetting restart counter.', 'info');
        this.restartCount = 0;
      }
    }
    
    return true;
  }

  /**
   * Calculates the backoff delay for restart attempts using exponential backoff.
   * Delay = baseDelay * 2^(restartCount)
   * 
   * @returns The delay in milliseconds
   */
  private calculateBackoffDelay(): number {
    return this.baseBackoffDelay * Math.pow(2, this.restartCount);
  }

  /**
   * Records a successful server start.
   * Used to track uptime for restart counter reset logic.
   */
  recordSuccessfulStart(): void {
    this.lastSuccessfulStart = new Date();
    this.outputManager.log('Language server started successfully', 'info');
  }

  /**
   * Resets the restart counter.
   * Can be called manually or automatically after successful run duration.
   */
  resetRestartCount(): void {
    this.restartCount = 0;
  }

  /**
   * Gets the current restart count.
   * Useful for testing and monitoring.
   */
  getRestartCount(): number {
    return this.restartCount;
  }
}
