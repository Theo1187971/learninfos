import requests
import json
import os

def get_daily_news():
    # Récupération de la clé depuis les secrets GitHub
    api_key = os.environ.get("NEWS_API_KEY")
    
    if not api_key:
        print("Erreur : Clé API manquante.")
        return

    # URL pour avoir les gros titres en France
    url = f"https://newsapi.org/v2/top-headlines?country=fr&pageSize=10&apiKey={api_key}"

    try:
        response = requests.get(url)
        data = response.json()
        
        articles = data.get('articles', [])
        clean_data = []

        for article in articles:
            # On ignore les articles retirés ou sans titre
            if article['title'] == "[Removed]":
                continue

            clean_data.append({
                "source": article['source']['name'],
                "titre": article['title'],
                "description": article['description'] or "Cliquez pour lire l'article complet.",
                "url": article['url'],
                "image": article['urlToImage'] # Optionnel, si tu veux afficher des images plus tard
            })
            
        # Sauvegarde
        with open('data.json', 'w', encoding='utf-8') as f:
            json.dump(clean_data, f, ensure_ascii=False, indent=2)
            
        print(f"Succès : {len(clean_data)} articles récupérés.")

    except Exception as e:
        print(f"Erreur : {e}")

if __name__ == "__main__":
    get_daily_news()