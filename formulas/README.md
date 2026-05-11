# `@concord-consortium/codap-formulas`

Library for handling CODAP formulas. Used internally by CODAP and
available for other React 18 applications that need the CODAP formula
system.

This package is built from the [`monorepo`
branch](https://github.com/concord-consortium/codap/tree/monorepo/formulas)
of `concord-consortium/codap`, in the `formulas/` directory. It is not
present on `main`. See [doc/monorepo.md](https://github.com/concord-consortium/codap/blob/monorepo/doc/monorepo.md)
for context on the mono-repo setup.

## Peer dependencies

- `react` `^18.0.0`
- `react-dom` `^18.0.0`

## React 17 sibling

For React 17 consumers, see
[`@concord-consortium/codap-formulas-react17`](https://www.npmjs.com/package/@concord-consortium/codap-formulas-react17),
which builds from the same source.

## Publishing

Cutting a release is a single command:

```sh
git tag codap-formulas-v1.2.0 && git push origin codap-formulas-v1.2.0
```

The [`publish-formulas.yml`](https://github.com/concord-consortium/codap/blob/monorepo/.github/workflows/publish-formulas.yml)
GitHub Actions workflow extracts the version from the tag, writes it
into `package.json`, builds, and publishes with npm provenance via
OIDC trusted publishing. The committed `version` in `package.json`
stays at a placeholder (`0.0.0-development`) — the git tag is the
release authority.

Stable versions (e.g. `1.2.0`) publish to the `latest` dist-tag;
prerelease versions (e.g. `1.2.0-rc.1`, `1.2.0-beta.0`) publish to a
dist-tag matching the prerelease channel (`rc`, `beta`, etc.).

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
[formulas-react17/README.md](https://github.com/concord-consortium/codap/blob/monorepo/formulas-react17/README.md)
for the exact sequence.
