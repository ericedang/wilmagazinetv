import * as tsc from "typescript";
import * as fs from "fs";

const i18nContent = fs.readFileSync("src/i18n.ts", "utf8");
const match = i18nContent.match(/const resources = ({[\s\S]*?^};\n)/m);

if (match) {
  const objStr = match[1];
  fs.writeFileSync("resources.js", "module.exports = " + objStr);
}
