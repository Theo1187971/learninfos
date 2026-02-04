// Script de test pour FCM V1 API avec Service Account
// Usage: node test-notification-v1.js <FCM_TOKEN>

const https = require('https');
const fs = require('fs');
const path = require('path');

// Charger le service account
const serviceAccountPath = path.join(__dirname, 'service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ Erreur: Fichier service-account.json introuvable');
    console.log('📄 Créez ce fichier depuis Firebase Console');
    console.log('   Voir: service_account_guide.md');
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
const fcmToken = process.argv[2];

if (!fcmToken) {
    console.error('❌ Erreur: Token FCM manquant');
    console.log('Usage: node test-notification-v1.js <FCM_TOKEN>');
    process.exit(1);
}

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
            scope: 'https://www.googleapis.com/auth/firebase.messaging',
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

// Envoyer la notification
async function sendNotification() {
    try {
        console.log('🔑 Obtention du token d\'accès OAuth2...');
        const accessToken = await getAccessToken();
        console.log('✅ Token obtenu!');

        const payload = JSON.stringify({
            message: {
                token: fcmToken,
                data: {
                    title: '🔔 Test de notification',
                    body: 'Si vous voyez ceci, les notifications fonctionnent !',
                    url: 'https://theo1187971.github.io/learninfos/'
                },
                webpush: {
                    headers: {
                        Urgency: 'high'
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

        console.log('📤 Envoi de la notification...');
        console.log(`📱 Token: ${fcmToken.substring(0, 20)}...`);
        console.log(`📦 Payload size: ${Buffer.byteLength(payload)} bytes`);

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`\n📊 Statut: ${res.statusCode}`);
                
                try {
                    const response = JSON.parse(data);
                    console.log('📄 Réponse:', JSON.stringify(response, null, 2));
                    
                    if (res.statusCode === 200) {
                        console.log('\n✅ Notification envoyée avec succès !');
                        console.log('📱 Vérifiez votre iPhone pour voir la notification');
                    } else {
                        console.log('\n❌ Échec de l\'envoi');
                    }
                } catch (e) {
                    console.log('Réponse brute:', data);
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Erreur:', error);
        });

        req.write(payload);
        req.end();

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

sendNotification();
