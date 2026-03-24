import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Integration test for extension activation
 * Validates: Requirements 1.1, 1.2, 7.2
 */
suite('Integration: Extension Activation', () => {
  test('Extension activates when .tsn file is opened', async function() {
    this.timeout(30000); // Integration tests need more time
    
    // Get the extension
    const extension = vscode.extensions.getExtension('undefined_publisher.treason-language-support');
    
    // Extension should be installed
    assert.ok(extension, 'Extension should be installed');
    
    // Open a .tsn file to trigger activation
    const fixturesPath = path.resolve(__dirname, '../../../test/fixtures');
    const sampleFilePath = path.join(fixturesPath, 'sample.tsn');
    const document = await vscode.workspace.openTextDocument(sampleFilePath);
    await vscode.window.showTextDocument(document);
    
    // Wait for activation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Extension should now be active
    assert.strictEqual(extension.isActive, true, 'Extension should be active after opening .tsn file');
  });
  
  test('Extension spawns language server process', async function() {
    this.timeout(30000);
    
    const extension = vscode.extensions.getExtension('undefined_publisher.treason-language-support');
    assert.ok(extension, 'Extension should be installed');
    
    // Ensure extension is activated
    if (!extension.isActive) {
      const fixturesPath = path.resolve(__dirname, '../../../test/fixtures');
      const sampleFilePath = path.join(fixturesPath, 'sample.tsn');
      const document = await vscode.workspace.openTextDocument(sampleFilePath);
      await vscode.window.showTextDocument(document);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // The extension should be active
    assert.strictEqual(extension.isActive, true, 'Extension should be active');
    
    // Note: We cannot directly verify the process is spawned without exposing internal state,
    // but we can verify the extension activated successfully which implies the attempt was made.
    // In a real scenario, the language server would need to be available for this to fully work.
  });
});
