'use strict';

const AWS = require('aws-sdk');
const fs = require('fs');
const spawnSync = require("child_process").spawnSync;

function spawn(command, args) {
    console.log("Running:", command, args);
    const output = spawnSync(command,
        args.filter(function(x) { return x != null }));
    if (output.error != null) {
        console.log(output);
        return output.error.toString();
    }
    const s = output.stdout.toString() + output.stderr.toString();
    console.log(s);
    return s;
}

function install_linuxbrew() {
    process.env.GIT_EXEC_PATH = "/tmp/usr/libexec/git-core";
    process.env.GIT_SSH_COMMAND = "/tmp/usr/bin/ssh -T -i /tmp/.ssh/id_rsa -o StrictHostKeyChecking=no";
    process.env.GIT_TEMPLATE_DIR = "/tmp/usr/share/git-core/templates";
    process.env.HOME = "/tmp/test-bot";
    process.env.LD_LIBRARY_PATH = "/tmp/usr/lib64";
    process.env.PATH = "/tmp/usr/bin:/var/task/bin:" + process.env.PATH;

    process.env.HOMEBREW_DEVELOPER = "1";
    process.env.HOMEBREW_NO_ANALYTICS = "1";
    process.env.HOMEBREW_NO_AUTO_UPDATE = "1";
    process.env.HOMEBREW_NO_ENV_FILTERING = "1";
    process.env.HOMEBREW_VERBOSE = "1";

    if (fs.existsSync('/tmp/test-bot'))
        spawn('rm', ['-r', '/tmp/test-bot']);
    fs.mkdirSync('/tmp/test-bot');
    process.chdir('/tmp/test-bot');

    if (fs.existsSync('/tmp/brew'))
        return;
    spawn("cp", ["-a", "/var/task/brew", "/tmp/"]);
    spawn("ln", ["-s", "2.3.7", "/tmp/brew/Library/Homebrew/vendor/portable-ruby/current"]);
    spawn("tar", ["xf", "/var/task/git-2.4.3.tar", "-C", "/tmp"]);
    spawn("/tmp/brew/bin/brew", ["update-reset"]);
}

/**
 * Transfer bottles from CircleCI to BinTray and GitHub
 */
function processEvent(event, context, callback) {
    console.log('Received event:', JSON.stringify(event, null, 2));

    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? err.message : res,
        headers: {
            'Content-Type': 'text/plain',
        },
    });

    const brew_config = () => {
        console.log("Reporting: brew config");
        install_linuxbrew();
        done(null, spawn("/tmp/brew/bin/brew", ["config"]));
    }

    const brew_pull_circle = (pr_url) => {
        console.log("Pull request URL: " + pr_url);
        install_linuxbrew();
        const keep_old = q != null && 'keep-old' in q && q['keep-old'] != 0 ? "--keep-old" : null;
        spawn("/tmp/brew/bin/brew", ["pull-circle", "--ci-upload", keep_old, pr_url]);
        done(null, "Done!");
        spawn("/tmp/brew/bin/brew", ["update-reset"]);
    }

    const q = event.queryStringParameters;
    switch (event.httpMethod) {
        case 'GET':
            if (event.pathParameters != null)
                brew_pull_circle("https://" + event.pathParameters.url);
            else
                brew_config();
            break;
        case 'POST':
            const body = JSON.parse(event.body);
            const pr_url = body.payload.pull_requests[0].url;
            brew_pull_circle(pr_url);
            break;
        default:
            done(new Error(`Unsupported method "${event.httpMethod}"`));
    }
};

exports.handler = (event, context, callback) => {
    if ('HOMEBREW_BINTRAY_KEY' in process.env)
        return processEvent(event, context, callback);
    if (!('HOMEBREW_BINTRAY_KEY_ENCRYPTED' in process.env)) {
        console.log('Warning: Missing HOMEBREW_BINTRAY_KEY_ENCRYPTED');
        return processEvent(event, context, callback);
    }
    const kms = new AWS.KMS();
    kms.decrypt({ CiphertextBlob: new Buffer(process.env.HOMEBREW_BINTRAY_KEY_ENCRYPTED, 'base64') }, (err, data) => {
        if (err) {
            console.log('Decrypt error:', err);
            return callback(err);
        }
        process.env.HOMEBREW_BINTRAY_KEY = data.Plaintext.toString('ascii');

        if (fs.existsSync('/tmp/.ssh/id_rsa'))
            return processEvent(event, context, callback);
        kms.decrypt({ CiphertextBlob: new Buffer(process.env.HOMEBREW_SSH_KEY_ENCRYPTED, 'base64') }, (err, data) => {
            if (err) {
                console.log('Decrypt error:', err);
                return callback(err);
            }
            fs.mkdirSync('/tmp/.ssh', 0o700);
            fs.writeFileSync('/tmp/.ssh/id_rsa',
                data.Plaintext.toString('ascii'),
                { mode: 0o600 });
            processEvent(event, context, callback);
        });
    });
};
