import * as vscode from 'vscode';

export type LogLevel = 'info' | 'warn' | 'error';

/**
 * Manages logging and diagnostics for the Treason Language Server extension.
 * Provides an output channel for displaying server communication and error messages.
 * 
 * Requirements: 6.4
 */
export class OutputChannelManager {
  private channel: vscode.OutputChannel;
  private static readonly CHANNEL_NAME = 'Treason Language Server';

  constructor() {
    this.channel = vscode.window.createOutputChannel(OutputChannelManager.CHANNEL_NAME);
  }

  /**
   * Logs a message with the specified severity level.
   * Messages are formatted with timestamp and severity level.
   * 
   * Requirements: 6.4
   * 
   * @param message The message to log
   * @param level The severity level (info, warn, error)
   */
  log(message: string, level: LogLevel = 'info'): void {
    const timestamp = new Date().toISOString();
    const formattedLevel = level.toUpperCase().padEnd(5);
    const formattedMessage = `[${timestamp}] [${formattedLevel}] ${message}`;
    this.channel.appendLine(formattedMessage);
  }

  /**
   * Logs server communication output.
   * Used for logging messages sent to/from the language server.
   * 
   * Requirements: 6.4
   * 
   * @param output The server output to log
   */
  logServerOutput(output: string): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [SERVER] ${output}`;
    this.channel.appendLine(formattedMessage);
  }

  /**
   * Shows the output channel in the VSCode UI.
   * 
   * Requirements: 6.4
   */
  show(): void {
    this.channel.show();
  }

  /**
   * Clears all content from the output channel.
   * 
   * Requirements: 6.4
   */
  clear(): void {
    this.channel.clear();
  }

  /**
   * Disposes the output channel and releases resources.
   */
  dispose(): void {
    this.channel.dispose();
  }
}
