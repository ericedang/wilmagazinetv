const fs = require('fs');

async function main() {
  const content = fs.readFileSync('src/i18n.ts', 'utf8');

  let matchList = content.match(/en:\s*\{\s*common:\s*(\{[\s\S]*?\})\s*\}\s*\};/m);
  if (!matchList) {
    console.log("en object not found");
    return;
  }
  let enStr = matchList[1];
  
  // parse the json by using evil eval (it's safe here)
  let enObj = eval('(' + enStr + ')');
  
  let esObj = {};
  
  // translate in batches to avoid rate limit or uri limit
  const keys = Object.keys(enObj);
  console.log("total keys:", keys.length);
  
  for (let i=0; i<keys.length; i++) {
    const key = keys[i];
    const val = enObj[key];
    
    // Some basic translation logic. We'll use google translate free API
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=${encodeURIComponent(val)}`;
    
    try {
      const res = await fetch(url);
      const data = await res.json();
      esObj[key] = data[0].map(item => item[0]).join('');
    } catch(e) {
      console.log("error on key:", key);
      esObj[key] = val; // fallback
    }
    
    // pause briefly
    await new Promise(r => setTimeout(r, 100));
  }
  
  // Now we need to append it into src/i18n.ts
  // Instead of rewriting everything safely, we generate the string for `es`
  const esStr = JSON.stringify(esObj, null, 6).replace(/\n/g, '\n  ');
  
  const esBlock = `,\n  es: {\n    common: ${esStr}\n  }`;
  
  const insertIndex = content.lastIndexOf('  }\n};');
  if (insertIndex !== -1) {
    const newContent = content.slice(0, insertIndex + 3) + esBlock + content.slice(insertIndex + 3);
    fs.writeFileSync('src/i18n.ts', newContent);
    console.log("updated i18n.ts");
  } else {
    console.log("Could not find insert pos");
  }
}

main();
