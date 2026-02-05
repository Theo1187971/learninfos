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

const serviceAccount = require('./service-account.json');

// Fonction pour obtenir un Access Token OAuth2
async function getAccessToken() {
    return new Promise((resolve, reject) => {
        const jwtHeader = Buffer.from(JSON.stringify({
            alg: 'RS256',
            typ: 'JWT',
            kid: serviceAccount.private_key_id // <-- AJOUTEZ CETTE LIGNE
        })).toString('base64url');

        console.log('Email:', serviceAccount.client_email);
        console.log('ID:', serviceAccount.private_key_id);

        const now = Math.floor(Date.now() / 1000);
        const jwtPayload = Buffer.from(JSON.stringify({
            iss: serviceAccount.client_email,
            sub: serviceAccount.client_email,
            scope: 'https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/firebase.database',
            aud: 'https://oauth2.googleapis.com/token',
            exp: now + 3600,
            iat: now
        })).toString('base64url');

        const crypto = require('crypto');
        const signatureInput = `${jwtHeader}.${jwtPayload}`;
        console.log('Contenu brut de la clé privée utilisé pour la signature:\n', serviceAccount.private_key);
        const signature = crypto.createSign('RSA-SHA256')
            .update(signatureInput)
            .sign(serviceAccount.private_key, 'base64url');

        const jwt = `${signatureInput}.${signature}`;
        console.log('JWT complet généré:', jwt); // <-- AJOUTEZ CETTE LIGNE
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
                        console.log('Access token successfully obtained.'); // Ajouté
                        resolve(response.access_token);
                    } else {
                        // Log complet de la réponse pour le débogage
                        console.error('Erreur lors de l\'obtention du token d\'accès :');
                        console.error('Réponse complète de l\'API OAuth :', response);
                        reject(new Error('Aucun token d\'accès dans la réponse ou erreur de l\'API OAuth.'));
                    }
                } catch (e) {
                    console.error('Erreur parsing de la réponse OAuth :', e); // Ajouté
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
        // Append the access_token as a query parameter
        const url = new URL(`${databaseUrl}/fcm_tokens.json?access_token=${accessToken}`);

        console.log(`🔍 URL de récupération: ${url.hostname}${url.pathname}${url.search}`); // Log the full URL with query parameters

        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search, // Include the search parameters in the path
            method: 'GET',
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`📊 Statut HTTP: ${res.statusCode}`);
                console.log(`📄 Réponse brute: ${data.substring(0, 500)}`);
                
                try {
                    const tokensData = JSON.parse(data);
                    const tokens = [];
                    
                    if (tokensData) {
                        console.log(`📋 Structure des données:`, Object.keys(tokensData));
                        Object.entries(tokensData).forEach(([userId, user]) => {
                            console.log(`  - User ${userId}: token=${user.token ? 'présent' : 'absent'}`);
                            if (user.token) {
                                tokens.push(user.token);
                            }
                        });
                    } else {
                        console.log('⚠️ tokensData est null ou undefined');
                    }
                    
                    resolve(tokens);
                } catch (e) {
                    console.log(`❌ Erreur parsing: ${e.message}`);
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
