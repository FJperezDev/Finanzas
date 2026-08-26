module.exports = {
  existsSync: () => false,
  readFileSync: () => {
    throw new Error("fs shim: readFileSync no disponible en React Native");
  },
  writeFileSync: () => {},
  statSync: () => ({ size: 0 }),
  readdirSync: () => [],
};
