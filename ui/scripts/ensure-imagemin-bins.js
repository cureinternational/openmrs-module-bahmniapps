var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');

var osFilterObj = require('../node_modules/os-filter-obj');

var packages = ['jpegtran-bin', 'gifsicle', 'optipng-bin'];
var failures = [];

packages.forEach(function (pkg) {
    var pkgDir = path.join(__dirname, '../node_modules', pkg);
    if (!fs.existsSync(pkgDir)) {
        return;
    }
    var bin = require(path.join(pkgDir, 'lib'));
    var target = bin.path();

    if (fs.existsSync(target)) {
        return;
    }

    var matched = osFilterObj(bin.src() || []);
    if (matched.length === 0) {
        failures.push('No ' + pkg + ' binary for ' + process.platform + '/' + process.arch);
        return;
    }

    var url = matched[0].url;
    fs.mkdirSync(path.dirname(target), { recursive: true });

    var result = childProcess.spawnSync('curl', [
        '--ipv4',
        '--fail',
        '--silent',
        '--show-error',
        '--location',
        '--connect-timeout', '30',
        '--max-time', '300',
        url,
        '--output', target
    ], { encoding: 'utf8' });

    if (result.status !== 0) {
        failures.push('Download failed for ' + pkg + ' (' + url + '): ' + (result.stderr || result.error));
        return;
    }

    fs.chmodSync(target, 0o755);
    console.log('[ensure-imagemin-bins] restored ' + path.relative(path.join(__dirname, '..'), target));
});

if (failures.length > 0) {
    console.error('[ensure-imagemin-bins] ' + failures.join('\n'));
    process.exit(1);
}