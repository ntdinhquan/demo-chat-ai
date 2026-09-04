import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These pull in native bindings (onnxruntime, sharp) and non-JS files
  // (READMEs, ONNX/wasm assets) that Turbopack's bundler chokes on trying
  // to statically analyze — load them via native `require` at runtime instead.
  serverExternalPackages: ["chromadb", "@chroma-core/default-embed", "@huggingface/transformers", "onnxruntime-node", "sharp"],
};

export default nextConfig;
