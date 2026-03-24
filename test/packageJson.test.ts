import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

suite('Package.json Validation Tests', () => {
  let packageJson: any;

  suiteSetup(() => {
    // Read package.json from the project root
    const packageJsonPath = path.resolve(__dirname, '../../package.json');
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
    packageJson = JSON.parse(packageJsonContent);
  });

  test('package.json exists and is valid JSON', () => {
    assert.ok(packageJson, 'package.json should be parsed successfully');
    assert.strictEqual(typeof packageJson, 'object', 'package.json should be an object');
  });

  test('package.json contains required metadata fields', () => {
    assert.ok(packageJson.name, 'package.json should have a name field');
    assert.ok(packageJson.displayName, 'package.json should have a displayName field');
    assert.ok(packageJson.description, 'package.json should have a description field');
    assert.ok(packageJson.version, 'package.json should have a version field');
    assert.ok(packageJson.engines, 'package.json should have an engines field');
    assert.ok(packageJson.engines.vscode, 'package.json should specify vscode engine version');
  });

  test('activation events include "onLanguage:treason"', () => {
    assert.ok(Array.isArray(packageJson.activationEvents), 'activationEvents should be an array');
    assert.ok(
      packageJson.activationEvents.includes('onLanguage:treason'),
      'activationEvents should include "onLanguage:treason"'
    );
  });

  test('language contribution includes .tsn extension', () => {
    assert.ok(packageJson.contributes, 'package.json should have a contributes field');
    assert.ok(packageJson.contributes.languages, 'contributes should have a languages field');
    assert.ok(Array.isArray(packageJson.contributes.languages), 'languages should be an array');
    
    const treasonLanguage = packageJson.contributes.languages.find(
      (lang: any) => lang.id === 'treason'
    );
    
    assert.ok(treasonLanguage, 'languages should include a treason language definition');
    assert.ok(Array.isArray(treasonLanguage.extensions), 'treason language should have extensions array');
    assert.ok(
      treasonLanguage.extensions.includes('.tsn'),
      'treason language extensions should include .tsn'
    );
  });

  test('main entry point is set to ./out/extension.js', () => {
    assert.strictEqual(
      packageJson.main,
      './out/extension.js',
      'main entry point should be ./out/extension.js'
    );
  });

  test('configuration includes treason.racketPath', () => {
    assert.ok(packageJson.contributes.configuration, 'contributes should have configuration');
    assert.ok(packageJson.contributes.configuration.properties, 'configuration should have properties');
    assert.ok(
      packageJson.contributes.configuration.properties['treason.racketPath'],
      'configuration should include treason.racketPath'
    );
  });

  test('configuration includes treason.serverScriptPath', () => {
    assert.ok(
      packageJson.contributes.configuration.properties['treason.serverScriptPath'],
      'configuration should include treason.serverScriptPath'
    );
  });

  test('configuration includes treason.trace.server', () => {
    assert.ok(
      packageJson.contributes.configuration.properties['treason.trace.server'],
      'configuration should include treason.trace.server'
    );
  });
});
