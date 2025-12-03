# gemini electron-gui

gui for the gemini cli.
sidecar, not a wrapper. manages the `gemini` process, streams json output, renders it.

## stack

- **electron**: the shell.
- **react**: view layer.
- **tailwind**: styling.
- **execa**: process management.

## setup

needs the cli installed globally.

```
npm install -g @google/gemini-cli@latest
```

then grab deps here.

```
npm install
```

## running

dev mode.

```
npm run electron:dev
```

```
npm run electron:build
```

## architecture

main process (src/main) finds `gemini` binary, spawns it, pipes stdio.
renderer (src/renderer) gets json over ipc, renders it. logic stays in the main process where possible.

design is neutral. bento layout.

## troubleshooting

if "gemini command not found", check the system path. npm globals location varies.

```

```
