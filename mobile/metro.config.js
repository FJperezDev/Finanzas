const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// SheetJS (xlsx) referencia módulos de Node que no existen en React Native.
// Los mapeamos a shims inertes: el código que los usa solo se ejecuta en Node.
config.resolver.extraNodeModules = {
  fs: path.resolve(__dirname, "shims/fs.js"),
  path: path.resolve(__dirname, "shims/path.js"),
  stream: path.resolve(__dirname, "shims/stream.js"),
  os: path.resolve(__dirname, "shims/os.js"),
  crypto: path.resolve(__dirname, "shims/crypto.js"),
  child_process: path.resolve(__dirname, "shims/empty.js"),
  http: path.resolve(__dirname, "shims/empty.js"),
  https: path.resolve(__dirname, "shims/empty.js"),
  net: path.resolve(__dirname, "shims/empty.js"),
  tls: path.resolve(__dirname, "shims/empty.js"),
  zlib: path.resolve(__dirname, "shims/empty.js"),
};

module.exports = config;
