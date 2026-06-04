const env = {
  development: {
    baseUrl: "http://127.0.0.1:8080"
  },
  production: {
    baseUrl: "https://api.example.com"
  }
};

const current = "development";

module.exports = {
  current,
  ...env[current]
};
