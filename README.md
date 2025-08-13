# verifier

Standalone CLI tool for verification tasks.

Features:
- Init project config in `.verifier/`
- Run agents: `lint`, `security-scan`
- Token usage reporting

## Install

```bash
npm install -g verifier
# or
npx verifier --help
```

## Usage

```bash
verifier init
verifier run lint --files src/index.ts
verifier token-usage --format json
```

API keys:
- Set in `.verifier/config.yaml` or `.verifier/.env`
- Supports OpenAI and Anthropic providers

## Development

```bash
npm install
npm run build
npm link
verifier --help
```

Publishing:
```bash
npm run build
npm publish --access public
```

## License

MIT

