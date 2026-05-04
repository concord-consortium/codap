# `@concord-consortium/codap-formulas`

Library for handling CODAP formulas. Used internally by CODAP and
available for other React 18 applications that need the CODAP formula
system.

This package is built from the [`monorepo`
branch](https://github.com/concord-consortium/codap/tree/monorepo/formulas)
of `concord-consortium/codap`, in the `formulas/` directory. It is not
present on `main`. See [doc/monorepo.md](../doc/monorepo.md) for context
on the mono-repo setup.

## Peer dependencies

- `react` `^18.0.0`
- `react-dom` `^18.0.0`

## React 17 sibling

For React 17 consumers, see
[`@concord-consortium/codap-formulas-react17`](https://www.npmjs.com/package/@concord-consortium/codap-formulas-react17),
which builds from the same source.

## Publishing

Publishes are triggered by pushing a tag of the form
`codap-formulas-v<version>` (e.g. `codap-formulas-v1.1.0`). The
[`.github/workflows/publish-formulas.yml`](../.github/workflows/publish-formulas.yml)
workflow builds and publishes with npm provenance.

Before tagging, bump `version` in [package.json](package.json) and run
the verification commands in [doc/react18-plan.md](../doc/react18-plan.md)
to confirm the workspace is clean.

## Local testing

To consume an unpublished version locally, use yalc:

```sh
yarn dlx yalc publish --push
```

Then in the consuming repo:

```sh
npx yalc add @concord-consortium/codap-formulas
```

If you also need an unpublished `@concord-consortium/codap-utilities`,
publish it with yalc first, then add it to this package, then publish
this package — see
[formulas-react17/README.md](../formulas-react17/README.md) for the
exact sequence.
