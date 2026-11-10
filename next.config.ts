import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Intentionally minimal: no experimental flags (plan.md §2).
  reactStrictMode: true,

  // Next 16 otherwise appends a "nextjs-agent-rules" block to AGENTS.md on
  // every `next dev` / `next build`. AGENTS.md is this project's governance
  // document, not a framework-generated file, so the framework is told to keep
  // out rather than having the block committed into it.
  agentRules: false,
};

export default nextConfig;
