import requests
import json
import os

def get_daily_news():
    # Récupération de la clé depuis les secrets GitHub
    api_key = os.environ.get("NEWS_API_KEY")
    
    if not api_key:
        print("Erreur : Clé API manquante.")
        return

    # Essayer plusieurs endpoints pour maximiser les chances d'avoir des articles
    endpoints = [
        f"https://newsapi.org/v2/top-headlines?country=fr&pageSize=10&apiKey={api_key}",
        f"https://newsapi.org/v2/top-headlines?category=technology&language=fr&pageSize=10&apiKey={api_key}",
        f"https://newsapi.org/v2/top-headlines?category=science&language=fr&pageSize=10&apiKey={api_key}",
        f"https://newsapi.org/v2/everything?q=France&language=fr&sortBy=publishedAt&pageSize=10&apiKey={api_key}"
    ]

    all_clean_data = []
    
    for idx, url in enumerate(endpoints):
        if len(all_clean_data) >= 5:  # Arrêter si on a déjà assez d'articles
            break
            
        try:
            print(f"Tentative {idx + 1}/{len(endpoints)}...")
            response = requests.get(url)
            data = response.json()
            
            # Vérifier le statut de la réponse
            if data.get('status') == 'error':
                print(f"  Erreur API : {data.get('message', 'Erreur inconnue')}")
                continue
            
            articles = data.get('articles', [])
            print(f"  Articles reçus : {len(articles)}")
            
            removed_count = 0

            for article in articles:
                # On ignore les articles retirés ou sans titre
                if article.get('title') == "[Removed]" or not article.get('title'):
                    removed_count += 1
                    continue

                # Éviter les doublons
                if any(a['titre'] == article['title'] for a in all_clean_data):
                    continue

                all_clean_data.append({
                    "source": article.get('source', {}).get('name', 'Source inconnue'),
                    "titre": article['title'],
                    "description": article.get('description') or "Cliquez pour lire l'article complet.",
                    "url": article.get('url', '#'),
                    "image": article.get('urlToImage')
                })
            
            print(f"  Articles filtrés : {removed_count}, Articles valides ajoutés : {len(all_clean_data)}")

        except Exception as e:
            print(f"  Erreur sur cette tentative : {e}")
            continue
    
    # Limiter à 10 articles maximum
    all_clean_data = all_clean_data[:10]
        
    # Sauvegarde
    with open('data.json', 'w', encoding='utf-8') as f:
        json.dump(all_clean_data, f, ensure_ascii=False, indent=2)
        
    print(f"\n✅ Succès : {len(all_clean_data)} articles sauvegardés dans data.json")

if __name__ == "__main__":
    get_daily_news()