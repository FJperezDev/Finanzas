module.exports = {
  randomBytes: () => new Uint8Array(16),
  createHash: () => ({ update: () => ({ digest: () => "" }) }),
};
