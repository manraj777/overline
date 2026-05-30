const fs = require('fs');

const xml = fs.readFileSync('/Users/manrajgupta/.gemini/antigravity-ide/brain/e6dc3cff-e4e7-4314-90ce-af0135f1862a/window_dump.xml', 'utf8');

const regex = /<node[^>]*text="([^"]+)"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"[^>]*>/g;
let match;
while ((match = regex.exec(xml)) !== null) {
  const text = match[1];
  if (text.toLowerCase().includes('continue') || text.toLowerCase().includes('item')) {
    const x = Math.floor((parseInt(match[2]) + parseInt(match[4])) / 2);
    const y = Math.floor((parseInt(match[3]) + parseInt(match[5])) / 2);
    console.log(`Found "${text}": x=${x}, y=${y}`);
  }
}
