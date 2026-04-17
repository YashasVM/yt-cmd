#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { App } from '../src/App.js';

if (!process.stdout.isTTY || !process.stdin.isTTY) {
  console.error('yvm-yt requires an interactive terminal.');
  process.exit(1);
}

process.stdout.write('\u001Bc');
process.stdout.write('\u001B[?25l');

const app = render(React.createElement(App), {
  exitOnCtrlC: false,
});

const restoreTerminal = () => {
  process.stdout.write('\u001B[?25h');
};

process.on('exit', restoreTerminal);

app.waitUntilExit().finally(() => {
  restoreTerminal();
});
