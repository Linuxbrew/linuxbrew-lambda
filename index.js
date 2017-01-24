'use strict';

console.log('Loading function');

/**
 * Transfer bottles from CircleCI to BinTray and GitHub
 */
exports.handler = (event, context, callback) => {
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
            done(null, "GET Hello, world!");
            break;
        case 'POST':
            const body = JSON.parse(event.body);
            console.log("POST value = " + body.key);
            done(null, "POST Hello, world!\n" + body.key);
            break;
        default:
            done(new Error(`Unsupported method "${event.httpMethod}"`));
    }
};
