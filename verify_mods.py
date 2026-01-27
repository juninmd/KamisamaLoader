from playwright.sync_api import sync_playwright

def verify_mods_page(page):
    # Mock electronAPI
    page.add_init_script("""
        window.electronAPI = {
            getInstalledMods: async () => [],
            fetchCategories: async () => [{id: 1, name: 'Characters', count: 10}],
            searchBySection: async (options) => {
                console.log('Mock searchBySection called', options);
                return [
                    {
                        id: '1',
                        name: 'Goku Super Saiyan 5',
                        author: 'ModderX',
                        version: '1.0',
                        description: 'The ultimate transformation',
                        isEnabled: false,
                        iconUrl: 'https://via.placeholder.com/220',
                        gameBananaId: 1001,
                        latestVersion: '1.0',
                        viewCount: 1000,
                        likeCount: 500,
                        downloadCount: 200,
                        dateAdded: Date.now(),
                        images: [],
                        category: 'Characters',
                        isNsfw: false
                    },
                    {
                        id: '2',
                        name: 'Vegeta Ultra Ego',
                        author: 'PrinceV',
                        version: '2.0',
                        description: 'Destruction power',
                        isEnabled: false,
                        iconUrl: 'https://via.placeholder.com/220',
                        gameBananaId: 1002,
                        latestVersion: '2.0',
                        viewCount: 800,
                        likeCount: 400,
                        downloadCount: 150,
                        dateAdded: Date.now(),
                        images: [],
                        category: 'Characters',
                        isNsfw: false
                    }
                ];
            },
            onDownloadScanFinished: () => {}
        };
    """)

    page.goto("http://localhost:5173")

    # 1. Click My Mods in sidebar
    page.get_by_text("My Mods").click()

    # 2. Wait for Mods page and click Browse Online
    page.get_by_text("Browse Online").click()

    # 3. Wait for mods to appear
    page.wait_for_selector("text=Goku Super Saiyan 5")
    page.wait_for_selector("text=Vegeta Ultra Ego")

    # Screenshot
    page.screenshot(path="verification_mods.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_mods_page(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
