#!/usr/bin/env node
import { main } from '../src/main.mjs'

main().catch((err) => {
  console.error(`✗ ${err.message}`)
  process.exitCode = 1
})
