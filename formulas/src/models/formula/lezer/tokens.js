/* Hand-written tokenizers for JavaScript tokens that can't be
   expressed by lezer's built-in tokenizer. */

// based on https://github.com/lezer-parser/javascript/blob/34e5de4cb57fe3ef3d8d278c231a634b1f2bad9f/src/tokens.js
import {ContextTracker} from "@lezer/lr"
import {spaces, newline, BlockComment, LineComment} from "./parser.terms.js"

export const trackNewline = new ContextTracker({
  start: false,
  shift(context, term) {
    return term == LineComment || term == BlockComment || term == spaces ? context : term == newline
  },
  strict: false
})
