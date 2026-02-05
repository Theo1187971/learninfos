// Script pour envoyer des notifications FCM depuis GitHub Actions
// Lit les tokens depuis Firebase Realtime Database
// Usage: node send-notification-firebase.js

const https = require('https');

// Charger le service account depuis les variables d'environnement
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountJson) {
    console.error('❌ Erreur: Variable FIREBASE_SERVICE_ACCOUNT manquante');
    console.log('Ajoutez le contenu de service-account.json dans les secrets GitHub');
    process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountJson);

// Fonction pour obtenir un Access Token OAuth2
async function getAccessToken() {
    return new Promise((resolve, reject) => {
        const jwtHeader = Buffer.from(JSON.stringify({
            alg: 'RS256',
            typ: 'JWT'
        })).toString('base64url');

        const now = Math.floor(Date.now() / 1000);
        const jwtPayload = Buffer.from(JSON.stringify({
            iss: serviceAccount.client_email,
            scope: 'https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/firebase.database',
            aud: 'https://oauth2.googleapis.com/token',
            exp: now + 3600,
            iat: now
        })).toString('base64url');

        const crypto = require('crypto');
        const signatureInput = `${jwtHeader}.${jwtPayload}`;
        const signature = crypto.createSign('RSA-SHA256')
            .update(signatureInput)
            .sign(serviceAccount.private_key, 'base64url');

        const jwt = `${signatureInput}.${signature}`;
        const postData = `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`;

        const options = {
            hostname: 'oauth2.googleapis.com',
            path: '/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': postData.length
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.access_token) {
                        resolve(response.access_token);
                    } else {
                        reject(new Error('No access token in response'));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// Récupérer les tokens depuis Firebase Database
async function getTokensFromFirebase(accessToken) {
    return new Promise((resolve, reject) => {
        const databaseUrl = serviceAccount.databaseURL || 'https://learninfos-cc4f8-default-rtdb.europe-west1.firebasedatabase.app';
        const url = new URL(databaseUrl + '/fcm_tokens.json');
        url.searchParams.append('access_token', accessToken);

        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'GET'
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const tokensData = JSON.parse(data);
                    const tokens = [];
                    
                    if (tokensData) {
                        Object.values(tokensData).forEach(user => {
                            if (user.token) {
                                tokens.push(user.token);
                            }
                        });
                    }
                    
                    resolve(tokens);
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

// Envoyer une notification à un token
async function sendNotification(accessToken, fcmToken) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            message: {
                token: fcmToken,
                notification: {
                    title: '📰 Nouvelles actualités',
                    body: 'De nouveaux articles sont disponibles !'
                },
                data: {
                    url: 'https://theo1187971.github.io/learninfos/'
                },
                webpush: {
                    headers: {
                        Urgency: 'high'
                    },
                    fcm_options: {
                        link: 'https://theo1187971.github.io/learninfos/'
                    }
                }
            }
        });

        const options = {
            hostname: 'fcm.googleapis.com',
            port: 443,
            path: `/v1/projects/${serviceAccount.project_id}/messages:send`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json; charset=utf-8',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve({ success: true, token: fcmToken });
                } else {
                    try {
                        const error = JSON.parse(data);
                        resolve({ success: false, token: fcmToken, error: error.error });
                    } catch (e) {
                        resolve({ success: false, token: fcmToken, error: data });
                    }
                }
            });
        });

        req.on('error', (error) => {
            resolve({ success: false, token: fcmToken, error: error.message });
        });

        req.write(payload);
        req.end();
    });
}

// Fonction principale
async function main() {
    try {
        console.log('🔑 Obtention du token d\'accès OAuth2...');
        const accessToken = await getAccessToken();
        console.log('✅ Token obtenu!');

        console.log('📱 Récupération des tokens depuis Firebase...');
        const tokens = await getTokensFromFirebase(accessToken);
        console.log(`✅ ${tokens.length} abonné(s) trouvé(s)`);

        if (tokens.length === 0) {
            console.log('ℹ️  Aucun abonné, aucune notification à envoyer');
            process.exit(0);
        }

        console.log(`📤 Envoi de ${tokens.length} notification(s)...`);
        
        const results = await Promise.all(
            tokens.map(token => sendNotification(accessToken, token))
        );

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success);

        console.log(`\n✅ ${successful} notification(s) envoyée(s) avec succès`);
        
        if (failed.length > 0) {
            console.log(`❌ ${failed.length} échec(s):`);
            failed.forEach(f => {
                console.log(`  - ${f.token.substring(0, 20)}...: ${f.error?.message || f.error}`);
            });
        }

        process.exit(0);

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        process.exit(1);
    }
}

main();
