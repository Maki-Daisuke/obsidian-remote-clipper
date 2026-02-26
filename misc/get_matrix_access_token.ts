import { MatrixAuth } from "matrix-bot-sdk";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Writable } from "node:stream";

const mutableStdout = new Writable({
    write: function (chunk, encoding, callback) {
        if (!(this as any).muted) {
            output.write(chunk, encoding);
        }
        callback();
    }
});

const rl = readline.createInterface({
    input,
    output: mutableStdout as unknown as NodeJS.WritableStream,
    terminal: true
});

const homeserverUrl = await rl.question("Homeserver URL [https://matrix.org]: ") || "https://matrix.org";
const auth = new MatrixAuth(homeserverUrl);

const username = await rl.question("Username: ");

output.write("Password: ");
(mutableStdout as any).muted = true;
const password = await rl.question("");
(mutableStdout as any).muted = false;
output.write("\n");
rl.close();

console.log("Logging in...");
const client = await auth.passwordLogin(username, password);

console.log("\n✅ Login successful!");
console.log("Copy this access token to your bot's config: ", client.accessToken);
