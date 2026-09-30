// Inlines src/ into the single self-contained inside-the-planner.html
const fs = require("fs");
const read = f => fs.readFileSync(__dirname + "/src/" + f, "utf8");
const scenario = read("scenario.js").replace(/\nif \(typeof module[^\n]*\n?$/, "\n");
const html = read("shell.html")
  .replace("/*CSS*/", () => read("styles.css"))
  .replace("/*SCENARIO*/", () => scenario)
  .replace("/*APP*/", () => read("app.js"));
fs.writeFileSync(__dirname + "/inside-the-planner.html", html);
console.log("Built inside-the-planner.html", (html.length / 1024).toFixed(0) + " KB");
