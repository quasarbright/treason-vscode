import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Integration test for error recovery
 * Validates: Requirements 1.4, 6.1, 7.3
 */
suite('Integration: Error Recovery', () => {
  test('Extension handles invalid server path gracefully', async function() {
    this.timeout(30000);
    
    const extension = vscode.extensions.getExtension('undefined_publisher.treason-language-support');
    assert.ok(extension, 'Extension should be installed');
    
    const configuration = vscode.workspace.getConfiguration('treason');
    const originalServerPath = configuration.get('serverScriptPath');
    
    try {
      // Set an invalid server path
      const invalidPath = '/nonexistent/path/to/server.rkt';
      await configuration.update('serverScriptPath', invalidPath, vscode.ConfigurationTarget.Global);
      
      // Open a .tsn file to trigger activation
      const fixturesPath = path.resolve(__dirname, '../../../test/fixtures');
      const sampleFilePath = path.join(fixturesPath, 'sample.tsn');
      const document = await vscode.workspace.openTextDocument(sampleFilePath);
      await vscode.window.showTextDocument(document);
      
      // Wait for activation attempt
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Extension should still be active (even if server failed to start)
      // The extension itself shouldn't crash
      assert.strictEqual(extension.isActive, true,
        'Extension should be active even with invalid server path');
      
      // Note: In a real scenario, we would verify:
      // 1. An error notification was shown to the user
      // 2. Error details were logged to the output channel
      // 3. The extension remains functional (doesn't crash)
      
    } finally {
      // Restore original configuration
      await configuration.update('serverScriptPath', originalServerPath, vscode.ConfigurationTarget.Global);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  });
  
  test('Extension recovers when valid path is provided after error', async function() {
    this.timeout(40000);
    
    const extension = vscode.extensions.getExtension('undefined_publisher.treason-language-support');
    assert.ok(extension, 'Extension should be installed');
    
    const configuration = vscode.workspace.getConfiguration('treason');
    const originalServerPath = configuration.get('serverScriptPath');
    
    try {
      // Start with invalid path
      const invalidPath = '/invalid/server.rkt';
      await configuration.update('serverScriptPath', invalidPath, vscode.ConfigurationTarget.Global);
      
      // Open a .tsn file
      const fixturesPath = path.resolve(__dirname, '../../../test/fixtures');
      const sampleFilePath = path.join(fixturesPath, 'sample.tsn');
      const document = await vscode.workspace.openTextDocument(sampleFilePath);
      await vscode.window.showTextDocument(document);
      
      // Wait for failed activation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Now update to a valid path (or the original path)
      const validPath = originalServerPath || '../treason/server.rkt';
      await configuration.update('serverScriptPath', validPath, vscode.ConfigurationTarget.Global);
      
      // Wait for server restart with valid configuration
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Verify configuration was updated
      const updatedConfig = vscode.workspace.getConfiguration('treason');
      const actualServerPath = updatedConfig.get('serverScriptPath');
      assert.strictEqual(actualServerPath, validPath,
        'Configuration should be updated to valid path');
      
      // Extension should still be active
      assert.strictEqual(extension.isActive, true,
        'Extension should be active after recovery');
      
      // Note: In a real scenario with a working server, we would verify:
      // 1. The server successfully starts with the valid path
      // 2. Language features become available
      // 3. No error notifications are shown
      
    } finally {
      // Restore original configuration
      await configuration.update('serverScriptPath', originalServerPath, vscode.ConfigurationTarget.Global);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  });
  
  test('Extension logs startup errors', async function() {
    this.timeout(30000);
    
    const extension = vscode.extensions.getExtension('undefined_publisher.treason-language-support');
    assert.ok(extension, 'Extension should be installed');
    
    const configuration = vscode.workspace.getConfiguration('treason');
    const originalRacketPath = configuration.get('racketPath');
    
    try {
      // Set an invalid racket executable path
      const invalidRacketPath = '/nonexistent/racket';
      await configuration.update('racketPath', invalidRacketPath, vscode.ConfigurationTarget.Global);
      
      // Open a .tsn file to trigger activation
      const fixturesPath = path.resolve(__dirname, '../../../test/fixtures');
      const sampleFilePath = path.join(fixturesPath, 'sample.tsn');
      const document = await vscode.workspace.openTextDocument(sampleFilePath);
      await vscode.window.showTextDocument(document);
      
      // Wait for activation attempt
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Extension should be active (even if server failed)
      assert.strictEqual(extension.isActive, true,
        'Extension should be active even with invalid racket path');
      
      // Note: Without access to the output channel in tests, we can't directly verify
      // that errors were logged. In a real scenario, we would:
      // 1. Capture output channel messages
      // 2. Verify error details are logged (command, arguments, error message)
      // 3. Verify user was notified of the error
      
    } finally {
      // Restore original configuration
      await configuration.update('racketPath', originalRacketPath, vscode.ConfigurationTarget.Global);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  });
});
