# @notlm/ranker

Hybrid / ONNX **inference** for NotLM pack ranking. Training lives outside this
package — hosts ship a trained `ranker.json` (and optional ONNX) under `.notlm/`.

## Install

```bash
npm install @notlm/ranker @notlm/core
# optional peers for ONNX:
# npm install onnxruntime-web   # browser
# npm install onnxruntime-node  # Node
```

## Usage

```ts
import { createJsonHybridParser, featurizeUtterance } from '@notlm/ranker';

const parse = createJsonHybridParser(rankerJson);
const hit = parse('open settings', { stepIds: ['settings'] });
const features = featurizeUtterance('open settings');
```

`npx notlmCLI ranker check <app>` validates a host pack’s ranker artifact.

## License

MIT
