### gemini-cli-gui

This is a fork of the official [**Google Gemini CLI**](https://github.com/google-gemini/gemini-cli).

The goal of this project is to give the agent a proper gui.

The original CLI is a great tool, but sometimes you don't want to stare at a terminal window. You want actual UI elements. You want a button to click, a settings menu to toggle, and a proper diff view that doesn't rely on ASCII characters.

This project wraps the powerful logic of the Gemini agent in a modern Electron interface, giving you the best of both worlds: Google's reasoning engine with a user experience that feels like a real desktop application.

#### How it Works

We use what we call a "Headless Core" architecture.

The repository is set up as a monorepo. We intentionally treat the original Google code as a library so we don't break the logic.

* **packages/core**: This is the brain. It handles the agents, tools, and context management. We keep this identical to the upstream repo.
* **packages/cli**: The original terminal interface. It's still here if you need it.
* **packages/electron-gui**: This is the new face. It's a React + Tailwind application running inside Electron that imports the Core directly.

When you run this app, you aren't just running a web wrapper. The Electron main process actually spins up the Gemini agent directly from the core package.

#### Getting Started

Because this is a monorepo with shared dependencies, there is a specific order to get things running.

1.  **Install Dependencies**
    Grab all the node modules for the workspace.
    ```
    npm install
    ```

2.  **Build the Core**
    We need to compile the TypeScript in the core package first so the Electron app can consume it.
    ```
    npm run build --workspace=packages/core
    ```

3.  **Run the GUI**
    Start the Electron development server.
    ```
    npm run dev --workspace=packages/electron-gui
    ```

#### Development

If you want to change how the application looks or feels, you'll spend most of your time in `packages/electron-gui`. We use Vite, so changes to the React components will hot-reload instantly.

If you want to change how the agent thinks or add new tools, you will need to work in `packages/core`. Just remember that if you change the core logic, you have to rebuild that package before the UI will pick up the changes.

#### Relationship to Upstream

We track the official [`google-gemini/gemini-cli`](https://github.com/google-gemini/gemini-cli). repository.

The strategy is to keep the `core` package as clean as possible. This ensures that when Google releases a smarter model or a new reasoning capability, we can merge it in and immediately expose it in the GUI without painful merge conflicts.

## License

Apache 2.0 same as upstream
