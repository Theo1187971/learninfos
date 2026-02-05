// Script pour envoyer des notifications FCM avec Firebase Admin SDK
// Usage: node send-notification-admin.js

const admin = require('firebase-admin');

// Charger le service account
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
    serviceAccount = require('./service-account.json');
}

// Initialiser Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://learninfos-cc4f8-default-rtdb.europe-west1.firebasedatabase.app'
});

const db = admin.database();
const messaging = admin.messaging();

async function main() {
    try {
        console.log('📱 Récupération des tokens depuis Firebase...');
        
        // Lire les tokens depuis la Realtime Database
        const snapshot = await db.ref('fcm_tokens').once('value');
        const tokensData = snapshot.val();
        
        if (!tokensData) {
            console.log('⚠️ Aucun token trouvé dans la base de données');
            console.log('ℹ️  Aucun abonné, aucune notification à envoyer');
            process.exit(0);
        }
        
        // Extraire les tokens
        const tokens = [];
        Object.entries(tokensData).forEach(([userId, data]) => {
            console.log(`  - User ${userId}: token=${data.token ? 'présent' : 'absent'}`);
            if (data.token) {
                tokens.push(data.token);
            }
        });
        
        console.log(`✅ ${tokens.length} abonné(s) trouvé(s)`);
        
        if (tokens.length === 0) {
            console.log('ℹ️  Aucun abonné, aucune notification à envoyer');
            process.exit(0);
        }
        
        console.log(`📤 Envoi de ${tokens.length} notification(s)...`);
        
        // Envoyer les notifications
        const results = await Promise.all(
            tokens.map(async (token) => {
                try {
                    const message = {
                        token: token,
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
                            fcmOptions: {
                                link: 'https://theo1187971.github.io/learninfos/'
                            }
                        }
                    };
                    
                    await messaging.send(message);
                    return { success: true, token };
                } catch (error) {
                    return { success: false, token, error: error.message };
                }
            })
        );
        
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success);
        
        console.log(`\n✅ ${successful} notification(s) envoyée(s) avec succès`);
        
        if (failed.length > 0) {
            console.log(`❌ ${failed.length} échec(s):`);
            failed.forEach(f => {
                console.log(`  - ${f.token.substring(0, 20)}...: ${f.error}`);
            });
        }
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        process.exit(1);
    }
}

main();
