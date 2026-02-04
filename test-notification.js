// Script de test pour envoyer une notification push Firebase
// Usage: node test-notification.js <FCM_TOKEN>

const https = require('https');

// Récupérer le token depuis les arguments
const fcmToken = process.argv[2];
const serverKey = process.env.FCM_SERVER_KEY;

if (!fcmToken) {
    console.error('❌ Erreur: Token FCM manquant');
    console.log('Usage: node test-notification.js <FCM_TOKEN>');
    console.log('Exemple: node test-notification.js dXyZ123...');
    process.exit(1);
}

if (!serverKey) {
    console.error('❌ Erreur: FCM_SERVER_KEY manquant');
    console.log('Définissez la variable d\'environnement FCM_SERVER_KEY');
    console.log('Exemple: set FCM_SERVER_KEY=AAAA... (Windows)');
    console.log('Exemple: export FCM_SERVER_KEY=AAAA... (Mac/Linux)');
    process.exit(1);
}

const payload = JSON.stringify({
    to: fcmToken,
    notification: {
        title: '🔔 Test de notification',
        body: 'Si vous voyez ceci, les notifications fonctionnent !',
        icon: '/icon-192.png',
        click_action: 'https://theo1187971.github.io/learninfos/'
    },
    data: {
        url: 'https://theo1187971.github.io/learninfos/'
    }
});

const options = {
    hostname: 'fcm.googleapis.com',
    port: 443,
    path: '/fcm/send',
    method: 'POST',
    headers: {
        'Authorization': `key=${serverKey}`,
        'Content-Type': 'application/json',
        'Content-Length': payload.length
    }
};

console.log('📤 Envoi de la notification de test...');
console.log(`📱 Token: ${fcmToken.substring(0, 20)}...`);

const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log(`\n📊 Statut: ${res.statusCode}`);
        
        try {
            const response = JSON.parse(data);
            console.log('📄 Réponse:', JSON.stringify(response, null, 2));
            
            if (response.success === 1) {
                console.log('\n✅ Notification envoyée avec succès !');
                console.log('📱 Vérifiez votre iPhone pour voir la notification');
            } else {
                console.log('\n❌ Échec de l\'envoi');
                if (response.results && response.results[0].error) {
                    console.log(`Erreur: ${response.results[0].error}`);
                }
            }
        } catch (e) {
            console.log('❌ Erreur de parsing:', data);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Erreur:', error);
});

req.write(payload);
req.end();
