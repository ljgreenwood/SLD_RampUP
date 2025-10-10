import os
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin


def scrape_mp3s(base_url: str, download_dir: str = "mp3_downloads"):
    os.makedirs(download_dir, exist_ok=True)

    response = requests.get(base_url)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")

    mp3_links = set()
    # Case 2: <audio><source src="..."></audio>
    for source in soup.find_all("source", src=True):
        if source["src"].endswith(".mp3"):
            mp3_links.add(urljoin(base_url, source["src"]))

    if not mp3_links:
        print("No MP3 files found.")
        return

    for mp3_url in mp3_links:
        filename = os.path.join(download_dir, os.path.basename(mp3_url))
        print(f"Downloading {mp3_url} → {filename}")
        with requests.get(mp3_url, stream=True) as r:
            r.raise_for_status()
            with open(filename, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)

    print(f"Downloaded {len(mp3_links)} files to {download_dir}")


if __name__ == "__main__":
    url = input("Enter the URL of the page to scrape for .mp3 files: ").strip()
    scrape_mp3s(url)
    print("Scraping completed.")