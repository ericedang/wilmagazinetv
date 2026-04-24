const fs = require('fs');
const content = fs.readFileSync('src/i18n.ts', 'utf8');

// We can just find the end of the const resources = { ... };
const startIndex = content.indexOf('const resources = {');
// Find the last index of resources
// Wait, we can just split and match
const regex = /const resources = (\{[\s\S]*?\n\});\n\ni18n/m;
const match = content.match(regex);
if (match) {
  fs.writeFileSync('scripts/resources.js', 'module.exports = ' + match[1] + ';');
  console.log('extracted');
} else {
  console.log('not found');
}
