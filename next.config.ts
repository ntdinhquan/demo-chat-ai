import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These packages pull in non-JS assets (READMEs, ONNX model files, native
  // bindings) that Turbopack chokes on trying to statically bundle — let
  // Node `require()` them at runtime instead. `onnxruntime-node`, `sharp`,
  // and `@huggingface/transformers` are already externalized by Next.js by
  // default; the Chroma packages aren't yet.
  serverExternalPackages: ["chromadb", "@chroma-core/default-embed", "@chroma-core/ai-embeddings-common"],
};

export default nextConfig;
