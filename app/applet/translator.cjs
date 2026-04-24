const fs = require('fs');

async function main() {
  const content = fs.readFileSync('/app/applet/src/i18n.ts', 'utf8');

  let matchList = content.match(/en:\s*\{\s*common:\s*(\{[\s\S]*?\})\s*\}\s*\};/m);
  if (!matchList) {
    console.log("en object not found");
    return;
  }
  let enStr = matchList[1];
  
  let enObj = eval('(' + enStr + ')');
  let esObj = {};
  
  const keys = Object.keys(enObj);
  console.log("total keys:", keys.length);
  
  let currentChunk = [];
  let currentKeys = [];
  let chunks = [];
  
  for (let i = 0; i < keys.length; i++) {
    currentChunk.push(enObj[keys[i]]);
    currentKeys.push(keys[i]);
    
    if (currentChunk.join('\n').length > 1500 || i === keys.length - 1) {
      chunks.push({ keys: currentKeys, texts: currentChunk.join('\n') });
      currentChunk = [];
      currentKeys = [];
    }
  }
  
  console.log("Total chunks:", chunks.length);
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=${encodeURIComponent(chunk.texts)}`;
    
    try {
      const res = await fetch(url);
      const data = await res.json();
      const translatedLines = data[0].map(item => item[0]).join('').split('\n');
      
      chunk.keys.forEach((key, idx) => {
        esObj[key] = translatedLines[idx] || enObj[key]; 
      });
      console.log(`Chunk ${i+1}/${chunks.length} translated`);
    } catch(e) {
      console.log("error on chunk", i);
      chunk.keys.forEach(key => esObj[key] = enObj[key]);
    }
    
    await new Promise(r => setTimeout(r, Math.random() * 500 + 500));
  }
  
  const esStr = JSON.stringify(esObj, null, 4);
  const formattedEsStr = esStr.split('\n').map(line => '    ' + line).join('\n').trim();
  
  const esBlock = `,\n  es: {\n    common: ${formattedEsStr}\n  }`;
  
  const insertIndex = content.lastIndexOf('  }\n};');
  if (insertIndex !== -1) {
    const newContent = content.slice(0, insertIndex + 3) + esBlock + content.slice(insertIndex + 3);
    fs.writeFileSync('/app/applet/src/i18n.ts', newContent);
    console.log("updated i18n.ts");
  } else {
    console.log("Could not find insert pos");
  }
}

main();
