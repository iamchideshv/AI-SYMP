import wikipedia
import logging

logging.basicConfig(level=logging.INFO)

def test_wiki(names):
    for name in names:
        try:
            print(f"\n--- Searching for: {name} ---")
            # Suggestion: Search specifically for medical information
            search_results = wikipedia.search(name)
            print(f"Search results: {search_results}")
            if search_results:
                summary = wikipedia.summary(search_results[0], sentences=2)
                print(f"Summary: {summary}")
        except Exception as e:
            print(f"Error for {name}: {e}")

if __name__ == "__main__":
    test_wiki(["Migraine", "Common Cold", "Influenza", "Tension Headache"])
