import * as path from 'node:path'
import { execSync } from 'node:child_process'

const cwd = process.cwd()

const src = path.resolve(cwd, './src')
const dist = path.resolve(cwd, './dist')

const dirNames = ['runtime-framework', 'runtime-ets', 'taro-runtime', 'vue-runtime-dom']

dirNames.forEach(dirName => {
  execSync(`cp -r ${path.resolve(src, dirName)} ${path.resolve(dist, dirName)}`)
})
