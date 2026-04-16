import wikipedia

def test_page(query):
    try:
        page = wikipedia.page(query, auto_suggest=True)
        print(f"Title: {page.title}")
        print(f"Sections: {page.sections}")
        # print(f"Content snippet: {page.content[:500]}")
        
        # Look for Diagnosis or Symptoms section
        target_sections = ["Signs and symptoms", "Symptoms", "Diagnosis", "Clinical features"]
        for section in page.sections:
            if any(target in section for target in target_sections):
                print(f"\n--- Section: {section} ---")
                print(page.section(section)[:1000]) # First 1000 chars
                break
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_page("Migraine")
    test_page("Meningitis")
