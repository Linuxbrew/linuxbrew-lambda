'use strict';

console.log('Loading function');

const AWS = require('aws-sdk');
let decrypted;

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

    switch (event.httpMethod) {
        case 'GET':
            console.log("GET Hello, world!");
            const spawn = require("child_process").spawnSync;
            const ruby = spawn("bin/ruby", ["-e", "puts(123+456)"]);
            console.log(ruby.stderr.toString() + ruby.stdout.toString());
            process.env.HOME = "/tmp";
            process.env.PATH = process.cwd() + "/bin:" + process.env.PATH;
            console.log("PATH=" + process.env.PATH);
            spawn("cp", ["-a", "brew", "/tmp/"]);
            process.chdir("/tmp");
            const brew_config = spawn("/tmp/brew/bin/brew", ["config"]);
            console.log(brew_config.stderr.toString() + brew_config.stdout.toString());
            const brew_pull_circle = spawn("/tmp/brew/bin/brew", ["pull-circle", "--ci-upload", "https://github.com/Linuxbrew/homebrew-extra/pull/2"]);
            console.log(brew_pull_circle.stderr.toString() + brew_pull_circle.stdout.toString());
            done(null, brew_pull_circle.stderr.toString() + brew_pull_circle.stdout.toString());
            break;
        case 'POST':
            const body = JSON.parse(event.body);
            console.log("POST " + body.key);
            done(null, "POST " + body.key);
            break;
        default:
            done(new Error(`Unsupported method "${event.httpMethod}"`));
    }
};

exports.handler = (event, context, callback) => {
    if (decrypted) {
        processEvent(event, context, callback);
    } else {
        // Decrypt code should run once and variables stored outside of the function
        // handler so that these are decrypted once per container
        const kms = new AWS.KMS();
        kms.decrypt({ CiphertextBlob: new Buffer(process.env.BINTRAY_KEY_ENCRYPTED, 'base64') }, (err, data) => {
            if (err) {
                console.log('Decrypt error:', err);
                return callback(err);
            }
            process.env.BINTRAY_KEY = data.Plaintext.toString('ascii');
            processEvent(event, context, callback);
        });
    }
};
