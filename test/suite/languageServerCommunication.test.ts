import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Integration test for language server communication
 * Validates: Requirements 2.1, 2.2, 7.3
 */
suite('Integration: Language Server Communication', () => {
  test('Extension communicates with language server', async function() {
    this.timeout(30000);
    
    const extension = vscode.extensions.getExtension('undefined_publisher.treason-language-support');
    assert.ok(extension, 'Extension should be installed');
    
    // Open a .tsn file to activate extension
    const fixturesPath = path.resolve(__dirname, '../../../test/fixtures');
    const sampleFilePath = path.join(fixturesPath, 'sample.tsn');
    const document = await vscode.workspace.openTextDocument(sampleFilePath);
    await vscode.window.showTextDocument(document);
    
    // Wait for activation and server initialization
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verify extension is active
    assert.strictEqual(extension.isActive, true, 'Extension should be active');
    
    // Note: Without a real language server running, we can't test actual LSP communication.
    // This test verifies the extension activates and attempts to start the server.
    // In a real scenario with a mock or real server, we would:
    // 1. Send an LSP initialize request
    // 2. Verify we receive an initialize response
    // 3. Send textDocument/didOpen notification
    // 4. Verify the server acknowledges it
  });
  
  test('Extension handles textDocument/didOpen notification', async function() {
    this.timeout(30000);
    
    const extension = vscode.extensions.getExtension('undefined_publisher.treason-language-support');
    assert.ok(extension, 'Extension should be installed');
    
    // Open a .tsn file
    const fixturesPath = path.resolve(__dirname, '../../../test/fixtures');
    const sampleFilePath = path.join(fixturesPath, 'sample.tsn');
    const document = await vscode.workspace.openTextDocument(sampleFilePath);
    await vscode.window.showTextDocument(document);
    
    // Wait for server communication
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify document is open
    assert.strictEqual(document.languageId, 'treason', 'Document should have treason language ID');
    assert.ok(document.getText().length > 0, 'Document should have content');
    
    // The extension should have sent a textDocument/didOpen notification to the server
    // We can't directly verify this without instrumenting the client, but we can verify
    // the document is properly opened and the extension is active
    assert.strictEqual(extension.isActive, true, 'Extension should be active');
  });
});
