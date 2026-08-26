module.exports = {
  join: (...args) => args.join("/"),
  basename: (p) => String(p).split("/").pop(),
  dirname: (p) => String(p).split("/").slice(0, -1).join("/") || ".",
  extname: (p) => {
    const parts = String(p).split(".");
    return parts.length > 1 ? "." + parts.pop() : "";
  },
};
