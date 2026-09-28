/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @libsql/client uses native bindings for local file databases — keep it
  // external to the server bundle instead of letting webpack process it.
  experimental: {
    // graphql must be loaded exactly once (instanceof checks break if webpack
    // bundles one copy and Node loads another), so it is external too.
    serverComponentsExternalPackages: ['@libsql/client', 'graphql'],
  },
};

module.exports = nextConfig;
