from playwright.sync_api import Page, expect, sync_playwright
import time
import os
import socket

def wait_for_server(port, timeout=30):
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            with socket.create_connection(("localhost", port), timeout=1):
                return True
        except:
            time.sleep(1)
            print(f"Waiting for server on port {port}...")
    return False

def verify_gui(page: Page):
    port = 4173
    if not wait_for_server(port):
        print("Server not ready, trying anyway...")

    url = f"http://localhost:{port}"
    print(f"Navigating to {url}")

    page.goto(url)

    # Expect title
    expect(page).to_have_title("Gemini Electron GUI")

    # Check for specific UI elements
    # Sidebar "EXPLORER"
    expect(page.get_by_text("EXPLORER")).to_be_visible()

    # Header "Gemini Agent"
    expect(page.get_by_role("heading", name="Gemini Agent")).to_be_visible()

    # Input box
    expect(page.get_by_placeholder("Enter instructions...")).to_be_visible()

    # Take screenshot
    print("Taking screenshot...")
    screenshot_path = os.path.join(os.getcwd(), "verification", "gui_screenshot.png")
    page.screenshot(path=screenshot_path)
    print(f"Screenshot saved to {screenshot_path}")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_gui(page)
        except Exception as e:
            print(f"Error: {e}")
            try:
                print(page.content())
            except:
                pass
        finally:
            browser.close()
