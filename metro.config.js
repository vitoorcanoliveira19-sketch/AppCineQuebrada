const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const backendPattern = new RegExp(
  `${path.resolve(__dirname, 'backend').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[/\\\\].*`
);
const current = config.resolver.blockList;

config.resolver.blockList = Array.isArray(current)
  ? [...current, backendPattern]
  : current
    ? new RegExp(`(?:${current.source})|(?:${backendPattern.source})`)
    : backendPattern;

module.exports = config;
