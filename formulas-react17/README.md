# CODAP Formula system library (React 17)

This is a react 17 version of the CODAP formula system. CLUE uses it to get all of the functions that CODAP has.

It uses the same source files as the main formula system which requires React 18 or higher.

# In A Branch
The code for this library is currently in a branch of the CODAP repository:
`CODAP-740-formula-library`

## Publishing
Bump the version.
Build it:
`yarn build`
Check what will be included in the package:
`yarn pack --dry-run`
Publish it:
`yarn npm publish`

## Testing Locally
To test this locally publish it with yalc.

`yarn dlx yalc publish --push`

In an npm repository add this locally published library with:
`npx yalc add @concord-consortium/codap-formulas-react17`

If you need to also test changes to the codap-utilities package, you need to publish that package to yalc. Then add it to this package with yalc and then publish this package. So:
```
cd ../utilities
yarn dlx yalc publish --push
cd ../formulas-react17
yarn dlx yalc add @concord-consortium/codap-utilities
yarn dlx yalc publish --push
```
