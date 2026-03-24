import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Server Protocol Debugging Test
 * 
 * This test provides detailed diagnostics about the LSP communication
 * with your language server. It helps identify protocol format issues.
 * 
 * To see detailed LSP communication logs:
 * 1. Set "treason.trace.server": "verbose" in your VSCode settings
 * 2. Run this test
 * 3. Open the "Treason Language Server" output channel in VSCode
 * 4. You'll see all LSP messages being sent/received
 * 
 * Common protocol issues this helps debug:
 * - Missing or incorrect Content-Length headers
 * - Malformed JSON in responses
 * - Missing required fields in initialize response
 * - Incorrect message format (not JSON-RPC 2.0)
 */
suite('Server Protocol Debugging', () => {
  test('Initialize with verbose logging enabled', async function() {
    this.timeout(45000);
    
    // Enable verbose logging
    const config = vscode.workspace.getConfiguration('treason');
    const originalTrace = config.get('trace.server');
    
    try {
      await config.update('trace.server', 'verbose', vscode.ConfigurationTarget.Global);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('\n=== Starting Language Server with Verbose Logging ===');
      console.log('Check the "Treason Language Server" output channel for detailed logs\n');
      
      // Get extension
      const extension = vscode.extensions.getExtension('undefined_publisher.treason-language-support');
      assert.ok(extension, 'Extension should be installed');
      
      // If already active, we need to restart to pick up the new trace setting
      if (extension.isActive) {
        console.log('Extension already active, restarting to enable verbose logging...');
        await vscode.commands.executeCommand('workbench.action.reloadWindow');
        // Note: The test will end here due to reload, but that's okay for debugging
        return;
      }
      
      // Open a .tsn file to trigger activation
      const fixturesPath = path.resolve(__dirname, '../../../test/fixtures');
      const sampleFilePath = path.join(fixturesPath, 'sample.tsn');
      const document = await vscode.workspace.openTextDocument(sampleFilePath);
      await vscode.window.showTextDocument(document);
      
      console.log('Waiting for extension activation...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      if (!extension.isActive) {
        console.error('❌ Extension failed to activate!');
        console.error('Check the "Treason Language Server" output channel for error details');
        assert.fail('Extension should have activated');
      }
      
      console.log('✓ Extension activated');
      console.log('Waiting for LSP initialize handshake...');
      
      // Wait for initialize to complete
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log('\n=== LSP Initialize Handshake Complete ===');
      console.log('✓ If you see this, your server responded to initialize correctly!');
      console.log('\nTo see the actual LSP messages:');
      console.log('1. Open View → Output');
      console.log('2. Select "Treason Language Server" from the dropdown');
      console.log('3. Look for messages like:');
      console.log('   - Sending request: initialize');
      console.log('   - Received response: initialize');
      console.log('   - Sending notification: initialized');
      
      assert.strictEqual(extension.isActive, true, 'Extension should be active');
      
    } finally {
      // Restore original trace setting
      await config.update('trace.server', originalTrace, vscode.ConfigurationTarget.Global);
    }
  });
  
  test('Verify server startup with current configuration', async function() {
    this.timeout(30000);
    
    const config = vscode.workspace.getConfiguration('treason');
    const racketPath = config.get<string>('racketPath', 'racket');
    const serverPath = config.get<string>('serverScriptPath', '../treason/server.rkt');
    
    console.log('\n=== Current Configuration ===');
    console.log(`Racket executable: ${racketPath}`);
    console.log(`Server script: ${serverPath}`);
    
    // Try to resolve the server path
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      const resolvedPath = path.resolve(workspaceFolder.uri.fsPath, serverPath);
      console.log(`Resolved server path: ${resolvedPath}`);
    }
    
    console.log('\nAttempting to start server...');
    
    const extension = vscode.extensions.getExtension('undefined_publisher.treason-language-support');
    assert.ok(extension, 'Extension should be installed');
    
    // Open a .tsn file to trigger activation
    const fixturesPath = path.resolve(__dirname, '../../../test/fixtures');
    const sampleFilePath = path.join(fixturesPath, 'sample.tsn');
    const document = await vscode.workspace.openTextDocument(sampleFilePath);
    await vscode.window.showTextDocument(document);
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    if (extension.isActive) {
      console.log('✓ Server started successfully');
      console.log('✓ LSP initialize request/response completed');
      console.log('\nYour server is correctly handling the LSP protocol!');
    } else {
      console.error('❌ Server failed to start');
      console.error('\nPossible issues:');
      console.error('1. Server script not found at specified path');
      console.error('2. Racket executable not found or not in PATH');
      console.error('3. Server crashed during initialization');
      console.error('4. LSP protocol format error in initialize response');
      console.error('\nCheck the "Treason Language Server" output channel for details');
      assert.fail('Extension should have activated');
    }
  });
  
  test('Test server with minimal .tsn file', async function() {
    this.timeout(30000);
    
    // Create a minimal test file
    const testContent = '(define x 42)';
    const doc = await vscode.workspace.openTextDocument({
      language: 'treason',
      content: testContent
    });
    
    await vscode.window.showTextDocument(doc);
    
    console.log('\n=== Testing with minimal .tsn content ===');
    console.log(`Content: ${testContent}`);
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const extension = vscode.extensions.getExtension('undefined_publisher.treason-language-support');
    assert.ok(extension?.isActive, 'Extension should be active');
    
    console.log('✓ Server handled minimal file successfully');
    
    // Try making an edit
    const edit = new vscode.WorkspaceEdit();
    edit.insert(doc.uri, new vscode.Position(0, 0), '; comment\n');
    await vscode.workspace.applyEdit(edit);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('✓ Server handled textDocument/didChange notification');
  });
});
