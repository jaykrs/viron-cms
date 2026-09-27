/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @libsql/client uses native bindings for local file databases — keep it
  // external to the server bundle instead of letting webpack process it.
  experimental: {
    serverComponentsExternalPackages: ['@libsql/client'],
  },
};

module.exports = nextConfig;
