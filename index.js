
const { dirname } = require('path');
const path = require('path');
const shell = require('shelljs');
var execSync = require('child_process').execSync
const argv = require('yargs').argv;

const SKIP_VERSION_KEYS = ['modified', 'created'];
const BOUNDARY_DATE = Date.parse('2022.02.22');
const tooFresh = [];


const parseNpmList = (data) => {
  return data
    .replace(/[^a-zA-Z0-9 @\.\-\/(deduped)]/g, '')
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter((n, i, arr) => {
      if (n === 'deduped') {
        return false;
      }
      return arr.indexOf(n) === i;
    })
    .slice(2)
}

const parsePackageName = (dep) => {
  const arr = dep.split('@');
  const isPrefixed = dep[0] === '@';
  const name = arr.slice(0, arr.length - 1).join('');

  return {
    name: isPrefixed ? `@${name}` : name,
    version: arr[arr.length - 1]
  }
}

const getPath = () => argv.rootDir ? argv.rootDir : process.cwd();

const getPackagesList = () => {
  const path = getPath();
  const { stdout } = shell.exec(`npm list --all --prefix ${path}`);
  const deps = parseNpmList(stdout);
  return deps;
}

const getSafeVersion = (versions) => {
  let version;
  const entries = Object.entries(versions);

  for (const [key, value] of entries) {
    const date = Date.parse(value);
    if (date > BOUNDARY_DATE && !SKIP_VERSION_KEYS.includes(key)) {
      return version;
    }
    version = key;
  }

  return version;
}


function checkPackageTimeCreation () {
  const deps = getPackagesList();
  deps.forEach((dep) => {
    try {
      const { name, version } = parsePackageName(dep);
      const commandCode = `npm view ${name} time --json`;
      const { stdout: datetime } = shell.exec(commandCode);
      const parsedDateTimeJson = JSON.parse(datetime);
      const date = Date.parse(parsedDateTimeJson[version]);
    
      if (date > BOUNDARY_DATE) {
        const safeVersion = getSafeVersion(parsedDateTimeJson);
        console.error(`${dep} is too fresh, please reduce the verison to ${safeVersion}`)
        const res = { dep,  safeVersion};
        tooFresh.push(res);
      }

    } catch (e) {}
  })

  console.log(tooFresh);
}

checkPackageTimeCreation();