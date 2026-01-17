import time
from playwright.sync_api import sync_playwright

def test_home_page():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # Wait for server to start
            time.sleep(2)
            page.goto("http://localhost:3000")

            # Verify title
            # Note: The title might not be set in index.html, usually Vite sets it to "Vite + React + TS"
            # I should check the page content instead.

            # Wait for the "Welcome" text
            page.wait_for_selector("text=Welcome to Kamisama Loader")

            # Take screenshot of Home
            page.screenshot(path="/home/jules/verification/home_page.png")
            print("Home page screenshot taken")

            # Navigate to Mods
            page.click("text=Mods")
            page.wait_for_selector("text=Installed Mods")
            page.screenshot(path="/home/jules/verification/mods_page.png")
            print("Mods page screenshot taken")

            # Navigate to Settings
            page.click("text=Settings")
            page.wait_for_selector("text=Game Directory")
            page.screenshot(path="/home/jules/verification/settings_page.png")
            print("Settings page screenshot taken")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    test_home_page()
