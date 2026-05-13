import http from 'node:http';
import { Buffer } from 'node:buffer';
const port = Number(process.env.PORT ?? 3000);
const baseUrl = 'https://vilska-s-rgs.onrender.com';
const authToken = process.env.RGS_AUTH_TOKEN ?? 'rgs-secret-token';
let balance = 1000;
function sendJson(res, status, payload) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload, null, 2));
}
function authenticate(req, res) {
    const authorization = req.headers.authorization;
    if (!authorization || authorization !== `Bearer ${authToken}`) {
        sendJson(res, 401, {
            error: 'Unauthorized',
            message: 'Provide Authorization: Bearer <token>',
            validExample: `Bearer ${authToken}`
        });
        return false;
    }
    return true;
}
function handleWallet(_req, res) {
    sendJson(res, 200, {
        endpoint: `${baseUrl}/wallet`,
        balance,
        status: 'ok'
    });
}
function handleWalletApi(_req, res) {
    sendJson(res, 200, {
        endpoint: `${baseUrl}/wallet/api`,
        balance,
        actions: [`GET ${baseUrl}/wallet`, `POST ${baseUrl}/wallet/play`]
    });
}
function handleWalletPlay(req, res) {
    if (req.method !== 'POST') {
        return sendJson(res, 405, { error: 'POST required', endpoint: '/wallet/play' });
    }
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
        const bodyText = Buffer.concat(chunks).toString() || '{}';
        let amount = 10;
        try {
            const payload = JSON.parse(bodyText);
            if (typeof payload.amount === 'number' && Number.isFinite(payload.amount) && payload.amount > 0) {
                amount = payload.amount;
            }
        }
        catch {
            // ignore invalid JSON and use default amount
        }
        const win = Math.random() < 0.5;
        balance += win ? amount : -amount;
        if (balance < 0)
            balance = 0;
        sendJson(res, 200, {
            endpoint: '/wallet/play',
            result: win ? 'win' : 'lose',
            amount,
            balance
        });
    });
}
const server = http.createServer((req, res) => {
    if (!authenticate(req, res)) {
        return;
    }
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    switch (url.pathname) {
        case '/wallet':
            return handleWallet(req, res);
        case '/wallet/api':
            return handleWalletApi(req, res);
        case '/wallet/play':
            return handleWalletPlay(req, res);
        case '/':
            return sendJson(res, 200, {
                message: 'Remote Gaming Server (RGS) backend is running',
                balance,
                baseUrl,
                endpoints: [`${baseUrl}/wallet`, `${baseUrl}/wallet/api`, `${baseUrl}/wallet/play`]
            });
        default:
            return sendJson(res, 404, { error: 'Not found', path: url.pathname });
    }
});
server.listen(port, () => {
    console.log(`RGS backend listening on http://localhost:${port}`);
});
//# sourceMappingURL=server.js.map