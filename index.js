'use strict';

const AWS = require('aws-sdk');
const fs = require('fs');
const spawnSync = require("child_process").spawnSync;

function spawn(command, args) {
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
    if (fs.existsSync('/tmp/brew'))
        return;
    spawn("cp", ["-a", "/var/task/brew", "/tmp/"]);
    spawn("tar", ["xf", "/var/task/git-2.4.3.tar", "-C", "/tmp"]);
    process.env.GIT_EXEC_PATH = "/tmp/usr/libexec/git-core";
    process.env.GIT_SSH_COMMAND = "/var/task/bin/ssh -T -i /tmp/.ssh/id_rsa -o StrictHostKeyChecking=no";
    process.env.GIT_TEMPLATE_DIR = "/tmp/usr/share/git-core/templates";
    process.env.HOME = "/tmp";
    process.env.LD_LIBRARY_PATH = "/tmp/usr/lib64";
    process.env.PATH = "/tmp/usr/bin:/var/task/bin:" + process.env.PATH;
    process.chdir("/tmp");
}

/**
 * Transfer bottles from CircleCI to BinTray and GitHub
 */
function processEvent(event, context, callback) {
    console.log('Received event:', JSON.stringify(event, null, 2));

    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? err.message : JSON.stringify(res),
        headers: {
            'Content-Type': 'application/json',
        },
    });

    const q = event.queryStringParameters;
    switch (event.httpMethod) {
        case 'GET':
            install_linuxbrew();
            done(null, spawn("/tmp/brew/bin/brew", ["config"]));
            break;
        case 'POST':
            const body = JSON.parse(event.body);
            const pr = body.payload.pull_requests[0].url;
            console.log("Pull request URL: " + pr);
            install_linuxbrew();
            process.env.HOMEBREW_DEVELOPER = "1";
            process.env.HOMEBREW_NO_ANALYTICS = "1";
            process.env.HOMEBREW_NO_AUTO_UPDATE = "1";
            process.env.HOMEBREW_VERBOSE = "1";
            const keep_old = q != null && 'keep-old' in q && q['keep-old'] != 0 ? "--keep-old" : null;
            done(null, spawn("/tmp/brew/bin/brew", ["pull-circle", "--ci-upload", keep_old, pr]));
            break;
        default:
            done(new Error(`Unsupported method "${event.httpMethod}"`));
    }
};

exports.handler = (event, context, callback) => {
    if (fs.existsSync('/tmp/.ssh/id_rsa')) {
        processEvent(event, context, callback);
    } else {
        const kms = new AWS.KMS();
        kms.decrypt({ CiphertextBlob: new Buffer(process.env.BINTRAY_KEY_ENCRYPTED, 'base64') }, (err, data) => {
            if (err) {
                console.log('Decrypt error:', err);
                return callback(err);
            }
            process.env.BINTRAY_KEY = data.Plaintext.toString('ascii');
            kms.decrypt({ CiphertextBlob: new Buffer(process.env.ID_RSA_ENCRYPTED, 'base64') }, (err, data) => {
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
    }
};
