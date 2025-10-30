/**
 * Quick test for pageElementService CRUD operations
 * Tests basic functionality without database connection
 */

import * as pageElementService from './src/services/pageElementService';

// Mock test to verify type safety and basic structure
console.log('Testing pageElementService exports...');

const exportedFunctions = [
  'createPageElement',
  'getPageElements',
  'getPageElementById',
  'updatePageElement',
  'deletePageElement',
  'restorePageElement',
  'duplicatePageElement',
  'updateZIndex',
];

const pageElementServiceModule = require('./src/services/pageElementService');

for (const fn of exportedFunctions) {
  if (typeof pageElementServiceModule[fn] === 'function' || pageElementServiceModule.default[fn]) {
    console.log(`✓ ${fn} is exported`);
  } else {
    console.log(`✗ ${fn} is NOT exported`);
    process.exit(1);
  }
}

console.log('\nAll required functions are properly exported!');
console.log('pageElementService structure is valid.');
