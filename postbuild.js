const fs = require('fs')

const PATH_TO_CSS = 'dist/assets/main.css'

fs.writeFileSync(
  PATH_TO_CSS,
  fs
    .readFileSync(PATH_TO_CSS)
    .toString()
    .replace(/url\(\S*(\.\.\/)\S+\)/g, (match, p) => match.replace(p, ''))
)
