// @ts-check
// deno-lint-ignore-file no-var prefer-const no-unused-vars no-explicit-any
import { decode as _base64Decode } from 'https://deno.land/std@0.175.0/encoding/base64.ts'
import { AsyncLocalStorage as ALSCompat } from 'https://deno.land/std@0.175.0/node/async_hooks.ts'
import { Buffer as BufferCompat } from 'https://deno.land/std@0.175.0/io/buffer.ts'

/**
 * These are the shims, polyfills and other kludges to make Next.js work in standards-compliant runtime.
 * This file isn't imported, but is instead inlined along with other chunks into the edge bundle.
 */

// Deno defines "window", but naughty libraries think this means it's a browser
// @ts-ignore
delete globalThis.window
globalThis.process = {
  env: { ...Deno.env.toObject(), NEXT_RUNTIME: 'edge', NEXT_PRIVATE_MINIMAL_MODE: '1' },
}
globalThis.EdgeRuntime = 'netlify-edge'
let _ENTRIES = {}

// Next.js expects this as a global
globalThis.AsyncLocalStorage = ALSCompat

// Next.js uses this extension to the Headers API implemented by Cloudflare workerd
if (!('getAll' in Headers.prototype)) {
  // @ts-ignore
  Headers.prototype.getAll = function getAll(name) {
    name = name.toLowerCase()
    if (name !== 'set-cookie') {
      throw new Error('Headers.getAll is only supported for Set-Cookie')
    }
    return [...this.entries()].filter(([key]) => key === name).map(([, value]) => value)
  }
}
//  Next uses blob: urls to refer to local assets, so we need to intercept these
const _fetch = globalThis.fetch
const fetch /* type {typeof globalThis.fetch} */ = async (url, init) => {
  try {
    if (url instanceof URL && url.href?.startsWith('blob:')) {
      const key = url.href.slice(5)
      if (key in _ASSETS) {
        return new Response(_base64Decode(_ASSETS[key]))
      }
    }
    return await _fetch(url, init)
  } catch (error) {
    console.error(error)
    throw error
  }
}

// Turbopack aliases "Buffer" to a module import, so we need to provide a shim for that
if (typeof require === 'undefined') {
  globalThis.require = (name) => {
    if (name === 'buffer' || name === 'node:buffer') {
      return { Buffer: BufferCompat }
    }
    throw TypeError('Native module not found: ' + id)
  }
}

// Next edge runtime uses "self" as a function-scoped global-like object, but some of the older polyfills expect it to equal globalThis
// See https://nextjs.org/docs/basic-features/supported-browsers-features#polyfills
const self = { ...globalThis, fetch }
